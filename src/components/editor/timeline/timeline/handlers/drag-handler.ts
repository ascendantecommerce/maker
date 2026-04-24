import { type FabricObject } from "fabric";
import type Timeline from "../canvas";
import {
  getLineGuideStops,
  getObjectSnappingEdges,
  getGuides,
  drawGuides,
  clearAuxiliaryObjects,
  getStopsForObject,
} from "../guidelines/utils";

const MIN_RESIZE_WIDTH = 10;

/** Build guide stops for the playhead line so clips can snap to it. */
function getPlayheadGuideStops(timeline: Timeline): { vertical: any[]; horizontal: any[] } {
  const px = timeline.playheadX;
  if (px === null) return { vertical: [], horizontal: [] };
  // The playhead is a vertical line; its height spans the full canvas
  const canvasHeight = timeline.canvas.getHeight();
  return {
    vertical: getStopsForObject(px, 0, 0, canvasHeight),
    horizontal: [],
  };
}

/**
 * Returns true when at least one of the resolved guides corresponds to the
 * current playhead position (within 1 px rounding tolerance).
 */
function guidesIncludePlayhead(guides: ReturnType<typeof getGuides>, timeline: Timeline): boolean {
  const px = timeline.playheadX;
  if (px === null) return false;
  return guides.some(
    (g) => g.orientation === "V" && Math.abs(g.lineGuide - px) < 1,
  );
}

export function handleDragging(timeline: Timeline, options: any) {
  const target = options.target as FabricObject;
  if (!target) return;

  // --- Snapping Guidelines ---
  const allObjects = timeline.canvas.getObjects();
  const targetRect = target.getBoundingRect();
  target.setCoords();

  const skipObjects = [target, ...timeline.canvas.getActiveObjects()];
  const lineGuideStops = getLineGuideStops(skipObjects, timeline.canvas);
  // Also snap to playhead
  const playheadStops = getPlayheadGuideStops(timeline);
  lineGuideStops.vertical.push(...playheadStops.vertical);
  const itemBounds = getObjectSnappingEdges(target);
  const guides = getGuides(lineGuideStops, itemBounds);

  if (timeline.enableGuideRedraw) {
    clearAuxiliaryObjects(timeline.canvas, allObjects);
    // Don't draw a canvas line for playhead snaps — the playhead colour change is the feedback
    const visibleGuides = guides.filter(
      (g) => timeline.playheadX === null || Math.abs(g.lineGuide - timeline.playheadX) >= 1,
    );
    if (visibleGuides.length > 0) {
      drawGuides(visibleGuides, targetRect, timeline.canvas);
    }
    timeline.enableGuideRedraw = false;
    setTimeout(() => {
      timeline.enableGuideRedraw = true;
    }, 50);
  }

  guides.forEach((lineGuide) => {
    if (lineGuide.orientation === "V") {
      target.set("left", lineGuide.lineGuide + lineGuide.offset);
      target.setCoords();
    }
  });

  // Notify React whether the clip is currently locked to the playhead
  timeline.emit("playhead:snap", { isSnapping: guidesIncludePlayhead(guides, timeline) });
  // ---------------------------

  // Get the pointer position (cursor position) instead of object center
  const pointer = timeline.canvas.getPointer(options.e);
  const cursorY = pointer.y;

  if (timeline.isOverTrack(cursorY)) {
    timeline.clearSeparatorHighlights();
    timeline.setActiveSeparatorIndex(null);
    timeline.canvas.requestRenderAll();
    return;
  }

  const potentialSeparator = timeline.checkSeparatorIntersection(cursorY);
  timeline.clearSeparatorHighlights();

  if (potentialSeparator) {
    potentialSeparator.highlight.set("fill", "white");
    timeline.setActiveSeparatorIndex(potentialSeparator.index);
  } else {
    timeline.setActiveSeparatorIndex(null);
  }

  timeline.canvas.requestRenderAll();
}

/**
 * Shows snapping guidelines and snaps the active edge (left or right handle)
 * to neighboring clip boundaries while the user is resizing a clip.
 */
export function handleResizing(timeline: Timeline, options: any) {
  const target = options.target as FabricObject;
  if (!target) return;

  const allObjects = timeline.canvas.getObjects();
  target.setCoords();

  // Determine which resize handle is active
  const corner: string | undefined = options.transform?.corner;
  const isLeftHandle = corner === "ml";

  const rect = target.getBoundingRect();

  // Build snapping candidates for only the active edge
  const activeEdgeX = isLeftHandle ? rect.left : rect.left + rect.width;

  const itemBounds = {
    vertical: [
      {
        guide: Math.round(activeEdgeX),
        // offset=0: we handle position adjustment manually below
        offset: 0,
        snap: isLeftHandle ? "start" : "end",
      },
    ],
    horizontal: [],
  };

  const skipObjects = [target, ...timeline.canvas.getActiveObjects()];
  const lineGuideStops = getLineGuideStops(skipObjects, timeline.canvas);
  // Also snap to playhead
  const playheadStops = getPlayheadGuideStops(timeline);
  lineGuideStops.vertical.push(...playheadStops.vertical);
  const guides = getGuides(lineGuideStops, itemBounds);

  // Throttled guideline redraw
  if (timeline.enableGuideRedraw) {
    clearAuxiliaryObjects(timeline.canvas, allObjects);
    // Don't draw a canvas line for playhead snaps — the playhead colour change is the feedback
    const visibleGuides = guides.filter(
      (g) => timeline.playheadX === null || Math.abs(g.lineGuide - timeline.playheadX) >= 1,
    );
    if (visibleGuides.length > 0) {
      drawGuides(visibleGuides, rect, timeline.canvas);
    }
    timeline.enableGuideRedraw = false;
    setTimeout(() => {
      timeline.enableGuideRedraw = true;
    }, 50);
  }

  // Apply snapping to the active edge
  guides.forEach((lineGuide) => {
    if (lineGuide.orientation !== "V") return;

    const snapX = lineGuide.lineGuide; // offset is 0; snapX is the raw boundary

    if (isLeftHandle) {
      // Moving the left edge: adjust left + width so right edge stays fixed
      const oldRight = target.left + target.width;
      const newLeft = snapX;
      const newWidth = oldRight - newLeft;
      if (newWidth >= MIN_RESIZE_WIDTH && newLeft >= 0) {
        target.set("left", newLeft);
        target.set("width", newWidth);
        target.setCoords();
      }
    } else {
      // Moving the right edge: adjust width only so left edge stays fixed
      const newWidth = snapX - target.left;
      if (newWidth >= MIN_RESIZE_WIDTH) {
        target.set("width", newWidth);
        target.setCoords();
      }
    }
  });

  // Notify React whether the clip edge is currently locked to the playhead
  timeline.emit("playhead:snap", { isSnapping: guidesIncludePlayhead(guides, timeline) });

  timeline.canvas.requestRenderAll();
}
