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
  effects?: { prompt: string; start: number; end: number }[];
}

/**
 * Refines the generated video clips by isolating and cleaning the audio,
 * and then adding AI-generated sound effects based on visual analysis.
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
    const sfxAudioPaths: string[] = [];
    const outputVideoPath = path.join(tempDir, `output-${clip.id}.mp4`);
    const finalVideoPath = path.join(tempDir, `final-${clip.id}.mp4`);

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

      // 4. Temporarily merge clean audio to analyze synced visuals
      await new Promise<void>((resolve, reject) => {
        ffmpeg()
          .input(inputVideoPath)
          .input(cleanAudioPath)
          .outputOptions([
            "-map 0:v:0",
            "-map 1:a:0",
            "-c:v copy",
            "-c:a aac",
            "-shortest",
          ])
          .on("error", (err) => reject(new Error(`Failed to merge clean audio: ${err.message}`)))
          .on("end", () => resolve())
          .save(outputVideoPath);
      });

      // 5. Analyze refined video for sound effects using Gemini 3.1 Flash
      const refinedVideoBuffer = fs.readFileSync(outputVideoPath);
      const { effects } = await services.gemini.analyzeVideoForSfx(refinedVideoBuffer, "video/mp4");

      // 6. Generate Sound Effects using ElevenLabs
      if (effects && effects.length > 0) {
        await Promise.all(
          effects.map(async (effect, index) => {
            const durationMs = effect.end - effect.start;
            const durationSeconds = Math.max(0.5, durationMs / 1000);
            
            const sfxBuffer = await services.tts.generateSfx(effect.prompt, durationSeconds);
            const sfxPath = path.join(tempDir, `sfx-${clip.id}-${index}.mp3`);
            fs.writeFileSync(sfxPath, sfxBuffer);
            sfxAudioPaths.push(sfxPath);
          })
        );

        // 7. Mix Clean Voice + All SFX back into video
        await new Promise<void>((resolve, reject) => {
          const command = ffmpeg().input(inputVideoPath).input(cleanAudioPath);
          
          // Add all SFX as inputs
          sfxAudioPaths.forEach((path) => command.input(path));

          // Build complex filter for mixing
          const filterParts: string[] = [];
          // Input 0: Original Video (ignore original audio)
          // Input 1: Clean Voice
          // Inputs 2 to N: SFX
          
          // Delay each SFX input
          sfxAudioPaths.forEach((_, i) => {
            const effect = effects[i];
            const delay = effect.start; // in ms
            // Index is i + 2 because 0 is video, 1 is clean voice
            filterParts.push(`[${i + 2}:a]adelay=${delay}|${delay}[sfx${i}]`);
          });

          // Mix clean voice [1:a] with all delayed SFX [sfx0], [sfx1]...
          const mixInputs = [`[1:a]`, ...sfxAudioPaths.map((_, i) => `[sfx${i}]`)];
          filterParts.push(`${mixInputs.join("")}amix=inputs=${mixInputs.length}:dropout_transition=0[aout]`);

          command
            .complexFilter(filterParts)
            .outputOptions([
              "-map 0:v:0",   // Use original video
              "-map [aout]",  // Use mixed audio
              "-c:v copy",    // Fast copy video
              "-c:a aac",     // Encode audio to AAC
              "-shortest",    // Handle duration mismatches
            ])
            .on("error", (err) => reject(new Error(`Failed to mix SFX: ${err.message}`)))
            .on("end", () => resolve())
            .save(finalVideoPath);
        });
      } else {
        // No SFX detected, just use the clean audio version
        fs.renameSync(outputVideoPath, finalVideoPath);
      }

      // 8. Upload finalized video to R2
      const finalVideoBuffer = fs.readFileSync(finalVideoPath);
      const fileName = `character-ads/${schemeId}/final-${clip.id}-${runToken}.mp4`;
      const finalUrl = await services.r2.uploadData(fileName, finalVideoBuffer, "video/mp4");

      refinedClips.push({
        id: clip.id,
        url: finalUrl,
        effects,
      });
    } catch (error) {
      console.error(`[Refinement/SFX Error] Clip ${clip.id}:`, error);
      // Fallback to original clip if anything fails
      refinedClips.push(clip);
    } finally {
      // Cleanup temp files
      try {
        [inputVideoPath, inputAudioPath, cleanAudioPath, outputVideoPath, finalVideoPath, ...sfxAudioPaths].forEach((p) => {
          if (fs.existsSync(p)) fs.unlinkSync(p);
        });
      } catch (cleanupErr) {
        console.warn("[Refinement Cleanup Warning]:", cleanupErr);
      }
    }
  }

  return refinedClips;
}
