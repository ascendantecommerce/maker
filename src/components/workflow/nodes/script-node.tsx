"use client";

import React, { memo, useRef } from "react";
import { Position, type NodeProps, type Node, Handle } from "@xyflow/react";
import { AlignLeft, Type } from "lucide-react";
import { cn } from "@/lib/utils";
import { CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

export type ScriptNodeData = {
  text: string;
  onUpdate?: (id: string, updates: any) => void;
};

export type ScriptNode = Node<ScriptNodeData, "script">;

function ScriptNode({ id, data, selected }: NodeProps<ScriptNode>) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  return (
    <div className="relative group/node w-full h-full bg-transparent">
      {/* Label above the card */}
      <div className="absolute -top-7 left-0 flex items-center gap-2 px-1 pointer-events-none whitespace-nowrap z-30">
        <AlignLeft className="w-3.5 h-3.5 text-muted-foreground/60 drop-shadow-md" />
        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60 drop-shadow-md">
          Scene Script
        </span>
      </div>

      <div
        className={cn(
          "w-full h-full transition-all duration-500 rounded-[32px] overflow-hidden bg-card shadow-2xl border-2",
          selected ? "border-primary/50 shadow-[0_0_50px_-12px_rgba(var(--primary),0.3)]" : "border-border/40 group-hover/node:border-border/60"
        )}
      >
        <div className="flex flex-col h-full">
          <CardContent className="p-6 space-y-4 flex-1">
            <div className="flex items-center gap-2 opacity-50">
              <Type className="w-3 h-3" />
              <span className="text-[9px] font-black uppercase tracking-widest">Text Content</span>
            </div>
            <Textarea
              ref={textareaRef}
              value={data.text || ""}
              onChange={(e) => data.onUpdate?.(id, { text: e.target.value })}
              placeholder="Enter scene script..."
              className="nodrag nopan nowheel w-full h-[180px] text-[15px] leading-relaxed text-foreground font-medium italic bg-transparent border-none focus-visible:ring-0 p-0 resize-none overflow-y-auto scrollbar-thin scrollbar-thumb-muted-foreground/10"
            />
          </CardContent>
        </div>
      </div>

      {/* Handles */}
      <div className="absolute top-1/2 -left-3 -translate-y-1/2 z-20">
        <Handle
          id="input"
          type="target"
          position={Position.Left}
          className="!w-6 !h-6 !bg-primary !border-[4px] !border-background shadow-2xl hover:scale-110 transition-transform"
        />
      </div>
      <div className="absolute top-1/2 -right-3 -translate-y-1/2 z-20">
        <Handle
          id="output"
          type="source"
          position={Position.Right}
          className="!w-6 !h-6 !bg-muted-foreground/30 !border-[4px] !border-background shadow-2xl hover:scale-110 transition-transform"
        />
      </div>
    </div>
  );
}

export default memo(ScriptNode);
