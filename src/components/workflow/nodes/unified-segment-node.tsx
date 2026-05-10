"use client";

import React, { useState, memo } from "react";
import { Position, type NodeProps, type Node, Handle } from "@xyflow/react";
import { AlignLeft, Mic, Volume2, Clock, Hash } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

export type UnifiedSegmentNodeData = {
  text: string;
  voiceUrl?: string;
  voiceDuration?: number;
  label: string;
  onUpdate?: (id: string, updates: any) => void;
};

export type UnifiedSegmentNode = Node<UnifiedSegmentNodeData, "unifiedSegment">;

function UnifiedSegmentNode({ id, data, selected }: NodeProps<UnifiedSegmentNode>) {
  const [view, setView] = useState<"script" | "voice">(data.voiceUrl ? "voice" : "script");
  const hasVoice = !!data.voiceUrl;

  return (
    <Card 
      className={cn(
        "w-[400px] p-0 overflow-hidden border-2 shadow-2xl transition-all rounded-[24px]",
        selected ? "border-primary ring-4 ring-primary/10" : "border-border/40 bg-card"
      )}
    >
      <CardHeader className="m-0 bg-muted/30 px-4 py-3 border-b border-border/50 flex flex-row items-center gap-2">
        <Hash className="w-4 h-4 text-primary" />
        <CardTitle className="text-[11px] font-black uppercase tracking-widest text-muted-foreground flex-1">
          {data.label}
        </CardTitle>
        <div className="flex bg-muted/50 p-1 rounded-lg border border-border/50">
          <button
            onClick={() => setView("script")}
            className={cn(
              "px-3 py-1 rounded-md text-[9px] font-black transition-all flex items-center gap-1.5 uppercase tracking-tighter",
              view === "script" 
                ? "bg-background text-foreground shadow-sm" 
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <AlignLeft className="w-3 h-3" />
            SCRIPT
          </button>
          <button
            onClick={() => setView("voice")}
            className={cn(
              "px-3 py-1 rounded-md text-[9px] font-black transition-all flex items-center gap-1.5 uppercase tracking-tighter",
              view === "voice" 
                ? "bg-background text-foreground shadow-sm" 
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Mic className="w-3 h-3" />
            VOICE
          </button>
        </div>
      </CardHeader>

      <CardContent className="p-4 flex flex-col gap-4">
        <div className="min-h-[220px]">
          {view === "script" ? (
            <Textarea
              value={data.text || ""}
              onChange={(e) => data.onUpdate?.(id, { text: e.target.value })}
              placeholder="Enter scene script..."
              className="nodrag nopan nowheel w-full min-h-[180px] p-4 text-[14px] leading-relaxed text-foreground font-medium italic bg-muted/10 border border-border/50 rounded-xl focus-visible:ring-primary/20 transition-all resize-none"
            />
          ) : (
            <div className="flex flex-col items-center justify-center py-6 gap-6">
              {hasVoice ? (
                <>
                  <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center border-2 border-primary/20 shadow-xl animate-pulse">
                    <Volume2 className="w-10 h-10 text-primary" />
                  </div>
                  <div className="flex flex-col items-center gap-2">
                    <span className="text-sm font-black text-foreground uppercase tracking-widest">Voice Preview</span>
                    <div className="flex items-center gap-2 px-3 py-1 bg-muted rounded-full text-[10px] font-black text-muted-foreground uppercase tracking-tighter shadow-inner">
                      <Clock className="w-3 h-3" />
                      {(data.voiceDuration || 0).toFixed(1)}s
                    </div>
                  </div>
                  <audio controls src={data.voiceUrl} className="w-full h-10 scale-90 opacity-80" />
                </>
              ) : (
                <div className="flex flex-col items-center gap-4 text-muted-foreground/30 py-10">
                  <Mic className="w-12 h-12" />
                  <span className="text-[10px] font-black uppercase tracking-[0.2em]">No Voice Sync</span>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-3 pt-2">
           <Label className="text-[9px] font-black text-muted-foreground uppercase tracking-widest opacity-60 px-1">
            Visual Flow
          </Label>
          <div className="grid grid-cols-2 gap-4">
            <div className="relative flex items-center gap-2 p-2 rounded-lg bg-muted/20 border border-border/50">
              <Handle
                id="script"
                type="target"
                position={Position.Left}
                className="!w-3 !h-3 !bg-muted-foreground/40 !border-2 !border-background shadow-lg hover:scale-110 transition-transform"
              />
              <span className="text-[10px] font-bold text-muted-foreground/80">From Master</span>
            </div>
            <div className="relative flex items-center justify-end gap-2 p-2 rounded-lg bg-primary/5 border border-primary/10">
              <span className="text-[10px] font-bold text-primary/80">Scene Visuals</span>
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

export default memo(UnifiedSegmentNode);
