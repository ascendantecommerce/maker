"use client";

import React, { memo } from "react";
import { type NodeProps, type Node, Handle, Position } from "@xyflow/react";
import { cn } from "@/lib/utils";
import { Sparkles, Image as ImageIcon } from "lucide-react";

export type VisualsGroupNodeData = {
  id: string;
  label: string;
};

export type VisualsGroupNode = Node<VisualsGroupNodeData>;

function VisualsGroupNode({ data, selected }: NodeProps<VisualsGroupNode>) {
  return (
    <div
      className={cn(
        "relative w-full h-full rounded-2xl border-2 border-dashed border-primary/20 bg-primary/[0.02] transition-all duration-500",
        selected && "border-primary/50 bg-primary/[0.05] shadow-[0_0_40px_-12px_rgba(var(--primary),0.1)]",
      )}
    >
      {/* Target handle for the connection from Segment/Voice node */}
      <Handle 
        type="target" 
        position={Position.Left} 
        className="!w-9 !h-9 !bg-muted/80 !border-2 !border-border !rounded-full flex items-center justify-center !-left-4 !top-1/2 !-translate-y-1/2 z-10 shadow-lg hover:bg-primary transition-colors group/handle"
      >
        <Sparkles className="w-3.5 h-3.5 text-white pointer-events-none opacity-50 group-hover/handle:opacity-100" />
      </Handle>
      
      {/* Label for the sub-group */}
      <div className="absolute -top-3 left-6">
        <div className="px-3 py-1 bg-background border border-border rounded-full text-[9px] font-black uppercase tracking-widest text-muted-foreground/60">
          Visual Assets
        </div>
      </div>
    </div>
  );
}

export default memo(VisualsGroupNode);
