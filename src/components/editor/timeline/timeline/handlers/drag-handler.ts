import { type FabricObject } from "fabric";
import type Timeline from "../canvas";
import {
  getLineGuideStops,
  getObjectSnappingEdges,
  getGuides,
  drawGuides,
  clearAuxiliaryObjects,
} from "../guidelines/utils";

const MIN_RESIZE_WIDTH = 10;

export function handleDragging(timeline: Timeline, options: any) {
  const target = options.target as FabricObject;
  if (!target) return;

  // --- Snapping Guidelines ---
  const allObjects = timeline.canvas.getObjects();
  const targetRect = target.getBoundingRect();
  target.setCoords();

  const skipObjects = [target, ...timeline.canvas.getActiveObjects()];
  const lineGuideStops = getLineGuideStops(skipObjects, timeline.canvas);
  const itemBounds = getObjectSnappingEdges(target);
  const guides = getGuides(lineGuideStops, itemBounds);

  if (timeline.enableGuideRedraw) {
    clearAuxiliaryObjects(timeline.canvas, allObjects);
    if (guides.length > 0) {
      drawGuides(guides, targetRect, timeline.canvas);
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
  const guides = getGuides(lineGuideStops, itemBounds);

  // Throttled guideline redraw
  if (timeline.enableGuideRedraw) {
    clearAuxiliaryObjects(timeline.canvas, allObjects);
    if (guides.length > 0) {
      drawGuides(guides, rect, timeline.canvas);
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

  timeline.canvas.requestRenderAll();
}
