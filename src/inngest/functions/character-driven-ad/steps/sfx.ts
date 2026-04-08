import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { CharacterAdServices } from "../services";

interface Clip {
  id: string;
  url: string;
  effects?: { prompt: string; start: number; end: number }[];
  soundEffects?: { start: number; url: string; duration?: number }[];
}

/**
 * Analyzes video for necessary sound effects and generates them via ElevenLabs.
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
    const inputVideoPath = path.join(tempDir, `input-video-${clip.id}.mp4`);

    try {
      // 1. Download refined video
      const response = await fetch(clip.url);
      const buffer = await response.arrayBuffer();
      fs.writeFileSync(inputVideoPath, Buffer.from(buffer));

      // 2. Analyze video for sound effects using Gemini 3.1 Flash
      const videoBuffer = fs.readFileSync(inputVideoPath);
      const { effects } = await services.gemini.analyzeVideoForSfx(
        videoBuffer,
        "video/mp4",
      );
      console.log(`[SFX] Clip ${clip.id} effects:`, effects);

      // 3. Generate Sound Effects using ElevenLabs
      let generatedSoundEffects: {
        start: number;
        url: string;
        duration?: number;
      }[] = [];

      if (effects && effects.length > 0) {
        for (let index = 0; index < effects.length; index++) {
          const effect = effects[index];
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
            });
          } catch (e) {
            console.error(`Failed to generate SFX for prompt: ${effect.prompt}`, e);
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
      if (fs.existsSync(inputVideoPath)) fs.unlinkSync(inputVideoPath);
    }
  }

  return finalClips;
}
