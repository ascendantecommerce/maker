import { Node, Edge } from "@xyflow/react";

// ── Layout constants ──────────────────────────────────────────────────────────
const COL_GAP = 140; // horizontal gap between columns
const ROW_GAP = 160; // vertical gap between segment rows
const GROUP_PAD = { top: 100, right: 60, bottom: 80, left: 60 };
const VISUALS_PAD = { top: 60, right: 40, bottom: 60, left: 40 };
const INTERNAL_GAP = 80; // gap between nodes inside a group

// ── Helpers ───────────────────────────────────────────────────────────────────
function nodeW(n: Node): number {
  return typeof n.style?.width === "number" ? n.style.width : parseInt(String(n.style?.width || 400));
}
function nodeH(n: Node): number {
  return typeof n.style?.height === "number" ? n.style.height : parseInt(String(n.style?.height || 420));
}

type Rect = { x: number; y: number; w: number; h: number };

export const getLayoutedElements = (
  nodes: Node[],
  edges: Edge[],
): { nodes: Node[]; edges: Edge[] } => {
  const rects = new Map<string, Rect>();
  const childrenOf = new Map<string, Node[]>();
  
  nodes.forEach(n => {
    if (n.parentId) {
      const children = childrenOf.get(n.parentId) || [];
      children.push(n);
      childrenOf.set(n.parentId, children);
    }
  });

  // --- Step 1: Measure VisualsGroups (Grid of Shots) ---
  const visualsGroupSizes = new Map<string, { w: number; h: number, shotsMap: Map<number, { img?: Node, vid?: Node }>, row1H: number, row2H: number, totalGridW: number }>();
  
  nodes.filter(n => n.type === 'visualsGroup').forEach(visG => {
    const children = childrenOf.get(visG.id) || [];
    
    // Group shots by their "shot index"
    const shotsMap = new Map<number, { img?: Node, vid?: Node }>();
    children.forEach(sn => {
      const shotIdx = Number(sn.data?.shotIndex ?? 0);
      const isVid = sn.data?.type === 'VIDEO';
      const entry = shotsMap.get(shotIdx) || {};
      if (isVid) entry.vid = sn; else entry.img = sn;
      shotsMap.set(shotIdx, entry);
    });

    const sortedShotIndices = Array.from(shotsMap.keys()).sort((a, b) => a - b);
    
    let totalGridW = 0;
    let row1H = 0;
    let row2H = 0;

    sortedShotIndices.forEach((idx, i) => {
      const { img, vid } = shotsMap.get(idx)!;
      const colW = Math.max(img ? nodeW(img) : 0, vid ? nodeW(vid) : 0);
      totalGridW += colW + (i > 0 ? INTERNAL_GAP : 0);
      if (img) row1H = Math.max(row1H, nodeH(img));
      if (vid) row2H = Math.max(row2H, nodeH(vid));
    });

    const w = VISUALS_PAD.left + totalGridW + VISUALS_PAD.right;
    const h = VISUALS_PAD.top + row1H + (row2H > 0 ? INTERNAL_GAP + row2H : 0) + VISUALS_PAD.bottom;
    
    visualsGroupSizes.set(visG.id, { w, h, shotsMap, row1H, row2H, totalGridW });
  });

  // --- Step 2: Measure Segment Groups ---
  const segmentGroupSizes = new Map<string, { w: number; h: number }>();
  
  nodes.filter(n => n.type === 'segmentGroup').forEach(segG => {
    const children = childrenOf.get(segG.id) || [];
    const contentNode = children.find(c => c.type === 'unifiedSegment');
    const visualsGroup = children.find(c => c.type === 'visualsGroup');
    
    const contentW = contentNode ? nodeW(contentNode) : 0;
    const contentH = contentNode ? nodeH(contentNode) : 0;
    
    const visGSize = visualsGroup ? visualsGroupSizes.get(visualsGroup.id)! : { w: 0, h: 0 };

    const totalW = GROUP_PAD.left + contentW + (visGSize.w > 0 ? INTERNAL_GAP + visGSize.w : 0) + GROUP_PAD.right;
    const totalH = GROUP_PAD.top + Math.max(contentH, visGSize.h) + GROUP_PAD.bottom;
    
    segmentGroupSizes.set(segG.id, { w: totalW, h: totalH });

    // Position children of SegmentGroup
    if (contentNode) {
      rects.set(contentNode.id, { 
        x: GROUP_PAD.left, 
        y: (totalH - nodeH(contentNode)) / 2, 
        w: nodeW(contentNode), 
        h: nodeH(contentNode) 
      });
    }

    if (visualsGroup) {
      const visY = (totalH - visGSize.h) / 2;
      rects.set(visualsGroup.id, { 
        x: GROUP_PAD.left + contentW + INTERNAL_GAP, 
        y: visY, 
        w: visGSize.w, 
        h: visGSize.h 
      });

      // Position children of VisualsGroup
      const { shotsMap, row1H } = visualsGroupSizes.get(visualsGroup.id)!;
      const sortedShotIndices = Array.from(shotsMap.keys()).sort((a, b) => a - b);
      
      let curX = VISUALS_PAD.left;
      sortedShotIndices.forEach(idx => {
        const { img, vid } = shotsMap.get(idx)!;
        const colW = Math.max(img ? nodeW(img) : 0, vid ? nodeW(vid) : 0);
        
        if (img) {
          rects.set(img.id, { 
            x: curX + (colW - nodeW(img)) / 2, 
            y: VISUALS_PAD.top, 
            w: nodeW(img), 
            h: nodeH(img) 
          });
        }
        
        if (vid) {
          rects.set(vid.id, { 
            x: curX + (colW - nodeW(vid)) / 2, 
            y: VISUALS_PAD.top + row1H + INTERNAL_GAP, 
            w: nodeW(vid), 
            h: nodeH(vid) 
          });
        }
        
        curX += colW + INTERNAL_GAP;
      });
    }
  });

  // --- Step 3: Global Positioning ---
  const globalScript = nodes.find(n => n.id === 'global-script')!;
  const globalProducts = nodes.find(n => n.id === 'global-products');
  const globalOutput = nodes.find(n => n.id === 'global-output')!;

  const xGlobal = 0;
  const xSegments = xGlobal + nodeW(globalScript) + COL_GAP * 2;
  
  const sortedSegments = nodes
    .filter(n => n.type === 'segmentGroup')
    .sort((a, b) => Number(a.data?.index || 0) - Number(b.data?.index || 0));

  let currentY = 0;
  let maxRowW = 0;

  sortedSegments.forEach(segG => {
    const size = segmentGroupSizes.get(segG.id)!;
    rects.set(segG.id, { ...rects.get(segG.id)!, x: xSegments, y: currentY, w: size.w, h: size.h });
    maxRowW = Math.max(maxRowW, size.w);
    currentY += size.h + ROW_GAP;
  });

  const totalH = currentY - ROW_GAP;
  const xOutput = xSegments + maxRowW + COL_GAP;

  sortedSegments.forEach(segG => {
    const segId = segG.id.replace('segment-group-', '');
    const segOut = nodes.find(n => n.id === `seg-out-${segId}`);
    if (segOut) {
      const segRect = rects.get(segG.id)!;
      rects.set(segOut.id, { 
        x: xOutput, 
        y: segRect.y + (segRect.h - nodeH(segOut)) / 2, 
        w: nodeW(segOut), 
        h: nodeH(segOut) 
      });
    }
  });

  rects.set(globalScript.id, { x: xGlobal, y: (totalH - nodeH(globalScript)) / 2, w: nodeW(globalScript), h: nodeH(globalScript) });
  if (globalProducts) {
    rects.set(globalProducts.id, { 
      x: xGlobal, 
      y: (totalH - nodeH(globalScript)) / 2 + nodeH(globalScript) + COL_GAP, 
      w: nodeW(globalProducts), 
      h: nodeH(globalProducts) 
    });
  }
  rects.set(globalOutput.id, { x: xOutput + 200 + COL_GAP, y: (totalH - nodeH(globalOutput)) / 2, w: nodeW(globalOutput), h: nodeH(globalOutput) });

  return {
    nodes: nodes.map(n => {
      const r = rects.get(n.id);
      if (!r) return n;
      return {
        ...n,
        position: { x: r.x, y: r.y },
        style: { ...n.style, width: r.w, height: r.h }
      };
    }),
    edges
  };
};
