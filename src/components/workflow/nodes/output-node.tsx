"use client";

import React, { memo } from "react";
import { Position, type NodeProps, type Node, Handle } from "@xyflow/react";
import { Eye, RefreshCw, Settings2, Plus, Minus, ChevronDown, Wand2, Loader2, ImageIcon, Type } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { VideoPlayer } from "@/components/ui/video-player";

export type OutputNodeData = {
  type: "IMAGE" | "VIDEO";
  outputUrl?: string;
  status: "idle" | "processing" | "success" | "error";
  promptText?: string;
  resolution?: string;
  segmentId?: string;
  shotIndex?: number;
  onUpdate?: (id: string, updates: any) => void;
  onGenerate?: (segmentId: string, shotIndexStr: string, type: "IMAGE" | "VIDEO") => void;
};

export type OutputNode = Node<OutputNodeData, "output">;

function OutputNode({ id, data, selected }: NodeProps<OutputNode>) {
  const isVideo = data.type === "VIDEO";

  return (
    <div className="relative group/node w-full h-full bg-transparent">
      {/* Label above the card - Moved to absolute -top to sit outside the clipping boundary */}
      <div className="absolute -top-7 left-0 flex items-center gap-2 px-1 pointer-events-none whitespace-nowrap z-30">
        <Eye className="w-3.5 h-3.5" />
        <span className="text-sm font-bold">
          {isVideo ? "Motion Output" : "Visual Output"}
        </span>
      </div>

      <div
        className={cn(
          "relative w-full h-full rounded-xl  border-border border-3 transition-all duration-500 bg-card overflow-hidden",
          selected && "border-primary/40"
        )}
      >
        <div className="relative w-full h-full flex flex-col">
          {/* Media Container - Perfectly flush with the rounded card edges */}
          <div className="absolute inset-0 z-0">
            {data.outputUrl ? (
              isVideo ? (
                <VideoPlayer
                  src={data.outputUrl}
                  size="full"
                  objectFit="cover"
                  showBottomControls={false}
                  className="w-full h-full rounded-none"
                />
              ) : (
                <img src={data.outputUrl} alt="Output" className="w-full h-full object-cover" />
              )
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center gap-4 text-muted-foreground/20 bg-muted/5">
                {data.status === "processing" ? (
                  <>
                    <Loader2 className="w-12 h-12 animate-spin text-primary/40" />
                    <span className="text-[10px] font-black tracking-[0.2em] uppercase animate-pulse">Processing...</span>
                  </>
                ) : (
                  <>
                    <Wand2 className="w-12 h-12 opacity-10" />
                    <span className="text-[10px] font-black tracking-[0.2em] uppercase">No Result</span>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Floating Overlays */}
          <div className="relative w-full h-full pointer-events-none">

            {/* Bottom Overlay Info */}
            <div className="absolute bottom-0 left-0 right-0 z-10 p-6 pt-24 bg-gradient-to-t from-background via-background/20 to-transparent pointer-events-auto">
              <div className="flex flex-col gap-5">


                {/* Toolbar */}
                <div className="flex items-center justify-end gap-2 mt-1">

                  <div className="flex items-center gap-2">
                    <Button
                      size="icon"
                      className={cn(
                        "h-9 w-9 p-0 rounded-full shadow-2xl transition-all "
                      )}
                      variant={data.status === "processing" ? "outline" : 'default'}
                      onClick={() => {
                        if (data.segmentId && data.shotIndex !== undefined) {
                          data.onGenerate?.(data.segmentId, data.shotIndex.toString(), data.type);
                        }
                      }}
                      disabled={data.status === "processing"}
                    >
                      {data.status === "processing" ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <RefreshCw className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Input handle — fully outside left border */}
      <Handle
        id="input"
        type="target"
        position={Position.Left}
        className="!w-10 !h-10 !rounded-full !bg-card !border !border-border border-2! !shadow-lg !flex !items-center !justify-center"
        style={{ left: -40, top: "50%", transform: "translateY(-50%)" }}
      >
        <ImageIcon className="w-4 h-4   pointer-events-none" />
      </Handle>

      {/* Output handle — fully outside right border */}
      <Handle
        id="result"
        type="source"
        position={Position.Right}
        className="!w-10 !h-10 !rounded-full !bg-card !border !border-border/60 !shadow-lg !flex !items-center !justify-center"
        style={{ right: -40, top: "50%", transform: "translateY(-50%)" }}
      >
        <Type className="w-4 h-4 text-muted-foreground/70 pointer-events-none" />
      </Handle>
    </div>
  );
}

export default memo(OutputNode);
