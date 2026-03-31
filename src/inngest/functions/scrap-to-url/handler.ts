import fs from "fs";
import os from "os";
import path from "path";

import { db } from "@/lib/database";
import { TtsService } from "@/lib/tts";
import { SttService } from "@/lib/transcribe/deepgram";
import { ImageGenerator } from "@/lib/image-generation";
import { createStyledPrompt, buildScraperPreviewPrompt } from "@/lib/prompts";
import { R2StorageService } from "@/lib/r2-storage";
import { OpenAIService } from "@/lib/openai";
import { ExpandImageService } from "@/lib/expand-image";
import { AssetType, AudioSubtype, SourceType } from "@/lib/database/types";

import { SegmentUpdater } from "../../services/updater";

import { adjustVideoToCanvasBuffer } from "../../services/ffmpeg";

import { generateId } from "@/utils/id";
import { aspectRatioType, ResolverStatus } from "@/utils/enum";
import { getAudioInfo } from "@/utils/get-audio-info";
import { ServicePricing } from "../../utils/pricing";
import { VOICE_ID, VOICEOVER_PAUSE, VOICEOVER_INIT_PAUSE } from "../../utils/constant";
import { buildMiniTranscribe, safeUpstashCall } from "../../utils/common";
import { LinkToVideoSchema, ScriptSegment } from "./utils/types";
import { adjustImageToCanvas, downloadVideo, fileUrlToBuffer } from "./utils/common";
import { GeneratedMedia, MediaMetadata, PriceItem, VideoSegment } from "../../utils/types";
import { ScraperPipelineResult } from "../common/utils/types";

export class ScraperVideoPipeline {
  private prices: PriceItem[] = [];
  private tmpDir = os.tmpdir();
  private userId: string | null = null;
  private projectId: string | null = null;
  private mediaMetadata: Record<string, MediaMetadata> = {};

  constructor(
    private tts: TtsService,
    private stt: SttService,
    private openai: OpenAIService,
    private imageGenerator: ImageGenerator,
    private imageExpander: ExpandImageService,
    private storage: R2StorageService,
    private segmentUpdater: SegmentUpdater,
    private generationId: string,
    private expandImage: boolean = false,
  ) {}

  // --- Helper to persist assets to DB ---
  private async persistAsset(
    filePath: string,
    publicUrl: string,
    params: {
      sourceType: SourceType;
      assetType: AssetType;
      audioSubtype?: AudioSubtype;
      originalFilename?: string;
      duration?: number;
    },
  ): Promise<void> {
    if (!this.userId) return;

    try {
      const uniqueFilename = filePath;

      await db
        .insertInto("assets")
        .values({
          id: generateId(),
          user_id: this.userId,
          project_id: this.projectId,
          source_type: params.sourceType,
          asset_type: params.assetType,
          audio_subtype: params.audioSubtype || null,
          original_filename: params.originalFilename || filePath.split("/").pop() || "asset",
          unique_filename: uniqueFilename,
          file_path: filePath,
          public_url: publicUrl,
          file_size: null,
          mime_type: null,
          duration: params.duration || null,
          metadata: { generation_id: this.generationId },
        })
        .execute();
    } catch (err) {
      console.error("Failed to persist asset:", err);
    }
  }

