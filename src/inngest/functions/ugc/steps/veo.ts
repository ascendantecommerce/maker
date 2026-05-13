import { nanoid } from "nanoid";
import { db } from "@/lib/database";
import { buildUgcPrompt, buildUgcNegativePrompt } from "@/lib/prompts";
import { getLastFrameFromVideo } from "../../../services/ffmpeg";
import { UgcServices } from "../index";
import * as os from "os";
import * as fs from "fs";
import * as path from "path";
import { Segment, VideoSchema } from "@/types/segment";
import { transcribeAndTrimVeoVideo } from "@/inngest/services/veo-video-processor";

// Veo 3.1 supports 4s, 6s, 8s. Pick closest.
export const getClosestVeoDuration = (estimatedDuration: number) => {
  if (estimatedDuration <= 5) return 4;
  if (estimatedDuration <= 7) return 6;
  return 8;
};

export interface VeoInput {
  prompt: string;
  negativePrompt?: string;
  durationSeconds: number;
  aspectRatio: string;
  firstFrameUrl?: string;
  lastFrameUrl?: string;
  referenceImageUrls?: string[];
}

export interface UgcVideoRequest {
  text: string;
  estimatedDuration: number;
  shot?: {
    videoPrompt?: string;
    scenePrompt?: string;
  };
  isProductShot: boolean;
  mode: "first frame to video" | "reference to video";
  firstFrameSource: "avatar" | "last_frame" | "none";
  avatarUrl?: string;
  productUrls: string[];
  aspectRatio: string;
  schemaId: string;
  segmentId: string;
  previousSegmentDbId: string | null;
  videoUrlByDbId: Record<string, string | null>;
  productDescription?: string;
}

export type WaveItem = {
  segmentId: string; // The database ID (segment.id)
  segData: any; // The segment_data object
  previousSegmentDbId: string | null;
  mode: "first frame to video" | "reference to video";
  needsPreviousFrame: boolean;
  firstFrameSource: "avatar" | "last_frame" | "none";
  isProductShot: boolean;
};

export function buildGenerationPlan(sortedSegments: any[]) {
  const waveGroups: any[][] = [];
  let currentGroup: any[] = [];
  let productMentionedInWaves = false;

  for (const seg of sortedSegments) {
    const segData = seg.segment_data as any;
    const currentShot = segData.shots?.[0];
    const estimatedDuration = segData.estimatedDuration ?? 5;
    const isProductShot =
      currentShot?.type === "product" || currentShot?.hasProductInteraction !== false;

    // Detect dependency needs:
    // Priority 1: schema explicitly flags this as a continuation of a sentence/paragraph.
    // Priority 2: implicit continuity for product shots in the 4.5-6s duration range.
    let willNeedPreviousFrame = false;
    if (segData.isContinuation === true) {
      // Explicit continuation -> always group with previous regardless of duration
      willNeedPreviousFrame = true;
    } else if (isProductShot) {
      if (!productMentionedInWaves) {
        // First product mention uses Reference mode -> no dependency
        willNeedPreviousFrame = false;
      } else if (estimatedDuration > 6) {
        // Long product shot uses Reference mode -> no dependency
        willNeedPreviousFrame = false;
      } else if (estimatedDuration < 4.5) {
        // Short product shot uses Avatar mode -> no dependency
        willNeedPreviousFrame = false;
      } else {
        // Non-first product shot between 4.5-6s uses Continuity -> HAS DEPENDENCY
        willNeedPreviousFrame = true;
      }
    } else {
      // Generic shots currently always use Avatar mode -> no dependency
      willNeedPreviousFrame = false;
    }

    if (currentGroup.length === 0) {
      currentGroup = [seg];
      if (isProductShot) productMentionedInWaves = true;
      continue;
    }

    let shouldGroup = false;

    // RULE: Only group if the current segment HAS a dependency on the previous one.
    // Also respect max 2 segments per wave.
    if (currentGroup.length < 2 && willNeedPreviousFrame) {
      shouldGroup = true;
    } else {
      shouldGroup = false;
    }

    if (shouldGroup) {
      currentGroup.push(seg);
    } else {
      waveGroups.push(currentGroup);
      currentGroup = [seg];
    }

    if (isProductShot) productMentionedInWaves = true;
  }
  if (currentGroup.length > 0) waveGroups.push(currentGroup);


  let productMentionedForMapping = false;

  const waves: WaveItem[][] = waveGroups.map((group) =>
    group.map((seg, index) => {
      const segData = seg.segment_data as any;
      const estimatedDuration = segData.estimatedDuration ?? 5;
      const isContinuation = index > 0;
      const currentShot = segData.shots?.[0];
      const isProductShot =
        currentShot?.type === "product" || currentShot?.hasProductInteraction !== false;

      let isFirstProductMention = false;
      if (isProductShot && !productMentionedForMapping) {
        isFirstProductMention = true;
        productMentionedForMapping = true;
      }

      let mode: "first frame to video" | "reference to video" = "first frame to video";
      let firstFrameSource: "avatar" | "last_frame" | "none" = "avatar";
      let needsPreviousFrame = false;

      // RULE PRIORITIES (highest to lowest)
      if (segData.isContinuation === true && index > 0) {
        // Rule 0 (Highest): Explicit schema continuation -> always use last frame of previous clip
        mode = "first frame to video";
        firstFrameSource = "last_frame";
        needsPreviousFrame = true;
      } else if (isFirstProductMention) {
        // Rule 1: First product mention -> References
        mode = "reference to video";
        firstFrameSource = "none";
        needsPreviousFrame = false;
      } else if (!isProductShot) {
        // Rule 2: No product -> Avatar talking head
        mode = "first frame to video";
        firstFrameSource = "avatar";
        needsPreviousFrame = false;
      } else if (estimatedDuration < 4.5) {
        // Rule 3: Short product shot < 4.5s -> Avatar (isContinuation already handled above)
        mode = "first frame to video";
        firstFrameSource = "avatar";
        needsPreviousFrame = false;
      } else if (isProductShot && estimatedDuration > 6) {
        // Rule 4: Product shot > 6s -> References
        mode = "reference to video";
        firstFrameSource = "none";
        needsPreviousFrame = false;
      } else if (isContinuation) {
        // Fallthrough (Implicit Continuity): 4.5-6s, product mentioned, not first time
        mode = "first frame to video";
        firstFrameSource = "last_frame";
        needsPreviousFrame = true;
      } else {
        // Default: Start of scene, not first mention, 4.5-6s
        mode = "first frame to video";
        firstFrameSource = "avatar";
        needsPreviousFrame = false;
      }

      return {
        segmentId: seg.id,
        segData,
        previousSegmentDbId: isContinuation ? group[index - 1].id : null,
        mode,
        needsPreviousFrame,
        firstFrameSource,
        isProductShot,
      };
    }),
  );

  return { waves };
}

