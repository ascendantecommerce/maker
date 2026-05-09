"use client";

import React from "react";
import { Handle, Position } from "@xyflow/react";
import { Layers, CheckCircle2, Clapperboard, Mic } from "lucide-react";
import { cn } from "@/lib/utils";

export default function SegmentOutputNode({
  data,
  selected,
}: {
  data: { label: string; shotCount?: number; hasAudio?: boolean };
  selected?: boolean;
}) {
  const shotCount = data.shotCount || 0;
  const hasAudio = !!data.hasAudio;
  const totalInputs = shotCount + (hasAudio ? 1 : 0);

  return (
    <div
      className={cn(
        "group relative flex flex-col w-[400px] bg-card border-2 rounded-lg shadow-2xl transition-all overflow-hidden",
        selected ? "border-blue-800" : "border-border hover:border-input/80",
      )}
      style={{ width: 200 }}
    >
      {/* Label above the card */}
      <div className="absolute -top-7 left-0 flex items-center gap-2 px-1">
        <Clapperboard className="w-3.5 h-3.5 text-blue-400 drop-shadow-md" />
        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground drop-shadow-md">
          Segment Output
        </span>
      </div>

      <div className="p-5 flex flex-col items-center justify-center gap-3">
        <div className="w-12 h-12 rounded-full bg-muted border-2 border-border flex items-center justify-center relative shadow-inner">
          <Layers className="w-5 h-5 text-muted-foreground" />
          <div className="absolute -bottom-1 -right-1 bg-background rounded-full">
            <CheckCircle2 className="w-4 h-4 text-primary" />
          </div>
        </div>
        <div className="text-center">
          <p className="text-sm font-bold text-foreground">Rendered Segment</p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest mt-1">
            {data.label}
          </p>
        </div>
      </div>

      {/* Dynamic Target Handles */}
      {hasAudio && (
        <Handle
          type="target"
          id="voice"
          position={Position.Left}
          style={{ top: totalInputs > 1 ? "15%" : "50%" }}
          className="!w-9 !h-9 !bg-muted/80 !border-2 !border-border !rounded-full flex items-center justify-center !-left-4 !-translate-y-1/2 z-10 shadow-lg"
        >
          <Mic className="w-3.5 h-3.5 text-white pointer-events-none" />
        </Handle>
      )}

      {Array.from({ length: shotCount }).map((_, i) => {
        // Calculate offset to spread them. If total is 1, center it.
        // Otherwise, spread between 30% and 85%
        const start = hasAudio ? 35 : 15;
        const end = 85;
        const step = totalInputs > 1 ? (end - start) / Math.max(1, shotCount - 1) : 0;
        const top = totalInputs > 1 ? start + i * step : 50;

        return (
          <Handle
            key={i}
            type="target"
            id={`shot-${i}`}
            position={Position.Left}
            style={{ top: `${top}%` }}
            className="!w-9 !h-9 !bg-muted/80 !border-2 !border-border !rounded-full flex items-center justify-center !-left-4 !-translate-y-1/2 z-10 shadow-lg"
          >
            <Layers className="w-3.5 h-3.5 text-white pointer-events-none" />
          </Handle>
        );
      })}

      <Handle
        type="source"
        position={Position.Right}
        className="!w-9 !h-9 !bg-muted/80 !border-2 !border-border !rounded-full flex items-center justify-center !-right-4 !top-1/2 !-translate-y-1/2 z-10 shadow-lg"
      >
        <Clapperboard className="w-3.5 h-3.5 text-white pointer-events-none" />
      </Handle>
    </div>
  );
}
