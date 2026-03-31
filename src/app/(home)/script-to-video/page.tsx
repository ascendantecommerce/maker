"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { VideoCustomization } from "@/components/generation-steps/video-customization";
import { useScriptStore } from "@/stores/script-store";
import { useSchemaStore } from "@/stores/schema-store";
import { useVideoGenerationStore } from "@/stores/video-generation-store";
import { type GenerateScriptParams } from "@/lib/generation/constants";
import type { Schema } from "@/lib/schema-generator/types";
import { useEffect, useState, Suspense } from "react";
import { Assistant } from "@/components/script-to-video/assistant";
import { Button } from "@/components/ui/button";
import { calculateVideoCreditCost } from "@/lib/generation/costs";
import { VideoType } from "@/utils/enum";

function ScriptToVideoContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const mode = searchParams.get("mode") as
    | "narrative-video"
    | "product-video-ad"
    | "ugc-video-ad"
    | "character-driven-ad"
    | null;

  const { script } = useScriptStore();
  const generationParams = (useSchemaStore((state) => state.schema) || {}) as Partial<Schema>;
  const setGenerationParams = useSchemaStore((state) => state.updateSchema);
  const [isGenerating, setIsGenerating] = useState(false);

  // Initialize mode from query param
  useEffect(() => {
    if (mode) {
      setGenerationParams({ type: mode });
    }
  }, [mode, setGenerationParams]);

  // Sync script parameter with prompt changes
  useEffect(() => {
    setGenerationParams({ script });
  }, [script, setGenerationParams]);

  const handleGenerate = async () => {
    console.log("generationParams", generationParams);
    setIsGenerating(true);
    const isCharacterAd = generationParams.type === "character-driven-ad";
    if (!generationParams.script && !isCharacterAd) {
      console.warn("Missing required parameters for generation");
      setIsGenerating(false);
      return;
    }

    if (isCharacterAd && (!generationParams.blocks || generationParams.blocks.length === 0)) {
      console.warn("Character-driven ad requires a 'blocks' array");
      setIsGenerating(false);
      return;
    }

    try {
      const { startGeneration } = useVideoGenerationStore.getState();
      const jobId = await startGeneration(generationParams as GenerateScriptParams);

      if (jobId) {
        router.push(`/storyboard/${jobId}`);
      }
    } catch (error) {
      console.error("Error starting video generation:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  const isUGC = generationParams.type === "ugc-video-ad";
  const selectedVisualType = generationParams.visuals?.type || VideoType.AI_IMAGES;

  const title =
    generationParams.type === "character-driven-ad"
      ? "Character-Driven Ad"
      : generationParams.type === "product-video-ad"
        ? "Product Video Ad"
        : isUGC
          ? "UGC Video"
          : "Narrative Video";

  return (
    <div className="flex flex-col h-screen w-full bg-zinc-950">
      <div className="h-13 border-b border-border w-full flex-none bg-card flex items-center justify-between px-4 text-sm z-10">
        <div className="font-medium">{title}</div>
        <div className="flex items-center gap-4">
          {!isUGC && (
            <div className="text-muted-foreground text-xs">
              Total cost {calculateVideoCreditCost(script, selectedVisualType)} credits
            </div>
          )}
          <Button
            onClick={handleGenerate}
            size={"sm"}
            disabled={isGenerating}
            className="rounded-full text-primary-foreground"
          >
            {isGenerating
              ? isUGC
                ? "Generating..."
                : "Generating..."
              : isUGC
                ? "Generate"
                : "Generate"}
          </Button>
        </div>
      </div>
      <div className="flex flex-1 h-[calc(100vh-52px)] w-full overflow-hidden">
        <div className="h-full w-[480px] scrollbar-thin">
          <Assistant />
        </div>

        <VideoCustomization
          generationParams={generationParams}
          setGenerationParams={setGenerationParams}
        />
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<div className="h-screen w-full bg-background animate-pulse" />}>
      <ScriptToVideoContent />
    </Suspense>
  );
}