/**
 * Extracts the last frame of a video from a given URL and uploads it to R2.
 */
export const extractLastFrameFromVideoUrl = async ({
  videoUrl,
  schemaId,
  segmentId,
  services,
}: {
  videoUrl: string;
  schemaId: string;
  segmentId: string;
  services: UgcServices;
}) => {
  const { r2 } = services;
  console.log(`[Veo] Extracting last frame from: ${videoUrl}`);

  const response = await fetch(videoUrl);
  const buffer = Buffer.from(await response.arrayBuffer());

  const tempDir = os.tmpdir();
  const downloadedFileName = `temp-extract-${nanoid()}.mp4`;
  const downloadedPath = path.join(tempDir, downloadedFileName);
  fs.writeFileSync(downloadedPath, buffer);

  try {
    const lastFrameBuffer = await getLastFrameFromVideo(downloadedPath, tempDir);
    const lastFrameR2Name = `ugc-videos/${schemaId}/${segmentId}/last-frame-${nanoid()}.png`;
    const lastFrameUrl = await r2.uploadData(lastFrameR2Name, lastFrameBuffer, "image/png");

    return { lastFrameUrl };
  } finally {
    if (fs.existsSync(downloadedPath)) {
      fs.unlinkSync(downloadedPath);
    }
  }
};

export async function generateVeoVideoRaw({
  input,
  services,
  schemaId,
  segmentId,
}: {
  input: VeoInput;
  services: UgcServices;
  schemaId: string;
  segmentId: string;
}) {
  const { videoGenerator, r2 } = services;

  const generatorOutput = await videoGenerator.create({
    prompt: input.prompt,
    negativePrompt: input.negativePrompt || buildUgcNegativePrompt(),
    style: "Cinematic",
    aspectRatio: input.aspectRatio,
    durationSeconds: input.durationSeconds,
    firstFrameUrl: input.firstFrameUrl,
    lastFrameUrl: input.lastFrameUrl,
    referenceImageUrls: input.referenceImageUrls,
  });

  const rawVideoUrl = typeof generatorOutput === "string" ? generatorOutput : generatorOutput.url;

  if (!rawVideoUrl) {
    throw new Error(`Veo failed to generate for segment ${segmentId}`);
  }

  // Handle base64 or URL
  let buffer: Buffer;
  let contentType = "video/mp4";

  if (rawVideoUrl.startsWith("data:")) {
    const [meta, data] = rawVideoUrl.split(",");
    if (!meta || !data) throw new Error("Invalid base64 video format");
    const contentTypeMatch = meta.match(/data:(.*?);base64/);
    contentType = contentTypeMatch ? contentTypeMatch[1] : "video/mp4";
    buffer = Buffer.from(data, "base64");
  } else {
    const response = await fetch(rawVideoUrl);
    if (!response.ok) throw new Error(`Failed to download video from ${rawVideoUrl}`);
    const arrayBuffer = await response.arrayBuffer();
    buffer = Buffer.from(arrayBuffer);
    contentType = response.headers.get("content-type") || "video/mp4";
  }

  const fileName = `ugc-videos/${schemaId}/${segmentId}/raw-${nanoid()}.mp4`;
  const rawR2Url = await r2.uploadData(fileName, buffer, contentType);

  return { rawR2Url };
}

