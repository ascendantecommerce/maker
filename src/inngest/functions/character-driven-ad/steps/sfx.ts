import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { CharacterAdServices } from "../services";

interface Clip {
  id: string;
  url: string;
  /** URL of the original Veo-generated video (with native audio). Used for SFX analysis. */
  originalUrl?: string;
  effects?: { prompt: string; start: number; end: number, volume?: number }[];
  soundEffects?: { start: number; url: string; duration?: number, volume?: number }[];
}

/**
 * Clones sound effects from the original Veo video and regenerates them via ElevenLabs.
 *
 * Strategy:
 *   1. Download the ORIGINAL Veo clip (which has native audio/SFX baked in by the model).
 *   2. Use Gemini to audit that audio and describe each existing SFX with timing.
 *   3. Regenerate each identified SFX via ElevenLabs and upload to R2.
 *   4. Return the refined clip URL unchanged — only soundEffects metadata is added.
 */
export async function generateCharacterSoundEffects(
  schemeId: string,
  clips: Clip[],
  services: CharacterAdServices,
  runToken: string,
): Promise<Clip[]> {
  const finalClips: Clip[] = [];

  for (const clip of clips) {
    const tempDir = path.join(os.tmpdir(), `sfx-${schemeId}-${runToken}`);
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    // Analyze the original Veo video if available — it has untouched native audio.
    // Fall back to the refined clip URL if originalUrl is not provided.
    const analysisUrl = clip.originalUrl ?? clip.url;
    const analysisVideoPath = path.join(tempDir, `original-video-${clip.id}.mp4`);

    try {
      // 1. Download the original Veo video for SFX analysis
      console.log(`[SFX] Downloading original Veo clip for analysis: ${analysisUrl}`);
      const response = await fetch(analysisUrl);
      const buffer = await response.arrayBuffer();
      fs.writeFileSync(analysisVideoPath, Buffer.from(buffer));

      // 2. Audit the original video's audio to clone existing SFX
      const videoBuffer = fs.readFileSync(analysisVideoPath);
      const { effects } = await services.gemini.analyzeVideoForSfx(
        videoBuffer,
        "video/mp4",
      );
      console.log(`[SFX] Clip ${clip.id} — cloned effects from original:`, effects);

      // 3. Regenerate each identified SFX via ElevenLabs
      const generatedSoundEffects: { start: number; url: string; duration?: number, volume?: number }[] = [];

      if (effects && effects.length > 0) {
        // Enforce extreme scarcity natively: take at most 2 largest/loudest effects
        const topEffects = [...effects]
          .sort((a, b) => (b.volume ?? 0.5) - (a.volume ?? 0.5)) // loudest first
          .slice(0, 2) // max 2
          .sort((a, b) => a.start - b.start); // chronological order

        for (let index = 0; index < topEffects.length; index++) {
          const effect = topEffects[index];
          const durationMs = effect.end - effect.start;
          const durationSeconds = Math.max(0.5, durationMs / 1000);

          try {
            const sfxBuffer = await services.tts.generateSfx(
              effect.prompt,
              durationSeconds,
            );
            const fileName = `character-ads/${schemeId}/sfx-${clip.id}-${index}-${runToken}.mp3`;
            const sfxUrl = await services.r2.uploadData(
              fileName,
              sfxBuffer,
              "audio/mpeg",
            );

            generatedSoundEffects.push({
              start: effect.start,
              url: sfxUrl,
              duration: durationMs,
              volume: effect.volume,
            });
          } catch (e) {
            console.error(`[SFX] Failed to regenerate SFX: "${effect.prompt}"`, e);
          }
        }
      }

      finalClips.push({
        ...clip,
        effects,
        soundEffects: generatedSoundEffects,
      });
    } catch (error) {
      console.error(`[SFX Generation Error] Clip ${clip.id}:`, error);
      finalClips.push(clip);
    } finally {
      if (fs.existsSync(analysisVideoPath)) fs.unlinkSync(analysisVideoPath);
    }
  }

  return finalClips;
}

