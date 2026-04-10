import os from "os";
import path from "path";
import fs from "fs";
import { GoogleGenAI, Image, VideoGenerationReferenceType } from "@google/genai";
import { VideoParams, VideoStatusResponse } from "./types";
import { Generator } from "./interface";
import { aspectRatioType } from "@/utils/enum";
import { fileUrlToBuffer } from "@/utils/download";
import { generateId } from "@/utils/id";

export class VeoProvider implements Generator {
  private gemini: GoogleGenAI;
  private geminiApiKey: string;
  private readonly MAX_POLL_ATTEMPTS = 100;

  private model?: string;

  constructor(config: { geminiApiKey: string; resolution?: string; model?: string }) {
    this.gemini = new GoogleGenAI({ apiKey: config.geminiApiKey });
    this.geminiApiKey = config.geminiApiKey;
    this.model = config.model;
  }

  async create(params: VideoParams): Promise<string> {
    const operationName = await this.submitVeoTask(params);
    return this.pollVeoTask(operationName);
  }

  private async submitVeoTask(params: VideoParams): Promise<string> {
    const aspectRatio = params.aspectRatio || aspectRatioType.NINE_SIXTEEN;
    let imagePart: Image | undefined = undefined;

    if (params.firstFrameUrl) {
      const { buffer, contentType } = await fileUrlToBuffer(params.firstFrameUrl);
      imagePart = {
        imageBytes: buffer.toString("base64"),
        mimeType: contentType,
      };
    }

    const finalPrompt = params.prompt?.trim() || "";
    const combinedReferenceImages = [...(params.referenceImages || [])];

    if (params.referenceImageUrls?.length) {
      for (const url of params.referenceImageUrls) {
        try {
          const { buffer, contentType } = await fileUrlToBuffer(url);
          combinedReferenceImages.push({
            image: { imageBytes: buffer.toString("base64"), mimeType: contentType },
            referenceType: VideoGenerationReferenceType.ASSET,
          });
        } catch (error) {
          console.error(`Failed to process reference image URL ${url}:`, error);
        }
      }
    }

    const cappedReferenceImages = combinedReferenceImages.slice(0, 3);
    const hasFinalReferences = cappedReferenceImages.length > 0;

    let finalImagePart = imagePart;
    if (hasFinalReferences && imagePart) {
      cappedReferenceImages.unshift({
        image: imagePart,
        referenceType: VideoGenerationReferenceType.ASSET,
      });
      finalImagePart = undefined;
    }

    const finalCappedReferences = cappedReferenceImages.slice(0, 3);
    const usesReferences = finalCappedReferences.length > 0;

    let lastFramePart: Image | undefined = undefined;
    if (params.lastFrameUrl) {
      try {
        const { buffer, contentType } = await fileUrlToBuffer(params.lastFrameUrl);
        lastFramePart = {
          imageBytes: buffer.toString("base64"),
          mimeType: contentType,
        };
      } catch (error) {
        console.error(`Failed to process last frame URL ${params.lastFrameUrl}:`, error);
      }
    }

    const usesReferencesOrImages = usesReferences || !!finalImagePart || !!lastFramePart;
    let finalPromptToUse = finalPrompt;
    let finalNegativePrompt: string | undefined = params.negativePrompt;

    if (usesReferencesOrImages && params.negativePrompt) {
      finalPromptToUse += `\n\nNEGATIVE PROMPT: ${params.negativePrompt}`;
      finalNegativePrompt = undefined;
    }

    const supportedVeoDurations = [4, 6, 8];
    const rawDuration = params.durationSeconds || 4;
    const snappedDuration =
      usesReferences || lastFramePart
        ? 8
        : supportedVeoDurations.find((d) => d >= rawDuration) || 8;

    const payload: any = {
      model: this.model || "veo-3.1-fast-generate-preview",
      prompt: finalPromptToUse,
      ...(finalImagePart ? { image: finalImagePart } : {}),
      config: {
        aspectRatio: aspectRatio,
        negativePrompt: finalNegativePrompt,
        referenceImages: usesReferences ? finalCappedReferences : undefined,
        durationSeconds: snappedDuration,
        ...(lastFramePart ? { lastFrame: lastFramePart } : {}),
      },
    };

    console.log(
      `[Veo] Submitting task (Duration: ${snappedDuration}s):`,
      JSON.stringify(
        payload,
        (key, value) => {
          if (typeof value === "string" && value.length > 50) {
            return value.substring(0, 10) + "... (truncated)";
          }
          return value;
        },
        2,
      ),
    );

    const operation = await this.gemini.models.generateVideos(payload);
    if (!operation.name) throw new Error("Failed to get operation name from Gemini");
    return operation.name;
  }

