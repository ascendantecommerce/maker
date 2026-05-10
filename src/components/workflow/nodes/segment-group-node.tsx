"use client";

import React, { memo } from "react";
import { type NodeProps, type Node, Handle, Position } from "@xyflow/react";
import { cn } from "@/lib/utils";
import { Video } from "lucide-react";

export type SegmentGroupNodeData = {
  id: string;
  label: string;
  index: number;
};

export type SegmentGroupNode = Node<SegmentGroupNodeData, "segmentGroup">;

function SegmentGroupNode({ data, selected }: NodeProps<SegmentGroupNode>) {
  return (
    <div
      className={cn(
        "relative w-full h-full rounded-3xl border-2 transition-all duration-500",
        selected
          ? "bg-primary/[0.03] border-primary/40 shadow-[0_0_80px_-20px_rgba(var(--primary),0.2)] ring-1 ring-primary/20"
          : "bg-muted/5 border-dashed border-border hover:bg-muted/10 hover:border-border/80",
      )}
    >
      <Handle 
        id="right"
        type="source" 
        position={Position.Right} 
        className="!w-10 !h-10 !bg-background !border-2 !border-primary/50 !rounded-full flex items-center justify-center !-right-5 !top-1/2 !-translate-y-1/2 z-10 shadow-2xl hover:scale-110 transition-transform group/handle"
      >
        <Video className="w-4 h-4 text-primary pointer-events-none" />
      </Handle>
      
      <div className="absolute -top-3.5 left-8 flex items-center gap-3">
        <div
          className={cn(
            "px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border shadow-xl backdrop-blur-md transition-all",
            selected
              ? "bg-primary text-primary-foreground border-primary scale-110"
              : "bg-card/80 text-muted-foreground border-border",
          )}
        >
          Scene {data.index + 1}
        </div>
        <span
          className={cn(
            "text-[11px] font-black uppercase tracking-widest transition-colors",
            selected ? "text-foreground opacity-100" : "text-muted-foreground/40",
          )}
        >
          {data.label}
        </span>
      </div>
    </div>
  );
}

export default memo(SegmentGroupNode);
