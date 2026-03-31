import { aspectRatioType } from "@/utils/enum";

export interface ScrapedData {
  url: string;
  title?: string;
  preview?: string;
  description?: string;
  html: string;
  media: {
    images: string[];
    videos: string[];
  };
}

export interface ScriptSegment {
  id: string;
  title: string;
  text: string;
  description: string;
  duration: number;
  media: {
    images: string[];
    videos: string[];
  };
  prompts: {
    image: string;
    video: string;
  };
  tags: string[];
}

export interface LinkToVideoSchema {
  title: string;
  description: string;
  tags: string[];
  prompt_preview: string;
  preview?: string; // Single image URL (ideally the logo)
  segments: ScriptSegment[];
  visualStyle: string;
  aspectRatio: aspectRatioType;
  expandImage?: boolean; // If true, AI images will be expanded with Flux
}
