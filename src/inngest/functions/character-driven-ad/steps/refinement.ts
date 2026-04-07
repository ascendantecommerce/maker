import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { randomUUID } from "node:crypto";
import ffmpeg from "fluent-ffmpeg";
import ffmpegStatic from "ffmpeg-static";
import { CharacterAdServices } from "../services";

// Set ffmpeg path
if (ffmpegStatic) {
  ffmpeg.setFfmpegPath(ffmpegStatic);
}

interface Clip {
  id: string;
  url: string;
}

/**
 * Refines the generated video clips by isolating and cleaning the audio.
 */
export async function refineCharacterClips(
  schemeId: string,
  clips: Clip[],
  services: CharacterAdServices,
  runToken: string,
): Promise<Clip[]> {
  const refinedClips: Clip[] = [];

  for (const clip of clips) {
    const tempDir = path.join(os.tmpdir(), `refine-${schemeId}-${runToken}`);
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const inputVideoPath = path.join(tempDir, `input-${clip.id}.mp4`);
    const inputAudioPath = path.join(tempDir, `input-${clip.id}.mp3`);
    const cleanAudioPath = path.join(tempDir, `clean-${clip.id}.mp3`);
    const outputVideoPath = path.join(tempDir, `output-${clip.id}.mp4`);

    try {
      // 1. Download original video
      const response = await fetch(clip.url);
      const buffer = await response.arrayBuffer();
      fs.writeFileSync(inputVideoPath, Buffer.from(buffer));

      // 2. Extract audio using ffmpeg
      await new Promise<void>((resolve, reject) => {
        ffmpeg(inputVideoPath)
          .toFormat("mp3")
          .on("error", (err) => reject(new Error(`Failed to extract audio: ${err.message}`)))
          .on("end", () => resolve())
          .save(inputAudioPath);
      });

      // 3. Isolate audio using ElevenLabs
      const audioBuffer = fs.readFileSync(inputAudioPath);
      const cleanAudioBuffer = await services.tts.isolateAudio(audioBuffer);
      fs.writeFileSync(cleanAudioPath, cleanAudioBuffer);

      // 4. Merge clean audio back into video
      // We use -c:v copy to avoid re-encoding the video stream
      await new Promise<void>((resolve, reject) => {
        ffmpeg()
          .input(inputVideoPath)
          .input(cleanAudioPath)
          .outputOptions([
            "-map 0:v:0", // Use the video from the first input
            "-map 1:a:0", // Use the audio from the second input
            "-c:v copy",   // Copy video stream without re-encoding
            "-c:a aac",    // Encode clean audio to AAC
            "-shortest",   // Finish when the shortest stream ends
          ])
          .on("error", (err) => reject(new Error(`Failed to merge audio: ${err.message}`)))
          .on("end", () => resolve())
          .save(outputVideoPath);
      });

      // 5. Upload refined video to R2
      const finalVideoBuffer = fs.readFileSync(outputVideoPath);
      const fileName = `character-ads/${schemeId}/refined-${clip.id}-${runToken}.mp4`;
      const refinedUrl = await services.r2.uploadData(fileName, finalVideoBuffer, "video/mp4");

      refinedClips.push({
        id: clip.id,
        url: refinedUrl,
      });
    } catch (error) {
      console.error(`[Refinement Error] Clip ${clip.id}:`, error);
      // Fallback to original clip if refinement fails
      refinedClips.push(clip);
    } finally {
      // Cleanup temp files
      try {
        if (fs.existsSync(inputVideoPath)) fs.unlinkSync(inputVideoPath);
        if (fs.existsSync(inputAudioPath)) fs.unlinkSync(inputAudioPath);
        if (fs.existsSync(cleanAudioPath)) fs.unlinkSync(cleanAudioPath);
        if (fs.existsSync(outputVideoPath)) fs.unlinkSync(outputVideoPath);
      } catch (cleanupErr) {
        console.warn("[Refinement Cleanup Warning]:", cleanupErr);
      }
    }
  }

  return refinedClips;
}