export async function resolveVeoGenerationStrategy(
  request: UgcVideoRequest,
  services: UgcServices
): Promise<VeoInput> {
  const { gemini } = services;
  let durationSeconds = getClosestVeoDuration(request.estimatedDuration);
  const initialDurationSeconds = durationSeconds;

  let finalPrompt = buildUgcPrompt(
    request.text ?? "",
    request.shot?.videoPrompt ?? "",
    request.shot?.scenePrompt ?? ""
  );

  let useFirstFrame = request.mode === "first frame to video";
  let useReferences = request.mode === "reference to video";

  let firstFrameUrlToUse: string | undefined = undefined;
  let referenceImageUrlsToUse: string[] | undefined = undefined;
  let lastFrameUrlToUse: string | undefined = undefined;

  if (useFirstFrame) {
    if (request.firstFrameSource === "avatar") {
      firstFrameUrlToUse = request.avatarUrl;
    } else if (request.firstFrameSource === "last_frame") {
      const preExtractedLastFrameUrl = request.previousSegmentDbId
        ? request.videoUrlByDbId[request.previousSegmentDbId]
        : null;

      if (preExtractedLastFrameUrl) {
        firstFrameUrlToUse = preExtractedLastFrameUrl;
        lastFrameUrlToUse = request.avatarUrl;
        durationSeconds = 8;

        if (request.isProductShot) {
          const visibility = await gemini.checkProductVisibility(
            firstFrameUrlToUse,
            request.productDescription ?? ""
          );

          if (!visibility.isVisible || visibility.confidence < 0.7) {
            if (request.estimatedDuration > 4.5) {
              useFirstFrame = false;
              useReferences = true;
              firstFrameUrlToUse = undefined;
              lastFrameUrlToUse = undefined;
              durationSeconds = 8;
            } else {
              firstFrameUrlToUse = request.avatarUrl;
              lastFrameUrlToUse = undefined;
              durationSeconds = initialDurationSeconds;
            }
          }
        }
      } else {
        firstFrameUrlToUse = request.avatarUrl;
        durationSeconds = initialDurationSeconds;
      }
    } else {
      firstFrameUrlToUse = request.avatarUrl;
    }

    // Simplified Prompt Fallback instead of Gemini rewrite
    if (firstFrameUrlToUse === request.avatarUrl && request.isProductShot) {
      console.log(`[Veo] Using simple avatar fallback prompt for segment: ${request.segmentId}`);
      finalPrompt = `A professional avatar speaker speaks the following dialogue: ${request.text}`;
    }
  }

  if (useReferences) {
    referenceImageUrlsToUse = [
      ...(request.avatarUrl ? [request.avatarUrl] : []),
      ...request.productUrls,
    ];
    durationSeconds = 8;
  }

  return {
    prompt: finalPrompt,
    durationSeconds,
    aspectRatio: request.aspectRatio,
    firstFrameUrl: firstFrameUrlToUse,
    lastFrameUrl: lastFrameUrlToUse,
    referenceImageUrls: referenceImageUrlsToUse,
  };
}

