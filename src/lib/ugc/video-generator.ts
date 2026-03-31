import { VideoGenerator } from "../video-generation";
import { config } from "../../inngest/config";
import { buildUgcPrompt, buildUgcNegativePrompt } from "@/lib/prompts";

export interface VideoGenerationParams {
  prompt?: string;
  firstFrameUrl?: string; // Initial frame image URL (first frame)
  lastFrameUrl?: string; // End frame image URL (last frame - next segment's first frame)
  avatarUrl?: string;
  productUrls?: string[];
  aspectRatio?: string;
  model?: string;
  text?: string;
  scenePrompt?: string;
  videoPrompt?: string;
}

/**
 * Generates a video using Google Veo 3.1 Fast via the unified VideoGenerator
 */
export async function generateUGCVideo(params: VideoGenerationParams): Promise<string> {
  const {
    prompt,
    firstFrameUrl,
    lastFrameUrl,
    aspectRatio = "9:16",
    text,
    scenePrompt,
    videoPrompt,
  } = params;

  const videoGenerator = new VideoGenerator({
    provider: "veo",
    params: {
      geminiApiKey: config.gemini.key,
    },
  });

  let finalPrompt = prompt?.trim() || "";
  if (!finalPrompt && (text || scenePrompt || videoPrompt)) {
    const prompt = buildUgcPrompt(text, videoPrompt, scenePrompt);
  }

  // Use the generated frame as primary reference, and lastFrameUrl as end frame
  const taskId = await videoGenerator.create({
    prompt: finalPrompt,
    negativePrompt: buildUgcNegativePrompt(),
    firstFrameUrl: firstFrameUrl || "",
    lastFrameUrl: lastFrameUrl, // End frame for smooth transition
    aspectRatio,
    style: "Cinematic", // Default style for Veo
  });

  return taskId;
}
