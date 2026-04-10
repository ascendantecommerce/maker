import { type StepContext } from "../../common/steps/types";
import { type PriceItem, type SegmentAsset, type VideoSegment, type MediaMetadata } from "@/inngest/utils/types";
import { generateImage, processAIVideoScenes } from "../../common/steps/visuals";
import { fileUrlToBuffer } from "../../common/utils/common";
import { persistAsset } from "../../common/steps/utils";
import { generateId } from "@/utils/id";
import { segmentQueries } from "@/lib/database/segment-queries";
import { ensureObject } from "../../common/services/utils";
import { type SegmentTiming } from "../../common/steps/timings";

/**
 * Granular Step: Generate Shot First Frames
 */
export async function generateShotFirstFrames(
  context: StepContext,
  userId: string | null,
  projectId: string | null,
): Promise<{ prices: PriceItem[]; segmentAssets: Record<string, SegmentAsset[]>; previewUrl?: string }> {
  const { scheme, services, schemeId } = context;
  const segments = scheme.segments;
  const prices: PriceItem[] = [];
  const segmentAssets: Record<string, SegmentAsset[]> = {};
  let previewUrl: string | undefined;

  const segmentUpdates: any[] = [];

  await Promise.all(
    segments.map(async (seg) => {
      if (!seg.shots?.length) return;

      const currentAssets: SegmentAsset[] = [];
      let segmentUpdated = false;

      await Promise.all(
        seg.shots.map(async (shot) => {
          if (shot.imageUrl) return;

          const isProductShot = shot.type === "product";
          const { imageUrl: img, price: imgPrice } = await generateImage(
            context,
            seg,
            isProductShot,
            shot.firstFramePrompt || "",
            shot.type,
          );

          const { buffer, extension } = await fileUrlToBuffer(img);
          const filePath = `VIDEOS/${schemeId}/${seg.id}/IMAGE/${generateId()}.${extension}`;
          const currentFrame = await services.storage.uploadData(filePath, buffer);

          shot.imageUrl = currentFrame;
          prices.push(imgPrice);
          segmentUpdated = true;

          const asset: SegmentAsset = {
            id: generateId(),
            type: "image",
            status: "completed",
            url: currentFrame,
            prompt: `${shot.type}-${shot.firstFramePrompt}`,
          };
          currentAssets.push(asset);

          if (!previewUrl) previewUrl = currentFrame;

          await persistAsset(userId, projectId, schemeId, filePath, currentFrame, {
            sourceType: "ai_generated",
            assetType: "image",
            originalFilename: `shot_frame_${seg.id}_${generateId()}.${extension}`,
          });
        }),
      );

      if (segmentUpdated) {
        segmentAssets[seg.id] = currentAssets;
        // Correctly update the assets array on the segment object so it is persisted in the database blob
        seg.assets = [...(seg.assets || []), ...currentAssets];
        
        segmentUpdates.push({
          id: seg.id,
          segment_data: JSON.parse(JSON.stringify(ensureObject(seg))),
        });
      }
    }),
  );

  if (segmentUpdates.length > 0) {
    console.log(`[PIPELINE] Bulk updating ${segmentUpdates.length} segments with first frames. Payload sample (first 100 chars): ${JSON.stringify(segmentUpdates[0]).substring(0, 100)}`);
    await segmentQueries.bulkUpdateSegments(segmentUpdates);
    console.log(`[PIPELINE] Bulk update successful for ${segmentUpdates.length} segments.`);
  }

  return { prices, segmentAssets, previewUrl };
}

/**
 * Granular Step: Generate Shot Videos
 */
export async function generateShotVideos(
  context: StepContext,
  mediaMetadata: Record<string, MediaMetadata>,
  segmentTimings: SegmentTiming[],
  userId: string | null,
  projectId: string | null,
): Promise<{
  segResults: VideoSegment[];
  prices: PriceItem[];
  usedVideoIds: number[];
  segmentAssets: Record<string, SegmentAsset[]>;
}> {
  // Use the robust common processAIVideoScenes logic
  const result = await processAIVideoScenes(
    context,
    mediaMetadata,
    segmentTimings,
    [],
    userId,
    projectId,
  );

  // similar how first frames are updating segment
  const segmentUpdates: any[] = [];
  result.segResults.forEach((seg) => {
    console.log(`[PIPELINE] Preparing bulk update for segment ${seg.id}. Shots: ${seg.shots?.length || 0}. Sample shot 0 videoUrl: ${seg.shots?.[0]?.videoUrl || 'NONE'}`);
    segmentUpdates.push({
      id: seg.id,
      segment_data: JSON.parse(JSON.stringify(ensureObject(seg))),
    });
  });

  if (segmentUpdates.length > 0) {
    console.log(`[PIPELINE] Bulk updating ${segmentUpdates.length} segments with video results.`);
    await segmentQueries.bulkUpdateSegments(segmentUpdates);
    console.log(`[PIPELINE] Bulk update successful for ${segmentUpdates.length} segments.`);
  }

  return result;
}

