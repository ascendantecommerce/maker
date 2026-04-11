import { StepContext } from "./types";
import {
  Segment,
  MediaMetadata,
  PriceItem,
  VideoSegment,
  VisualShot,
  GeneratedMedia,
  SegmentAsset,
} from "@/inngest/utils/types";
import { generateId } from "@/utils/id";
import { ServicePricing } from "@/inngest/utils/pricing";
import {
  downloadVideo,
  fileUrlToBuffer,
  getClosestResolutionMatch,
  selectVideoFromPexelsByDuration,
} from "@/inngest/functions/common/utils/common";
import { getLastFrameFromVideo, fixAndValidateMp4 } from "@/inngest/services/ffmpeg";
import { persistAsset } from "@/inngest/functions/common/steps/utils";
import { createStyledPrompt } from "@/lib/prompts";
import {
  ContinuityType,
  VideoType,
  resolutionType,
  aspectRatioType,
  PexelsOrientation,
} from "@/utils/enum";
import { VIDEO_THRESHOLD } from "@/inngest/utils/constant";
import { roundUp3 } from "@/utils/common";
import { SegmentUpdater } from "@/inngest/services/updater";
import fs from "fs";
import path from "path";
import os from "os";
import { convertMsToSeconds } from "@/inngest/utils/common";
import { SegmentTiming } from "@/inngest/functions/common/steps/timings";

export const generateImage = async (
  context: StepContext,
  seg: Segment,
  isProduct: boolean = false,
  promptOverride?: string,
  shotType?: "lifestyle" | "medical_cgi" | "metaphor" | "product" | "generic" | "b-roll" | "character-speaking",
): Promise<{ imageUrl: string; price: PriceItem }> => {
  if (!promptOverride) {
    throw new Error(`Prompt is required for image generation in segment ${seg.id}`);
  }

  const { scheme, services } = context;
  const imageUrls = isProduct && scheme.assets?.length ? scheme.assets.map((a: any) => a.url) : [];

  const styledPrompt = createStyledPrompt(promptOverride, {
    styleDescription: scheme.visuals.style,
    aspectRatio: scheme.aspectRatio as aspectRatioType,
    isProduct,
    shotType,
  });
  console.log("GENERATE-IMAGE", styledPrompt);

  if (!isProduct) {
    const imageUrl = await services.imageGenerator.create({
      prompt: styledPrompt,
      aspectRatio: scheme.aspectRatio,
    });
    return {
      imageUrl,
      price: { service: "Seedream", type: "4.5", price: ServicePricing.GENERATE_SEEDREAM_45_IMAGE },
    };
  }

  const imageUrl = await services.imageGenerator.create({
    prompt: styledPrompt,
    aspectRatio: scheme.aspectRatio,
    imageUrls,
  });
  return {
    imageUrl,
    price: {
      service: "Gemini-2.5",
      type: "image_to_image",
      price: ServicePricing.GENERATE_GEMINI_V2_IMAGE,
    },
  };
};

const getVideoPricing = (
  resolution: resolutionType,
  attempt: number,
  duration: number,
): PriceItem => {
  const isHigh = resolution === resolutionType.High;
  const isRetry = attempt > 1;

  const service = !isRetry ? "PixeVerse" : isHigh ? "Hailuo" : "Wan_2.2";
  const type = isHigh ? "video_1080" : "video_720";

  const basePrice = !isRetry
    ? isHigh
      ? ServicePricing.GENERATE_VIDEO_HIGH
      : ServicePricing.GENERATE_VIDEO_LOW
    : isHigh
      ? ServicePricing.GENERATE_VIDEO_HIGH_V2
      : ServicePricing.GENERATE_VIDEO_LOW_V2;

  const price = service === "Hailuo" ? basePrice : basePrice * duration;
  return { service, type, price };
};

