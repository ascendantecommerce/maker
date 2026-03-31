import { GeminiService } from "@/lib/gemini/generator";
import { config } from "@/inngest/config";
import { VideoSchema } from "@/inngest/utils/types";
import { Schema, VisualShot, VisualBroll } from "@/lib/schema-generator/types";
import { VideoType } from "@/utils/enum";

export const generateNarrativePrompts = async (scheme: VideoSchema, generatedSchema: any) => {
  const gemini = new GeminiService(config.gemini.key, config.gemini.model2);
  let prePrice: any = { service: "Gemini", type: "Chat", price: 0 };
  let generatedPrompts:
    | { segmentId: string; shots: VisualShot[]; bRolls?: VisualBroll[] }[]
    | undefined;

  if (scheme?.visuals.type === VideoType.AI_IMAGES) {
    const { prompts: schemaPrompts, price } = await gemini.generateStandardImagePrompts(
      generatedSchema as Schema,
      scheme.visuals.style,
    );
    prePrice = price;
    generatedPrompts = schemaPrompts as { segmentId: string; shots: VisualShot[] }[];
  } else if (scheme?.visuals.type === VideoType.AI_VIDEOS) {
    const { prompts: videoPrompts, price } = await gemini.generateStandardVideoPrompts(
      generatedSchema as Schema,
      scheme.visuals.style,
    );
    prePrice = price;
    // @ts-ignore
    generatedPrompts = videoPrompts;
  }

  return { generatedPrompts, prePrice };
};
