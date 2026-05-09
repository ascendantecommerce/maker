"use client";

import React, { useState, memo } from "react";
import { Handle, Position, type NodeProps, type Node } from "@xyflow/react";
import { cn } from "@/lib/utils";
import {
  Sparkles,
  Video,
  Image as ImageIcon,
  Wand2,
  Settings2,
  Play,
  Eye,
  FileText,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { VideoPlayer } from "@/components/ui/video-player";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type UnifiedShotNodeData = {
  type: "IMAGE" | "VIDEO";
  promptText: string;
  outputUrl?: string;
  status: "idle" | "generating" | "completed" | "error";
  model?: string;
  isProduct?: boolean;
  isVideo?: boolean;
  onUpdate?: (id: string, updates: any) => void;
  onGenerate?: (id: string) => void;
};

export type UnifiedShotNode = Node<UnifiedShotNodeData>;

function UnifiedShotNode({ id, data, selected }: NodeProps<UnifiedShotNode>) {
  const [view, setView] = useState<"prompt" | "output">(data.outputUrl ? "output" : "prompt");
  const isVideo = data.type === "VIDEO";

  const activeHandles = [
    { id: "script", type: "text" },
    { id: "image", type: "image", show: data.isVideo },
    { id: "product", type: "product", show: data.isProduct },
  ].filter((h) => h.id === "script" || h.show);

  return (
    <div className="group relative flex flex-col bg-card border-2 rounded-xl shadow-2xl transition-all overflow-hidden"
      style={{ width: 400, height: 460 }}>

      {/* Header with Toggle */}
      <div className="flex items-center justify-between px-4 py-3 bg-muted/30 border-b border-border">
        <div className="flex items-center gap-2">
          {isVideo ? (
            <Video className="w-3.5 h-3.5 text-primary" />
          ) : (
            <ImageIcon className="w-3.5 h-3.5 text-primary" />
          )}
          <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
            {isVideo ? "Motion Shot" : "Visual Shot"}
          </span>
        </div>

        <div className="flex bg-muted/50 p-1 rounded-lg border border-border/50">
          <button
            onClick={() => setView("prompt")}
            className={cn(
              "px-3 py-1 rounded-md text-[10px] font-bold transition-all flex items-center gap-1.5",
              view === "prompt"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <FileText className="w-3 h-3" />
            PROMPT
          </button>
          <button
            onClick={() => setView("output")}
            className={cn(
              "px-3 py-1 rounded-md text-[10px] font-bold transition-all flex items-center gap-1.5",
              view === "output"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Eye className="w-3 h-3" />
            OUTPUT
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 flex flex-col p-5">
        {view === "prompt" ? (
          <div className="flex-1 flex flex-col space-y-4">
            <div className="flex-1">
              <textarea
                value={data.promptText || ""}
                onChange={(e) => data.onUpdate?.(id, { promptText: e.target.value })}
                placeholder="Enter generation prompt..."
                className="w-full h-full min-h-[180px] text-[14px] leading-relaxed text-foreground font-medium bg-transparent border-none resize-none focus:outline-none focus:ring-0 scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent"
              />
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-border/50">
              <div className="flex items-center gap-2">
                <Select
                  value={data.model || (isVideo ? "luma-ray" : "flux-pro")}
                  onValueChange={(val) => data.onUpdate?.(id, { model: val })}
                >
                  <SelectTrigger className="h-9 w-auto min-w-[120px] text-[11px] bg-muted/50 border-border rounded-xl focus:ring-0">
                    <SelectValue placeholder="Model" />
                  </SelectTrigger>
                  <SelectContent>
                    {isVideo ? (
                      <>
                        <SelectItem value="luma-ray">Luma Ray</SelectItem>
                        <SelectItem value="runway-gen3">Runway Gen-3</SelectItem>
                      </>
                    ) : (
                      <>
                        <SelectItem value="flux-pro">Flux Pro</SelectItem>
                        <SelectItem value="dalle-3">DALL-E 3</SelectItem>
                      </>
                    )}
                  </SelectContent>
                </Select>
                <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl border border-border/50">
                  <Settings2 className="w-4 h-4" />
                </Button>
              </div>

              <Button
                size="icon"
                className={cn(
                  "h-11 w-11 rounded-full shadow-lg transition-all",
                  data.status === "generating" ? "bg-muted cursor-not-allowed" : "bg-primary hover:scale-105"
                )}
                onClick={(e) => {
                  e.stopPropagation();
                  data.onGenerate?.(id);
                  setView("output");
                }}
                disabled={data.status === "generating"}
              >
                {data.status === "generating" ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Play className="w-5 h-5 fill-current ml-0.5" />
                )}
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col min-h-0">
            <div className="relative w-full h-[300px] rounded-xl bg-black/60 border border-border/50 overflow-hidden group/media flex items-center justify-center">
              {data.outputUrl ? (
                isVideo ? (
                  <VideoPlayer
                    src={data.outputUrl}
                    size="full"
                    objectFit="contain"
                    showBottomControls={false}
                    className="w-full h-full absolute inset-0 rounded-none"
                  />
                ) : (
                  <img src={data.outputUrl} alt="Output" className="max-w-full max-h-full object-contain" />
                )
              ) : (
                <div className="flex flex-col items-center gap-3 text-muted-foreground/40">
                  {data.status === "generating" ? (
                    <>
                      <Loader2 className="w-10 h-10 animate-spin" />
                      <span className="text-xs font-bold tracking-widest uppercase">Generating...</span>
                    </>
                  ) : (
                    <>
                      <Wand2 className="w-10 h-10 opacity-20" />
                      <span className="text-xs font-bold tracking-widest uppercase">No Output Yet</span>
                    </>
                  )}
                </div>
              )}

              {/* Status Badge Over Media */}
              <div className="absolute top-4 right-4">
                {data.status === "completed" && (
                  <div className="flex items-center gap-1.5 px-2 py-1 bg-green-500/90 text-white rounded-full text-[9px] font-black uppercase tracking-tighter shadow-xl">
                    <CheckCircle2 className="w-3 h-3" />
                    Ready
                  </div>
                )}
                {data.status === "error" && (
                  <div className="flex items-center gap-1.5 px-2 py-1 bg-destructive/90 text-white rounded-full text-[9px] font-black uppercase tracking-tighter shadow-xl">
                    <AlertCircle className="w-3 h-3" />
                    Failed
                  </div>
                )}
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                {isVideo ? "Generated Motion" : "Generated Frame"}
              </span>
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-[10px] font-black uppercase tracking-tighter rounded-lg"
                onClick={() => setView("prompt")}
              >
                Refine Prompt
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Handles */}
      {activeHandles.map((h, i) => {
        const count = activeHandles.length;
        const top = count === 1 ? 50 : 25 + i * (50 / (count - 1));

        return (
          <Handle
            key={h.id}
            type="target"
            id={h.id}
            position={Position.Left}
            className="!w-9 !h-9 !bg-muted/80 !border-2 !border-border !rounded-full flex items-center justify-center !-left-4 !-translate-y-1/2 z-10 shadow-lg hover:scale-110 transition-transform"
            style={{ top: `${top}%` }}
          >
            {h.type === "text" && <FileText className="w-3.5 h-3.5 text-white" />}
            {h.type === "image" && <ImageIcon className="w-3.5 h-3.5 text-white" />}
            {h.type === "product" && <Wand2 className="w-3.5 h-3.5 text-white" />}
          </Handle>
        );
      })}

      <Handle
        type="source"
        position={Position.Right}
        className="!w-9 !h-9 !bg-primary !border-2 !border-border !rounded-full flex items-center justify-center !-right-4 !top-1/2 !-translate-y-1/2 z-10 shadow-lg hover:scale-110 transition-transform"
      >
        <Sparkles className="w-3.5 h-3.5 text-white pointer-events-none" />
      </Handle>

      {/* Vertical Handles for Image -> Video flow */}
      <Handle
        type="source"
        id="bottom"
        position={Position.Bottom}
        className="!w-6 !h-6 !bg-primary !border-2 !border-border !rounded-full !-bottom-3 !left-1/2 !-translate-x-1/2 z-10 shadow-lg"
      />

      <Handle
        type="target"
        id="top"
        position={Position.Top}
        className="!w-6 !h-6 !bg-muted/80 !border-2 !border-border !rounded-full !-top-3 !left-1/2 !-translate-x-1/2 z-10 shadow-lg"
      />
    </div>
  );
}

export default memo(UnifiedShotNode);