export const generateVideoClip = async (
  context: StepContext,
  params: {
    seg: Segment;
    imageUrl: string | undefined;
    duration: number;
    tmpDir: string;
    promptOverride?: string;
    isProduct?: boolean;
  },
): Promise<{ videoPath: string; price: PriceItem; duration: number }> => {
  if (!params.promptOverride) {
    throw new Error(`Prompt is required for video generation in segment ${params.seg.id}`);
  }

  const { scheme, attempt, services } = context;
  const { resolution } = scheme;

  const snappedDuration = params.duration <= 4 ? 4 : params.duration <= 6 ? 6 : 8;

  const payload = {
    prompt: params.promptOverride,
    style: scheme.visuals.style,
    firstFrameUrl: params.imageUrl,
    durationSeconds: snappedDuration,
    aspectRatio: scheme.aspectRatio,
  };

  let videoUrl = "";
  let actualDurationSeconds: number = snappedDuration;

  const result = await services.videoGenerator.create(payload);
  if (typeof result === "string") {
    videoUrl = result;
  } else {
    videoUrl = result.url;
    actualDurationSeconds = result.duration;
  }

  let videoPath: string | undefined;
  const MAX_RETRIES = 3;

  for (let attemptCount = 1; attemptCount <= MAX_RETRIES; attemptCount++) {
    try {
      let tempPath = await downloadVideo(videoUrl, params.tmpDir);
      tempPath = await fixAndValidateMp4(tempPath);
      if (!tempPath || !fs.existsSync(tempPath)) throw new Error(`Invalid video file: ${tempPath}`);
      videoPath = tempPath;
      break;
    } catch (err) {
      if (attemptCount === MAX_RETRIES)
        throw new Error(`Video generation failed after ${MAX_RETRIES} attempts.`);
      await new Promise((res) => setTimeout(res, 800));
    }
  }

  if (!videoPath) throw new Error("Video file not found after retries.");

  const pricingEntry = !params.isProduct
    ? getVideoPricing(resolution, attempt, params.duration)
    : { service: "Veo-3.1", type: "video ad", price: ServicePricing.GENERATE_VEO_3_1_VIDEO };

  return { videoPath, price: pricingEntry, duration: actualDurationSeconds * 1000 };
};

const processStockVideoSegment = async (
  context: StepContext,
  seg: Segment,
  audioUrl: string,
  captionUrl: string,
  duration: number,
  originalDuration: number,
  tmpDir: string,
  usedVideoIds: number[],
  startPause: number,
) => {
  const { scheme, services, schemeId } = context;
  let resolution = { width: 1080, height: 1080 };
  let position = PexelsOrientation.SQUARE;

  if (scheme.resolution === resolutionType.Low) {
    if (scheme.aspectRatio === aspectRatioType.ONE) resolution = { width: 720, height: 720 };
    else if (scheme.aspectRatio === aspectRatioType.NINE_SIXTEEN) {
      resolution = { width: 720, height: 1280 };
      position = PexelsOrientation.PORTRAIT;
    } else if (scheme.aspectRatio === aspectRatioType.SIXTEEN_NINE) {
      resolution = { width: 1280, height: 720 };
      position = PexelsOrientation.LANDSCAPE;
    }
  } else if (scheme.resolution === resolutionType.High) {
    if (scheme.aspectRatio === aspectRatioType.ONE) resolution = { width: 1080, height: 1080 };
    else if (scheme.aspectRatio === aspectRatioType.NINE_SIXTEEN) {
      resolution = { width: 1080, height: 1920 };
      position = PexelsOrientation.PORTRAIT;
    } else if (scheme.aspectRatio === aspectRatioType.SIXTEEN_NINE) {
      resolution = { width: 1920, height: 1080 };
      position = PexelsOrientation.LANDSCAPE;
    }
  }

  const { videos } = await services.pexels.searchVideos({
    query: seg.tags?.join(",") || "",
    orientation: position,
    per_page: 30,
  });

  let assetVid: SegmentAsset = {
    id: generateId(),
    type: "video",
    status: "generating",
    prompt: seg.tags?.join(",") || "",
  };
  const video = selectVideoFromPexelsByDuration(videos, convertMsToSeconds(duration), usedVideoIds);
  if (!video) throw new Error("Video not exist");
  usedVideoIds.push(video.id);

  const pexVideo = await services.pexels.getVideoDownloadUrl(video.id);
  const closedVideo = getClosestResolutionMatch(pexVideo.video_files, resolution);

  let videoPath: string | undefined;
  const MAX_RETRIES = 3;

  for (let attemptCount = 1; attemptCount <= MAX_RETRIES; attemptCount++) {
    try {
      let tempPath = await downloadVideo(closedVideo.link, tmpDir);
      tempPath = await fixAndValidateMp4(tempPath);
      if (!tempPath || !fs.existsSync(tempPath)) throw new Error(`Invalid video file: ${tempPath}`);
      videoPath = tempPath;
      break;
    } catch (err) {
      if (attemptCount === MAX_RETRIES)
        throw new Error(`Video generation failed after ${MAX_RETRIES} attempts.`);
      await new Promise((res) => setTimeout(res, 800));
    }
  }

  if (!videoPath) throw new Error("Video file not found after retries.");

  assetVid = { ...assetVid, url: videoPath, status: "completed" };
  let previewSrc = video.image;
  if (video.image) {
    const { buffer, extension } = await fileUrlToBuffer(video.image);
    const filePath = `VIDEOS/${schemeId}/${seg.id}/PREVIEW/${generateId()}.${extension}`;
    previewSrc = await services.storage.uploadData(filePath, buffer);
  }

  return {
    id: seg.id,
    generatedMedia: [
      {
        type: "video" as const,
        src: "",
        filePath: videoPath,
        preview: previewSrc,
        duration,
        startPause,
      },
    ],
    caption: captionUrl,
    audio: audioUrl,
    duration,
    originalDuration,
    excludeVideoIds: usedVideoIds,
    prices: [{ service: "Pexels", type: "stock_video", price: ServicePricing.STOCK_VIDEOS }],
    assets: [assetVid],
  };
};

