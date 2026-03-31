import fs from "fs/promises";
import path from "path";
import os from "os";
import { GoogleGenAI, Part, createPartFromUri } from "@google/genai";
import { ScrapedData, LinkToVideoSchema } from "../utils/types";
import { fileUrlToBuffer } from "../utils/common";
import { generateId } from "@/utils/id";
import { config } from "@/inngest/config";
import { R2StorageService } from "@/lib/r2-storage";
import { calculateGeminiCost } from "@/inngest/utils/pricing";
import { PriceItem } from "@/inngest/utils/types";

const MAX_VIDEOS = 6;
const MAX_MEDIA_TOTAL = 15;
const MAX_CONCURRENT_UPLOADS = 5;

const FRAME_STYLES = [
  "realism",
  "anime",
  "claymation",
  "pixar",
  "cartoon",
  "mythological",
  "digital",
  "ghibli",
  "hyper-realistic",
  "shadows",
  "3d",
  "illustration",
  "sketch",
  "lego",
  "manga",
  "minecraft",
  "wooden-textured",
  "transparent-glass",
  "paper-style",
  "cinematic",
  "miniature",
  "felt-wool",
  "dreamwave",
  "gigerwave",
  "gta-vi",
];

const client = new GoogleGenAI({ apiKey: config.gemini.key });

// --- Clean HTML ---
function extractReadableText(html: string): string {
  return html
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 4000);
}

interface mediaResult {
  id: string;
  url: string;
  geminiUrl: string;
  contentType: string;
}

// --- Upload de media ---
async function uploadMediaUrls(
  urls: string[],
  type: "IMAGE" | "VIDEO",
  generationId: string,
  storage: R2StorageService,
  maxSlots: number,
  maxConcurrency = MAX_CONCURRENT_UPLOADS,
): Promise<mediaResult[]> {
  const results: mediaResult[] = [];
  let index = 0;

  if (type === "VIDEO") {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "video-"));

    try {
      async function worker() {
        while (results.length < maxSlots && index < urls.length) {
          const currentIndex = index++;
          const url = urls[currentIndex];

          try {
            const { buffer, extension, contentType } = await fileUrlToBuffer(url);

            const fileName = `${generateId()}.${extension}`;
            const filePath = path.join(tempDir, fileName);

            await fs.writeFile(filePath, buffer);

            const myfile = await client.files.upload({
              file: filePath,
              config: { mimeType: contentType },
            });

            if (!myfile.uri || !myfile.mimeType) continue;

            const pathKey = `VIDEOS/${generationId}/${type}/${fileName}`;
            const uploadedUrl = await storage.uploadData(pathKey, buffer);

            results.push({
              id: `vid_${index}`,
              url: uploadedUrl,
              geminiUrl: myfile.uri,
              contentType: myfile.mimeType,
            });

            await fs.unlink(filePath);
          } catch (err) {
            console.warn(`Error subiendo ${url}:`, err);
          }
        }
      }

      const workers = Array.from({ length: Math.min(maxConcurrency, urls.length) }, () => worker());

      await Promise.all(workers);
      return results.slice(0, maxSlots);
    } finally {
      await fs.rm(tempDir, { recursive: true, force: true });
    }
  } else {
    async function worker() {
      while (results.length < maxSlots && index < urls.length) {
        const currentIndex = index++;
        const url = urls[currentIndex];

        try {
          const { buffer, extension, contentType } = await fileUrlToBuffer(url);
          const filePath = `VIDEOS/${generationId}/${type}/${generateId()}.${extension}`;
          const uploadedUrl = await storage.uploadData(filePath, buffer);
          results.push({
            id: `img_${index}`,
            url: uploadedUrl,
            geminiUrl: "",
            contentType: contentType,
          });
        } catch (err) {
          console.warn(`Error subiendo ${url}:`, err);
        }
      }
    }

    const workers = Array.from({ length: Math.min(maxConcurrency, urls.length) }, () => worker());

    await Promise.all(workers);
    return results.slice(0, maxSlots);
  }
}

