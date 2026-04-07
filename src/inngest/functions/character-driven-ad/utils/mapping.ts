import { nanoid } from "nanoid";
import { VideoSchema, Segment, CharacterConfig, UserScriptBlock } from "@/types/segment";
import { resolutionType, aspectRatioType } from "@/utils/enum";

export interface GenerateCharacterVideoInput {
  blocks: UserScriptBlock[];
  product?: { name?: string; description?: string };
  assets?: { url: string; type: string }[];
  visuals?: { style?: string; type?: string };
}

const DEFAULT_STYLE = "High-end 3D Pixar/Illumination animation style, cinematic lighting, ultra-detailed textures, vibrant colors";
const DEFAULT_ASPECT_RATIO = "9:16";
const DEFAULT_TITLE = "Character-Driven Ad";

/** Appended to firstFramePrompt to prevent AI image layout artifacts */
const SINGLE_FRAME_SUFFIX = "single cinematic frame, NO TEXT, no letters, no words, no labels, no split screen, no panels, no collage, no before-and-after, no multiple views, no text overlays, no watermarks, no borders";

const DEFAULT_HERO_VISUAL = "Cute 3D character, highly expressive facial features, premium realistic PBR materials (matte plastic, smooth vinyl, or soft felt depending on the object), ultra-clean, brightly lit, high-end Pixar animation style";
const DEFAULT_VILLAIN_VISUAL = "Mischievous 3D character or anthropomorphized object representing the problem, highly expressive facial features, premium solid materials, high-end Pixar animation style";
const DEFAULT_HUMAN_VISUAL = "blurred cinematic human subject in background, reacting with emotional frustration or stress, out of focus (bokeh)";
const DEFAULT_SCENE_VISUAL = "Clean, bright, modern premium Pixar 3D interior, cinematic lighting, volumetric light rays, glossy reflections";
const DEFAULT_MOTION_VISUAL = "Energetic, expressive, and playful 3D character animation, highly dynamic movements reacting to the product";

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
  const globalStyle = input.visuals?.style || DEFAULT_STYLE;
  const aspectRatio = DEFAULT_ASPECT_RATIO;
  const videoTitle = DEFAULT_TITLE;

  // 1. Deduplicate Characters
  const characterMap = new Map<string, CharacterConfig>();
  input.blocks.forEach((block) => {
    if (!characterMap.has(block.characterName)) {
      let visualDescription = block.characterDescription;
      if (!visualDescription) {
        console.log("USING DEFAULT VISUAL DESCRIPTION")
        if (block.characterRole === "hero") visualDescription = DEFAULT_HERO_VISUAL;
        else if (block.characterRole === "villain") visualDescription = DEFAULT_VILLAIN_VISUAL;
        else if (block.characterRole === "human") visualDescription = DEFAULT_HUMAN_VISUAL;
        else visualDescription = DEFAULT_SCENE_VISUAL;
      }

      characterMap.set(block.characterName, {
        id: `char-${nanoid(4)}`,
        name: block.characterName,
        role: block.characterRole,
        visualDescription,
        voiceDescription: block.voiceDescription || (block.characterRole === "villain" ? "Raspy, sneaky, fast-talking" : "Warm, deep, confident"),
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
        case "packaging_hero":
          productAction = `The external product packaging and container are prominently displayed. `;
          break;
        case "product_content_hero":
          productAction = `The actual internal product content (the substance itself) is shown clearly as the center of focus. `;
          break;
        case "packaging_in_hand":
          productAction = `The character holds the product's packaging/container naturally in their stable hands. `;
          break;
        case "product_content_in_hand":
          productAction = `The character holds the actual inner product content (e.g., gummy, liquid, or substance) in their hand for scale. `;
          break;
        case "packaging_on_surface":
          productAction = `The product packaging/container rests neatly on a nearby surface. `;
          break;
        case "product_content_on_surface":
          productAction = `The actual inner product content (the substance itself) rests neatly on a nearby surface. `;
          break;
        case "product_reveal":
          productAction = `The character specifically shows the transition from the packaging to the actual internal product content. `;
          break;
      }
      promptPrefix = `${globalStyle}, ${productAction}Featuring the product "${input.product.name}" (${input.product.description || ""}). `;
    }

    // 3. Construct Prompts (Stages 1 & 2)
    // Building blocks for stable, scalable prompt generation.
    const isContentShot = interaction.includes("product_content");
    const visualQuality = "cinematic lighting, ultra-detailed textures, Pixar style";
    const packagingAccuracy = "The product packaging in the scene must be reproduced with exact colors, exact branding text, and exact label details from the reference image — do not stylize, recolor, or alter the product packaging in any way, photorealistic product, faithful brand reproduction";
    const contentAccuracy = "Focus heavily on the texture, material, and visual characteristics of the internal product content (the substance) as shown in the reference images — maintain high visual fidelity to its shape and appearance.";
    const productAccuracy = isContentShot ? contentAccuracy : packagingAccuracy;

    // Stage 1: firstFramePrompt (Persona + Ambient)
    const firstFramePrompt = [
      globalStyle,
      character.visualDescription,
      block.sceneDescription || DEFAULT_SCENE_VISUAL,
      visualQuality,
      isProductShot ? productAccuracy : "",
      SINGLE_FRAME_SUFFIX
    ].filter(Boolean).join(", ");

    // Stage 2: videoPrompt (Veo) (Persona + Ambient + Action)
    const finalVideoPrompt = [
      promptPrefix,
      character.visualDescription,
      block.sceneDescription || DEFAULT_SCENE_VISUAL,
      block.videoDescription || DEFAULT_MOTION_VISUAL,
      "the character has NO TEXT, NO LETTERS, AND NO WORDS on them.",
      SINGLE_FRAME_SUFFIX
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
