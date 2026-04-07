import { nanoid } from "nanoid";
import { VideoSchema, Segment, CharacterConfig, UserScriptBlock } from "@/types/segment";
import { resolutionType, aspectRatioType } from "@/utils/enum";

export interface GenerateCharacterVideoInput {
  blocks?: UserScriptBlock[];
  /** New format: segments with nested character objects from the script generator */
  segments?: CharacterSegmentInput[];
  product?: { name?: string; description?: string };
  assets?: { url: string; type: string }[];
  visuals?: { style?: string; type?: string };
}

/** A scene segment as produced by the new CHARACTER_AD_SCRIPT_OUTPUT_SCHEMA */
export interface CharacterSegmentInput {
  title: string;
  text: string;
  character: {
    name: string;
    role: "villain" | "hero" | "human" | "narrator";
    visualDescription: string;
    voiceDescription: string;
    emotion: string;
  };
  sceneDescription: string;
  videoDescription: string;
  productInteractionType?: UserScriptBlock["productInteractionType"];
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

/** Build a product-action prefix for a given interaction type */
function buildProductActionPrefix(interaction: string, productName: string, productDescription?: string): string {
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
  return `${productAction}Featuring the product "${productName}" (${productDescription || ""}). `;
}

/**
 * Build a fully-mapped segment from character + scene data.
 * Shared by both the new `segments` format and the legacy `blocks` format.
 */
function buildMappedSegment(
  index: number,
  schemaId: string,
  globalStyle: string,
  character: CharacterConfig,
  data: {
    title: string;
    text: string;
    sceneDescription?: string;
    videoDescription?: string;
    emotion?: string;
    productInteractionType?: string;
  },
  product?: { name?: string; description?: string },
): Segment & { character: CharacterConfig } {
  const segmentId = `${schemaId}-seg-${index}`;
  const calculatedDuration = calculateEstimatedDuration(data.text);
  const durationMs = calculatedDuration * 1000;

  const interaction = data.productInteractionType || "none";
  const isProductShot = interaction !== "none";

  let promptPrefix = globalStyle;
  if (isProductShot && product?.name) {
    promptPrefix = `${globalStyle}, ${buildProductActionPrefix(interaction, product.name, product.description)}`;
  }

  const emotionPrompt = data.emotion ? `with a ${data.emotion} expression` : "";
  const characterVisual = `${character.visualDescription}${emotionPrompt ? `, ${emotionPrompt}` : ""}`;

  // Stage 1: firstFramePrompt (Persona + Ambient)
  const isContentShot = interaction.includes("product_content");
  const visualQuality = "cinematic lighting, ultra-detailed textures, Pixar style";
  const packagingAccuracy = "The product packaging in the scene must be reproduced with exact colors, exact branding text, and exact label details from the reference image — do not stylize, recolor, or alter the product packaging in any way, photorealistic product, faithful brand reproduction";
  const contentAccuracy = "Focus heavily on the texture, material, and visual characteristics of the internal product content (the substance) as shown in the reference images — maintain high visual fidelity to its shape and appearance.";
  const productAccuracy = isContentShot ? contentAccuracy : packagingAccuracy;

  const firstFramePrompt = [
    globalStyle,
    characterVisual,
    data.sceneDescription || DEFAULT_SCENE_VISUAL,
    visualQuality,
    isProductShot ? productAccuracy : "",
    SINGLE_FRAME_SUFFIX,
  ].filter(Boolean).join(", ");

  // Stage 2: videoPrompt (Veo)
  const finalVideoPrompt = [
    promptPrefix,
    characterVisual,
    data.sceneDescription || DEFAULT_SCENE_VISUAL,
    data.videoDescription || DEFAULT_MOTION_VISUAL,
    "the character has NO TEXT, NO LETTERS, AND NO WORDS on them.",
    SINGLE_FRAME_SUFFIX,
  ].filter(Boolean).join(", ");

  return {
    id: segmentId,
    title: data.title,
    description: data.videoDescription || data.sceneDescription || "",
    text: data.text,
    characterId: character.id,
    character: { ...character, emotion: data.emotion },
    emotion: data.emotion,
    tags: [character.name, character.role, data.emotion || ""],
    prompt_preview: `${promptPrefix}, ${character.visualDescription} in ${data.sceneDescription || DEFAULT_SCENE_VISUAL}`,
    shots: [
      {
        type: isProductShot ? "product" : "generic",
        category: character.role,
        characterId: character.id,
        words: data.text,
        emotion: data.emotion,
        firstFramePrompt,
        videoPrompt: finalVideoPrompt,
        display: { from: 0, to: durationMs },
        duration: durationMs,
      },
    ],
    duration: durationMs,
    estimatedDuration: calculatedDuration,
  };
}

/**
 * Maps the frontend's JSON payload into the internal VideoSchema.
 *
 * Accepts TWO input shapes:
 * 1. **New format** (preferred): `input.segments` — array of scene objects each with a nested
 *    `character: { name, role, visualDescription, voiceDescription }`. Produced by the character
 *    ad script generator using `CHARACTER_AD_SCRIPT_OUTPUT_SCHEMA`.
 * 2. **Legacy format**: `input.blocks` — flat `UserScriptBlock[]` array.
 *
 * In both cases, every output `Segment` will have a `character` field set to the resolved
 * `CharacterConfig` object so the orchestrator downstream can work with character data directly.
 */
export function mapInputToSchema(input: GenerateCharacterVideoInput): VideoSchema {
  const schemaId = `char-ad-${nanoid(8)}`;
  const globalStyle = input.visuals?.style || DEFAULT_STYLE;
  const aspectRatio = DEFAULT_ASPECT_RATIO;
  const videoTitle = DEFAULT_TITLE;

  // ── Resolve input source ────────────────────────────────────────────────
  const hasNewSegments = input.segments && input.segments.length > 0;
  const hasLegacyBlocks = input.blocks && input.blocks.length > 0;

  if (!hasNewSegments && !hasLegacyBlocks) {
    throw new Error("mapInputToSchema: either `segments` or `blocks` must be provided");
  }

  // ── Build character registry ────────────────────────────────────────────
  const characterMap = new Map<string, CharacterConfig>();

  if (hasNewSegments) {
    // New format: read character from each segment
    input.segments!.forEach((seg) => {
      const { name, role, visualDescription, voiceDescription } = seg.character;
      if (!characterMap.has(name)) {
        let finalVisualDescription = visualDescription;
        if (!finalVisualDescription) {
          if (role === "hero") finalVisualDescription = DEFAULT_HERO_VISUAL;
          else if (role === "villain") finalVisualDescription = DEFAULT_VILLAIN_VISUAL;
          else if (role === "human") finalVisualDescription = DEFAULT_HUMAN_VISUAL;
          else finalVisualDescription = DEFAULT_SCENE_VISUAL;
        }
        characterMap.set(name, {
          id: `char-${nanoid(4)}`,
          name,
          role,
          visualDescription: finalVisualDescription,
          voiceDescription: voiceDescription || (role === "villain" ? "Raspy, sneaky, fast-talking" : "Warm, deep, confident"),
          baseImageUrl: undefined,
        });
      }
    });
  } else {
    // Legacy format: read character from blocks
    input.blocks!.forEach((block) => {
      if (!characterMap.has(block.characterName)) {
        let visualDescription = block.characterDescription;
        if (!visualDescription) {
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
  }

  const characters = Array.from(characterMap.values());

  // ── Map to segments ─────────────────────────────────────────────────────
  let segments: (Segment & { character: CharacterConfig })[];

  if (hasNewSegments) {
    segments = input.segments!.map((seg, index) => {
      const character = characterMap.get(seg.character.name)!;
      return buildMappedSegment(index, schemaId, globalStyle, character, {
        title: seg.title,
        text: seg.text,
        sceneDescription: seg.sceneDescription,
        videoDescription: seg.videoDescription,
        emotion: seg.character.emotion,
        productInteractionType: seg.productInteractionType,
      }, input.product);
    });
  } else {
    segments = input.blocks!.map((block, index) => {
      const character = characterMap.get(block.characterName)!;
      return buildMappedSegment(index, schemaId, globalStyle, character, {
        title: `Scene ${index + 1}: ${block.characterName}`,
        text: block.dialogue,
        sceneDescription: block.sceneDescription,
        videoDescription: block.videoDescription,
        emotion: block.emotion,
        productInteractionType: block.productInteractionType,
      }, input.product);
    });
  }

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