function resolveMediaIds(
  schema: LinkToVideoSchema,
  imageCatalog: { id: string; url: string }[],
  videoCatalog: { id: string; url: string }[],
) {
  const imageMap = Object.fromEntries(imageCatalog.map((i) => [i.id, i.url]));
  const videoMap = Object.fromEntries(videoCatalog.map((v) => [v.id, v.url]));

  schema.preview = imageMap[schema.preview || ""] ?? schema.preview;

  schema.segments.forEach((segment) => {
    segment.media.images = segment.media.images.map((id) => imageMap[id]).filter(Boolean);

    segment.media.videos = segment.media.videos.map((id) => videoMap[id]).filter(Boolean);
  });
}

export async function generateUnifiedSchema(
  data: ScrapedData,
  storage: R2StorageService,
  generationId: string,
): Promise<{ scheme: LinkToVideoSchema; price: PriceItem }> {
  const imageSources = [...data.media.images];
  let explicitPreviewUrl = "";

  const uploadedVideos = await uploadMediaUrls(
    data.media.videos,
    "VIDEO",
    generationId,
    storage,
    MAX_VIDEOS,
  );

  const remainingSlots = MAX_MEDIA_TOTAL - uploadedVideos.length;

  const uploadedImages = await uploadMediaUrls(
    imageSources,
    "IMAGE",
    generationId,
    storage,
    remainingSlots,
  );

  let previewId = "";
  if (data.preview && data.preview.trim() !== "") {
    const { buffer, extension, contentType } = await fileUrlToBuffer(data.preview.trim());
    const pathKey = `VIDEOS/${generationId}/IMAGE/${generateId()}.${extension}`;
    explicitPreviewUrl = await storage.uploadData(pathKey, buffer);
    previewId = `preview_1`;
    uploadedImages.push({
      id: previewId,
      url: explicitPreviewUrl,
      geminiUrl: "",
      contentType: contentType,
    });
  }

  const mediaParts: Part[] = [
    ...uploadedImages.map((v) => createPartFromUri(v.url, v.contentType)),
    ...uploadedVideos.map((v) => createPartFromUri(v.geminiUrl, v.contentType)),
  ];

  const userContent = {
    role: "user",
    parts: [
      ...mediaParts,
      {
        text: `
Analyze the website content and the provided media.

MEDIA CATALOG (USE IDS ONLY):

IMAGES:
${uploadedImages.map((i) => i.id).join("\n")}

VIDEOS:
${uploadedVideos.map((v) => v.id).join("\n")}

${previewId ? `DESIGNATED PREVIEW ID: ${previewId}` : ""}

RULES:
- Use ONLY the IDs above
- DO NOT invent new IDs
- DO NOT write URLs
- Media fields must contain ONLY these IDs
${previewId ? `- The "preview" field MUST be "${previewId}"` : ""}

Website URL: ${data.url}
Title: ${data.title}
Meta Description: ${data.description}

Cleaned Content:
${extractReadableText(data.html)}
        `,
      },
    ],
  };

  const geminiModel = "gemini-3-flash-preview";
  const response = await client.models.generateContent({
    model: geminiModel,
    contents: [userContent],
    config: {
      systemInstruction: `
        You are a professional video editor and script analyst. Your mission is to analyze the provided website content and create a production-ready video schema.
        
        GOALS:
        1. Create a compelling 60-second spoken voiceover script divided into logical segments.
        2. Each segment must represent a complete thought that takes 7-10 seconds to speak aloud.
        3. For each segment, match it with the most relevant media IDs from the provided catalog.
        4. Select a "preview" image ID for the entire video. ${previewId ? `Use the DESIGNATED PREVIEW ID: ${previewId}.` : "If no designated preview is provided, pick the best image (ideally a logo or a high-impact brand image)."}
        5. Generate a "prompt_preview": This MUST be a detailed, high-quality visual description of the selected "preview" image. This prompt will be used to generate a high-quality thumbnail that matches the preview image.
        6. Generate rich, production-ready visual prompts for each segment.
        7. STRONGLY prioritize video usage to create a dynamic, engaging experience. If videos are available, you MUST try to use at least one video in as many segments as possible, provided it is naturally relevant.
        
        SCRIPT RULES:
        - Follow a Hook → Problem → Solution → Proof → Call-To-Action narrative flow.
        - Tone must be confident, energetic, and persuasive.
        - Assume ~2.5 words per second (e.g., 10 seconds = 25 words max, 7 seconds = 17 words min).
        
        EDITORIAL JUDGMENT RULES:
        - Actively evaluate the website content to identify elements that could function as a strong attention hook.
        - Potential hook candidates may include: recognizable clients/brands, notable metrics (scale, years in operation, users), offers, promotions, guarantees, unique technologies, or high-impact outcomes.
        - Use these elements ONLY if they genuinely strengthen attention, credibility, or persuasion.
        - Do NOT force the inclusion of numbers, clients, or offers if they are weak, vague, or low-impact.
        - Prioritize what would resonate emotionally or commercially with a first-time viewer.
        
        MEDIA MATCHING RULES:
        - For each segment, select 1-2 image IDs and/or 1 video ID from the provided catalog that best represent the segment's content.
        - DYNAMIC CONTENT: STRONGLY favor video IDs over image IDs. If you have 3 videos, you should aim to distribute them across the segments to ensure the video is not static. A segment with a video is always preferred over a segment with only images.
        - CRITICAL: Each media ID should ideally be used ONLY ONCE across the entire video. Do not repeat media unless absolutely necessary.
        - PREVIEW REUSE: The image ID used for "preview" SHOULD NOT be used in any segment unless the total number of available images is very small (e.g., fewer than 4 images besides the preview).
        - If no relevant media is found for a segment, leave the images/videos arrays empty. Do not force irrelevant media.
        - However, try your best to find at least one relevant media item for each segment.
        
        MEDIA QUALITY RULES (CRITICAL):
        - You have been provided with visual parts for each ID. Examine them carefully.
        - NEVER use images that appear to be UI elements, icons, or controls.
        - NEVER use images that are likely solid colors or "empty".
        - PRIORITIZE high-quality product shots, lifestyle photography, and clear action videos.
        - If a media item looks suspicious or like a technical asset, IGNORE IT.

        MEDIA REUSE POLICY (STRICT):
        - Media IDs MUST NOT be reused across segments.
        - Treat each media item as a scarce, valuable asset.
        - Reuse is allowed ONLY IF:
          - The total number of provided media IDs is very small (e.g., fewer than 6 total items),
          - AND the reused media is critically important for understanding the product or brand.
        - If reuse happens, it should be minimal and intentional, never automatic.

        VISUAL PROMPT RULES:
        - "prompts.image": include subject, setting, composition, lighting, mood, and stylistic cues.
        - "prompts.video": include subject, motion, camera style, lighting, pacing, and mood.

        OUTPUT RULES:
        - NEVER write URLs.
        - Use ONLY provided IDs.
        - Output valid JSON only.
      `,
      responseMimeType: "application/json",
      responseSchema: {
        type: "object",
        required: [
          "title",
          "description",
          "tags",
          "prompt_preview",
          "preview",
          "visualStyle",
          "segments",
        ],
        properties: {
          title: { type: "string" },
          description: { type: "string" },
          tags: { type: "array", items: { type: "string" } },
          prompt_preview: { type: "string" },
          preview: { type: "string" },
          visualStyle: { type: "string", enum: FRAME_STYLES },
          segments: {
            type: "array",
            items: {
              type: "object",
              required: [
                "id",
                "title",
                "text",
                "description",
                "duration",
                "media",
                "prompts",
                "tags",
              ],
              properties: {
                id: { type: "string" },
                title: { type: "string" },
                text: { type: "string" },
                description: { type: "string" },
                duration: { type: "number", minimum: 7, maximum: 10 },
                media: {
                  type: "object",
                  properties: {
                    images: { type: "array", items: { type: "string" } },
                    videos: { type: "array", items: { type: "string" } },
                  },
                },
                prompts: {
                  type: "object",
                  properties: {
                    image: { type: "string" },
                    video: { type: "string" },
                  },
                },
                tags: { type: "array", items: { type: "string" } },
              },
            },
          },
        },
      },
    },
  });

  const price = response.usageMetadata
    ? calculateGeminiCost(response.usageMetadata, geminiModel)
    : 0;

  const text = response.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Invalid Gemini response");

  const scheme = JSON.parse(text) as LinkToVideoSchema;

  resolveMediaIds(scheme, uploadedImages, uploadedVideos);

  return { scheme, price: { service: "Gemini", type: "Chat", price } };
}
