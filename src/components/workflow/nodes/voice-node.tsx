"use client";

import React, { memo } from "react";
import { Position, type NodeProps, type Node, Handle } from "@xyflow/react";
import { Volume2, Mic, Clock, Play } from "lucide-react";
import { cn } from "@/lib/utils";
import { CardContent } from "@/components/ui/card";

export type VoiceNodeData = {
  voiceUrl?: string;
  voiceDuration?: number;
};

export type VoiceNode = Node<VoiceNodeData, "voice">;

function VoiceNode({ id, data, selected }: NodeProps<VoiceNode>) {
  const hasVoice = !!data.voiceUrl;

  return (
    <div className="relative group/node w-full h-full bg-transparent">
      {/* Label above the card */}
      <div className="absolute -top-7 left-0 flex items-center gap-2 px-1 pointer-events-none whitespace-nowrap z-30">
        <Mic className="w-3.5 h-3.5 text-muted-foreground/60 drop-shadow-md" />
        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60 drop-shadow-md">
          Voice Engine
        </span>
      </div>

      <div
        className={cn(
          "w-full h-full transition-all duration-500 rounded-[32px] overflow-hidden bg-card shadow-2xl border-2",
          selected ? "border-primary/50 shadow-[0_0_50px_-12px_rgba(var(--primary),0.3)]" : "border-border/40 group-hover/node:border-border/60"
        )}
      >
        <div className="flex flex-col h-full">
          <CardContent className="p-6 flex flex-col items-center justify-center h-full gap-6">
            {hasVoice ? (
              <>
                <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center border-4 border-primary/20 shadow-xl relative group/voice">
                  <Volume2 className="w-10 h-10 text-primary transition-transform group-hover/voice:scale-110" />
                  <div className="absolute inset-0 rounded-full border-2 border-primary/40 animate-ping opacity-20" />
                </div>
                <div className="flex flex-col items-center gap-2">
                  <div className="flex items-center gap-2 px-4 py-1.5 bg-muted rounded-full text-[11px] font-black text-muted-foreground uppercase tracking-widest shadow-inner border border-border/50">
                    <Clock className="w-3.5 h-3.5" />
                    {(data.voiceDuration || 0).toFixed(2)}s
                  </div>
                </div>
                <audio controls src={data.voiceUrl} className="w-full h-10 scale-90 opacity-80" />
              </>
            ) : (
              <div className="flex flex-col items-center gap-4 text-muted-foreground/20 py-10">
                <Mic className="w-16 h-16 opacity-10" />
                <span className="text-[11px] font-black uppercase tracking-[0.3em]">Processing...</span>
              </div>
            )}
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

export default memo(VoiceNode);