  // --- MAIN PIPELINE ---
  async run(scraperScheme: LinkToVideoSchema, step: any): Promise<ScraperPipelineResult> {
    // 0. Fetch User and Project ID for asset persistence
    const { userId, projectId } = await step.run("Validation data preprocessing...", async () => {
      try {
        const generation = await db
          .selectFrom("generations")
          .select("user_id")
          .where("id", "=", this.generationId)
          .executeTakeFirst();
        this.userId = generation?.user_id || null;

        if (this.userId) {
          const project = await db
            .selectFrom("projects")
            .select("id")
            .where("generation_id", "=", this.generationId)
            .executeTakeFirst();
          this.projectId = project?.id || null;
        }
        return { userId: this.userId, projectId: this.projectId };
      } catch (err) {
        console.error("Initialization error:", err);
      }
    });
    this.userId = userId;
    this.projectId = projectId;

    // 1. Generate Preview Image
    const previewData = await this.generatePreview(scraperScheme, step);
    const previewUrl = previewData.url;
    this.prices = this.prices.concat(previewData.price || []);

    // 2. Preprocess Audio and Captions (parallel)
    const preData = await step.run(
      "Processing audio and captions for all segments...",
      async () => {
        try {
          const { result, price } = await this.preprocessAudioAndCaptions(scraperScheme.segments);
          this.mediaMetadata = result;
          this.prices.push(...price);

          return {
            finish: true,
            mediaMetadata: result,
            prices: price,
          };
        } catch (err) {
          console.error("Audio/caption preprocessing error:", err);
          throw new Error("Audio and caption preprocessing failed");
        }
      },
    );
    // STEP 1A: Save audio + captions to BD
    this.mediaMetadata = preData.mediaMetadata || {};
    this.prices = this.prices.concat(preData.prices || []);

    // 3. Process Segments (media selection)
    const processedSegments: VideoSegment[] = [];
    for (const seg of scraperScheme.segments) {
      const { segmentResult, prices } = await this.processSegment(seg, scraperScheme, step);
      processedSegments.push(segmentResult);
      this.prices.push(...prices);
    }

    await this.segmentUpdater.finalize();

    return {
      preview: previewUrl,
      segResults: processedSegments,
      prices: this.prices,
    };
  }

  private async generatePreview(scraperScheme: LinkToVideoSchema, step: any) {
    return await step.run("Generating preview image...", async () => {
      const aspectSizes: Record<aspectRatioType, { width: number; height: number }> = {
        [aspectRatioType.SIXTEEN_NINE]: { width: 400, height: 225 },
        [aspectRatioType.NINE_SIXTEEN]: { width: 225, height: 400 },
        [aspectRatioType.ONE]: { width: 400, height: 400 },
      };
      const size = aspectSizes[scraperScheme.aspectRatio];

      const previewPrompt = buildScraperPreviewPrompt(
        scraperScheme.title,
        scraperScheme.prompt_preview,
        scraperScheme.visualStyle,
        scraperScheme.aspectRatio,
        !!scraperScheme.preview,
      );

      const styledPrompt = createStyledPrompt(previewPrompt, {
        styleDescription: scraperScheme.visualStyle,
      });

      const img = await this.imageGenerator.create({
        prompt: styledPrompt,
        aspectRatio: scraperScheme.aspectRatio,
        imageUrls: scraperScheme.preview ? [scraperScheme.preview] : [],
        options: { webp: true, resize: size },
      });

      const { buffer, extension } = await fileUrlToBuffer(img);
      const resizedBuffer = await adjustImageToCanvas(buffer, scraperScheme.aspectRatio);
      const uploadedUrl = await this.storage.uploadData(
        `VIDEOS/${this.generationId}/PREVIEW/${generateId()}.${extension}`,
        resizedBuffer,
      );

      this.prices.push({
        service: "Gemini-2.5",
        type: "nano banana",
        price: ServicePricing.GENERATE_GEMINI_V2_IMAGE,
      });

      // Update DB
      await db
        .updateTable("generations")
        .set({
          status: ResolverStatus.PROGRESS,
          progress: 1.5,
          preview_url: uploadedUrl,
        })
        .where("id", "=", this.generationId)
        .execute();

      return { url: uploadedUrl, price: this.prices };
    });
  }

