"use client";

import React, { useState, memo } from "react";
import { Handle, Position, type NodeProps, type Node } from "@xyflow/react";
import { cn } from "@/lib/utils";
import {
  AlignLeft,
  Mic,
  Music,
  ArrowRight,
  Hash,
  Play,
  Volume2,
  Clock,
} from "lucide-react";

export type UnifiedSegmentNodeData = {
  text: string;
  voiceUrl?: string;
  voiceDuration?: number;
  label: string;
  onUpdate?: (id: string, updates: any) => void;
};

export type UnifiedSegmentNode = Node<UnifiedSegmentNodeData>;

function UnifiedSegmentNode({ id, data, selected }: NodeProps<UnifiedSegmentNode>) {
  const [view, setView] = useState<"script" | "voice">(data.voiceUrl ? "voice" : "script");
  const hasVoice = !!data.voiceUrl;

  return (
    <div className="group relative flex flex-col bg-card border-2 rounded-xl shadow-2xl transition-all overflow-hidden" 
         style={{ width: 400, height: 380 }}>
      
      {/* Header with Toggle */}
      <div className="flex items-center justify-between px-4 py-3 bg-muted/30 border-b border-border">
        <div className="flex items-center gap-2">
          <Hash className="w-3.5 h-3.5 text-primary" />
          <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
            {data.label}
          </span>
        </div>

        <div className="flex bg-muted/50 p-1 rounded-lg border border-border/50">
          <button
            onClick={() => setView("script")}
            className={cn(
              "px-3 py-1 rounded-md text-[10px] font-bold transition-all flex items-center gap-1.5",
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
              "px-3 py-1 rounded-md text-[10px] font-bold transition-all flex items-center gap-1.5",
              view === "voice" 
                ? "bg-background text-foreground shadow-sm" 
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Mic className="w-3 h-3" />
            VOICE
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 flex flex-col p-6">
        {view === "script" ? (
          <div className="flex-1">
            <textarea
              value={data.text || ""}
              onChange={(e) => data.onUpdate?.(id, { text: e.target.value })}
              placeholder="Enter scene script..."
              className="w-full h-full min-h-[150px] text-[15px] leading-relaxed text-foreground font-medium italic bg-transparent border-none resize-none focus:outline-none focus:ring-0 scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent"
            />
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center space-y-6">
            {hasVoice ? (
              <>
                <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center animate-pulse">
                  <Volume2 className="w-10 h-10 text-primary" />
                </div>
                <div className="flex flex-col items-center gap-2">
                  <span className="text-sm font-bold text-foreground">Voice Preview Ready</span>
                  <div className="flex items-center gap-2 px-3 py-1 bg-muted rounded-full text-[10px] font-bold text-muted-foreground uppercase">
                    <Clock className="w-3 h-3" />
                    {(data.voiceDuration || 0).toFixed(1)}s
                  </div>
                </div>
                <audio controls src={data.voiceUrl} className="w-full h-10 scale-90" />
              </>
            ) : (
              <div className="flex flex-col items-center gap-4 text-muted-foreground/30">
                <Mic className="w-12 h-12" />
                <span className="text-xs font-bold uppercase tracking-widest">No Voice Generated</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Handles */}
      <Handle
        type="target"
        position={Position.Left}
        className="!w-9 !h-9 !bg-muted/80 !border-2 !border-border !rounded-full flex items-center justify-center !-left-4 !top-1/2 !-translate-y-1/2 z-10 shadow-lg"
      >
        <AlignLeft className="w-3.5 h-3.5 text-white" />
      </Handle>

      <Handle
        type="source"
        position={Position.Right}
        className="!w-9 !h-9 !bg-primary !border-2 !border-border !rounded-full flex items-center justify-center !-right-4 !top-1/2 !-translate-y-1/2 z-10 shadow-lg"
      >
        <ArrowRight className="w-3.5 h-3.5 text-white" />
      </Handle>

      <Handle
        type="source"
        id="bottom"
        position={Position.Bottom}
        className="!w-9 !h-9 !bg-muted/80 !border-2 !border-border !rounded-full flex items-center justify-center !-bottom-4 !left-1/2 !-translate-x-1/2 z-10 shadow-lg"
      >
        <Music className="w-3.5 h-3.5 text-white" />
      </Handle>
    </div>
  );
}

export default memo(UnifiedSegmentNode);
