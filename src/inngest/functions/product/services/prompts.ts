import { GeminiService } from "@/lib/gemini/generator";
import { config } from "@/inngest/config";
import { VideoSchema } from "@/inngest/utils/types";
import { Schema, VisualShot, VisualBroll } from "@/lib/schema-generator/types";
import { VideoType } from "@/utils/enum";
import {
  buildProductContextBlock,
  buildProductImagePrompt,
  getProductImagePacingInstruction,
  SCHEMA_OUTPUT_INSTRUCTIONS,
  getProductVideoPacingInstruction,
  buildProductVideoSchemaContext,
  buildProductAdBrollInteractionPrompt,
} from "../prompts";
import { buildVideoGenerationSchemaContext, buildVideoGenerationPrompt } from "@/lib/prompts";
import {
  buildNarrativeImagePrompt,
  getNarrativeImagePacingInstruction,
  buildNarrativeVideoPrompt,
  getNarrativeVideoPacingInstruction,
} from "../../narrative/prompts";


export const generateProductPrompts = async (scheme: VideoSchema, generatedSchema: any) => {
  const gemini = new GeminiService(config.gemini.key, config.gemini.model2);
  let prePrice: any = { service: "Gemini", type: "Chat", price: 0 };
  let generatedPrompts:
    | { segmentId: string; shots: VisualShot[]; bRolls?: VisualBroll[] }[]
    | undefined;

  const segmentsText = (generatedSchema.segments || [])
    .map((s: any, i: number) => `Segment ${i + 1} (ID: ${s.id}): ${s.text}`)
    .join("\n");

  if (scheme?.visuals.type === VideoType.AI_IMAGES) {
    if (scheme.assets?.length) {


      const pacingInstruction = getProductImagePacingInstruction();

      const schemaContext = buildVideoGenerationSchemaContext(
        segmentsText,
        pacingInstruction,
        generatedSchema.topic?.name,
        generatedSchema.description,
      );

      const prompt = buildProductImagePrompt(
        buildProductContextBlock(scheme.product?.name, scheme.product?.description),
        schemaContext,
        SCHEMA_OUTPUT_INSTRUCTIONS,
        scheme.visuals.style,
      );

      const { prompts: schemaPrompts, price } = await gemini.generateProductImagePrompts(
        scheme.assets.map((a: any) => a.url),
        prompt,
        generatedSchema as Schema,
      );
      prePrice = price;
      generatedPrompts = schemaPrompts as { segmentId: string; shots: VisualShot[] }[];
    } else {
      const pacingInstruction = getNarrativeImagePacingInstruction();

      const prompt = buildNarrativeImagePrompt(
        segmentsText,
        pacingInstruction,
        generatedSchema.topic?.name,
        generatedSchema.description,
        scheme.visuals.style,
      );

      const { prompts: schemaPrompts, price } = await gemini.generateStandardImagePrompts(
        prompt,
        generatedSchema as Schema,
      );

      prePrice = price;
      generatedPrompts = schemaPrompts as { segmentId: string; shots: VisualShot[] }[];
    }
  } else if (scheme?.visuals.type === VideoType.AI_VIDEOS) {
    if (scheme.assets?.length) {


      const pacingInstruction = getProductVideoPacingInstruction();

      const schemaContext = buildProductVideoSchemaContext(
        segmentsText,
        pacingInstruction,
        scheme.product?.name,
        scheme.product?.description,
        scheme.visuals.style,
      );

      const prompt = buildVideoGenerationPrompt(
        buildProductContextBlock(scheme.product?.name, scheme.product?.description),
        schemaContext,
        "",
        scheme.visuals.style,
      );

      const { prompts: videoPrompts, price } = await gemini.generateProductVideoPrompts(
        scheme.assets.map((a: any) => a.url),
        prompt,
        generatedSchema as Schema,
      );
      prePrice = price;
      // @ts-ignore
      generatedPrompts = videoPrompts;
    } else {
      const pacingInstruction = getNarrativeVideoPacingInstruction();

      const prompt = buildNarrativeVideoPrompt(
        segmentsText,
        pacingInstruction,
        generatedSchema.topic?.name,
        generatedSchema.description,
        scheme.visuals.style,
      );

      const { prompts: videoPrompts, price } = await gemini.generateStandardVideoPrompts(
        prompt,
        generatedSchema as Schema,
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
    const segmentsTextForBrolls = (generatedSchema.segments || [])
      .map((s: any, i: number) => {
        let text = `Segment ${i + 1} (ID: ${s.id}):\nText: ${s.text}\n`;
        const segmentShots = prompts.find((gs: any) => gs.segmentId === s.id)?.shots || [];
        if (segmentShots.length > 0) {
          text += `Planned Shots for this segment (Narrator should usually YIELD to these if they are product-focused):\n`;
          segmentShots.forEach((shot: any, idx: number) => {
            text += `  - Shot ${idx + 1} (type: ${shot.type})\n`;
          });
        }
        return text;
      })
      .join("\n\n");

    const brollPrompt = buildProductAdBrollInteractionPrompt(
      segmentsTextForBrolls,
      generatedSchema.topic?.name,
      generatedSchema.description,
      scheme.product?.name,
      scheme.product?.description,
      scheme.visuals.style,
    );

    const bRollsPrompts = await gemini.generateProductAdBrolls(
      generatedSchema as Schema,
      brollPrompt,
      scheme.avatar!.url,
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
