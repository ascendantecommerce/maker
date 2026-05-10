"use client";

import React, { memo, useRef } from "react";
import { Position, type NodeProps, type Node, Handle } from "@xyflow/react";
import { PencilRuler, Settings2, Play, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CardContent, CardFooter } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

export type PromptNodeData = {
  type: "IMAGE" | "VIDEO";
  promptText: string;
  status: "idle" | "processing" | "success" | "error";
  model?: string;
  onUpdate?: (id: string, updates: any) => void;
  onGenerate?: (id: string) => void;
};

export type PromptNode = Node<PromptNodeData, "prompt">;

function PromptNode({ id, data, selected }: NodeProps<PromptNode>) {
  const isVideo = data.type === "VIDEO";
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  return (
    <div className="relative group/node w-full h-full bg-transparent">
      {/* Label above the card */}
      <div className="absolute -top-7 left-0 flex items-center gap-2 px-1 pointer-events-none whitespace-nowrap z-30">
        <PencilRuler className="w-3.5 h-3.5 text-muted-foreground/60 drop-shadow-md" />
        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60 drop-shadow-md">
          {isVideo ? "Motion Prompt" : "Visual Prompt"}
        </span>
      </div>

      <div
        className={cn(
          "w-full h-full transition-all duration-500 rounded-[32px] overflow-hidden bg-card shadow-2xl border-2",
          selected ? "border-primary/50 shadow-[0_0_50px_-12px_rgba(var(--primary),0.3)]" : "border-border/40 group-hover/node:border-border/60"
        )}
      >
        <div className="flex flex-col h-full">
          <CardContent className="p-6 space-y-8 flex-1">
            <div className="space-y-3">
              <Label className="text-[10px] uppercase text-muted-foreground">
                Prompt
              </Label>
              <Textarea
                ref={textareaRef}
                value={data.promptText || ""}
                onChange={(e) => data.onUpdate?.(id, { promptText: e.target.value })}
                placeholder="Describe the visual scene..."
                className="min-h-[180px] max-h-[240px] text-[13px] leading-relaxed bg-transparent border-none focus-visible:ring-0 p-1 resize-none overflow-y-auto scrollbar-thin scrollbar-thumb-muted-foreground/10 scrollbar-track-transparent placeholder:text-muted-foreground/20"
              />
            </div>
          </CardContent>

          <CardFooter className="flex items-center justify-between gap-2 p-4 bg-muted/20 border-t border-border/40">
            <Button
              variant="outline"
              size="icon"
              className="h-10 w-10 shrink-0 bg-background border-border/40 rounded-full hover:bg-accent text-muted-foreground/60"
            >
              <Settings2 className="w-4 h-4" />
            </Button>

            <Button
              className={cn(
                "h-10 w-10 p-0 rounded-full shadow-2xl transition-all active:scale-90 shrink-0",
                data.status === "processing"
                  ? "bg-muted cursor-not-allowed"
                  : "bg-primary text-primary-foreground hover:bg-primary/90"
              )}
              onClick={() => data.onGenerate?.(id)}
              disabled={data.status === "processing"}
            >
              {data.status === "processing" ? (
                <Sparkles className="w-4 h-4 animate-spin" />
              ) : (
                <Play className="w-4 h-4 fill-current ml-0.5" />
              )}
            </Button>
          </CardFooter>
        </div>
      </div>

      {/* Handles */}
      <div className="absolute top-1/2 -left-3 -translate-y-1/2 z-20">
        <Handle
          id="asset"
          type="target"
          position={Position.Left}
          className="!w-6 !h-6 !bg-primary !border-[4px] !border-background shadow-2xl hover:scale-110 transition-transform"
        />
      </div>
      <div className="absolute top-1/2 -right-3 -translate-y-1/2 z-20">
        <Handle
          id="result"
          type="source"
          position={Position.Right}
          className="!w-6 !h-6 !bg-muted-foreground/30 !border-[4px] !border-background shadow-2xl hover:scale-110 transition-transform"
        />
      </div>
    </div>
  );
}

export default memo(PromptNode);