  // --- Preprocess Audio + Captions (Parallel) ---
  private async preprocessAudioAndCaptions(segments: ScriptSegment[]): Promise<{
    result: Record<string, MediaMetadata>;
    price: PriceItem[];
  }> {
    const result: Record<string, MediaMetadata> = {};

    const promises = segments.map(async (seg, index) => {
      try {
        const audioUrl = await this.processTTS(seg);
        const { captionUrl, duration } = await this.processSTT(seg, audioUrl);

        // Calculate pause splits based on segment position
        const isFirstSegment = index === 0;
        const startPause = isFirstSegment ? VOICEOVER_INIT_PAUSE : VOICEOVER_PAUSE / 2;
        const endPause = VOICEOVER_PAUSE / 2;

        result[seg.id] = {
          audioUrl,
          captionUrl,
          duration: duration + startPause + endPause,
          originalDuration: duration,
          startPause,
          endPause,
        };
      } catch (err) {
        console.error(`Failed preprocessing segment ${seg.id}:`, err);
        throw err;
      }
    });

    await Promise.all(promises);

    const totalLength = segments.reduce((acc, obj) => acc + obj.text.length, 0);
    const costTTS = totalLength * ServicePricing.TEXT_TO_SPEECH;

    const totalAudioDuration = Object.values(result).reduce(
      (acc, segData) => acc + segData.originalDuration,
      0,
    );
    const costSTT = totalAudioDuration * ServicePricing.SPEECH_TO_TEXT;

    const price: PriceItem[] = [
      {
        service: "Elevenlabs",
        type: "text_to_speech",
        price: costTTS,
      },
      {
        service: "Deepgram",
        type: "speech_to_text",
        price: costSTT,
      },
    ];

    return { result, price };
  }

  // --- TTS: Generate Audio from Text ---
  private async processTTS(seg: ScriptSegment): Promise<string> {
    return await safeUpstashCall(async () => {
      const { success, buffer } = await this.tts.synthesize(seg.text, VOICE_ID);
      if (!success) throw new Error("TTS failed");

      const filePath = `VIDEOS/${this.generationId}/${seg.id}/AUDIO/${generateId()}.mp3`;
      const url = await this.storage.uploadData(filePath, Buffer.from(buffer));

      await this.persistAsset(filePath, url, {
        sourceType: "ai_generated",
        assetType: "audio",
        audioSubtype: "voiceover",
        originalFilename: `voice_${seg.id}.mp3`,
      });

      return url;
    });
  }

  // --- STT: Generate Captions + Duration ---
  private async processSTT(
    seg: ScriptSegment,
    audioUrl: string,
  ): Promise<{ captionUrl: string; duration: number }> {
    const { success, data } = await this.stt.transcribeV2(audioUrl);
    if (success && data?.duration) {
      const captionUrl = await this.storage.uploadJson(
        `VIDEOS/${this.generationId}/${seg.id}/CAPTION/${generateId()}.json`,
        data.transcript,
      );
      return { captionUrl, duration: data.duration };
    }
    const filePath = await downloadVideo(audioUrl, this.tmpDir);
    const speechData = await this.openai.transcribeAudioWithTimestamps(filePath);
    const transcript = buildMiniTranscribe(speechData, speechData.duration);
    const captionUrl = await this.storage.uploadJson(
      `VIDEOS/${this.generationId}/${seg.id}/CAPTION/${generateId()}.json`,
      transcript,
    );
    return { captionUrl, duration: speechData.duration };
  }