const processAIImageSegment = async (
  context: StepContext,
  seg: Segment,
  audioUrl: string,
  captionUrl: string,
  duration: number,
  originalDuration: number,
  segmentTiming: SegmentTiming,
  tmpDir: string,
  startPause: number,
) => {
  const generatedMedia: GeneratedMedia[] = [];
  const prices: PriceItem[] = [];
  let assets = new Array<SegmentAsset>();
  if (!seg.shots || seg.shots.length === 0)
    throw new Error(`No shots found for segment ${seg.id}.`);
  const imagesToGenerate = seg.shots.length;
  const subSegments = seg.shots.map((shot: VisualShot) => ({
    text: shot.words || "",
    prompt: shot.firstFramePrompt || "",
    isProduct: shot.type === "product",
  }));

  const shotDurations = segmentTiming.clips;

  for (let i = 0; i < imagesToGenerate; i++) {
    let previewUrl = "";
    let imagePath = "";
    const currentPrompt = subSegments[i].prompt;
    const isProduct = subSegments[i].isProduct;
    const clipDuration = shotDurations[i].duration;
    const shotType = seg.shots[i].type;

    let imgPrice;
    imagePath = seg.shots[i].imageUrl || "";
    
    if (!imagePath) {
      throw new Error(`First frame missing for shot ${i} in segment ${seg.id}. Ensure Stage 6 (First Frames) has run.`);
    }

    // Since Stage 6 generated the image but it's likely a URL, we need to ensure it's in tmpDir for assembly
    if (imagePath.startsWith("http")) {
      const { buffer, extension } = await fileUrlToBuffer(imagePath);
      const localPath = path.join(tmpDir, `IMAGE/${generateId()}.${extension}`);
      await fs.promises.mkdir(path.dirname(localPath), { recursive: true });
      await fs.promises.writeFile(localPath, buffer);
      imagePath = localPath;
    }

    if (imgPrice) prices.push(imgPrice);

    assets.push({
      id: generateId(),
      type: "image",
      status: "completed",
      url: imagePath,
      prompt: `${shotType}-${currentPrompt}`,
    });
    generatedMedia.push({
      type: "image",
      src: previewUrl,
      srcExpand: undefined,
      filePath: imagePath,
      preview: previewUrl,
      duration: clipDuration,
      startPause: i === 0 ? startPause : 0,
    });
  }

  return {
    id: seg.id,
    generatedMedia,
    caption: captionUrl,
    audio: audioUrl,
    duration,
    originalDuration,
    excludeVideoIds: [],
    prices,
    assets,
  };
};

