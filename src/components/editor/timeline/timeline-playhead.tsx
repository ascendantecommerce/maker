"use client";

import { useRef, useState, useEffect, useMemo } from "react";
import { usePlaybackStore } from "@/stores/playback-store";
import { TimelineTrack } from "@/types/timeline";
import { TIMELINE_CONSTANTS } from "@/components/editor/timeline/timeline-constants";
import { useTimelinePlayhead } from "@/hooks/use-timeline-playhead";
import { useTheme } from "next-themes";

interface TimelinePlayheadProps {
  duration: number;
  zoomLevel: number;
  tracks: TimelineTrack[];
  seek: (time: number) => void;
  rulerRef: React.RefObject<HTMLDivElement | null>;
  rulerScrollRef: React.RefObject<HTMLDivElement | null>;
  tracksScrollRef: React.RefObject<HTMLDivElement | null>;
  trackLabelsRef?: React.RefObject<HTMLDivElement | null>;
  timelineRef: React.RefObject<HTMLDivElement | null>;
  playheadRef?: React.RefObject<HTMLDivElement | null>;
  isSnappingToPlayhead?: boolean;
  isScrubbing?: boolean;
  scrollLeft: number;
  onScrollChange?: (scrollX: number) => void;
}

export function TimelinePlayhead({
  duration,
  zoomLevel,
  tracks,
  seek,
  rulerRef,
  rulerScrollRef,
  tracksScrollRef,
  trackLabelsRef,
  timelineRef,
  playheadRef: externalPlayheadRef,
  isSnappingToPlayhead = false,
  isScrubbing: externalIsScrubbing = false,
  scrollLeft,
  onScrollChange,
}: TimelinePlayheadProps) {
  const currentTime = usePlaybackStore((state) => state.currentTime);

  const internalPlayheadRef = useRef<HTMLDivElement>(null);
  const playheadRef = externalPlayheadRef || internalPlayheadRef;
  const { theme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);
  const currentTheme = useMemo(() => {
    if (!mounted) return "light";
    return (theme === "system" ? resolvedTheme : theme) as "dark" | "light";
  }, [mounted, theme, resolvedTheme]);

  const { playheadPosition, handlePlayheadMouseDown, isScrubbing: internalIsScrubbing } = useTimelinePlayhead({
    currentTime,
    duration,
    zoomLevel,
    seek,
    rulerRef,
    rulerScrollRef,
    tracksScrollRef,
    playheadRef,
    onScrollChange,
  });

  const isScrubbing = internalIsScrubbing || externalIsScrubbing;

  const lineColor = useMemo(() => {
    if (isSnappingToPlayhead) return "#f59e0b"; // amber — snapping
    return "#ffffff"; // Always white line as per reference
  }, [isSnappingToPlayhead]);

  const indicatorStyle = useMemo(() => {
    if (isSnappingToPlayhead) {
      return { fill: "#f59e0b", stroke: "transparent" };
    }
    if (isScrubbing) {
      return { fill: "#ffffff", stroke: "transparent" };
    }
    return {
      fill: "#1a1a1a",
      stroke: "rgba(255, 255, 255, 0.8)",
    };
  }, [isSnappingToPlayhead, isScrubbing]);

  // Use timeline container height minus a few pixels for breathing room
  const timelineContainerHeight = timelineRef.current?.offsetHeight || 400;
  const totalHeight = timelineContainerHeight - 4;

  // Get dynamic track labels width, fallback to 0 if no tracks or no ref
  const trackLabelsWidth =
    tracks.length > 0 && trackLabelsRef?.current ? trackLabelsRef.current.offsetWidth : 0;

  // Calculate position locked to timeline content (accounting for scroll)
  const timelinePosition = playheadPosition * TIMELINE_CONSTANTS.PIXELS_PER_SECOND * zoomLevel;
  const rawLeftPosition = trackLabelsWidth + timelinePosition - scrollLeft;

  // Get the timeline content width and viewport width for right boundary
  const tracksViewport = tracksScrollRef.current || rulerScrollRef.current;
  const viewportWidth = tracksViewport?.clientWidth || 1000;

  // Constrain playhead to never appear outside the timeline area
  // We don't clamp it, but rather hide it if it's off-screen so it doesn't stick to the edges
  const leftPosition = rawLeftPosition;

  // Calculate if the playhead is currently visible in the scroll viewport
  const isVisible =
    duration > 0 &&
    leftPosition >= trackLabelsWidth &&
    leftPosition <= trackLabelsWidth + viewportWidth;

  return (
    <div
      ref={playheadRef}
      className="absolute pointer-events-auto z-40 group"
      style={{
        left: `${leftPosition}px`,
        top: 0,
        height: `${totalHeight}px`,
        width: "1px",
        opacity: isVisible ? 1 : 0,
        display: isVisible ? "block" : "none",
      }}
      onMouseDown={handlePlayheadMouseDown}
    >
      {/* The playhead line spanning full height */}
      <div
        className="absolute left-1/2 -translate-x-1/2 w-[1px] cursor-col-resize h-full"
        style={{
          backgroundColor: lineColor,
          transition: "background-color 80ms ease",
        }}
      />

      {/* Playhead indicator at the top */}
      <div
        className="absolute left-1/2 transform -translate-x-1/2 cursor-col-resize"
        style={{
          top: "0",
          width: "13px", // Slightly wider to accommodate stroke
          height: "15px",
          display: "flex",
          justifyContent: "center",
          transition: "all 80ms ease",
        }}
      >
        <svg
          width="13"
          height="15"
          viewBox="0 0 13 15"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          style={{ overflow: "visible" }}
        >
          <path
            d="M2.5 0.5H10.5C11.6046 0.5 12.5 1.39543 12.5 2.5V9.5L6.5 14L0.5 9.5V2.5C0.5 1.39543 1.39543 0.5 2.5 0.5Z"
            fill={indicatorStyle.fill}
            stroke={indicatorStyle.stroke}
            strokeWidth="2"
            style={{ transition: "fill 80ms ease, stroke 80ms ease" }}
          />
        </svg>
      </div>
    </div>
  );
}

// Also export a hook for getting ruler handlers
export function useTimelinePlayheadRuler({
  duration,
  zoomLevel,
  seek,
  rulerRef,
  rulerScrollRef,
  tracksScrollRef,
  playheadRef,
  onScrollChange,
}: Omit<TimelinePlayheadProps, "tracks" | "trackLabelsRef" | "timelineRef" | "scrollLeft"> & {
  scrollLeft?: number;
}) {
  const currentTime = usePlaybackStore((state) => state.currentTime);
  const { handleRulerMouseDown, isDraggingRuler, isScrubbing } = useTimelinePlayhead({
    currentTime,
    duration,
    zoomLevel,
    seek,
    rulerRef,
    rulerScrollRef,
    tracksScrollRef,
    playheadRef,
    onScrollChange,
  });

  return { handleRulerMouseDown, isDraggingRuler, isScrubbing };
}

export { TimelinePlayhead as default };
