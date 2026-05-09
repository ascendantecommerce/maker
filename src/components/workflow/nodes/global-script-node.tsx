"use client";

import React from "react";
import { Handle, Position } from "@xyflow/react";
import { cn } from "@/lib/utils";
import { FileText, AlignLeft, Settings } from "lucide-react";

export default function GlobalScriptNode({
  id,
  data,
  selected,
}: {
  id: string;
  data: {
    label?: string;
    text?: string;
    onUpdate?: (id: string, updates: any) => void;
  };
  selected?: boolean;
}) {
  return (
    <div
      className={cn(
        "group relative flex flex-col bg-card border-2 rounded-lg shadow-2xl transition-all overflow-hidden",
        selected ? "border-blue-800" : "border-border hover:border-input/80",
      )}
    >
      {/* Label above the card */}
      <div className="absolute -top-7 left-0 flex items-center gap-2">
        <FileText className="w-4 h-4 text-primary" />
        <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
          Master Script
        </span>
      </div>

      {/* Header Actions */}
      <div className="flex items-center justify-between px-5 py-4">
        <div className="flex gap-2">
          <div className="p-2 rounded-xl bg-muted border border-border">
            <AlignLeft className="w-3.5 h-3.5 text-muted-foreground" />
          </div>
        </div>
        <span className="text-[10px] font-bold text-muted-foreground/50 uppercase tracking-widest">
          {data.label || "Project Script"}
        </span>
      </div>

      {/* Content */}
      <div className="px-6 pb-8">
        <textarea
          value={data.text || ""}
          onChange={(e) => data.onUpdate?.(id, { script: e.target.value })}
          placeholder="Enter the master script for your video..."
          className="w-full text-[14px] leading-[1.6] text-foreground font-medium bg-transparent border-none resize-none focus:outline-none focus:ring-0 min-h-[120px] max-h-[300px] overflow-y-auto scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent"
        />
      </div>

      {/* Connection Handles */}
      <Handle
        type="source"
        id="right"
        position={Position.Right}
        className="!w-9 !h-9 !bg-muted/80 !border-2 !border-border !rounded-full flex items-center justify-center !-right-4 !top-1/2 !-translate-y-1/2 z-10 shadow-lg"
      >
        <FileText className="w-3.5 h-3.5 text-white pointer-events-none" />
      </Handle>
      <Handle
        type="source"
        id="bottom"
        position={Position.Bottom}
        className="!w-9 !h-9 !bg-muted/80 !border-2 !border-border !rounded-full flex items-center justify-center !-bottom-4 !left-1/2 !-translate-x-1/2 z-10 shadow-lg"
      >
        <Settings className="w-3.5 h-3.5 text-white pointer-events-none" />
      </Handle>
    </div>
  );
}
