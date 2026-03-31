"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AspectRatioConfig } from "./aspect-ratio-config";
import { VisualsConfig } from "./visuals-config";
import { VoiceModal } from "./voice-modal";
import { MusicModal } from "./music-modal";
import { CaptionsConfig } from "./captions-config";
import type { AspectRatio, Voice } from "@/types/video-generation";
import type { Schema } from "@/lib/schema-generator/types";
import { VideoType, FrameStyle } from "@/utils/enum";
import { Separator } from "@/components/ui/separator";
import { ScriptEditing } from "./script-editing";
import { useScriptStore } from "@/stores/script-store";
import { VIDEO_STYLES } from "@/constants/video-styles";
import { AssetsConfig } from "./assets-config";
import { ProductConfig } from "./product-config";
import { AvatarConfig } from "./avatar-config";
import { CharacterAdPayload } from "./character-ad-payload";

interface VideoCustomizationProps {
  generationParams: Partial<Schema>;
  setGenerationParams: (
    updates: Partial<Schema> | ((prev: Schema | null) => Partial<Schema>),
  ) => void;
}

export function VideoCustomization({
  generationParams,
  setGenerationParams,
}: VideoCustomizationProps) {
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const script = useScriptStore((state) => state.script);

  const isRealUGC = generationParams.type === "ugc-video-ad";
  const isFakeUGC = generationParams.type === "fake-ugc-video-ad";
  const isProduct = generationParams.type === "product-video-ad";
  const isCharacterAd = generationParams.type === "character-driven-ad";
  const isNarrative = !isRealUGC && !isFakeUGC && !isProduct && !isCharacterAd;
  // Voice state
  const [voices, setVoices] = useState<Voice[]>([]);
  const [isLoadingVoices, setIsLoadingVoices] = useState(true);

  // State management - initialize from generation params
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>(
    (generationParams.aspectRatio as AspectRatio) || "9:16",
  );
  const [selectedVisualType, setSelectedVisualType] = useState<VideoType>(
    generationParams.visuals?.type || VideoType.AI_IMAGES,
  );
  const [selectedStyleId, setSelectedStyleId] = useState<FrameStyle>(
    (generationParams.visuals?.style as FrameStyle) || FrameStyle.Realism,
  );
  const [selectedDescription, setSelectedDescription] = useState<string>(
    VIDEO_STYLES.find((s) => s.id === selectedStyleId)?.description || "",
  );
  const [pacing, setPacing] = useState<"fast" | "regular" | "relaxed">(
    (generationParams.pacing as "fast" | "regular" | "relaxed") || "regular",
  );
  const [selectedVoice, setSelectedVoice] = useState("CwhRBWXzGAHq8TQ4Fs17");
  const [selectedMusic, setSelectedMusic] = useState<{ id: string; url: string } | undefined>(
    generationParams.music,
  );
  const [caption, setCaption] = useState<{
    id: string;
    name: string;
    position: "top" | "middle" | "bottom";
    size: "small" | "medium" | "large";
  }>(
    generationParams.caption || {
      id: "will",
      name: "Will",
      position: "bottom",
      size: "medium",
    },
  );
  const [assets, setAssets] = useState<Schema["assets"]>(generationParams.assets || []);

  const [product, setProduct] = useState<Schema["product"]>(
    generationParams.product || { name: "", description: "" },
  );
  const [avatar, setAvatar] = useState<Schema["avatar"]>(generationParams.avatar);
  const [blocks, setBlocks] = useState<Schema["blocks"]>(generationParams.blocks || []);

  // Voice transformation function
  const transformVoices = useCallback((voicesList: any[]): Voice[] => {
    return voicesList.map((voice: any) => {
      const supportedLanguages: string[] = Array.from(
        new Set(
          (voice.verifiedLanguages || []).map((vl: any) => vl.language as string).filter(Boolean),
        ),
      );
      const verifiedLanguages = (voice.verifiedLanguages || [])
        .map((vl: any) => ({
          language: vl.language,
          previewUrl: vl.previewUrl,
          accent: vl.accent,
          locale: vl.locale,
        }))
        .filter((vl: any) => vl.language && vl.previewUrl);
      return {
        id: voice.voiceId,
        name: voice.name,
        language: voice.labels?.language || voice.fineTuning?.language || "en",
        gender: voice.labels?.gender || "unknown",
        accent: voice.labels?.accent || voice.labels?.age || "",
        previewUrl: voice.previewUrl,
        supportedLanguages: supportedLanguages.length > 0 ? supportedLanguages : undefined,
        verifiedLanguages: verifiedLanguages.length > 0 ? verifiedLanguages : undefined,
        quality: voice.highQualityBaseModelIds?.length > 0 ? "High Quality" : "Standard",
        description: voice.description,
      };
    });
  }, []);

  // Fetch voices on component mount
  useEffect(() => {
    const fetchVoices = async () => {
      try {
        setIsLoadingVoices(true);
        const response = await fetch("/api/voices", {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        });
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Failed to fetch voices: ${response.status} ${errorText}`);
        }
        const data = await response.json();
        if (!data || typeof data !== "object") throw new Error("Invalid API response format");
        const voicesList = data.voices || [];
        if (!Array.isArray(voicesList)) throw new Error("Voices data is not an array");
        setVoices(transformVoices(voicesList));
      } catch (error) {
        console.error("Error fetching voices:", error);
      } finally {
        setIsLoadingVoices(false);
      }
    };
    fetchVoices();
  }, [transformVoices]);

  // Sync local state if generationParams changes externally
  useEffect(() => {
    if (generationParams.aspectRatio) setAspectRatio(generationParams.aspectRatio as AspectRatio);
    if (generationParams.visuals?.type) setSelectedVisualType(generationParams.visuals.type);
    if (generationParams.visuals?.style) {
      const styleId = generationParams.visuals.style as FrameStyle;
      const style = VIDEO_STYLES.find((s) => s.id === styleId);
      if (style) {
        setSelectedStyleId(styleId);
        setSelectedDescription(style.description);
      } else {
        setSelectedDescription(generationParams.visuals.style as string);
      }
    }
    if (generationParams.caption) setCaption(generationParams.caption as any);
    if (generationParams.music) setSelectedMusic(generationParams.music);
    if (generationParams.voice?.id) setSelectedVoice(generationParams.voice.id);
    if (generationParams.assets) setAssets(generationParams.assets);

    if (generationParams.product) setProduct(generationParams.product);
    if (generationParams.avatar) setAvatar(generationParams.avatar);
    if (generationParams.pacing) setPacing(generationParams.pacing as any);
    if (generationParams.blocks) setBlocks(generationParams.blocks);
  }, [generationParams]);

  // Update generation params when local state changes
  useEffect(() => {
    const activeVoice = voices.find((v) => v.id === selectedVoice);
    const isCustomVoice = selectedVoice?.startsWith("http") || selectedVoice?.startsWith("blob:");

    const hasChanges =
      aspectRatio !== generationParams.aspectRatio ||
      selectedVisualType !== generationParams.visuals?.type ||
      selectedDescription !== generationParams.visuals?.style ||
      JSON.stringify(caption) !== JSON.stringify(generationParams.caption) ||
      JSON.stringify(assets) !== JSON.stringify(generationParams.assets) ||
      JSON.stringify(product) !== JSON.stringify(generationParams.product) ||
      JSON.stringify(avatar) !== JSON.stringify(generationParams.avatar) ||
      pacing !== generationParams.pacing ||
      (activeVoice && selectedVoice !== generationParams.voice?.id) ||
      (isCustomVoice && selectedVoice !== generationParams.voice?.url) ||
      JSON.stringify(blocks) !== JSON.stringify(generationParams.blocks);

    if (hasChanges) {
      setGenerationParams((prev) => ({
        ...prev,
        aspectRatio,
        visuals: { type: selectedVisualType, style: selectedDescription },
        caption,
        assets,
        product: product?.name || product?.description ? product : undefined,
        avatar,
        pacing,
        blocks,
        ...(activeVoice
          ? { voice: { id: activeVoice.id, name: activeVoice.name } }
          : isCustomVoice
            ? { voice: { url: selectedVoice, name: "Custom Voice" } }
            : {}),
      }));
    }
  }, [
    aspectRatio,
    selectedVisualType,
    selectedDescription,
    caption,
    assets,
    product,
    avatar,
    pacing,
    selectedVoice,
    blocks,
    voices,
    setGenerationParams,
  ]);

  const handleVoiceChange = (voiceId: string) => {
    setSelectedVoice(voiceId);

    if (voiceId.startsWith("http") || voiceId.startsWith("blob:")) {
      setGenerationParams({
        ...generationParams,
        voice: {
          name: "Custom Voice",
          url: voiceId,
        },
      });
      return;
    }

    const selectedVoiceObj = voices.find((voice) => voice.id === voiceId);
    if (selectedVoiceObj) {
      setGenerationParams({
        ...generationParams,
        voice: {
          id: selectedVoiceObj.id,
          name: selectedVoiceObj.name,
        },
      });
    }
  };

  const handleMusicChange = (music: { id: string; url: string }) => {
    setSelectedMusic(music);
    setGenerationParams({ ...generationParams, music });
  };

  return (
    <div className="flex-1 flex flex-col w-full bg-card">
      <div className="relative flex h-full w-full">
        <ScrollArea
          ref={scrollAreaRef}
          className="w-full h-[calc(100vh-64px)] md:h-[calc(100vh-64px)]"
        >
          <div className="text-sm">
            {isCharacterAd ? (
              <CharacterAdPayload
                blocks={blocks || []}
                onChange={setBlocks}
              />
            ) : (
              <ScriptEditing />
            )}
            <Separator />

            <AspectRatioConfig aspectRatio={aspectRatio} onAspectRatioChange={setAspectRatio} />
            <Separator />

            {/* <PacingConfig pacing={pacing} onPacingChange={setPacing} />
            <Separator /> */}

            {/* Assets: UGC, Product, and Character Ads */}
            {(isRealUGC || isFakeUGC || isProduct || isCharacterAd) && (
              <>
                <AssetsConfig assets={assets} onAssetsChange={setAssets} />
                <Separator />
              </>
            )}

            {/* Product description: UGC, Product, and Character Ads */}
            {(isRealUGC || isFakeUGC || isProduct || isCharacterAd) && (
              <>
                <ProductConfig
                  product={(product as any) || { name: "", description: "" }}
                  onProductChange={setProduct}
                />
                <Separator />
              </>
            )}

            {/* Real UGC: Avatar selection */}
            {isRealUGC && (
              <>
                <AvatarConfig
                  selectedAvatar={avatar}
                  onAvatarChange={setAvatar}
                  aspectRatio={aspectRatio}
                />
                <Separator />
              </>
            )}

            {/* Narrative & Product: Visuals Style */}
            {(isNarrative || isProduct) && (
              <>
                <VisualsConfig
                  selectedVisualType={selectedVisualType}
                  onVisualTypeChange={setSelectedVisualType}
                  selectedStyle={selectedDescription}
                  onStyleChange={setSelectedDescription}
                  selectedStyleId={selectedStyleId}
                  onStyleIdChange={setSelectedStyleId}
                />
                <Separator />
              </>
            )}

            {/* Narrative, Product & Fake UGC: Voice & Music */}
            {(isNarrative || isProduct || isFakeUGC) && (
              <>
                <VoiceModal
                  selectedVoice={selectedVoice}
                  onVoiceChange={handleVoiceChange}
                  voices={voices}
                  isLoadingVoices={isLoadingVoices}
                />
                <Separator />
                <MusicModal selectedMusic={selectedMusic} onMusicChange={handleMusicChange} />
                <Separator />
              </>
            )}

            <CaptionsConfig
              caption={caption}
              onCaptionChange={(updatedCaption) => setCaption(updatedCaption)}
            />

          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
