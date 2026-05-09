import { type Node, type Edge, MarkerType } from "@xyflow/react";
import { Schema, Segment, VisualShot } from "@/lib/schema-generator/types";

// ─── Centralized edge style presets ───────────────────────────────────────────
const marker = (color: string) => ({
  type: MarkerType.ArrowClosed,
  width: 14,
  height: 14,
  color,
});

const primaryEdge = (animated = false): Partial<Edge> => ({
  type: "default",
  animated,
  style: { stroke: "#4f4f7a", strokeWidth: 1.5, opacity: 0.8 },
  markerEnd: marker("#4f4f7a"),
});

const promptEdge = (animated = false): Partial<Edge> => ({
  type: "default",
  animated,
  style: { stroke: "#3b4a6b", strokeWidth: 1.5, opacity: 0.9 },
  markerEnd: marker("#3b4a6b"),
});

const videoEdge = (animated = false): Partial<Edge> => ({
  type: "default",
  animated,
  style: { stroke: "#5b3f7a", strokeWidth: 1.5, opacity: 0.9 },
  markerEnd: marker("#5b3f7a"),
});

const voiceEdge = (): Partial<Edge> => ({
  type: "default",
  style: { stroke: "#2d5a42", strokeWidth: 1.5, opacity: 0.9 },
  markerEnd: marker("#2d5a42"),
});

const collectEdge = (): Partial<Edge> => ({
  type: "default",
  style: { stroke: "#374b6e", strokeWidth: 2, opacity: 0.9 },
  markerEnd: marker("#374b6e"),
});

const productEdge = (): Partial<Edge> => ({
  type: "default",
  style: { stroke: "#6b4f2d", strokeWidth: 1.5, opacity: 0.9 },
  markerEnd: marker("#6b4f2d"),
});

