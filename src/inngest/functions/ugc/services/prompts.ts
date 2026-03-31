import { GeminiService } from "@/lib/gemini/generator";
import type { Schema } from "@/lib/schema-generator/types";

export const generateUgcShots = async (
  scheme: any,
  generatedSchema: any,
  gemini: GeminiService,
) => {
  return gemini.generateUGCPrompts(
    generatedSchema as Schema,
    (scheme.assets as any) || [],
    scheme.avatar?.url,
    scheme.product?.name,
    scheme.product?.description,
  );
};

export const generateUgcBRolls = async (
  scheme: any,
  generatedSchema: any,
  ugcShots: any,
  gemini: GeminiService,
) => {
  return gemini.generateUGCBrolls(
    generatedSchema as Schema,
    (scheme.assets as any) || [],
    (ugcShots as any[]) || [],
    scheme.avatar?.url,
    scheme.product?.name,
    scheme.product?.description,
  );
};
