"use client";

import React, { memo } from "react";
import { Position, type NodeProps, type Node, Handle } from "@xyflow/react";
import { Layers, CheckCircle2, Clapperboard } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";

export type SegmentOutputNodeData = {
  label: string;
  shotCount?: number;
  hasAudio?: boolean;
};

export type SegmentOutputNode = Node<SegmentOutputNodeData, "segmentOutput">;

function SegmentOutputNode({ id, data, selected }: NodeProps<SegmentOutputNode>) {
  return (
    <Card 
      className={cn(
        "w-[260px] p-0 overflow-hidden border-2 shadow-2xl transition-all rounded-[24px]",
        selected ? "border-primary ring-4 ring-primary/10" : "border-border/40 bg-card"
      )}
    >
      <CardHeader className="m-0 bg-muted/30 px-4 py-3 border-b border-border/50 flex flex-row items-center gap-2">
        <Clapperboard className="w-4 h-4 text-blue-400" />
        <CardTitle className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">
          Scene Collector
        </CardTitle>
      </CardHeader>

      <CardContent className="p-6 flex flex-col gap-6">
        <div className="flex flex-col items-center justify-center gap-4">
          <div className="w-16 h-16 rounded-full bg-muted border-2 border-border flex items-center justify-center relative shadow-inner">
            <Layers className="w-7 h-7 text-muted-foreground/50" />
            <div className="absolute -bottom-1 -right-1 bg-background rounded-full p-0.5 border border-border shadow-sm">
              <CheckCircle2 className="w-5 h-5 text-primary" />
            </div>
          </div>
          <div className="text-center">
            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest opacity-60 mb-1">
              {data.label}
            </p>
            <p className="text-xs font-bold text-foreground">Aggregated Stream</p>
          </div>
        </div>

        <div className="flex flex-col gap-3 pt-2">
           <Label className="text-[9px] font-black text-muted-foreground uppercase tracking-widest opacity-60 px-1">
            Stream Capture
          </Label>
          <div className="grid grid-cols-2 gap-4">
            <div className="relative flex items-center gap-2 p-2 rounded-lg bg-muted/20 border border-border/50">
              <Handle
                id="input"
                type="target"
                position={Position.Left}
                className="!w-3 !h-3 !bg-muted-foreground/40 !border-2 !border-background shadow-lg hover:scale-110 transition-transform"
              />
              <span className="text-[10px] font-bold text-muted-foreground/80">From Scene</span>
            </div>
            <div className="relative flex items-center justify-end gap-2 p-2 rounded-lg bg-primary/5 border border-primary/10">
              <span className="text-[10px] font-bold text-primary/80">Full Video</span>
              <Handle
                id="right"
                type="source"
                position={Position.Right}
                className="!w-3 !h-3 !bg-primary !border-2 !border-background shadow-lg hover:scale-110 transition-transform"
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default memo(SegmentOutputNode);
