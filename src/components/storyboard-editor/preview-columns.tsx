"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { GeneratedVideo, GeneratedAsset } from "@/stores/schema-store";
import type { Segment } from "@/lib/schema-generator/types";
import { Loader2, X, Video, Play } from "lucide-react";
import { VideoPlayer } from "@/components/ui/video-player";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { useCallback, useEffect, useRef, useState } from "react";
import { Studio } from "openvideo";
import {
  IconPlayerPlayFilled,
  IconPlayerPauseFilled,
  IconPlayerSkipBack,
  IconPlayerSkipForward,
} from "@tabler/icons-react";
import { convertUgcSchemaToDesign } from "@/utils/ugc-schema-converter";
import { convertSchemaToDesign } from "@/utils/schema-converter";
import { formatTimeCode } from "@/lib/time";

interface ThumbnailStripProps {
  assets: any[]; // Changed to any to accommodate renamed clips if needed, but passing seg.clips works
  selectedUrl?: string;
  type: "image" | "video";
  onSelect: (asset: GeneratedAsset) => void;
  onDelete?: (asset: GeneratedAsset) => void;
  className?: string;
}

export function ThumbnailStrip({
  assets,
  selectedUrl,
  type,
  onSelect,
  onDelete,
  className,
}: ThumbnailStripProps) {
  const filteredAssets = assets.filter((a) => a.type === type);

  if (filteredAssets.length === 0) return null;

  return (
    <div
      className={cn(
        "absolute top-6 left-6 z-10 w-12 flex flex-col gap-3 overflow-y-auto no-scrollbar max-h-[calc(100%-48px)] p-1 rounded-xl bg-black/20 backdrop-blur-xl border border-white/5",
        className,
      )}
    >
      {filteredAssets.map((asset, idx) => (
        <div
          key={asset.id}
          onClick={() => asset.url && onSelect(asset)}
          className={cn(
            "relative aspect-square rounded-lg overflow-hidden cursor-pointer border-2 transition-all shrink-0 shadow-lg group/thumb",
            selectedUrl === asset.url
              ? "border-primary ring-2 ring-primary/20 scale-105"
              : "border-white/10 opacity-70 hover:opacity-100 hover:border-white/30 hover:scale-105",
            asset.status === "generating" && "animate-pulse bg-muted",
          )}
        >
          {asset.status === "generating" ? (
            <div className="w-full h-full flex items-center justify-center">
              <Loader2 className="w-4 h-4 text-primary animate-spin" />
            </div>
          ) : asset.type === "video" ? (
            <>
              <VideoPlayer
                src={asset.url!}
                showControls={false}
                autoPlay
                loop
                muted
                size="full"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover/thumb:bg-black/10 transition-colors pointer-events-none">
                <Play className="w-3.5 h-3.5 text-white fill-current opacity-80" />
              </div>
            </>
          ) : (
            <img src={asset.url} alt={`Gen ${idx}`} className="w-full h-full object-cover" />
          )}

          {asset.status === "failed" && (
            <div className="absolute inset-0 bg-destructive/40 flex items-center justify-center">
              <X className="w-4 h-4 text-white" />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

interface VideoPlayerColumnProps {
  schema?: any;
  selectedSegment?: Segment;
  selectedVideo?: GeneratedVideo;
  onSelectAsset: (asset: GeneratedAsset) => void;
  onDeleteAsset: (asset: GeneratedAsset) => void;
  isGenerating: boolean;
}

export function VideoPlayerColumn({
  schema,
  selectedSegment,
  selectedVideo,
  onSelectAsset,
  onDeleteAsset,
  isGenerating,
}: VideoPlayerColumnProps) {
  const studioRef = useRef<Studio | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoadingDesign, setIsLoadingDesign] = useState(false);
  const [currentTimeUs, setCurrentTimeUs] = useState(0);
  const [durationUs, setDurationUs] = useState(0);

  const currentTimeSec = currentTimeUs / 1_000_000;
  const durationSec = durationUs / 1_000_000;
  const progressPercent = durationUs > 0 ? (currentTimeUs / durationUs) * 100 : 0;
  const aspectRatioLabel = schema?.aspectRatio || "9:16";

  const canvasRef = useCallback((canvas: HTMLCanvasElement | null) => {
    if (!canvas) {
      studioRef.current?.destroy();
      studioRef.current = null;
      return;
    }

    const studio = new Studio({
      width: 1080,
      height: 1920,
      canvas,
      bgColor: "#1C161D",
      spacing: 20,
    });
    studioRef.current = studio;

    studio.on("currentTime", ({ currentTime }: { currentTime: number }) => {
      setCurrentTimeUs(currentTime);
    });
    studio.on("studio:restored", () => {
      setDurationUs(studio.getMaxDuration());
      setCurrentTimeUs(0);
    });
    studio.on("play", () => setIsPlaying(true));
    studio.on("pause", () => setIsPlaying(false));
  }, []);

  const lastLoadedSchemaRef = useRef<string | null>(null);

  useEffect(() => {
    const loadFullDesign = async () => {
      if (!schema || !studioRef.current || isGenerating) return;

      const schemaStr = JSON.stringify(schema);
      if (lastLoadedSchemaRef.current === schemaStr) return;

      setIsLoadingDesign(true);
      try {
        let design: any;
        if (schema.type === "ugc-video-ad" || schema.type === "ugc-video") {
          design = await convertUgcSchemaToDesign(schema);
        } else {
          design = await convertSchemaToDesign(schema);
        }
        console.log("LOAD FROM JSON", design);
        if (design) {
          await studioRef.current.loadFromJSON(design);
          lastLoadedSchemaRef.current = schemaStr;
        }
      } catch (err) {
        console.error("Failed to load design", err);
      } finally {
        setIsLoadingDesign(false);
      }
    };

    const timer = setTimeout(loadFullDesign, 50);
    return () => clearTimeout(timer);
  }, [schema, isGenerating]);

  useEffect(() => {
    if (!selectedSegment || !studioRef.current || !schema?.segments) return;
    const segments: any[] = schema.segments;
    const selectedIndex = segments.findIndex(
      (s: any) => s === selectedSegment || s.id === selectedSegment.id,
    );
    if (selectedIndex <= 0) {
      studioRef.current.seek(0);
      return;
    }
    let cumulativeUs = 0;
    for (let i = 0; i < selectedIndex; i++) {
      const seg = segments[i];
      const shots: any[] = seg.shots ?? [];
      for (const shot of shots) {
        if (shot.display?.from != null && shot.display?.to != null)
          cumulativeUs += (shot.display.to - shot.display.from) * 1000;
        else if (shot.duration != null) cumulativeUs += shot.duration * 1_000_000;
      }
    }
    studioRef.current.seek(cumulativeUs);
  }, [selectedSegment, schema]);

  const handlePlay = async () => studioRef.current?.play();
  const handlePause = async () => studioRef.current?.pause();

  const handleSeekSlider = async (values: number[]) => {
    if (!studioRef.current || durationUs === 0) return;
    const newUs = (values[0] / 100) * durationUs;
    setCurrentTimeUs(newUs);
    await studioRef.current.seek(newUs);
  };

  return (
    <div className="flex-1 flex flex-col bg-[#0A0A0A] min-w-0 relative h-full overflow-hidden">
      {/* Main Canvas Area */}
      <div className="flex-1 relative flex items-center justify-center min-h-0 bg-background z-10">
        {(isLoadingDesign || isGenerating) && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 backdrop-blur-md z-20">
            <Loader2 className="w-8 h-8 text-primary animate-spin mb-4" />
            <h4 className="text-zinc-100 font-medium tracking-tight">
              {isGenerating ? "Crafting Visuals..." : "Synchronizing..."}
            </h4>
          </div>
        )}

        {schema ? (
          <div className="w-full h-full flex items-center justify-center">
            <canvas
              ref={canvasRef}
              className="max-h-full max-w-full object-contain shadow-2xl"
              id="studio-container"
            />
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center text-center p-12 relative overflow-hidden">
            <div className="w-24 h-24 rounded-[2rem] bg-white/5 border border-white/10 flex items-center justify-center mb-8 shadow-2xl backdrop-blur-xl">
              <Video className="w-10 h-10 text-muted-foreground/30" />
            </div>
            <h4 className="text-xl font-semibold mb-3 tracking-tight text-foreground">
              Awaiting Director
            </h4>
            <p className="text-sm text-muted-foreground max-w-64 leading-relaxed">
              Once your script is ready, we'll render your cinematic preview here.
            </p>
          </div>
        )}
      </div>

      {/* Full-width Footer aligned with QuickPreview style */}
      {schema && (
        <div className="shrink-0 flex flex-col bg-[#161412] border-t border-border/50 z-30 px-6 py-3">
          {/* Progress Slider inside footer */}
          <div className="w-full mb-3">
            <Slider
              value={[progressPercent]}
              onValueChange={handleSeekSlider}
              min={0}
              max={100}
              step={0.01}
              disabled={isLoadingDesign || isGenerating}
              className="w-full cursor-pointer h-1.5"
            />
          </div>

          <div className="flex items-center justify-between">
            {/* Left: Timecode */}
            <div className="flex items-center gap-2 text-xs font-medium tabular-nums min-w-24">
              <span className="text-foreground">{formatTimeCode(currentTimeSec, "MM:SS")}</span>
              <span className="text-muted-foreground/40">/</span>
              <span className="text-muted-foreground">{formatTimeCode(durationSec, "MM:SS")}</span>
            </div>

            {/* Center: Playback Controls */}
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                className="w-10 h-10 rounded-full hover:bg-white/5 transition-all text-foreground/80 hover:text-foreground active:scale-95 disabled:opacity-40"
                onClick={() => studioRef.current?.seek(0)}
                disabled={isLoadingDesign || isGenerating}
              >
                <IconPlayerSkipBack className="h-4 w-4" />
              </Button>

              <button
                className="w-12 h-12 flex items-center justify-center rounded-full bg-white text-black hover:scale-105 active:scale-95 transition-all shadow-xl disabled:opacity-50"
                onClick={isPlaying ? handlePause : handlePlay}
                disabled={isLoadingDesign || isGenerating}
              >
                {isPlaying ? (
                  <IconPlayerPauseFilled className="h-5 w-5 fill-current" />
                ) : (
                  <IconPlayerPlayFilled className="h-5 w-5 ml-0.5 fill-current" />
                )}
              </button>

              <Button
                variant="ghost"
                size="icon"
                className="w-10 h-10 rounded-full hover:bg-white/5 transition-all text-foreground/80 hover:text-foreground active:scale-95 disabled:opacity-40"
                onClick={() => studioRef.current?.seek(durationUs)}
                disabled={isLoadingDesign || isGenerating}
              >
                <IconPlayerSkipForward className="h-4 w-4" />
              </Button>
            </div>

            {/* Right: Aspect Ratio */}
            <div className="flex items-center gap-3 min-w-24 justify-end">
              <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/5 shadow-inner">
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/80">
                  {aspectRatioLabel}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
