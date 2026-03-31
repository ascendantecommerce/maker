"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Image as ImageIcon, Loader2, VideoIcon, Trash2 } from "lucide-react";
import { Segment } from "@/lib/schema-generator/types";
import { GeneratedFrame } from "@/stores/schema-store";

interface StoryboardProps {
  segments: Segment[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onDelete?: (id: string) => void;
  frames?: Record<string, GeneratedFrame>;
  videos?: Record<string, { url: string }>;
  generatingFrames?: Record<string, boolean>;
  generatingVideos?: Record<string, boolean>;
  onTranscribe?: (id: string) => void;
}

export const Storyboard = ({
  segments = [],
  selectedId,
  onSelect,
  onDelete,
  onTranscribe,
  frames = {},
  videos = {},
  generatingFrames = {},
  generatingVideos = {},
}: StoryboardProps) => {
  // No longer need previewType state since all shots are shown inline

  return (
    <div className="flex flex-col h-full bg-background border-r border-border/50">
      <div className="px-5 py-4 border-b border-border/40 flex items-center justify-between shrink-0 bg-card/30 backdrop-blur-md">
        <h3 className="font-semibold text-sm tracking-tight text-foreground">Storyboard</h3>
        <span className="text-[10px] font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full border border-border/50">
          {segments.length} Scenes
        </span>
      </div>

      <ScrollArea className="flex-1">
        <div className="flex flex-col p-4 gap-3">
          {segments.map((seg, index) => {
            const isSelected = selectedId === seg.id;

            // Format time for scenes
            const startTime = segments
              .slice(0, index)
              .reduce((acc, s) => acc + (s.duration || 0), 0);

            const formatTime = (t: number) => {
              const m = Math.floor(t / 60);
              const s = Math.floor(t % 60);
              return `${m}:${s.toString().padStart(2, "0")}`;
            };

            return (
              <div
                key={seg.id || index}
                onClick={() => onSelect(seg.id)}
                className={cn(
                  "relative group cursor-pointer rounded-sm p-5 transition-all duration-300 border",
                  isSelected
                    ? "bg-card border-primary/20 shadow-[0_8px_30px_rgb(0,0,0,0.12)] ring-1 ring-primary/10"
                    : "bg-transparent border-transparent hover:bg-card/40 hover:border-border/40",
                )}
              >
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col gap-3">
                    {/* Scene Metadata Header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div
                          className={cn(
                            "px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border",
                            isSelected
                              ? "bg-primary/10 border-primary/20 text-primary"
                              : "bg-muted border-border text-muted-foreground",
                          )}
                        >
                          Scene {index + 1}
                        </div>
                        <span className="text-[10px] font-medium text-muted-foreground/60 tabular-nums">
                          {formatTime(startTime / 1000)}
                        </span>
                      </div>
                      {onDelete && isSelected && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDelete(seg.id);
                          }}
                          className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-destructive/10 hover:text-destructive rounded-md transition-all"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {/* Narration Text */}
                    <p
                      className={cn(
                        "text-[13.5px] leading-relaxed transition-colors tracking-tight font-normal",
                        isSelected ? "text-foreground" : "text-muted-foreground/80 line-clamp-3",
                      )}
                    >
                      {seg.text || "Empty scene narration..."}
                    </p>
                  </div>

                  {/* Shots Row: Horizontally scrollable strip of shots */}
                  {((seg.shots && seg.shots.length > 0) ||
                    generatingFrames?.[seg.id] ||
                    generatingVideos?.[seg.id]) && (
                    <div className="flex items-center gap-2.5 overflow-x-auto pb-1 no-scrollbar">
                      {seg.shots?.map((shot, shotIdx) => {
                        const showVideo = !!shot.videoUrl;
                        const showImage = !!shot.imageUrl;
                        const imgSource = shot.imageUrl;
                        const vidSource = shot.videoUrl;

                        return (
                          <div
                            key={shotIdx}
                            className="aspect-video w-28 shrink-0 rounded-lg overflow-hidden border border-border/60 bg-muted/30 relative group/shot shadow-sm"
                          >
                            {showVideo ? (
                              <>
                                <video
                                  src={vidSource}
                                  className="w-full h-full object-cover"
                                  muted
                                  autoPlay={false}
                                />
                                <div className="absolute top-1 left-1 bg-black/40 backdrop-blur-md p-1 rounded-sm border border-white/10">
                                  <VideoIcon className="w-2.5 h-2.5 text-white" />
                                </div>
                                {shot.duration && (
                                  <div className="absolute bottom-1 right-1 bg-black/60 backdrop-blur-md px-1.5 py-0.5 rounded-sm text-[9px] font-bold text-white tabular-nums border border-white/5">
                                    {formatTime(shot.duration / 1000)}
                                  </div>
                                )}
                              </>
                            ) : showImage ? (
                              <>
                                <img
                                  src={imgSource}
                                  className="w-full h-full object-cover"
                                  alt="Shot preview"
                                />
                                {shot.duration && (
                                  <div className="absolute bottom-1 right-1 bg-black/60 backdrop-blur-md px-1.5 py-0.5 rounded-sm text-[9px] font-bold text-white tabular-nums border border-white/5">
                                    {formatTime(shot.duration / 1000)}
                                  </div>
                                )}
                              </>
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-secondary/20">
                                <ImageIcon className="w-5 h-5 text-muted-foreground/20" />
                              </div>
                            )}

                            {/* Overlay glow on hover */}
                            <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover/shot:opacity-100 transition-opacity pointer-events-none" />
                          </div>
                        );
                      })}

                      {/* Loading states appended to shots row */}
                      {(generatingFrames?.[seg.id] || generatingVideos?.[seg.id]) && (
                        <div className="aspect-video w-28 shrink-0 rounded-lg overflow-hidden border border-primary/20 bg-primary/5 animate-pulse flex flex-col items-center justify-center gap-2">
                          <Loader2 className="w-4 h-4 text-primary animate-spin" />
                          <span className="text-[8px] font-bold uppercase tracking-widest text-primary/60">
                            Generating
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {segments.length === 0 && (
            <div className="flex flex-col items-center justify-center py-24 text-center space-y-4 opacity-50">
              <div className="p-5 rounded-3xl bg-card border border-dashed border-border flex items-center justify-center shadow-inner">
                <ImageIcon className="w-7 h-7 text-muted-foreground/50" />
              </div>
              <div className="space-y-1.5">
                <p className="text-sm font-semibold text-foreground">No Scenes Yet</p>
                <p className="text-xs leading-relaxed max-w-44 mx-auto text-muted-foreground">
                  Generate a script to start building your storyboard.
                </p>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};
