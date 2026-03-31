import { nanoid } from "nanoid";
import { VideoSchema, Segment, CharacterConfig, UserScriptBlock } from "@/types/segment";
import { resolutionType, aspectRatioType } from "@/utils/enum";

export interface GenerateCharacterVideoInput {
  blocks: UserScriptBlock[];
  product?: { name?: string; description?: string };
  assets?: { url: string; type: string }[];
}

const DEFAULT_STYLE = "High-end 3D Pixar/Illumination animation style, cinematic lighting, ultra-detailed textures, vibrant colors";
const DEFAULT_ASPECT_RATIO = "9:16";
const DEFAULT_TITLE = "Character-Driven Ad";

/** Appended to firstFramePrompt to prevent AI image layout artifacts */
const SINGLE_FRAME_SUFFIX = "single cinematic frame, no split screen, no panels, no collage, no before-and-after, no multiple views, no text overlays, no watermarks, no borders";

const calculateEstimatedDuration = (text: string): number => {
  if (!text) return 4;
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  // Standard speech rate ~2.5 words per second
  return Math.ceil(words / 2.5);
};

/**
 * Maps the frontend's deterministic JSON payload into the internal VideoSchema.
 * This skips the standard LLM-based script parsing because the user provides 
 * structured scenes directly.
 */
export function mapInputToSchema(input: GenerateCharacterVideoInput): VideoSchema {
  const schemaId = `char-ad-${nanoid(8)}`;
  const globalStyle = DEFAULT_STYLE;
  const aspectRatio = DEFAULT_ASPECT_RATIO;
  const videoTitle = DEFAULT_TITLE;

  // 1. Deduplicate Characters
  const characterMap = new Map<string, CharacterConfig>();
  input.blocks.forEach((block) => {
    if (!characterMap.has(block.characterName)) {
      characterMap.set(block.characterName, {
        id: `char-${nanoid(4)}`,
        name: block.characterName,
        role: block.characterRole,
        visualDescription: block.characterDescription, // Using characterDescription as the base visual persona
        voiceDescription: block.voiceDescription,
        baseImageUrl: undefined,
      });
    }
  });

  const characters = Array.from(characterMap.values());

  // 2. Map blocks to segments
  const segments: Segment[] = input.blocks.map((block, index) => {
    const character = characterMap.get(block.characterName)!;
    const segmentId = `${schemaId}-seg-${index}`;

    const calculatedDuration = calculateEstimatedDuration(block.dialogue);
    const durationMs = calculatedDuration * 1000;

    const interaction = block.productInteractionType || "none";
    const isProductShot = interaction !== "none";
    
    let promptPrefix = globalStyle;
    if (isProductShot && input.product?.name) {
      let productAction = "";
      switch (interaction) {
        case "package_hero":
          productAction = `The product packaging is prominently displayed. `;
          break;
        case "product_in_hand":
          productAction = `The character holds the closed product naturally. `;
          break;
        case "product_reveal":
          productAction = `The character actively reaches for and picks up the closed product. `;
          break;
        case "product_on_surface":
          productAction = `The closed product rests neatly on a nearby surface. `;
          break;
      }
      promptPrefix = `${globalStyle}, ${productAction}Featuring the product ${input.product.name} (${input.product.description || ""})`;
    }

    // 3. Construct Prompts (Stages 1 & 2)
    // Building blocks for stable, scalable prompt generation.
    const visualQuality = "cinematic lighting, ultra-detailed textures, Pixar style";
    const productAccuracy = "The product packaging in the scene must be reproduced with exact colors, exact branding text, and exact label details from the reference image — do not stylize, recolor, or alter the product packaging in any way, photorealistic product, faithful brand reproduction";

    // Stage 1: firstFramePrompt (Persona + Ambient)
    const firstFramePrompt = [
      globalStyle,
      block.characterDescription,
      block.sceneDescription,
      visualQuality,
      isProductShot ? productAccuracy : "",
      SINGLE_FRAME_SUFFIX
    ].filter(Boolean).join(", ");

    // Stage 2: videoPrompt (Veo) (Persona + Ambient + Action)
    const finalVideoPrompt = [
      promptPrefix,
      block.characterDescription,
      block.sceneDescription,
      block.videoDescription,
    ].filter(Boolean).join(", ");

    return {
      id: segmentId,
      title: `Scene ${index + 1}: ${block.characterName}`,
      description: block.videoDescription || block.sceneDescription,
      text: block.dialogue,
      characterId: character.id,
      emotion: block.emotion,
      tags: [block.characterName, block.characterRole, block.emotion],
      prompt_preview: `${promptPrefix}, ${block.characterDescription} in ${block.sceneDescription}`,
      shots: [
        {
          type: isProductShot ? "product" : "generic",
          category: block.characterRole,
          characterId: character.id,
          words: block.dialogue,
          emotion: block.emotion,
          firstFramePrompt,
          videoPrompt: finalVideoPrompt,
          display: { from: 0, to: durationMs },
          duration: durationMs,
        },
      ],
      duration: durationMs,
      estimatedDuration: calculatedDuration,
    };
  });

  return {
    id: schemaId,
    title: videoTitle,
    description: `Character-driven ad: ${videoTitle}`,
    promptPreview: globalStyle,
    tags: ["character-driven-ad", ...characters.map((c) => c.name)],
    voice: { name: "Native / Veo 3.1" },
    visuals: {
      type: "character-driven-ad" as any,
      style: globalStyle,
    },
    caption: {
      id: "modern-captions",
      name: "Modern",
      position: "bottom",
      size: "medium",
    },
    resolution: resolutionType.High,
    aspectRatio: aspectRatio as aspectRatioType,
    type: "character-driven-ad",
    audioMode: "native-video-model",
    characters,
    segments,
  };
}
