"use client";

import React, { memo } from "react";
import { type NodeProps, type Node } from "@xyflow/react";
import { cn } from "@/lib/utils";

export type SegmentContentGroupNodeData = {
  id: string;
  index: number;
};

export type SegmentContentGroupNode = Node<SegmentContentGroupNodeData, "segmentContentGroup">;

function SegmentContentGroupNode({ data, selected }: NodeProps<SegmentContentGroupNode>) {
  return (
    <div
      className={cn(
        "relative w-full h-full rounded-[40px] border-2 transition-all duration-500",
        selected
          ? "bg-primary/[0.02] border-primary/30 shadow-[0_0_60px_-10px_rgba(var(--primary),0.1)] ring-1 ring-primary/5"
          : "bg-muted/5 border-dashed border-border/40 hover:bg-muted/10 hover:border-border",
      )}
    >
      <div className="absolute -top-3 left-8">
        <div className={cn(
          "px-4 py-1.5 bg-background border rounded-full text-[9px] font-black uppercase tracking-widest shadow-xl",
          selected ? "text-primary border-primary/20" : "text-muted-foreground/40 border-border"
        )}>
          Scene Content {data.index + 1}
        </div>
      </div>
    </div>
  );
}

export default memo(SegmentContentGroupNode);
