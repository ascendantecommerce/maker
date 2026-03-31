import { resolutionType } from "@/utils/enum";
import { VideoStatusResponse } from "./types";

export interface Generator {
  create(params: any): Promise<string>;
  getStatus?(id: string): Promise<VideoStatusResponse>;
}

export type VideoProviderType = "wan" | "pixverse" | "hailuo" | "runway" | "veo";

export type GeneratorConfig =
  | {
      provider: "wan";
      params: { url: string; apiKey: string; resolution?: resolutionType };
    }
  | {
      provider: "pixverse";
      params: { url: string; apiKey: string; resolution?: resolutionType };
    }
  | {
      provider: "hailuo";
      params: { url: string; apiKey: string; resolution?: resolutionType };
    }
  | {
      provider: "runway";
      params: { apiKey: string; resolution?: string };
    }
  | {
      provider: "veo";
      params: { geminiApiKey: string; resolution?: string };
    };
