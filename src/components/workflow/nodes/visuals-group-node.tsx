"use client";

import React, { memo } from "react";
import { type NodeProps, type Node, Handle, Position } from "@xyflow/react";
import { cn } from "@/lib/utils";
import { Sparkles } from "lucide-react";

export type VisualsGroupNodeData = {
  id: string;
  label: string;
};

export type VisualsGroupNode = Node<VisualsGroupNodeData, "visualsGroup">;

function VisualsGroupNode({ data, selected }: NodeProps<VisualsGroupNode>) {
  return (
    <div
      className={cn(
        "relative w-full h-full rounded-3xl border-2 transition-all duration-500",
        selected
          ? "bg-primary/[0.05] border-primary/50 shadow-[0_0_60px_-15px_rgba(var(--primary),0.15)] ring-1 ring-primary/10"
          : "bg-muted/3 border-dashed border-primary/10 hover:bg-muted/8 hover:border-primary/30",
      )}
    >
      {/* Target handle for the connection from Segment/Voice node */}
      <Handle 
        type="target" 
        position={Position.Left} 
        className="!w-10 !h-10 !bg-background !border-2 !border-primary/50 !rounded-full flex items-center justify-center !-left-5 !top-1/2 !-translate-y-1/2 z-10 shadow-2xl hover:scale-110 transition-transform group/handle"
      >
        <Sparkles className="w-4 h-4 text-primary pointer-events-none" />
      </Handle>
      
      {/* Label for the sub-group */}
      <div className="absolute -top-3 left-8">
        <div className="px-4 py-1.5 bg-background border border-primary/20 rounded-full text-[9px] font-black uppercase tracking-[0.2em] text-primary/60 shadow-xl backdrop-blur-md">
          Generative Pipeline
        </div>
      </div>
    </div>
  );
}

export default memo(VisualsGroupNode);
