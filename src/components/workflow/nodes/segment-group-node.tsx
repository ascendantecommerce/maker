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

export type SegmentGroupNode = Node<SegmentGroupNodeData>;

function SegmentGroupNode({ data, selected }: NodeProps<SegmentGroupNode>) {
  return (
    <div
      className={cn(
        "relative w-full h-full rounded-2xl border-2 border-dashed transition-all duration-500",
        selected
          ? "bg-primary/[0.03] border-primary/40 shadow-[0_0_50px_-12px_rgba(var(--primary),0.2)]"
          : "bg-muted/10 border-input/80 hover:bg-muted/20 hover:border-border",
      )}
    >
      <Handle 
        type="source" 
        position={Position.Right} 
        className="!w-9 !h-9 !bg-muted/80 !border-2 !border-border !rounded-full flex items-center justify-center !-right-4 !top-1/2 !-translate-y-1/2 z-10 shadow-lg hover:bg-primary transition-colors group/handle"
      >
        <Video className="w-3.5 h-3.5 text-white pointer-events-none opacity-50 group-hover/handle:opacity-100" />
      </Handle>
      
      <div className="absolute -top-3 left-6 flex items-center gap-2">
        <div
          className={cn(
            "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter border shadow-sm",
            selected
              ? "bg-primary text-primary-foreground border-primary"
              : "bg-card text-muted-foreground border-border",
          )}
        >
          Scene {data.index + 1}
        </div>
        <span
          className={cn(
            "text-xs font-bold transition-colors",
            selected ? "text-foreground" : "text-muted-foreground/60",
          )}
        >
          {data.label}
        </span>
      </div>
    </div>
  );
}

export default memo(SegmentGroupNode);
