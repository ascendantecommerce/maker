import {
  calculateFitDimensions,
  fetchCaptionData,
  groupWordsByWidth,
} from "@/utils/schema-converter";
import { fontManager } from "openvideo";
import type { Segment } from "./store";
import { FONT_DEFAULT, FONT_URL_DEFAULT } from "@/constants/captions";
import { CAPTION_PRESETS } from "../editor/constant/caption";

const generateId = (prefix: string = "clip"): string => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 11);
  return `${prefix}_${timestamp}_${random}`;
};

export const PROJECT_SIZE = {
  width: 1080,
  height: 1920,
};

function parseTime(timeStr: string): number {
  if (!timeStr) return 0;
  if (timeStr === "full") return -1;
  const parts = timeStr.split(":").map(Number);
  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  } else if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  }
  return parseFloat(timeStr) || 0;
}

const getVideoInfo = (
  url: string,
): Promise<{ width: number; height: number; duration: number }> => {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.onloadedmetadata = () => {
      resolve({
        width: video.videoWidth,
        height: video.videoHeight,
        duration: video.duration,
      });
    };
    video.onerror = (err) => reject(err);
    video.src = url;
    video.load();
  });
};

const getImageInfo = (
  url: string,
): Promise<{ width: number; height: number }> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = (err) => reject(err);
    img.src = url;
  });
};

