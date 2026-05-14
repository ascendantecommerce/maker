"use client";

import React, { memo } from "react";
import { Position, type NodeProps, type Node, Handle } from "@xyflow/react";
import { Film, PlayCircle, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export type GlobalOutputNodeData = {
  segmentCount?: number;
};

export type GlobalOutputNode = Node<GlobalOutputNodeData, "globalOutput">;

function GlobalOutputNode({ id, data, selected }: NodeProps<GlobalOutputNode>) {
  const segmentCount = data.segmentCount || 0;

  return (
    <Card
      className={cn(
        "w-[320px] p-0 overflow-hidden border-2 shadow-2xl transition-all rounded-[24px]",
        selected
          ? "border-primary ring-4 ring-primary/10"
          : "border-border/40 bg-gradient-to-br from-card to-primary/5",
      )}
    >
      <CardHeader className="m-0 bg-primary/10 px-4 py-3 border-b border-primary/20 flex flex-row items-center gap-2">
        <Sparkles className="w-4 h-4 text-primary" />
        <CardTitle className="text-[11px] font-black uppercase tracking-widest text-primary">
          Final Compile
        </CardTitle>
      </CardHeader>

      <CardContent className="p-0 flex flex-col">
        <div className="relative h-[160px] flex items-center justify-center overflow-hidden">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--border))_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border))_1px,transparent_1px)] bg-[size:14px_24px] opacity-20" />

          <div className="relative z-10 w-24 h-24 rounded-full bg-background border-[4px] border-primary flex items-center justify-center shadow-[0_0_50px_rgba(var(--primary),0.2)]">
            <Film className="w-10 h-10 text-primary" />
          </div>
        </div>

        <div className="p-6 flex flex-col gap-5">
          <div className="text-center space-y-2">
            <h3 className="text-lg font-black text-foreground uppercase tracking-tight">
              Project Master
            </h3>
            <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest opacity-60">
              Compilation Suite
            </p>
          </div>

          <Button className="w-full h-12 rounded-2xl text-[11px] font-black uppercase tracking-[0.1em] shadow-2xl bg-primary text-primary-foreground hover:bg-primary/90 transition-all flex items-center justify-center gap-3">
            <PlayCircle className="w-5 h-5" />
            COMPILE TO TIMELINE
          </Button>
        </div>

        <div className="px-4 py-3 border-t border-border bg-muted/20 relative">
          <div className="mb-2 text-[9px] font-black text-muted-foreground uppercase tracking-widest opacity-60">
            Segments Incoming ({segmentCount})
          </div>
          <div className="flex items-center gap-3">
            <div className="relative flex items-center gap-2">
              <Handle
                id="input"
                type="target"
                position={Position.Left}
                className="!w-4 !h-4 !-left-[22px] !bg-primary !border-2 !border-background shadow-lg hover:scale-110 transition-transform"
              />
              <span className="text-[11px] font-black text-primary/70">Global Stream</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default memo(GlobalOutputNode);
