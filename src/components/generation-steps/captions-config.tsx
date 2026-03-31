"use client";
import { useState, useEffect, useCallback } from "react";
import { Check } from "lucide-react";
import { SelectableCard } from "@/components/ui/selectable-card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { NONE_PRESET, CAPTION_PRESETS } from "../editor/constant/caption";

interface Caption {
  id: string;
  name: string;
  position: "top" | "middle" | "bottom";
  size: "small" | "medium" | "large";
}

interface CaptionsConfigProps {
  caption: Caption;
  onCaptionChange: (caption: Caption) => void;
}

export function CaptionsConfig({ caption, onCaptionChange }: CaptionsConfigProps) {
  const [localCaption, setLocalCaption] = useState<Caption>(caption);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  // Sync local state with prop changes
  useEffect(() => {
    setLocalCaption(caption);
  }, [caption]);

  const handleCaptionIdChange = useCallback(
    (captionId: string) => {
      setIsPopoverOpen(false);
      const selectedCaptionObj = CAPTION_PRESETS.find((c) => c.id === captionId);
      if (selectedCaptionObj) {
        // Generate a name from the id (e.g., "caption-1" -> "Caption 1")
        const name = selectedCaptionObj.id
          .replace("caption-", "Caption ")
          .replace(/-/g, " ")
          .replace(/\b\w/g, (l) => l.toUpperCase());
        const updatedCaption: Caption = {
          ...localCaption,
          id: captionId,
          name,
        };
        setLocalCaption(updatedCaption);
        onCaptionChange(updatedCaption);
      }
    },
    [onCaptionChange, localCaption],
  );

  const handlePositionChange = useCallback(
    (position: "top" | "middle" | "bottom") => {
      const updatedCaption: Caption = {
        ...localCaption,
        position,
      };
      setLocalCaption(updatedCaption);
      onCaptionChange(updatedCaption);
    },
    [onCaptionChange, localCaption],
  );

  const handleSizeChange = useCallback(
    (size: "small" | "medium" | "large") => {
      const updatedCaption: Caption = {
        ...localCaption,
        size,
      };
      setLocalCaption(updatedCaption);
      onCaptionChange(updatedCaption);
    },
    [onCaptionChange, localCaption],
  );

  const selectedCaptionObj = CAPTION_PRESETS.find((c) => c.id === localCaption.id) || NONE_PRESET;

  return (
    <div className="items-center justify-between px-6  font-medium py-6 space-y-6">
      <div className="flex items-center">Captions</div>
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-[1fr_240px] items-center gap-4 border-b border-zinc-800/50 pb-6">
          <div className="space-y-1">
            <div className="text-sm font-medium text-foreground">Position</div>
            <div className="text-xs text-muted-foreground">
              Choose where the captions should appear on the screen
            </div>
          </div>
          <Select
            value={localCaption.position}
            onValueChange={(value: "top" | "middle" | "bottom") => handlePositionChange(value)}
          >
            <SelectTrigger className="w-full h-9 bg-background border-border hover:bg-muted/50 transition-colors shadow-none rounded-md">
              <SelectValue placeholder="Position" />
            </SelectTrigger>
            <SelectContent className="bg-popover border-border rounded-md">
              <SelectItem value="top">Top</SelectItem>
              <SelectItem value="middle">Middle</SelectItem>
              <SelectItem value="bottom">Bottom</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[1fr_240px] items-center gap-4 border-b border-border/50 pb-6">
          <div className="space-y-1">
            <div className="text-sm font-medium text-foreground">Size</div>
            <div className="text-xs text-muted-foreground">
              Adjust the visibility and impact of your captions
            </div>
          </div>
          <Select
            value={localCaption.size}
            onValueChange={(value: "small" | "medium" | "large") => handleSizeChange(value)}
          >
            <SelectTrigger className="w-full h-9 bg-background border-border hover:bg-muted/50 transition-colors shadow-none rounded-md">
              <SelectValue placeholder="Size" />
            </SelectTrigger>
            <SelectContent className="bg-popover border-border rounded-md">
              <SelectItem value="small">Small</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="large">Large</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[1fr_240px] items-center gap-4">
          <div className="space-y-1">
            <div className="text-sm font-medium text-foreground">Style</div>
            <div className="text-xs text-muted-foreground">
              Select a visual theme that fits your brand
            </div>
          </div>
          <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="w-full justify-between h-9 bg-background border-border hover:bg-muted/50 transition-all text-sm group shadow-none rounded-md"
              >
                <span className="truncate font-bold text-foreground">
                  {selectedCaptionObj && selectedCaptionObj.id !== "caption-none"
                    ? selectedCaptionObj.id
                        .replace("caption-", "")
                        .replace(/-/g, " ")
                        .replace(/\b\w/g, (l) => l.toUpperCase())
                    : "Select style"}
                </span>
                <ChevronDown className="h-4 w-4 text-muted-foreground/50 transition-transform duration-200 group-data-[state=open]:rotate-180" />
              </Button>
            </PopoverTrigger>
            <PopoverContent
              className="p-0 w-[320px] bg-popover border-border shadow-2xl"
              align="end"
            >
              <div className="p-3 border-b border-border bg-muted/50">
                <div className="text-xs font-medium text-foreground">Caption Styles</div>
              </div>
              <ScrollArea className="h-[400px]">
                <div className="grid grid-cols-2 gap-2 p-3">
                  {CAPTION_PRESETS.map((captionPreset) => (
                    <div
                      key={captionPreset.id}
                      onClick={() => handleCaptionIdChange(captionPreset.id)}
                      className={cn(
                        "relative aspect-video rounded-md overflow-hidden cursor-pointer border transition-all",
                        localCaption.id === captionPreset.id
                          ? "border-primary ring-1 ring-primary shadow-sm"
                          : "border-border hover:border-muted-foreground/30",
                      )}
                    >
                      {captionPreset.previewUrlDynamic ? (
                        <video
                          src={captionPreset.previewUrlDynamic}
                          autoPlay
                          loop
                          muted
                          playsInline
                          className="w-full h-full object-cover"
                        />
                      ) : captionPreset.previewUrlStatic ? (
                        <img
                          src={captionPreset.previewUrlStatic}
                          alt={captionPreset.id}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="text-foreground/60 text-xs text-center flex items-center justify-center h-full">
                          No preview
                        </div>
                      )}
                      <div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-black/80 to-transparent p-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="text-[9px] font-bold text-white truncate uppercase tracking-widest">
                          {captionPreset.id
                            .replace("caption-", "")
                            .replace(/-/g, " ")
                            .replace(/\b\w/g, (l) => l.toUpperCase())}
                        </div>
                      </div>
                      {localCaption.id === captionPreset.id && (
                        <div className="absolute top-1 right-1 bg-primary p-0.5 rounded-full text-primary-foreground shadow-sm">
                          <Check className="w-3 h-3" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </PopoverContent>
          </Popover>
        </div>
      </div>
    </div>
  );
}
