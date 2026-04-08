import {
  VideoSegment,
  PriceItem,
  SegmentAsset,
  MediaMetadata,
  VisualShot,
} from "@/inngest/utils/types";
import { SegmentTiming } from "@/inngest/functions/common/steps/timings";
import { VisualBroll } from "@/types/segment";
import { generateId } from "@/utils/id";
import { StepContext } from "./types";

export const assembleFinalVideo = async (
  context: StepContext,
  mediaMetadata: Record<string, MediaMetadata>,
  visuals: VideoSegment[],
  bRollMap: Record<string, VisualBroll[]>,
  segmentTimings: SegmentTiming[],
  pricing: PriceItem[],
  extraAssets: Record<string, SegmentAsset[]>[],
  prePrice: PriceItem,
  previewUrl?: string,
) => {
  const { scheme } = context;
  let totalDuration = 0;
  const visualsMap = new Map<string, VideoSegment>();
  visuals?.forEach((v) => visualsMap.set(v.id, v));

  for (let i = 0; i < (scheme.segments || []).length; i++) {
    const seg = scheme.segments[i];
    const visual = visualsMap.get(seg.id);

    const segmentBRolls = bRollMap[seg.id] || [];
    const segTimings = segmentTimings.find((t) => t.id === seg.id);

    if (segmentBRolls.length > 0 && segTimings) {
      scheme.segments[i].bRolls = segmentBRolls.map((b, idx) => {
        const matchingTiming = segTimings.bRolls.find((bt) => bt.originalBRollIndex === idx);

        return {
          ...b,
          display: matchingTiming
            ? {
                from: matchingTiming.display.from,
                to: matchingTiming.display.to,
              }
            : {
                from: (b.time || 0),
                to: (b.time || 0) + (b.duration || 0),
              },
        };
      });
    }

    const extraSegmentAssets = extraAssets.flatMap((mapping) => mapping[seg.id] || []);
    const projectAssets = extraAssets.flatMap((mapping) => mapping[scheme.id] || []);

    if (visual) {
      scheme.segments[i].assets = [
        ...(visual.assets || []),
        ...extraSegmentAssets,
        ...(i === 0 ? projectAssets : []),
      ];
    }

    if (visual && visual.generatedMedia && visual.generatedMedia.length > 0) {
      const segmentDuration = mediaMetadata[scheme.segments[i].id].duration;
      const originalAudioDuration = visual.originalDuration || visual.duration;

      const startPauseMs = mediaMetadata[scheme.segments[i].id].startPause || 0;

      const updatedShots =
        seg.shots?.map((shot: VisualShot, shotIdx: number) => {
          const clip = visual.generatedMedia?.[shotIdx] || visual.generatedMedia?.[0];
          if (!clip) return shot;

          const clipTiming = segTimings?.clips[shotIdx];
          let from = totalDuration;
          let to = totalDuration + clip.duration;

          if (clipTiming) {
            from = clipTiming.display.from;
            to = clipTiming.display.to;
          } else {
            const previousClipsDuration = visual.generatedMedia
              .slice(0, shotIdx)
              .reduce((acc: number, c: any, idx: number) => {
                const pause = idx === 0 ? c.startPause || 0 : 0;
                return acc + c.duration + pause;
              }, 0);

            from = previousClipsDuration;
            const clipStartPause = shotIdx === 0 ? clip.startPause || 0 : 0;
            to = from + (clip.duration + clipStartPause);
          }

          return {
            ...shot,
            imageUrl: clip.type === "image" ? clip.src : clip.preview,
            videoUrl: clip.type === "video" ? clip.src : undefined,
            duration: to - from,
            display: { from, to },
          };
        }) || [];

      scheme.segments[i] = {
        ...seg,
        shots: updatedShots,
        duration: segmentDuration,
        textToSpeech: seg.textToSpeech || {
          refId: generateId(),
          src: visual.audioUrl,
          duration: originalAudioDuration,
        },
        speechToText: seg.speechToText || {
          refId: generateId(),
          src: visual.captionUrl,
        },
      };

      // Add display info to textToSpeech/speechToText
      if (scheme.segments[i].textToSpeech) {
        scheme.segments[i].textToSpeech!.display = {
          from: startPauseMs,
          to: startPauseMs + originalAudioDuration,
        };
      }
      if (scheme.segments[i].speechToText) {
        scheme.segments[i].speechToText!.display = {
          from: startPauseMs,
          to: startPauseMs + originalAudioDuration,
        };
      }

      totalDuration += segmentDuration;
    }
  }

  if (prePrice) {
    pricing.push(prePrice);
  }

  const validPricing = pricing.filter((p) => p && typeof p.price === "number");
  const totalCost = validPricing.reduce((acc, obj) => acc + obj.price, 0);

  scheme.preview = previewUrl ? { refId: "prevId", src: previewUrl } : undefined;

  return { scheme, totalCost };
};
