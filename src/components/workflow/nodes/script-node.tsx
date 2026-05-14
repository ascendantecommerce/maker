"use client";

import React, { memo, useRef } from "react";
import { Position, type NodeProps, type Node, Handle } from "@xyflow/react";
import { AlignLeft, Type } from "lucide-react";
import { cn } from "@/lib/utils";
import { CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

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
        <AlignLeft className="w-3.5 h-3.5" />
        <span className="text-sm font-bold"> Scene Script</span>
      </div>

      <div
        className={cn(
          "relative w-full h-full rounded-xl  border-border border-3 transition-all duration-500 bg-card",
          selected && "border-primary/40",
        )}
      >
        <div className="flex flex-col h-full">
          <CardContent className="p-6 space-y-4 flex-1">
            <Label className="text-[10px] uppercase text-muted-foreground">Script Content</Label>
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
      <Handle
        id="input"
        type="target"
        position={Position.Left}
        className="!w-10 !h-10 !rounded-full !border !border-border border-2! bg-card! !shadow-lg !flex !items-center !justify-center hover:scale-110 transition-transform"
        style={{ left: -40, top: "50%", transform: "translateY(-50%)" }}
      >
        <AlignLeft className="w-4 h-4" />
      </Handle>

      <Handle
        id="output"
        type="source"
        position={Position.Right}
        className="!w-10 !h-10 !rounded-full !border !border-border border-2! bg-card! !shadow-lg !flex !items-center !justify-center hover:scale-110 transition-transform"
        style={{ right: -40, top: "50%", transform: "translateY(-50%)" }}
      >
        <Type className="w-4 h-4" />
      </Handle>
    </div>
  );
}

export default memo(ScriptNode);
