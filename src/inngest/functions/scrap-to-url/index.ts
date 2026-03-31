import { nanoid } from "nanoid";

import { ScraperVideoPipeline } from "./handler";

import { config } from "../../config";
import { VIDEO_STYLES } from "@/constants/video-styles";
import { AspectRatio } from "@/types/video-generation";
import { VideoSchema } from "@/types/segment";
import { SegmentUpdater } from "@/inngest/services/updater";
import { VOICE_ID } from "@/inngest/utils/constant";

import { db } from "@/lib/database";
import { projectQueries } from "@/lib/database/project-queries";
import { Schema } from "@/lib/schema-generator";
import { TtsService } from "@/lib/tts";
import { DistributedSemaphore } from "@/inngest/services/semaphore";
import { SttService } from "@/lib/transcribe/deepgram";
import { ImageGenerator } from "@/lib/image-generation";
import { ExpandImageService } from "@/lib/expand-image";
import { OpenAIService } from "@/lib/openai";
import { R2StorageService } from "@/lib/r2-storage";

import { generateId } from "@/utils/id";
import { aspectRatioType, ResolverStatus, VideoType } from "@/utils/enum";

import { scrapeUrl } from "./services/scraper";
import { generateUnifiedSchema } from "./services/generator";

export async function execLinkToVideo(
  url: string,
  generationId: string,
  aspectRatio: aspectRatioType,
  visualStyle: string,
  step: any, // Optional Inngest step
): Promise<VideoSchema> {
  // --- Initialize service instances ---
  const elevenLabsSemaphore = new DistributedSemaphore("elevenlabs:tts_slots", 5, 30000);

  const tts = new TtsService(
    config.elevenLabs.url,
    config.elevenLabs.key,
    config.elevenLabs.model,
    elevenLabsSemaphore,
  );

  const stt = new SttService(config.deepgram.url, config.deepgram.key, config.deepgram.model);

  const openaiTranscriber = new OpenAIService(config.openai.key, config.openai.transcriptionModel);

  const imageGenerator = new ImageGenerator({
    provider: "seedream45",
    params: {
      freepikUrl: config.freepik.url,
      freepikApiKey: config.freepik.key,
    },
  });

  const storage = new R2StorageService({
    bucketName: config.r2.bucket,
    accessKeyId: config.r2.accessKeyId,
    secretAccessKey: config.r2.secretAccessKey,
    accountId: config.r2.accountId,
    cdn: config.r2.cdn,
  });

  const imageExpander = new ExpandImageService(config.freepik.url, config.freepik.key);

  // 1. Scrape website
  const { scrapedData } = await step.run("Scrape website and extract media", async () => {
    console.log("🔍 Scraping website and extracting media...");
    const scrapedData = await scrapeUrl(url);

    console.log(
      `✅ Scraped! Found ${scrapedData.media.images.length} images and ${scrapedData.media.videos.length} videos.`,
    );

    return { scrapedData };
  });

  // 2. Generate Unified Schema
  const { scheme, chatPrice } = await step.run("Generate unified video schema", async () => {
    console.log("🤖 Generating AI script and matching media...");
    const { scheme, price } = await generateUnifiedSchema(scrapedData, storage, generationId);

    scheme.visualStyle =
      VIDEO_STYLES.find((s) => s.id === scheme.visualStyle)?.description ||
      "A style that closely mimics the visual appearance of reality, focusing on accuracy and detail.";

    // Save initial generation
    try {
      await db
        .updateTable("generations")
        .set({
          input: scheme,
          status: ResolverStatus.PROGRESS,
          progress: 1.5,
        })
        .where("id", "=", generationId)
        .execute();
    } catch (err) {
      console.warn("Generation already exists or failed to insert:", err);
      await db
        .updateTable("generations")
        .set({ status: ResolverStatus.PROGRESS, progress: 1.5 })
        .where("id", "=", generationId)
        .execute();
    }

    return { scheme, chatPrice: price };
  });

  //const scheme = schemea as LinkToVideoSchema;
  scheme.id = generationId;
  scheme.aspectRatio = aspectRatio;
  scheme.visualStyle = visualStyle;
  scheme.expandImage = false;

  let totalSegments = scheme.segments.length;
  const segmentUpdater = new SegmentUpdater(generationId, scheme.segments.length);

  const pipeline = new ScraperVideoPipeline(
    tts,
    stt,
    openaiTranscriber,
    imageGenerator,
    imageExpander,
    storage,
    segmentUpdater,
    generationId,
    scheme.expandImage || false,
  );

  const result = await pipeline.run(scheme, step);
  const { preview: previewUrl, segResults, prices } = result;

  scheme.preview = { refId: "previewId", src: previewUrl };

  // Publish pipeline complete
  const data = await step.run("Video generation complete, assembling final result", async () => {
    // --- Combine generated data back into scheme ---
    let totalDuration = 0;

    for (let i = 0; i < (scheme.segments || []).length; i++) {
      const seg = scheme.segments[i];
      const visual = segResults.find((v) => v.id === seg.id);

      // Only update if the visual result exists and was successful
      if (visual) {
        const segmentDuration = visual.duration * 1000; // convert seconds → ms
        const originalAudioDuration = visual.originalDuration * 1000;
        let segmentOffset = totalDuration;

        const updatedShots = visual.generatedMedia.map((c, clipIdx) => {
          const clipDuration = c.duration * 1000;
          const clipStartPause = clipIdx === 0 ? (c.startPause || 0) * 1000 : 0;

          const clipObj = {
            ...seg.shots?.[clipIdx],
            imageUrl: c.type === "image" ? c.src : c.preview,
            videoUrl: c.type === "video" ? c.src : undefined,
            duration: clipDuration,
            display: {
              from: segmentOffset,
              to: segmentOffset + clipStartPause + clipDuration,
            },
          };

          segmentOffset += clipStartPause + clipDuration;
          return clipObj;
        });

        const firstClipStartPause = (visual.generatedMedia[0]?.startPause || 0) * 1000;

        scheme.segments[i] = {
          ...seg,
          id: nanoid(),
          shots: updatedShots,
          duration: segmentDuration,
          textToSpeech: {
            refId: "textToSpeechId",
            src: visual.audioUrl,
            duration: originalAudioDuration,
            display: {
              from: totalDuration + firstClipStartPause,
              to: totalDuration + firstClipStartPause + originalAudioDuration,
            },
          },
          speechToText: {
            refId: "speechToTextId",
            src: visual.captionUrl,
            display: {
              from: totalDuration + firstClipStartPause,
              to: totalDuration + firstClipStartPause + originalAudioDuration,
            },
          },
        };

        totalDuration += segmentDuration;
      } else {
        console.warn(`Segment ${seg.id} was skipped — no visual result found.`);
      }
    }

    prices.push(chatPrice);
    const totalCost = prices.reduce((acc, obj) => acc + obj.price, 0);
    console.log("total cost: ", totalCost);

    // Publish completion progress
    await db
      .updateTable("generations")
      .set({
        metadata: { prices: { service: prices }, totalCost },
        preview_url: previewUrl,
        status: ResolverStatus.COMPLETED,
        progress: 100,
        output: JSON.stringify(scheme),
      })
      .where("id", "=", scheme.id)
      .execute();

    return { scheme, totalCost };
  });
  const finalScheme = data.scheme || {};

  return finalScheme;
}
