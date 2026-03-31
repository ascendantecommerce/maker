import { GeminiService } from "@/lib/gemini/generator";
import type { Schema, VisualShot, VisualBroll } from "@/lib/schema-generator/types";
import { VideoType } from "@/utils/enum";

export const generateStandardPrompts = async (
  scheme: any,
  generatedSchema: any,
  gemini: GeminiService,
) => {
  const isProductVideo =
    scheme.type === "product-video-ad" || (scheme.product?.name && scheme.product?.description);

  let generatedPrompts:
    | { segmentId: string; shots: VisualShot[]; bRolls?: VisualBroll[] }[]
    | undefined;
  let prePrice: any;

  if (isProductVideo) {
    if (scheme?.visuals?.type === VideoType.AI_IMAGES) {
      let schemaPrompts, price;
      if (scheme.assets?.length) {
        const res = await gemini.generateProductImagePrompts(
          scheme.assets.map((a: any) => a.url),
          scheme.product?.name,
          scheme.product?.description,
          generatedSchema as Schema,
          scheme.pacing,
          scheme.visuals.style,
        );
        schemaPrompts = res.prompts;
        price = res.price;
      } else {
        const res = await gemini.generateStandardImagePrompts(
          generatedSchema as Schema,
          scheme.visuals.style,
        );
        schemaPrompts = res.prompts;
        price = res.price;
      }
      prePrice = price;
      generatedPrompts = schemaPrompts as any;
    } else if (scheme?.visuals?.type === VideoType.AI_VIDEOS) {
      let videoPrompts, price;
      if (scheme.assets?.length) {
        const res = await gemini.generateProductVideoPrompts(
          scheme.assets.map((a: any) => a.url),
          scheme.product?.name,
          scheme.product?.description,
          generatedSchema as Schema,
          scheme.visuals.style,
        );
        videoPrompts = res.prompts;
        price = res.price;
      } else {
        const res = await gemini.generateStandardVideoPrompts(
          generatedSchema as Schema,
          scheme.visuals.style,
        );
        videoPrompts = res.prompts;
        price = res.price;
      }
      prePrice = price;
      generatedPrompts = videoPrompts as any;
    } else {
      prePrice = { service: "Gemini", type: "Chat", price: 0 };
    }
  } else {
    // Standard video
    if (scheme?.visuals?.type === VideoType.AI_IMAGES) {
      const { prompts: schemaPrompts, price } = await gemini.generateStandardImagePrompts(
        generatedSchema as Schema,
        scheme.visuals.style,
      );
      prePrice = price;
      generatedPrompts = schemaPrompts as any;
    } else if (scheme?.visuals?.type === VideoType.AI_VIDEOS) {
      const { prompts: videoPrompts, price } = await gemini.generateStandardVideoPrompts(
        generatedSchema as Schema,
        scheme.visuals.style,
      );
      prePrice = price;
      generatedPrompts = videoPrompts as any;
    } else {
      prePrice = { service: "Gemini", type: "Chat", price: 0 };
    }
  }

  return { generatedPrompts, prePrice };
};

export const generateStandardBRolls = async (
  scheme: any,
  generatedSchema: any,
  generatedPrompts: any,
  gemini: GeminiService,
) => {
  if (
    generatedPrompts &&
    scheme.avatar?.url &&
    (scheme?.visuals?.type === VideoType.AI_IMAGES || scheme?.visuals?.type === VideoType.AI_VIDEOS)
  ) {
    const bRollsPrompts = await gemini.generateProductAdBrolls(
      generatedSchema as Schema,
      generatedPrompts.map((p: any) => ({
        segmentId: p.segmentId,
        shots: p.shots,
      })),
      scheme.avatar!.url,
      scheme.product?.name,
      scheme.product?.description,
      scheme.visuals.style,
    );

    if (bRollsPrompts && bRollsPrompts.length > 0) {
      return generatedPrompts.map((p: any) => {
        const bRoll = bRollsPrompts.find((b: any) => b.segmentId === p.segmentId);
        return {
          ...p,
          bRolls: bRoll ? bRoll.bRolls : [],
        };
      });
    }
  }
  return generatedPrompts;
};

export const mapStandardPromptsToSegments = (scheme: any, generatedPrompts: any) => {
  if (!generatedPrompts || generatedPrompts.length === 0) return scheme.segments;

  return scheme.segments.map((s: any, index: number) => {
    let segmentPrompts = generatedPrompts.find((p: any) => p.segmentId === s.id);
    if (!segmentPrompts && generatedPrompts.length === scheme.segments.length) {
      segmentPrompts = generatedPrompts[index];
    }
    const shots = segmentPrompts ? segmentPrompts.shots : [];
    const bRolls = segmentPrompts?.bRolls ? segmentPrompts.bRolls : [];
    return { ...s, shots, bRolls };
  });
};