  private async processSegment(
    seg: ScriptSegment,
    scraperScheme: LinkToVideoSchema,
    step: any,
  ): Promise<{ segmentResult: VideoSegment; prices: PriceItem[] }> {
    return await step.run(`Processing segment ${seg.id}`, async () => {
      // Get pre-generated audio and captions
      const data = this.mediaMetadata[seg.id];
      if (!data) throw new Error(`Segment data missing for ID: ${seg.id}`);

      const { audioUrl, captionUrl, duration: targetDuration, originalDuration } = data;

      // Media Selection
      const generatedMedia: GeneratedMedia[] = [];
      let usedAISub = false;
      let currentDuration = 0;
      const prices: PriceItem[] = [];

      // 1. Video Processing Loop
      if (seg.media.videos && seg.media.videos.length > 0) {
        for (const rawVideo of seg.media.videos) {
          // Stop if remaining duration is <= VOICEOVER_PAUSE
          if (targetDuration - currentDuration <= VOICEOVER_PAUSE) break;

          let targetDir = "";
          try {
            const { buffer, extension } = await fileUrlToBuffer(rawVideo, "mp4");
            const tmpDir = os.tmpdir();

            // Directorio donde se va a guardar el archivo
            targetDir = `VIDEOS/${this.generationId}/${seg.id}/VIDEOS`;
            await fs.promises.mkdir(targetDir, { recursive: true });

            const filePath = path.join(targetDir, `${generateId()}.${extension}`);
            await fs.promises.writeFile(filePath, buffer);

            const resizedBuffer = await adjustVideoToCanvasBuffer(
              filePath,
              tmpDir,
              scraperScheme.aspectRatio as aspectRatioType,
            );

            const visualUrl = await this.storage.uploadData(filePath, resizedBuffer);

            // Get duration from video in milliseconds
            const { duration: clipDurationMs } = await getAudioInfo(filePath);
            const durationClip = clipDurationMs / 1000;

            await this.persistAsset(filePath, visualUrl, {
              sourceType: "user_uploaded",
              assetType: "video",
              originalFilename: `scraped_video_${seg.id}.${extension}`,
              duration: durationClip,
            });

            generatedMedia.push({
              type: "video",
              src: visualUrl,
              preview: "",
              filePath,
              duration: durationClip,
              startPause: generatedMedia.length === 0 ? data.startPause : 0,
            });

            currentDuration += durationClip;
          } catch (err) {
            console.warn(`Failed to use video ${rawVideo}`, err);
          } finally {
            if (targetDir) {
              try {
                await fs.promises.rm(targetDir, {
                  recursive: true,
                  force: true,
                });
              } catch (cleanupErr) {
                console.warn(`Failed to cleanup temp dir ${targetDir}`, cleanupErr);
              }
            }
          }
        }
      }

      // 2. Image Fallback Logic
      if (currentDuration < targetDuration) {
        const remaining = targetDuration - currentDuration;

        if (currentDuration > 0) {
          // Some videos were added, fill the gap with 1 image
          let imageUrl = "";
          let isAI = false;

          if (seg.media.images && seg.media.images.length > 0) {
            imageUrl = seg.media.images[0];
          } else {
            const styledPrompt = createStyledPrompt(seg.prompts.image, {
              styleDescription: scraperScheme.visualStyle,
            });
            imageUrl = await this.imageGenerator.create({
              prompt: styledPrompt,
              aspectRatio: scraperScheme.aspectRatio as aspectRatioType,
            });
            isAI = true;
          }

          try {
            const { buffer, extension } = await fileUrlToBuffer(imageUrl);
            const resizedBuffer = await adjustImageToCanvas(
              buffer,
              scraperScheme.aspectRatio as aspectRatioType,
            );
            const filePath = `VIDEOS/${this.generationId}/${seg.id}/IMAGE/${generateId()}.${extension}`;
            const visualUrl = await this.storage.uploadData(filePath, resizedBuffer);

            await this.persistAsset(filePath, visualUrl, {
              sourceType: isAI ? "ai_generated" : "user_uploaded",
              assetType: "image",
              originalFilename: `${isAI ? "ai" : "scraped"}_image_${seg.id}.${extension}`,
              duration: remaining,
            });

            const srcExpand = await this.expandImageIfEnabled(
              resizedBuffer,
              seg.id,
              remaining,
              prices,
            );

            generatedMedia.push({
              type: "image",
              src: visualUrl,
              preview: visualUrl,
              filePath: "",
              duration: remaining,
              startPause: generatedMedia.length === 0 ? data.startPause : 0,
              srcExpand,
            });

            if (isAI) usedAISub = true;
            currentDuration += remaining;
          } catch (err) {
            console.warn(`Failed to use fallback image`, err);
          }
        } else {
          // No videos were added
          if (seg.media.images && seg.media.images.length > 0) {
            const imagesToUse =
              seg.media.images.length === 1
                ? [seg.media.images[0]]
                : [seg.media.images[0], seg.media.images[1]];
            const clipDuration = targetDuration / imagesToUse.length;

            for (const rawImg of imagesToUse) {
              try {
                const { buffer, extension } = await fileUrlToBuffer(rawImg);
                const resizedBuffer = await adjustImageToCanvas(
                  buffer,
                  scraperScheme.aspectRatio as aspectRatioType,
                );
                const filePath = `VIDEOS/${this.generationId}/${seg.id}/IMAGE/${generateId()}.${extension}`;
                const visualUrl = await this.storage.uploadData(filePath, resizedBuffer);

                await this.persistAsset(filePath, visualUrl, {
                  sourceType: "user_uploaded",
                  assetType: "image",
                  originalFilename: `scraped_image_${seg.id}.${extension}`,
                  duration: clipDuration,
                });

                const srcExpand = await this.expandImageIfEnabled(
                  resizedBuffer,
                  seg.id,
                  clipDuration,
                  prices,
                );

                generatedMedia.push({
                  type: "image",
                  src: visualUrl,
                  preview: visualUrl,
                  filePath: "",
                  duration: clipDuration,
                  startPause: generatedMedia.length === 0 ? data.startPause : 0,
                  srcExpand,
                });
              } catch (err) {
                console.warn(`Failed to use image ${rawImg}`, err);
              }
            }
          } else {
            // No videos and no images, generate 1 AI image
            try {
              const styledPrompt = createStyledPrompt(seg.prompts.image, {
                styleDescription: scraperScheme.visualStyle,
              });
              const aiImg = await this.imageGenerator.create({
                prompt: styledPrompt,
                aspectRatio: scraperScheme.aspectRatio,
              });
              const { buffer, extension } = await fileUrlToBuffer(aiImg);
              const filePath = `VIDEOS/${this.generationId}/${seg.id}/IMAGE/${generateId()}.${extension}`;
              const visualUrl = await this.storage.uploadData(filePath, buffer);

              const srcExpand = await this.expandImageIfEnabled(
                buffer,
                seg.id,
                targetDuration,
                prices,
              );

              await this.persistAsset(filePath, visualUrl, {
                sourceType: "ai_generated",
                assetType: "image",
                originalFilename: `ai_image_${seg.id}.${extension}`,
                duration: targetDuration,
              });

              generatedMedia.push({
                type: "image",
                src: visualUrl,
                preview: visualUrl,
                filePath: "",
                duration: targetDuration,
                startPause: data.startPause,
                srcExpand,
              });
              usedAISub = true;
            } catch (err) {
              console.error(`Critical failure: AI image generation failed`, err);
            }
          }
        }
      }

      const segmentResult: VideoSegment = {
        id: seg.id,
        generatedMedia,
        captionUrl,
        audioUrl,
        duration: targetDuration,
        originalDuration,
        startPause: data.startPause,
        endPause: data.endPause,
      };

      await this.segmentUpdater.updateSegment(segmentResult);

      if (usedAISub) {
        prices.push({
          service: "Seedream-v4",
          type: "image",
          price: ServicePricing.GENERATE_SEEDREAM_IMAGE,
        });
      }

      return {
        segmentResult,
        prices,
      };
    });
  }

  private async expandImageIfEnabled(
    buffer: Buffer,
    segmentId: string,
    duration: number,
    prices: PriceItem[],
  ): Promise<string | undefined> {
    if (!this.expandImage) return undefined;

    try {
      const base64Image = buffer.toString("base64");
      const expandedUrl = await this.imageExpander.expand({
        image: base64Image,
      });

      const { buffer: expandedBuffer, extension: expandedExt } = await fileUrlToBuffer(expandedUrl);
      const expandedFilePath = `VIDEOS/${this.generationId}/${segmentId}/IMAGE/${generateId()}_expanded.${expandedExt}`;
      const expandedImageUrl = await this.storage.uploadData(expandedFilePath, expandedBuffer);

      await this.persistAsset(expandedFilePath, expandedImageUrl, {
        sourceType: "ai_generated",
        assetType: "image",
        originalFilename: `image_expanded_${segmentId}.${expandedExt}`,
        duration: duration,
      });

      prices.push({
        service: "Flux-Pro",
        type: "image-expand",
        price: ServicePricing.FLUX_EXPAND_IMAGE,
      });

      return expandedImageUrl;
    } catch (err) {
      console.error(`Failed to expand image for segment ${segmentId}:`, err);
      return undefined;
    }
  }
}
