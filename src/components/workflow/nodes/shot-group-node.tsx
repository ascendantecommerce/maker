"use client";

import React, { memo } from "react";
import { type NodeProps, type Node } from "@xyflow/react";
import { cn } from "@/lib/utils";

export type ShotGroupNodeData = {
  id: string;
  type: "IMAGE" | "VIDEO";
  index: number;
};

export type ShotGroupNode = Node<ShotGroupNodeData, "shotGroup">;

function ShotGroupNode({ data, selected }: NodeProps<ShotGroupNode>) {
  const isVideo = data.type === "VIDEO";

  return (
    <div
      className={cn(
        "relative w-full h-full rounded-2xl border-2 transition-all duration-500",
        selected
          ? "bg-primary/[0.02] border-primary/30 shadow-[0_0_40px_-10px_rgba(var(--primary),0.1)] ring-1 ring-primary/5"
          : "bg-muted/5 border-dashed border-border/60 hover:bg-muted/10 hover:border-border",
      )}
    >
      {/* Label for the shot group */}
      <div className="absolute -top-3 left-6">
        <div className={cn(
          "px-3 py-1 bg-background border rounded-full text-[8px] font-black uppercase tracking-widest shadow-lg",
          selected ? "text-primary border-primary/20" : "text-muted-foreground/50 border-border"
        )}>
          {isVideo ? "Motion Segment" : "Visual Segment"} {data.index + 1}
        </div>
      </div>
    </div>
  );
}

export default memo(ShotGroupNode);
