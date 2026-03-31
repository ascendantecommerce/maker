import { GeminiService } from "@/lib/gemini/generator";
import { config } from "@/inngest/config";
import { VideoSchema } from "@/inngest/utils/types";
import { Schema, VisualShot, VisualBroll } from "@/lib/schema-generator/types";
import { VideoType } from "@/utils/enum";

export const generateProductPrompts = async (scheme: VideoSchema, generatedSchema: any) => {
  const gemini = new GeminiService(config.gemini.key, config.gemini.model2);
  let prePrice: any = { service: "Gemini", type: "Chat", price: 0 };
  let generatedPrompts:
    | { segmentId: string; shots: VisualShot[]; bRolls?: VisualBroll[] }[]
    | undefined;

  if (scheme?.visuals.type === VideoType.AI_IMAGES) {
    if (scheme.assets?.length) {
      const { prompts: schemaPrompts, price } = await gemini.generateProductImagePrompts(
        scheme.assets.map((a) => a.url),
        scheme.product?.name,
        scheme.product?.description,
        generatedSchema as Schema,
        scheme.pacing,
        scheme.visuals.style,
      );
      prePrice = price;
      generatedPrompts = schemaPrompts as { segmentId: string; shots: VisualShot[] }[];
    } else {
      const { prompts: schemaPrompts, price } = await gemini.generateStandardImagePrompts(
        generatedSchema as Schema,
        scheme.visuals.style,
      );
      prePrice = price;
      generatedPrompts = schemaPrompts as { segmentId: string; shots: VisualShot[] }[];
    }
  } else if (scheme?.visuals.type === VideoType.AI_VIDEOS) {
    if (scheme.assets?.length) {
      const { prompts: videoPrompts, price } = await gemini.generateProductVideoPrompts(
        scheme.assets.map((a) => a.url),
        scheme.product?.name,
        scheme.product?.description,
        generatedSchema as Schema,
        scheme.visuals.style,
      );
      prePrice = price;
      // @ts-ignore
      generatedPrompts = videoPrompts;
    } else {
      const { prompts: videoPrompts, price } = await gemini.generateStandardVideoPrompts(
        generatedSchema as Schema,
        scheme.visuals.style,
      );
      prePrice = price;
      // @ts-ignore
      generatedPrompts = videoPrompts;
    }
  }

  // Generate product ad B-rolls when avatar is present
  if (
    generatedPrompts &&
    scheme.avatar?.url &&
    (scheme?.visuals.type === VideoType.AI_IMAGES || scheme?.visuals.type === VideoType.AI_VIDEOS)
  ) {
    const prompts = generatedPrompts;
    const bRollsPrompts = await gemini.generateProductAdBrolls(
      generatedSchema as Schema,
      prompts.map((p) => ({ segmentId: p.segmentId, shots: p.shots })),
      scheme.avatar!.url,
      scheme.product?.name,
      scheme.product?.description,
      scheme.visuals.style,
    );

    if (bRollsPrompts && bRollsPrompts.length > 0) {
      generatedPrompts = generatedPrompts.map((p) => {
        const bRoll = bRollsPrompts.find((b: any) => b.segmentId === p.segmentId);
        return { ...p, bRolls: bRoll ? bRoll.bRolls : [] };
      });
    }
  }

  return { generatedPrompts, prePrice };
};