const processAIVideoSegment = async (
  context: StepContext,
  seg: Segment,
  audioUrl: string,
  captionUrl: string,
  duration: number, // milliseconds
  originalDuration: number, // milliseconds
  segmentTiming: SegmentTiming,
  withVisuals: boolean,
  tmpDir: string,
  startPause: number, // milliseconds
  endPause: number, // milliseconds
  prevFrame?: string,
  firstFrames?: Record<string, string>,
) => {
  const { schemeId, scheme, services } = context;
  const config = scheme;
  let assets = new Array<SegmentAsset>();
  if (!seg.shots?.length) throw new Error("Shots not found");

  const generatedMediaResult: GeneratedMedia[] = [];
  const prices: PriceItem[] = [];

  const clips = segmentTiming.clips;
  let totalDurationMs = duration;

  for (let idx = 0; idx < seg.shots.length; idx++) {
    const shot = seg.shots[idx];
    let clipDurationMs = clips[idx].duration;
    let clipDurationSec = convertMsToSeconds(clipDurationMs);
    clipDurationSec = roundUp3(clipDurationSec);

    const isProductShot = shot.type === "product";

    let currentFrame = shot.imageUrl;
    if (!currentFrame) {
      throw new Error(`First frame missing for shot ${idx} in segment ${seg.id}. Ensure Stage 6 (First Frames) has run.`);
    }

    // Ensure local copy for video generation / assembly
    if (currentFrame.startsWith("http")) {
      const { buffer, extension } = await fileUrlToBuffer(currentFrame);
      const filePath = path.join(tmpDir, `IMAGE/${generateId()}.${extension}`);
      await fs.promises.mkdir(path.dirname(filePath), { recursive: true });
      await fs.promises.writeFile(filePath, buffer);
      currentFrame = filePath;
    }

    const combinedVideoPrompt =
      `${shot.videoPrompt || ""}. ${shot.scenePrompt || ""}`.trim() || shot.words || "";

    if (context.scheme.visuals.type === VideoType.AI_VIDEOS) {
      try {
        let assetVid: SegmentAsset = {
          id: generateId(),
          type: "video",
          status: "generating",
          prompt: combinedVideoPrompt,
        };

        // Determine min duration based on shot duration. 
        // User requested minimum 4s for Veo/Luma even for short shots.
        const requestedDuration = Math.max(4, clipDurationSec);

        console.log(`[VISUALS_TRACE] Calling generateVideoClip for shot ${idx} of segment ${seg.id}. Requested Duration: ${requestedDuration}s`);
        const { videoPath, price, duration: actualFileDuration } = await generateVideoClip(context, {
          seg,
          imageUrl: currentFrame,
          duration: requestedDuration,
          tmpDir,
          promptOverride: combinedVideoPrompt,
          isProduct: isProductShot,
        });

        console.log(`[VISUALS_TRACE] Generator returned local path: ${videoPath}. Actual Duration: ${actualFileDuration}ms`);
        shot.videoUrl = videoPath;
        assetVid = { ...assetVid, url: videoPath, status: "completed" };

        generatedMediaResult.push({
          type: "video",
          src: "",
          filePath: videoPath,
          preview: currentFrame,
          duration: actualFileDuration,
          startPause: idx === 0 ? startPause : 0,
        });

        prices.push(price);
        assets.push(assetVid);
      } catch (error: any) {
        console.error(`[VISUALS_ERROR] Video generation failed for shot ${idx} of segment ${seg.id}. Falling back to image.`, error);
        generatedMediaResult.push({
          type: "image",
          src: "",
          filePath: currentFrame,
          preview: currentFrame,
          duration: clipDurationMs,
          startPause: idx === 0 ? startPause : 0,
        });
      }
    } else {
      // AI_IMAGES: emit an image clip for this duration
      generatedMediaResult.push({
        type: "image",
        src: "",
        filePath: currentFrame,
        preview: currentFrame,
        duration: clipDurationMs,
        startPause: idx === 0 ? startPause : 0,
      });
    }

    totalDurationMs -= clipDurationMs;

    // Fill logic for the last shot to match perfect segment duration
    if (totalDurationMs > 0 && !seg.shots[idx + 1]) {
      generatedMediaResult.push({
        type: "image",
        src: "",
        filePath: currentFrame,
        preview: currentFrame,
        duration: totalDurationMs,
        startPause: 0,
      });
    }
  }


  return {
    id: seg.id,
    generatedMedia: generatedMediaResult,
    caption: captionUrl,
    audio: audioUrl,
    excludeVideoIds: [],
    duration,
    originalDuration,
    prices,
    assets,
  };
};

const groupByScenes = (segments: Segment[]): Segment[][] => {
  const groups: Segment[][] = [];
  let current: Segment[] = [];
  for (const seg of segments) {
    if (seg.continuity !== ContinuityType.Continue) {
      if (current.length) groups.push(current);
      current = [seg];
    } else {
      current.push(seg);
    }
  }
  if (current.length) groups.push(current);
  return groups;
};

