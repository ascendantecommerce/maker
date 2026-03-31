import fs from "fs";
import path from "path";
import { promisify } from "util";
import { pipeline } from "stream";
import mime from "mime/lite";
import sharp from "sharp";

import { aspectRatioType } from "@/utils/enum";

const streamPipeline = promisify(pipeline);
const DEFAULT_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
  "Accept-Language": "en-US,en;q=0.9",
};

export function safeParseAIJson(raw: string) {
  if (!raw || typeof raw !== "string") return null;

  // Remover fences ```json ``` o ```
  let cleaned = raw
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();

  const match = cleaned.match(/\{[\s\S]*\}/);
  if (!match) return null;

  try {
    return JSON.parse(match[0]);
  } catch (err) {
    console.error("JSON parse failed:", err);
    return null;
  }
}

/**
 * Download a video from a URL and save to outputDir
 */
export async function downloadVideo(url: string, outputDir: string): Promise<string> {
  const filename = path.basename(new URL(url).pathname);
  const outputPath = path.join(outputDir, filename);

  try {
    fs.mkdirSync(outputDir, { recursive: true });
    const urlObj = new URL(url);
    const response: any = await fetch(url, {
      headers: {
        ...DEFAULT_HEADERS,
        Referer: urlObj.origin + "/",
      },
    });
    if (!response.ok || !response.body) {
      throw new Error(`Failed to download video: ${response.status} ${response.statusText}`);
    }

    const contentLength = parseInt(response.headers.get("content-length") || "0", 10);
    await streamPipeline(response.body, fs.createWriteStream(outputPath));

    if (!fs.existsSync(outputPath)) {
      throw new Error(`File not found after download: ${outputPath}`);
    }

    const stats = fs.statSync(outputPath);
    if (contentLength && stats.size !== contentLength) {
      throw new Error("Downloaded video is incomplete");
    }

    return outputPath;
  } catch (err: any) {
    console.error("[DOWNLOAD_VIDEO] Failed to download video:", err);
    throw new Error(`Failed to download video`);
  }
}

export async function fileUrlToBuffer(
  fileUrl: string,
  defaultType = "jpeg",
): Promise<{
  buffer: Buffer;
  contentType: string;
  extension: string;
  numBytes: number;
}> {
  try {
    if (fileUrl.startsWith("data:")) {
      const parts = fileUrl.split(",");
      const match = parts[0].match(/^data:([^;]+);/);
      const contentType = match ? match[1] : "image/jpeg";
      const buffer = Buffer.from(parts[1] || "", "base64");
      const extension = mime.getExtension(contentType) || defaultType;
      return { buffer, contentType, extension, numBytes: buffer.length };
    } else if (!fileUrl.startsWith("http://") && !fileUrl.startsWith("https://")) {
      const buffer = Buffer.from(fileUrl, "base64");
      const contentType = defaultType === "png" ? "image/png" : "image/jpeg";
      const extension = defaultType;
      return { buffer, contentType, extension, numBytes: buffer.length };
    }

    const urlObj = new URL(fileUrl);
    const headers = { ...DEFAULT_HEADERS, Referer: urlObj.origin + "/" };

    // Fetch the file as an array buffer
    const response = await fetch(fileUrl, { headers });
    if (!response.ok) throw new Error(`Error: ${response.status}`);

    // Extract MIME type from the response headers
    let contentType = response.headers.get("content-type") || "application/octet-stream";

    // Fallback to URL extension if MIME is generic or bin
    const urlPath = urlObj.pathname.toLowerCase();
    const urlExt = urlPath.split(".").pop()?.split(/[?#]/)[0];

    const isGeneric = contentType === "application/octet-stream" || !contentType;

    if (isGeneric && urlExt) {
      const inferredMime = mime.getType(urlExt);
      if (inferredMime) contentType = inferredMime;
    }

    // Convert the array buffer to a Node.js buffer
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    if (buffer.length === 0) {
      throw new Error("Downloaded buffer is empty");
    }

    // Get the size in bytes
    const numBytes = buffer.length;
    const extension = mime.getExtension(contentType) || urlExt || defaultType;

    // Return the buffer, MIME type, and size
    return { buffer, contentType, extension, numBytes };
  } catch (error) {
    console.error("Error converting URL to buffer:", fileUrl, error);
    throw error;
  }
}

export async function adjustImageToCanvas(
  inputBuffer: Buffer,
  aspectRatio: aspectRatioType,
): Promise<Buffer> {
  const aspectSizes: Record<aspectRatioType, { width: number; height: number }> = {
    [aspectRatioType.SIXTEEN_NINE]: { width: 1280, height: 720 },
    [aspectRatioType.NINE_SIXTEEN]: { width: 720, height: 1280 },
    [aspectRatioType.ONE]: { width: 720, height: 720 },
  };

  const canvasSize = aspectSizes[aspectRatio];

  const image = sharp(inputBuffer);
  const metadata = await image.metadata();

  if (!metadata.width || !metadata.height) {
    throw new Error("Cannot read image dimensions.");
  }

  if (metadata.width <= canvasSize.width && metadata.height <= canvasSize.height) {
    console.log("Image fits within canvas. No resizing needed.");
    return inputBuffer;
  }

  const resizedBuffer = await image
    .resize({
      width: canvasSize.width,
      height: canvasSize.height,
      fit: "inside",
      withoutEnlargement: true,
    })
    .toBuffer();

  console.log(
    `✅ Image resized from ${metadata.width}x${metadata.height} to fit inside ${canvasSize.width}x${canvasSize.height}`,
  );

  return resizedBuffer;
}