export const updateVeoSegmentInDb = async ({
  segmentDbId,
  segData,
  finalR2Url,
  tsUrl,
  actualDuration,
}: {
  segmentDbId: string;
  segData: Segment;
  finalR2Url: string;
  tsUrl?: string;
  actualDuration: number;
}) => {
  const prompt =
    (segData.shots?.length ?? 0) > 0
      ? buildUgcPrompt(
          segData.text ?? "",
          segData.shots![0].videoPrompt,
          segData.shots![0].scenePrompt,
        )
      : buildUgcPrompt(segData.text ?? "", "", "");
  const assetId = nanoid();

  const existingAssets = (segData.assets ?? []).map((a: any) => ({
    ...a,
    active: a.type === "video" ? false : a.active,
  }));
  const updatedAssets = [
    ...existingAssets,
    {
      id: assetId,
      type: "video",
      videoUrl: finalR2Url,
      status: "completed",
      active: true,
      prompt,
    },
  ];

  const freshSeg = await db
    .selectFrom("segments")
    .select("segment_data")
    .where("id", "=", segmentDbId)
    .executeTakeFirst();

  const currentSegData = freshSeg ? (freshSeg.segment_data as any) : segData;

  const updatePayload: any = {
    ...currentSegData,
    assets: updatedAssets,
    estimatedDuration: actualDuration,
  };

  if (updatePayload.shots && updatePayload.shots.length > 0) {
    const originalShot = updatePayload.shots[0];
    const durationMs = actualDuration * 1000;
    updatePayload.shots[0] = {
      ...originalShot,
      videoUrl: finalR2Url,
      duration: durationMs,
      display: { from: 0, to: durationMs },
      prompt: originalShot.prompt || originalShot.videoPrompt || originalShot.scenePrompt || "",
      category: originalShot.category || "Avatar",
      words: originalShot.words || segData.text || "",
    };
  }

  if (tsUrl) {
    updatePayload.speechToText = { src: tsUrl, type: "json" };
  }

  await db
    .updateTable("segments")
    .set({
      segment_data: updatePayload,
      updated_at: new Date(),
    })
    .where("id", "=", segmentDbId)
    .execute();
};

/**
 * Unified function for generating 1 video:
 * 1. Resolves generation strategy (prompts, frames, durations)
 * 2. Calls video generator and uploads raw result to R2
 * 3. Isolates voice, trims, and re-transcribes the result
 */
export async function generateUgcVideo({
  request,
  services,
}: {
  request: UgcVideoRequest;
  services: UgcServices;
}) {
  const estimatedDurationInit = request.estimatedDuration ?? 5;
  const targetDuration = 7.75; // Aim close to 8s

  const needsFiller = estimatedDurationInit < 6.75;

  let localRequest = { ...request };

  if (needsFiller) {
    const timeToFillSeconds = Math.max(0, targetDuration - estimatedDurationInit);

    // Pick the closest filler phrase length (1 to 4 seconds)
    const fillerSecondsNeeded = Math.min(Math.max(Math.round(timeToFillSeconds), 1), 4);

    let selectedFiller = "";
    switch (fillerSecondsNeeded) {
      case 1:
        selectedFiller = "Yeah, exactly."; // ~1 sec
        break;
      case 2:
        selectedFiller = "Mhm. Yeah, exactly."; // ~2 sec
        break;
      case 3:
        selectedFiller = "Right. I mean, yeah, exactly."; // ~3 sec
        break;
      case 4:
        selectedFiller = "Hmm, alright. I mean, yeah, exactly."; // ~4 sec
        break;
      default:
        selectedFiller = "Yeah, exactly.";
        break;
    }

    console.log(
      `[Veo] Padding short video script [${estimatedDurationInit}s]. Adding ~${fillerSecondsNeeded}s filler to hit ~${targetDuration}s.`,
    );

    const trimmedBase = localRequest.text?.trim() ?? "";
    const textWithDot = trimmedBase.endsWith(".") ? trimmedBase : `${trimmedBase}.`;
    localRequest.text = `${textWithDot} ${selectedFiller}`;
    localRequest.estimatedDuration = estimatedDurationInit + fillerSecondsNeeded; // Override so orchestration recognizes the bump
  }

  // 1. Resolve Strategy
  const veoInput = await resolveVeoGenerationStrategy(localRequest, services);

  // 2. Generate the video
  const { rawR2Url } = await generateVeoVideoRaw({
    input: veoInput,
    services,
    schemaId: request.schemaId,
    segmentId: request.segmentId,
  });

  // 3. Isolate voice, trim, extract last frame, and re-transcribe
  const processedVideo = await transcribeAndTrimVeoVideo({
    rawR2Url,
    schemaId: request.schemaId,
    segmentId: request.segmentId,
    expectedText: localRequest.text,
    tts: services.tts,
  });

  const { finalR2Url, actualDuration, tsUrl, lastFrameUrl, isolatedVideoUrl } = processedVideo;

  // 4. Return everything needed
  return {
    rawR2Url, // The original video without isolation
    isolatedVideoUrl, // The raw untrimmed video with the isolated voice
    lastFrameUrl,
    finalTrimmedUrl: finalR2Url, // This applies the isolated audio video BUT correctly trimmed!
    actualDuration,
    tsUrl,
  };
}