export const convertSegmentToProject = async (segment: Segment) => {
  if (!segment) return null;

  const width = PROJECT_SIZE.width;
  const height = PROJECT_SIZE.height;
  const fps = 30;

  const clips: any[] = [];
  const tracks: any[] = [];

  const videoTrackId = `track_video_${Date.now()}`;
  const audioTrackId = `track_audio_${Date.now()}`;
  const captionTrackId = `track_captions_${Date.now()}`;

  const videoClipIds: string[] = [];
  const audioClipIds: string[] = [];
  const captionClipIds: string[] = [];

  const styleCaptions = CAPTION_PRESETS[1];

  // Load fonts
  await fontManager.loadFonts([
    {
      name: styleCaptions.fontFamily ?? FONT_DEFAULT,
      url: styleCaptions.fontUrl ?? FONT_URL_DEFAULT,
    },
  ]);

  // Main video clip
  let videoWidth = width;
  let videoHeight = height;
  let videoLeft = 0;
  let videoTop = 0;
  let actualDuration = 10;

  try {
    const info = await getVideoInfo(segment.url || "");

    actualDuration = info.duration;
    const fit = calculateFitDimensions(info.width, info.height, width, height);
    videoWidth = fit.width;
    videoHeight = fit.height;
    videoLeft = fit.left;
    videoTop = fit.top;
  } catch (error) {
    console.error("Failed to get video info:", error);
  }

  const startTime = 0;
  const endTime = actualDuration;

  const durationInSeconds = endTime - startTime;
  const durationUs = Math.max(0, durationInSeconds) * 1000 * 1000;

  const mainClipId = generateId();
  videoClipIds.push(mainClipId);

  clips.push({
    type: "Video",
    src: segment.url || "",
    display: {
      from: 0,
      to: durationUs,
    },
    playbackRate: 1,
    duration: durationUs,
    left: videoLeft,
    top: videoTop,
    width: videoWidth,
    height: videoHeight,
    angle: 0,
    zIndex: 10,
    opacity: 1,
    flip: null,
    style: {},
    trim: {
      from: startTime * 1000 * 1000,
      to: endTime * 1000 * 1000,
    },
    audio: true,
    volume: 1,
    id: mainClipId,
    effects: [],
  });

  // Sound Effects
  if (segment.soundEffects) {
    for (const sfx of segment.soundEffects) {
      const sfxId = generateId();
      audioClipIds.push(sfxId);

      const sfxFromUs = sfx.time * 1000 * 1000;
      const sfxDurationUs = 3 * 1000 * 1000; // Default 3s for SFX

      clips.push({
        type: "Audio",
        src: sfx.url,
        display: {
          from: sfxFromUs,
          to: sfxFromUs + sfxDurationUs,
        },
        playbackRate: 1,
        duration: sfxDurationUs,
        left: 0,
        top: 0,
        width: 0,
        height: 0,
        angle: 0,
        zIndex: 30,
        opacity: 1,
        flip: null,
        style: {},
        trim: {
          from: 0,
          to: 0,
        },
        loop: false,
        id: sfxId,
        volume: 0.4,
      });
    }
  }

  // B-Rolls
  if (segment.bRolls) {
    for (const bRoll of segment.bRolls) {
      const bRollId = generateId();
      videoClipIds.push(bRollId);

      const bRollFromUs = (bRoll.time || 0) * 1000 * 1000;
      const bRollDurationUs = (bRoll.duration || 5000) * 1000; // Assuming bRoll.duration is in ms
      const bRollToUs = bRollFromUs + bRollDurationUs;

      let bWidth = width;
      let bHeight = height;
      let bLeft = 0;
      let bTop = 0;

      try {
        const srcToUse = bRoll.videoUrl || bRoll.imageUrl || bRoll.url;
        if (!srcToUse) throw new Error("B-roll URL is required");
        const dimensions =
          bRoll.type === "video"
            ? await getVideoInfo(srcToUse)
            : await getImageInfo(srcToUse);
        const fit = calculateFitDimensions(
          dimensions.width,
          dimensions.height,
          width,
          height,
        );
        bWidth = fit.width;
        bHeight = fit.height;
        bLeft = fit.left;
        bTop = fit.top;
      } catch (e) {
        console.error("Failed to get B-roll dimensions:", e);
      }

      clips.push({
        type: bRoll.type === "video" ? "Video" : "Image",
        src: bRoll.videoUrl || bRoll.imageUrl || bRoll.url,
        display: {
          from: bRollFromUs,
          to: bRollToUs,
        },
        playbackRate: 1,
        duration: bRollDurationUs,
        left: bLeft,
        top: bTop,
        width: bWidth,
        height: bHeight,
        angle: 0,
        zIndex: 20,
        opacity: 1,
        flip: null,
        style: {},
        trim: {
          from: 0,
          to: bRoll.type === "video" ? bRollDurationUs : 0,
        },
        audio: bRoll.type === "video",
        volume: 1,
        id: bRollId,
        effects: [],
      });
    }
  }

  // Captions
  if (segment.speechToText) {
    try {
      let captionData = segment.speechToText as any;

      // If src is present, fetch the data
      if (segment.speechToText.src) {
        const fetchedData = await fetchCaptionData(segment.speechToText.src);
        if (fetchedData) {
          captionData = fetchedData;
        }
      }

      if (
        captionData &&
        captionData.results &&
        captionData.results.main &&
        captionData.results.main.words
      ) {
        await fontManager.loadFonts([
          {
            name: styleCaptions.fontFamily ?? FONT_DEFAULT,
            url: styleCaptions.fontUrl ?? FONT_URL_DEFAULT,
          },
        ]);
        const words = captionData.results.main.words;
        const maxLines = styleCaptions?.textBoxStyle?.maxLines ?? 1;
        const verticalPadding =
          styleCaptions?.textBoxStyle?.verticalPadding ?? 0;
        const captionChunks = groupWordsByWidth(
          words,
          800,
          styleCaptions.fontSize ?? 60,
          styleCaptions.fontFamily ?? FONT_DEFAULT,
          maxLines,
        );
        const maxCaptionHeight = captionChunks.reduce((max, chunk) => {
          const jumpLines = (chunk.text.match(/\r?\n/g) || []).length;

          const captionHeight =
            Math.ceil(chunk.height) +
            (jumpLines + 1) * verticalPadding * 2 +
            14 * (jumpLines + 1);

          return Math.max(max, captionHeight);
        }, 0);

        for (const chunk of captionChunks) {
          const capId = generateId();
          captionClipIds.push(capId);

          const fromUs = chunk.from * 1000 * 1000;
          const toUs = chunk.to * 1000 * 1000;
          const durationUs = toUs - fromUs;

          const capWidth = Math.ceil(chunk.width);
          const capHeight = Math.ceil(chunk.height) + 30;

          const jumpLines = (chunk.text.match(/\r?\n/g) || []).length;
          const captionHeight =
            Math.ceil(chunk.height) +
            (jumpLines + 1) * verticalPadding * 2 +
            14 * (jumpLines + 1);
          const captionBottomPadding =
            450 - (maxCaptionHeight - captionHeight) / 2;
          const topPosition = height - captionBottomPadding;

          clips.push({
            type: "Caption",
            src: "",
            display: {
              from: fromUs,
              to: toUs,
            },
            playbackRate: 1,
            duration: durationUs,
            left: (width - capWidth) / 2,
            top: topPosition,
            width: capWidth,
            height: capHeight,
            angle: 0,
            zIndex: 40,
            opacity: 1,
            flip: null,
            style: {
              fontSize: styleCaptions.fontSize ?? 60,
              fontFamily: styleCaptions.fontFamily ?? FONT_DEFAULT,
              fontWeight: "700",
              fontStyle: "normal",
              color: styleCaptions.color ?? "#ffffff",
              align: "center",
              fontUrl: styleCaptions.fontUrl ?? FONT_URL_DEFAULT,
              stroke: {
                color: styleCaptions.borderColor ?? "#000000",
                width: styleCaptions.borderWidth ?? 4,
              },
              shadow: {
                color: styleCaptions.boxShadow?.color ?? "#000000",
                alpha: 0.5,
                blur: styleCaptions.boxShadow?.blur ?? 4,
                distance: 0,
                angle: 0,
              },
            },
            trim: {
              from: 0,
              to: 0,
            },
            text: chunk.text,
            caption: {
              words: chunk.words,
              colors: {
                appeared: styleCaptions.appearedColor ?? "#ffffff",
                active: styleCaptions.activeColor ?? "#ffffff",
                activeFill: styleCaptions.activeFillColor ?? "#FF5700",
                background: styleCaptions.backgroundColor ?? "",
                keyword: styleCaptions.isKeywordColor ?? "#ffffff",
              },
              preserveKeywordColor: styleCaptions.preservedColorKeyWord ?? true,
              positioning: {
                videoWidth: width,
                videoHeight: height,
              },
            },
            id: capId,
            effects: [],
          });
        }
      }
    } catch (error) {
      console.error("Error processing caption data:", error);
    }
  }

  if (captionClipIds.length > 0) {
    tracks.push({
      id: captionTrackId,
      name: "Caption Track",
      type: "Caption",
      clipIds: captionClipIds,
    });
  }
  if (videoClipIds.length > 0) {
    tracks.push({
      id: videoTrackId,
      name: "Video Track",
      type: "Video",
      clipIds: videoClipIds,
    });
  }
  if (audioClipIds.length > 0) {
    tracks.push({
      id: audioTrackId,
      name: "Audio Track",
      type: "Audio",
      clipIds: audioClipIds,
    });
  }

  return {
    tracks,
    clips,
    settings: {
      width,
      height,
      fps: 30,
      bgColor: "#1c1917",
    },
  };
};