export const mapSchemaToFlow = (
  schema: Schema | null,
  callbacks?: {
    onUpdate?: (id: string, updates: any) => void;
    onGenerate?: (id: string) => void;
  },
) => {
  const segments = schema?.segments || [];
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  const NODE_WIDTH = 400;

  // 0. Determine if we are in video mode
  const isVideoMode = schema?.type !== "product-image-ad";

  const segmentOutputIds: string[] = [];

  // 1. Global Script Node
  const globalScriptId = "global-script";
  nodes.push({
    id: globalScriptId,
    type: "globalScript",
    data: {
      label: schema?.title,
      text: schema?.script,
      onUpdate: callbacks?.onUpdate,
    },
    style: { width: 400, height: 250 },
    position: { x: 0, y: 0 },
  });

  // 2. Global Product/Assets Node
  const productImages =
    schema?.productImages || (schema?.assets || []).filter((a) => a.type === "image");

  const productNodeId = "global-products";
  if (productImages && productImages.length > 0) {
    nodes.push({
      id: productNodeId,
      type: "product",
      data: {
        products: productImages,
      },
      style: { width: 260, height: 300 },
      position: { x: 0, y: 0 },
    });

    edges.push({
      id: `e-${globalScriptId}-${productNodeId}`,
      source: globalScriptId,
      sourceHandle: "bottom",
      target: productNodeId,
      ...productEdge(),
    });
  }

  // 3. Map Segments
  segments.forEach((segment, segmentIndex) => {
    const segmentGroupId = `segment-group-${segment.id}`;
    const segmentNodeId = `unified-seg-${segment.id}`;
    const visualsGroupId = `visuals-group-${segment.id}`;
    const shots = segment.shots || [];

    // Segment Group Node (Outer Container)
    nodes.push({
      id: segmentGroupId,
      type: "segmentGroup",
      data: {
        id: segmentGroupId,
        label: segment.title || `Scene ${segmentIndex + 1}`,
        index: segmentIndex,
      },
      style: {}, // Layout will compute size
      position: { x: 0, y: 0 },
    });

    // Unified Segment Node (Child of segmentGroup)
    nodes.push({
      id: segmentNodeId,
      type: "unifiedSegment",
      parentId: segmentGroupId,
      data: {
        label: `Scene Content ${segmentIndex + 1}`,
        text: segment.text,
        voiceUrl: segment.textToSpeech?.src || segment.audioUrl,
        voiceDuration: segment.textToSpeech?.duration || segment.audioDuration,
        onUpdate: callbacks?.onUpdate,
      },
      style: { width: NODE_WIDTH, height: 380 },
      position: { x: 0, y: 0 },
    });

    // Edge: Global Script -> Unified Segment
    edges.push({
      id: `e-${globalScriptId}-${segmentNodeId}`,
      source: globalScriptId,
      sourceHandle: "right",
      target: segmentNodeId,
      ...primaryEdge(),
    });

    // Visuals Group Node (Inner Container - Child of segmentGroup)
    nodes.push({
      id: visualsGroupId,
      type: "visualsGroup",
      parentId: segmentGroupId,
      data: { label: `Visuals ${segmentIndex + 1}` },
      style: {}, // Layout will compute size
      position: { x: 0, y: 0 },
    });

    // UNIFIED CONNECTION: Voiceover Node -> Visuals Group
    edges.push({
      id: `e-${segmentNodeId}-${visualsGroupId}`,
      source: segmentNodeId,
      target: visualsGroupId,
      ...promptEdge(),
    });

    // Map Shots directly as children of visualsGroup
    shots.forEach((shot, shotIndex) => {
      const shotBaseId = `shot-${segment.id}-${shotIndex}`;

      // Unified Image Shot Node (Child of visualsGroup)
      const imgShotId = `${shotBaseId}-img-unified`;
      nodes.push({
        id: imgShotId,
        type: "unifiedShot",
        parentId: visualsGroupId,
        data: {
          type: "IMAGE",
          shotIndex: shotIndex,
          promptText: shot.firstFramePrompt || segment.description,
          outputUrl: shot.imageUrl,
          status: shot.imageUrl ? "completed" : "idle",
          model: "flux-pro",
          isProduct: shot.type === "product",
          onUpdate: callbacks?.onUpdate,
          onGenerate: callbacks?.onGenerate,
        },
        style: { width: NODE_WIDTH, height: 460 },
        position: { x: 0, y: 0 },
      });

      if (isVideoMode) {
        // Unified Video Shot Node (Child of visualsGroup)
        const vidShotId = `${shotBaseId}-vid-unified`;
        nodes.push({
          id: vidShotId,
          type: "unifiedShot",
          parentId: visualsGroupId,
          data: {
            type: "VIDEO",
            shotIndex: shotIndex,
            promptText: shot.videoPrompt || "",
            outputUrl: shot.videoUrl,
            status: shot.videoUrl ? "completed" : "idle",
            model: "luma-ray",
            isProduct: shot.type === "product",
            isVideo: true,
            onUpdate: callbacks?.onUpdate,
            onGenerate: callbacks?.onGenerate,
          },
          style: { width: NODE_WIDTH, height: 460 },
          position: { x: 0, y: 0 },
        });

        // Internal Edge: Image Shot -> Video Shot (Vertical)
        edges.push({
          id: `e-${imgShotId}-${vidShotId}`,
          source: imgShotId,
          sourceHandle: "bottom",
          target: vidShotId,
          targetHandle: "top",
          ...videoEdge(),
        });
      }
    });

    // Segment Output Node (External to all groups)
    const segmentOutputId = `seg-out-${segment.id}`;
    segmentOutputIds.push(segmentOutputId);

    nodes.push({
      id: segmentOutputId,
      type: "segmentOutput",
      data: {
        label: `Scene ${segmentIndex + 1}`,
        shotCount: shots.length,
        hasAudio: !!(segment.textToSpeech?.src || segment.audioUrl),
      },
      style: { width: 200, height: 150 },
      position: { x: 0, y: 0 },
    });

    // CONSOLIDATED CONNECTION: Scene Group -> Scene Output
    edges.push({
      id: `e-${segmentGroupId}-${segmentOutputId}`,
      source: segmentGroupId,
      target: segmentOutputId,
      ...collectEdge(),
    });
  });

  // 4. Global Output Node
  const globalOutputId = "global-output";
  nodes.push({
    id: globalOutputId,
    type: "globalOutput",
    data: {
      segmentCount: segmentOutputIds.length,
    },
    style: { width: 300, height: 400 },
    position: { x: 0, y: 0 },
  });

  // Connect Segment Outputs to Global Output
  segmentOutputIds.forEach((segOutId) => {
    edges.push({
      id: `e-${segOutId}-${globalOutputId}`,
      source: segOutId,
      target: globalOutputId,
      ...collectEdge(),
    });
  });

  return { nodes, edges };
};