const internalProcessScenes = async (
  context: StepContext,
  mediaMetadata: Record<string, MediaMetadata>,
  segmentTimings: SegmentTiming[],
  usedVideoIds: number[],
  userId: string | null,
  projectId: string | null,
  sceneProcessor: (
    seg: Segment,
    tmpDir: string,
    withVisuals: boolean,
    prevFrame?: string,
    firstFrames?: Record<string, string>,
  ) => Promise<any>,
): Promise<{
  segResults: VideoSegment[];
  prices: PriceItem[];
  usedVideoIds: number[];
  segmentAssets: Record<string, SegmentAsset[]>;
}> => {
  const { schemeId, services, scheme } = context;
  const config = scheme;
  const segments = scheme.segments;
  const segmentUpdater = new SegmentUpdater(schemeId, segments.length);
  const tmpDir = os.tmpdir();
  const sceneGroups = groupByScenes(segments);
  const segmentIndexMap = new Map<string, number>();
  segments.forEach((seg, index) => segmentIndexMap.set(seg.id, index));

  const segResults: VideoSegment[] = [];
  const prices: PriceItem[] = [];
  const segmentAssets: Record<string, SegmentAsset[]> = {};
  const errors: string[] = [];
  const firstFrames: Record<string, string> = {};

  const scenePromises = sceneGroups.map(async (scene) => {
    const sceneResults: VideoSegment[] = [];
    const segPrice: PriceItem[] = [];
    let prevFrame: string | undefined = undefined;

    for (let i = 0; i < scene.length; i++) {
      const seg = scene[i];
      const withVisuals = i === 0;

      if (!mediaMetadata[seg.id]) {
        console.warn(`[VISUALS] Skipping segment ${seg.id} - Missing mediaMetadata`);
        continue;
      }

      try {
        const visualResult = await sceneProcessor(
          seg,
          tmpDir,
          withVisuals,
          prevFrame,
          firstFrames,
        );

        for (let idx = 0; idx < (visualResult.generatedMedia || []).length; idx++) {
          try {
            const clip = visualResult.generatedMedia[idx];
            const buffer = fs.readFileSync(clip.filePath!);
            const asset = visualResult.assets?.find((a: any) => a.url === clip.filePath);

            const extension = path.extname(clip.filePath!).toLowerCase();
            const r2Path = `VIDEOS/${schemeId}/${visualResult.id}/VIDEOS/${generateId()}${extension}`;
            const uploaded = await services.storage.uploadData(r2Path, buffer);

            if (asset) asset.url = uploaded;

            await persistAsset(userId, projectId, schemeId, r2Path, uploaded, {
              sourceType:
                config.visuals.type === VideoType.STOCK_VIDEOS ? "user_uploaded" : "ai_generated",
              assetType: config.visuals.type === VideoType.AI_IMAGES ? "image" : "video",
              originalFilename: `segment_${visualResult.id}${extension}`,
              duration: visualResult.duration,
            });

            visualResult.generatedMedia[idx].src = uploaded;

            if (seg.shots && seg.shots[idx]) {
              if (visualResult.generatedMedia[idx].type === "image") {
                console.log(`[VISUALS] Mapping imageUrl to shot ${idx} of segment ${seg.id}: ${uploaded}`);
                seg.shots[idx].imageUrl = uploaded;
              } else {
                console.log(`[VISUALS] Mapping videoUrl to shot ${idx} of segment ${seg.id}: ${uploaded}`);
                seg.shots[idx].videoUrl = uploaded;
              }
              console.log(`[VISUALS] Shot ${idx} updated. Current videoUrl: ${seg.shots[idx].videoUrl || 'NONE'}`);
            } else {
              console.warn(`[VISUALS] No shot found at index ${idx} for segment ${seg.id}`);
            }
          } catch (err) {
            console.error(`[VISUALS] Upload failed for clip ${idx}:`, err);
          }
        }

        usedVideoIds.push(...(visualResult.excludeVideoIds || []));

        const segmentResult: VideoSegment = {
          id: visualResult.id,
          generatedMedia: visualResult.generatedMedia,
          captionUrl: visualResult.caption,
          audioUrl: visualResult.audio,
          duration: visualResult.duration,
          originalDuration: visualResult.originalDuration,
          startPause: mediaMetadata[visualResult.id].startPause,
          endPause: mediaMetadata[visualResult.id].endPause,
          assets: visualResult.assets,
          shots: seg.shots,
        };

        console.log(`[VISUALS] Passing segment ${segmentResult.id} to SegmentUpdater. Shots: ${segmentResult.shots?.length || 0}. Sample shot 0 videoUrl: ${segmentResult.shots?.[0]?.videoUrl || 'NONE'}`);
        await segmentUpdater.updateSegment(segmentResult);
        segPrice.push(...visualResult.prices);
        segmentAssets[seg.id] = visualResult.assets || [];

        if (segmentResult.generatedMedia?.length && scene[i + 1]) {
          const lastClip = segmentResult.generatedMedia[segmentResult.generatedMedia.length - 1];
          const lastVideoPath = lastClip.filePath!;
          const lastFrameBuffer = await getLastFrameFromVideo(lastVideoPath, tmpDir);
          if (lastFrameBuffer) {
            const framePath = `VIDEOS/${schemeId}/${segmentResult.id}/IMAGE/${generateId()}.png`;
            prevFrame = await services.storage.uploadData(framePath, lastFrameBuffer);
            await persistAsset(userId, projectId, schemeId, framePath, prevFrame, {
              sourceType: "ai_generated",
              assetType: "image",
              originalFilename: `frame_${segmentResult.id}.png`,
            });
          }
        }
        sceneResults.push(segmentResult);
      } catch (err: any) {
        errors.push(`Segment ${seg.id} failed: ${err.message}`);
        if (err.message.includes("limit of the free trial usage")) {
          throw new Error(`CRITICAL: Provider limit reached. ${err.message}`);
        }
      }
    }
    return { sceneResults, prices: segPrice };
  });

  const allSceneResults = await Promise.all(scenePromises);
  allSceneResults.forEach(({ sceneResults, prices: p }) => {
    segResults.push(...sceneResults);
    prices.push(...p);
  });

  segResults.sort((a, b) => (segmentIndexMap.get(a.id) ?? 0) - (segmentIndexMap.get(b.id) ?? 0));
  await segmentUpdater.finalize();

  if (segResults.length === 0 && segments.length > 0) {
    throw new Error(`Failed to generate visual clips. Errors: ${errors.join(" | ")}`);
  }

  return { segResults, prices, usedVideoIds: [...new Set(usedVideoIds)], segmentAssets };
};

