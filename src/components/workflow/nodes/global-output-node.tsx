"use client";

import React from "react";
import { Handle, Position } from "@xyflow/react";
import { Film, PlayCircle, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function GlobalOutputNode({
  data,
  selected,
}: {
  data: { segmentCount?: number };
  selected?: boolean;
}) {
  const segmentCount = data.segmentCount || 0;

  return (
    <div
      className={cn(
        "group relative flex flex-col w-[400px] bg-card border-2 rounded-lg shadow-2xl transition-all overflow-hidden",
        selected ? "border-blue-800" : "border-border hover:border-input/80",
      )}
      style={{ width: 300 }}
    >
      {/* Label above the card */}
      <div className="absolute -top-8 left-0 flex items-center gap-2 px-1">
        <Sparkles className="w-4 h-4 text-primary drop-shadow-md" />
        <span className="text-[12px] font-bold uppercase tracking-[0.2em] text-primary drop-shadow-md">
          Final Compile
        </span>
      </div>

      <div className="flex flex-col">
        <div className="relative h-[160px] bg-muted/30 flex items-center justify-center border-b border-border overflow-hidden">
          {/* Aesthetic Background Grid/Pattern */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--border))_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border))_1px,transparent_1px)] bg-[size:14px_24px]" />

          <div className="relative z-10 w-20 h-20 rounded-full bg-background border-[4px] border-primary flex items-center justify-center shadow-[0_0_40px_rgba(var(--primary),0.3)] group-hover:scale-105 transition-transform duration-500">
            <Film className="w-8 h-8 text-primary" />
          </div>
        </div>

        <div className="p-6 flex flex-col gap-4 bg-gradient-to-b from-card to-background">
          <div className="text-center space-y-1">
            <h3 className="text-lg font-bold text-foreground">Project Master</h3>
            <p className="text-xs text-muted-foreground font-medium">
              Ready for timeline compilation
            </p>
          </div>

          <Button className="w-full h-12 rounded-xl text-sm font-bold tracking-wide shadow-xl bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-2">
            <PlayCircle className="w-5 h-5" />
            COMPILE TO TIMELINE
          </Button>
        </div>
      </div>

      {/* Dynamic Target Handles */}
      {Array.from({ length: segmentCount }).map((_, i) => {
        // Spread between 10% and 90%
        const start = 10;
        const end = 90;
        const step = segmentCount > 1 ? (end - start) / (segmentCount - 1) : 0;
        const top = segmentCount > 1 ? start + i * step : 50;

        return (
          <Handle
            key={i}
            type="target"
            id={`segment-${i}`}
            position={Position.Left}
            style={{ top: `${top}%` }}
            className="!w-9 !h-9 !bg-muted/80 !border-2 !border-border !rounded-full flex items-center justify-center !-left-4 !-translate-y-1/2 z-10 shadow-lg"
          >
            <Film className="w-3.5 h-3.5 text-white pointer-events-none" />
          </Handle>
        );
      })}
    </div>
  );
}
