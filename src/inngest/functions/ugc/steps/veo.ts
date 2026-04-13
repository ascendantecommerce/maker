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

  type WaveItem = {
    segment: any;
    isExpand: boolean;
    previousSegmentDbId: string | null;
    mode: "first frame to video" | "reference to video";
    needsPreviousFrame: boolean;
    firstFrameSource: "avatar" | "last_frame" | "none";
    isProductShot: boolean;
    isFirstProductMention: boolean;
  };

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
        segment: seg,
        isExpand: isContinuation,
        previousSegmentDbId: isContinuation ? group[index - 1].id : null,
        mode,
        needsPreviousFrame,
        firstFrameSource,
        isProductShot,
        isFirstProductMention,
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

export const generateAndUploadVeo = async ({
  segData,
  isExpand,
  previousSegmentDbId,
  globalIndex,
  videoUrlByDbId,
  avatarUrl,
  productUrls,
  schemaId,
  segmentId,
  schema,
  services,
  mode,
  firstFrameSource,
  isProductShot,
  isFirstProductMention,
}: {
  segData: Segment;
  isExpand: boolean;
  previousSegmentDbId: string | null;
  globalIndex: number;
  videoUrlByDbId: Record<string, string | null>;
  avatarUrl?: string;
  productUrls: string[];
  schemaId: string;
  segmentId: string;
  schema: VideoSchema;
  services: UgcServices;
  mode: "first frame to video" | "reference to video";
  firstFrameSource: "avatar" | "last_frame" | "none";
  isProductShot: boolean;
  isFirstProductMention: boolean;
}) => {
  const { videoGenerator, gemini, r2 } = services;
  const MAX_RETRIES = 3;
  let retryCount = 0;
  let rawVideoUrl: string | null = null;

  while (retryCount < MAX_RETRIES && !rawVideoUrl) {
    try {
      const estimatedDuration = segData.estimatedDuration ?? 5;
      let durationSeconds = getClosestVeoDuration(estimatedDuration);

      const currentShot = segData.shots?.[0];
      let finalPrompt = buildUgcPrompt(segData.text ?? "", "", "");
      if (currentShot) {
        finalPrompt = buildUgcPrompt(
          segData.text ?? "",
          currentShot.videoPrompt,
          currentShot.scenePrompt,
          currentShot.productSizing,
        );
      }

      let useFirstFrame = mode === "first frame to video";
      let useReferences = mode === "reference to video";

      let firstFrameUrlToUse: string | undefined = undefined;
      let referenceImageUrlsToUse: string[] | undefined = undefined;
      let lastFrameUrlToUse: string | undefined = undefined;

      // Track the initial duration to fallback properly if continuity fails
      const initialDurationSeconds = durationSeconds;

      if (useFirstFrame) {
        if (firstFrameSource === "avatar") {
          console.log(`[Veo] Using avatarUrl as firstFrame for segment: ${segmentId}`);
          firstFrameUrlToUse = avatarUrl;
        } else if (firstFrameSource === "last_frame") {
          // The orchestrator pre-extracts the last frame PNG from the previous segment's result
          // and passes it here via videoUrlByDbId. Use it directly — no re-ffmpeg needed.
          const preExtractedLastFrameUrl = previousSegmentDbId
            ? videoUrlByDbId[previousSegmentDbId]
            : null;

          if (preExtractedLastFrameUrl) {
            console.log(
              `[Veo] Continuity mode: using pre-extracted last frame for segment: ${segmentId}`,
            );
            firstFrameUrlToUse = preExtractedLastFrameUrl;
            lastFrameUrlToUse = avatarUrl;
            durationSeconds = 8; // Continuity interpolation forces 8s generation

            // Verify product visibility in the pre-extracted frame
            if (isProductShot) {
              const productDescription = (schema as any)?.product?.description ?? "";
              const visibility = await gemini.checkProductVisibility(
                firstFrameUrlToUse,
                productDescription,
              );

              const isClearlyVisible = visibility.isVisible && visibility.confidence > 0.7;

              if (!isClearlyVisible) {
                console.log(
                  `[Veo] Product NOT clearly visible in last frame (Confidence: ${visibility.confidence}). Applying fallback...`,
                );

                const originalEstimatedDuration =
                  (segData as any).originalEstimatedDuration ?? estimatedDuration;

                if (originalEstimatedDuration > 4.5) {
                  // Fallback to Reference Mode for longer product shots
                  console.log(`[Veo] Falling back to Reference Mode.`);
                  useFirstFrame = false;
                  useReferences = true;
                  firstFrameUrlToUse = undefined;
                  lastFrameUrlToUse = undefined;
                  durationSeconds = 8;
                } else {
                  // Transform short product shot to Generic talking head
                  console.log(`[Veo] Transforming short product shot to Generic talking head.`);
                  firstFrameUrlToUse = avatarUrl;
                  lastFrameUrlToUse = undefined;
                  durationSeconds = initialDurationSeconds;
                }
              }
            }
          } else {
            console.warn(
              `[Veo] Continuation expected but no pre-extracted frame found. Using avatar.`,
            );
            firstFrameUrlToUse = avatarUrl;
            lastFrameUrlToUse = undefined;
            durationSeconds = initialDurationSeconds;
          }
        } else {
          firstFrameUrlToUse = avatarUrl;
        }

        // If we ended up using the Avatar as first frame but it was a product-heavy shot,
        // we MUST rewrite the prompt to a generic talking head to prevent hallucinations.
        if (firstFrameUrlToUse === avatarUrl && isProductShot && currentShot) {
          console.log(`[Veo] Rewriting prompt to Generic for avatar-based first frame.`);
          const avatarDescription =
            (schema as any)?.avatar?.description ?? "A professional avatar speaker";
          const productDesc = (schema as any)?.product?.description ?? "";
          const rewrittenVideoPrompt = await gemini.rewriteToGenericPrompt(
            currentShot,
            avatarDescription,
            productDesc,
          );
          finalPrompt = buildUgcPrompt(
            segData.text,
            rewrittenVideoPrompt,
            currentShot?.scenePrompt,
            "",
          );
        }
      }

      if (useReferences) {
        referenceImageUrlsToUse = [...(avatarUrl ? [avatarUrl] : []), ...productUrls];
        durationSeconds = 8; // Reference injections also force 8s
      }

      console.log({
        segmentId,
        mode: useFirstFrame ? "first-frame" : "references",
        durationSeconds,
        hasFirstFrame: !!firstFrameUrlToUse,
        hasReferences: !!referenceImageUrlsToUse,
        firstFrameUrlToUse,
        lastFrameUrlToUse,
      });

      console.log({ finalPrompt });

      const negativePrompt = buildUgcNegativePrompt();
      const generatorOutput = await videoGenerator.create({
        prompt: finalPrompt,
        negativePrompt,
        style: "Cinematic",
        aspectRatio: (schema as any).aspect_ratio ?? "9:16",
        durationSeconds,
        firstFrameUrl: firstFrameUrlToUse,
        lastFrameUrl: lastFrameUrlToUse,
        referenceImageUrls: referenceImageUrlsToUse,
      });
      rawVideoUrl = typeof generatorOutput === "string" ? generatorOutput : generatorOutput.url;
    } catch (e: any) {
      retryCount++;
      console.error(
        `[Veo Retry ${retryCount}/${MAX_RETRIES}] Failed to generate segment ${segmentId}:`,
        e.message,
      );
      if (retryCount >= MAX_RETRIES) {
        throw new Error(
          `Failed to generate segment ${segmentId} after ${MAX_RETRIES} attempts. Last error: ${e.message}`,
        );
      }
      await new Promise((r) => setTimeout(r, 5000));
    }
  }

  if (!rawVideoUrl) {
    throw new Error(
      `Veo failed to generate for segment ${segmentId} after ${MAX_RETRIES} attempts.`,
    );
  }

  const [meta, data] = rawVideoUrl.split(",");
  if (!meta || !data) throw new Error("Invalid base64 video format");
  const contentTypeMatch = meta.match(/data:(.*?);base64/);
  const contentType = contentTypeMatch ? contentTypeMatch[1] : "video/mp4";
  const buffer = Buffer.from(data, "base64");
  const fileName = `ugc-videos/${schemaId}/${segmentId}/raw-${nanoid()}.mp4`;

  return {
    rawR2Url: await r2.uploadData(fileName, buffer, contentType),
  };
};

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
    updatePayload.shots[0] = {
      ...originalShot,
      videoUrl: finalR2Url,
      duration: actualDuration,
      display: { from: 0, to: actualDuration },
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
 * 1. call video generator
 * 2. isolates voice using phonos api
 * 3. uploads it and return originalUrl and improved url and other needed params
 */
export async function generateUgcVideo({
  segData,
  isExpand,
  previousSegmentDbId,
  globalIndex,
  videoUrlByDbId,
  avatarUrl,
  productUrls,
  schemaId,
  segmentId,
  schema,
  services,
  mode,
  firstFrameSource,
  isProductShot,
  isFirstProductMention,
}: {
  segData: Segment;
  isExpand: boolean;
  previousSegmentDbId: string | null;
  globalIndex: number;
  videoUrlByDbId: Record<string, string | null>;
  avatarUrl?: string;
  productUrls: string[];
  schemaId: string;
  projectId: string;
  segmentId: string;
  schema: VideoSchema;
  services: UgcServices;
  mode: "first frame to video" | "reference to video";
  firstFrameSource: "avatar" | "last_frame" | "none";
  isProductShot: boolean;
  isFirstProductMention: boolean;
  runToken: string;
  phonosSemaphore: any;
}) {
  const estimatedDurationInit = segData.estimatedDuration ?? 5;
  const targetDuration = 7.5; // Max target duration

  // Apply fillers if it's reference mode OR continuity mode (last_frame interpolation) and shorter than 6.75s
  const isShortReferenceMode = mode === "reference to video" && estimatedDurationInit < 6.75;
  const isShortContinuityMode = firstFrameSource === "last_frame" && estimatedDurationInit < 6.75;
  const needsFiller = isShortReferenceMode || isShortContinuityMode;

  let localSegData = { ...segData };

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

    const modeName = isShortContinuityMode ? "continuity" : "reference";
    console.log(
      `[Veo] Padding short ${modeName} video script [${estimatedDurationInit}s]. Adding ~${fillerSecondsNeeded}s filler to hit ~7.5s.`,
    );

    const trimmedBase = localSegData.text?.trim() ?? "";
    const textWithDot = trimmedBase.endsWith(".") ? trimmedBase : `${trimmedBase}.`;
    localSegData.text = `${textWithDot} ${selectedFiller}`;
    localSegData.estimatedDuration = estimatedDurationInit + fillerSecondsNeeded; // Override so orchestration recognizes the bump
  }

  (localSegData as any).originalEstimatedDuration = estimatedDurationInit;

  // 1. Generate the video
  const { rawR2Url } = await generateAndUploadVeo({
    segData: localSegData,
    isExpand,
    previousSegmentDbId,
    globalIndex,
    videoUrlByDbId,
    avatarUrl,
    productUrls,
    schemaId,
    segmentId,
    schema,
    services,
    mode,
    firstFrameSource,
    isProductShot,
    isFirstProductMention,
  });

  // 2. Isolate voice, trim, extract last frame, and re-transcribe
  const processedVideo = await transcribeAndTrimVeoVideo({
    rawR2Url,
    schemaId,
    segmentId,
    expectedText: segData.text,
    tts: services.tts,
  });

  // lastFrameUrl is extracted inside transcribeAndTrimVeoVideo from the in-memory trimmed buffer,
  // avoiding a redundant network download.
  const { finalR2Url, actualDuration, tsUrl, lastFrameUrl, isolatedVideoUrl } = processedVideo;

  // 3. Return everything needed
  return {
    rawR2Url, // The original video without isolation
    isolatedVideoUrl, // The raw untrimmed video with the isolated voice
    lastFrameUrl,
    finalTrimmedUrl: finalR2Url, // This applies the isolated audio video BUT correctly trimmed!
    actualDuration,
    tsUrl,
  };
}
