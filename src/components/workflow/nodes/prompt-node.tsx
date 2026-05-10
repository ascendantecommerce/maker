"use client";

import React, { memo, useRef, useState } from "react";
import { Position, type NodeProps, type Node, Handle } from "@xyflow/react";
import { PencilRuler, Play, Sparkles, Type, ChevronDown, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CardContent, CardFooter } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";

const NANO_BANANA_MODELS = [
  {
    id: "gemini-2.5-flash-image",
    name: "Nano Banana",
    tier: "Free",
    description: "Gemini 2.5 Flash Image",
  },
  {
    id: "gemini-3.1-flash-image-preview",
    name: "Nano Banana 2",
    tier: "Paid",
    description: "Gemini 3.1 Flash Image Preview",
  },
  {
    id: "gemini-3-pro-image-preview",
    name: "Nano Banana Pro",
    tier: "Paid",
    description: "Gemini 3 Pro Image Preview",
  },
] as const;

type NanoBananaModelId = (typeof NANO_BANANA_MODELS)[number]["id"];

// Banana icon as inline SVG
function BananaIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 13c3.5-2 8-2 10 2a5.5 5.5 0 0 1-7.78 7.78C4 20 3.5 15.5 4 13Z" />
      <path d="M5.15 17.89c5.52-1.52 8.65-6.89 7-12C11.55 4 11.5 2 13 2c3.22 0 5 5.5 4.5 11" />
    </svg>
  );
}

export type PromptNodeData = {
  type: "IMAGE" | "VIDEO";
  shotType?: "product" | "generic" | "b-roll";
  promptText: string;
  status: "idle" | "processing" | "success" | "error";
  model?: string;
  assets?: { id: string; url: string; name: string; type: string }[];
  onUpdate?: (id: string, updates: any) => void;
  onGenerate?: (id: string) => void;
};

export type PromptNode = Node<PromptNodeData, "prompt">;

function PromptNode({ id, data, selected }: NodeProps<PromptNode>) {
  const isVideo = data.type === "VIDEO";
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [selectedModel, setSelectedModel] = useState<NanoBananaModelId>(
    (data.model as NanoBananaModelId) ?? "gemini-2.5-flash-image"
  );
  const activeModel = NANO_BANANA_MODELS.find((m) => m.id === selectedModel) ?? NANO_BANANA_MODELS[0];

  const handleModelChange = (modelId: NanoBananaModelId) => {
    setSelectedModel(modelId);
    data.onUpdate?.(id, { model: modelId });
  };

  return (
    <div className="relative group/node w-full h-full bg-transparent">
      {/* Label above the card */}
      <div className="absolute -top-7 left-0 flex items-center gap-2 px-1 pointer-events-none whitespace-nowrap z-30">
        <PencilRuler className="w-3.5 h-3.5" />
        <span className="text-sm font-bold">
          {isVideo ? "Motion Prompt" : "Visual Prompt"}
        </span>
      </div>

      <div
        className={cn(
          "relative w-full h-full rounded-xl  border-border border-3 transition-all duration-500 bg-card",
          selected && "border-primary/40"
        )}
      >
        <div className="flex flex-col h-full">
          <CardContent className="p-6 space-y-6 flex-1">
            <div className="space-y-3">
              <Label className="text-[10px] uppercase text-muted-foreground">
                Prompt
              </Label>
              <Textarea
                ref={textareaRef}
                value={data.promptText || ""}
                onChange={(e) => data.onUpdate?.(id, { promptText: e.target.value })}
                placeholder="Describe the visual scene..."
                className="h-[200px] text-[13px] leading-relaxed bg-transparent border-none focus-visible:ring-0 p-1 resize-none overflow-y-auto scrollbar-thin scrollbar-thumb-muted-foreground/10 scrollbar-track-transparent placeholder:text-muted-foreground/20"
              />
            </div>

            {data.shotType === "product" && data.assets && data.assets.length > 0 && (
              <div className="space-y-2">
                <Label className="text-[10px] uppercase text-muted-foreground flex items-center gap-1.5">
                  Assets
                </Label>
                <div className="flex flex-row gap-2 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-muted-foreground/10 scrollbar-track-transparent">
                  {data.assets.map((asset) => (
                    <div
                      key={asset.id}
                      className="relative shrink-0 w-16 h-16 rounded-lg overflow-hidden border border-border/50 bg-muted/30 group/asset shadow-sm"
                      title={asset.name}
                    >
                      <img
                        src={asset.url}
                        alt={asset.name}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover/asset:scale-110"
                      />
                      <div className="absolute inset-0 ring-1 ring-inset ring-primary/0 group-hover/asset:ring-primary/40 rounded-lg transition-all duration-200" />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>

          <CardFooter className="flex items-center justify-between gap-2 p-4 bg-muted/20 border-t border-border/40">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="nodrag flex items-center gap-1.5 h-9 px-3 rounded-full bg-card  border border-border hover:border-border hover:bg-accent transition-all text-left shrink-0 min-w-0 max-w-[180px] group">
                  <BananaIcon className="w-3.5 h-3.5 text-primary shrink-0" />
                  <span className="text-[11px] font-semibold text-foreground/80 truncate">{activeModel.name}</span>
                  <ChevronDown className="w-3 h-3 text-muted-foreground/60 shrink-0 ml-auto group-data-[state=open]:rotate-180 transition-transform" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-[220px] p-1.5">
                {NANO_BANANA_MODELS.map((model) => (
                  <DropdownMenuItem
                    key={model.id}
                    className="flex items-start gap-2.5 px-2.5 py-2 rounded-lg cursor-pointer"
                    onSelect={() => handleModelChange(model.id)}
                  >
                    <BananaIcon className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                    <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[12px] font-semibold text-foreground truncate">{model.name}</span>

                      </div>
                      <span className="text-[10px] text-muted-foreground/60 truncate">{model.description}</span>
                    </div>
                    {selectedModel === model.id && (
                      <Check className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                    )}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <Button
              className={cn(
                "h-9 w-9 p-0 rounded-full shadow-2xl transition-all ",
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

      {/* Input handle — fully outside left border */}
      {/* <Handle
        id="asset"
        type="target"
        position={Position.Left}
        className="!w-10 !h-10 !rounded-full !bg-card !border !border-border/60 !shadow-lg !flex !items-center !justify-center"
        style={{ left: -40, top: "50%", transform: "translateY(-50%)" }}
      >
        <Type className="w-4 h-4 text-muted-foreground/70 pointer-events-none" />
      </Handle> */}

      {/* Output handle — fully outside right border */}
      <Handle
        id="result"
        type="source"
        position={Position.Right}
        className="!w-10 !h-10 !rounded-full !border !border-border border-2! bg-card! !shadow-lg !flex !items-center !justify-center"
        style={{ right: -40, top: "50%", transform: "translateY(-50%)" }}
      >
        <Type className="w-4 h-4" />
      </Handle>
    </div>
  );
}

export default memo(PromptNode);