export const processAIImageScenes = (
  context: StepContext,
  mediaMetadata: Record<string, MediaMetadata>,
  segmentTimings: SegmentTiming[],
  userId: string | null,
  projectId: string | null,
) => internalProcessScenes(context, mediaMetadata, segmentTimings, [], userId, projectId, 
  async (seg, tmpDir) => {
    const data = mediaMetadata[seg.id];
    return processAIImageSegment(
      context, seg, data.audioUrl, data.captionUrl, data.duration, data.originalDuration,
      segmentTimings.find(t => t.id === seg.id)!, tmpDir, data.startPause
    );
  }
);

export const processAIVideoScenes = (
  context: StepContext,
  mediaMetadata: Record<string, MediaMetadata>,
  segmentTimings: SegmentTiming[],
  usedVideoIds: number[],
  userId: string | null,
  projectId: string | null,
) => internalProcessScenes(context, mediaMetadata, segmentTimings, usedVideoIds, userId, projectId,
  async (seg, tmpDir, withVisuals, prevFrame, firstFrames) => {
    const data = mediaMetadata[seg.id];
    return processAIVideoSegment(
      context, seg, data.audioUrl, data.captionUrl, data.duration, data.originalDuration,
      segmentTimings.find(t => t.id === seg.id)!, withVisuals, tmpDir, data.startPause,
      data.endPause, prevFrame, firstFrames
    );
  }
);

export const processStockVideoScenes = (
  context: StepContext,
  mediaMetadata: Record<string, MediaMetadata>,
  segmentTimings: SegmentTiming[],
  usedVideoIds: number[],
  userId: string | null,
  projectId: string | null,
) => internalProcessScenes(context, mediaMetadata, segmentTimings, usedVideoIds, userId, projectId,
  async (seg, tmpDir, withVisuals, prevFrame) => {
    const data = mediaMetadata[seg.id];
    return processStockVideoSegment(
      context, seg, data.audioUrl, data.captionUrl, data.duration, data.originalDuration,
      tmpDir, usedVideoIds, data.startPause
    );
  }
);