  async getStatus(operationName: string): Promise<VideoStatusResponse> {
    const url = `https://generativelanguage.googleapis.com/v1beta/${operationName}?key=${this.geminiApiKey}`;
    const response = await fetch(url);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to get Gemini operation status: ${response.status} - ${errorText}`);
    }

    const operation = await response.json();
    if (!operation.done) return { id: operationName, status: "IN_PROGRESS", videos: [] };
    if (operation.error)
      return { id: operationName, status: "FAILED", videos: [], error: operation.error.message };

    let videoRef = operation.response?.generatedVideos?.[0]?.video;
    if (!videoRef)
      videoRef = operation.response?.generateVideoResponse?.generatedSamples?.[0]?.video;
    if (!videoRef) throw new Error("Veo generation failed: No video returned");

    const tempDir = os.tmpdir();
    const downloadPath = path.join(tempDir, `veo_${generateId()}.mp4`);

    try {
      if (videoRef.uri?.startsWith("http")) {
        const videoRes = await fetch(videoRef.uri, {
          headers: { "x-goog-api-key": this.geminiApiKey },
        });
        if (!videoRes.ok) throw new Error(`Failed to download video from URI: ${videoRes.status}`);
        const videoBuffer = Buffer.from(await videoRes.arrayBuffer());
        await fs.promises.writeFile(downloadPath, videoBuffer);
      } else {
        await this.gemini.files.download({ file: videoRef, downloadPath });
      }

      const videoBuffer = await fs.promises.readFile(downloadPath);
      const base64 = videoBuffer.toString("base64");
      await fs.promises.unlink(downloadPath).catch(() => {});
      console.log(`[VEO_TRACE] Task ${operationName} completed and downloaded successfully. Base64 length: ${base64.length}`);
      return {
        id: operationName,
        status: "COMPLETED",
        videos: [`data:video/mp4;base64,${base64}`],
      };
    } catch (err: any) {
      console.error(`[VEO_ERROR] Failed to download or process generated video:`, err);
      throw new Error(`Failed to download or process generated video: ${err.message}`);
    }
  }

  private async pollVeoTask(operationName: string): Promise<string> {
    let attempts = 0;
    while (attempts < this.MAX_POLL_ATTEMPTS) {
      attempts++;
      try {
        const result = await this.getStatus(operationName);
        console.log(`⏳ [Veo] Attempt ${attempts} - Status: ${result.status}`);
        if (result.status === "COMPLETED") return result.videos[0];
        if (result.status === "FAILED") {
          console.error(`[VEO_ERROR] Task failed on attempt ${attempts}: ${result.error}`);
          throw new Error(`Veo task failed: ${result.error}`);
        }
      } catch (error) {
        console.error(`⚠️ [Veo] getStatus failed (attempt ${attempts}):`, error);
        if (attempts >= 4) throw new Error(`Veo polling failed: 4 consecutive errors: ${error instanceof Error ? error.message : String(error)}`);
      }
      await new Promise((resolve) => setTimeout(resolve, 15000));
    }
    throw new Error(`Veo task timed out after ${attempts} attempts`);
  }
}
