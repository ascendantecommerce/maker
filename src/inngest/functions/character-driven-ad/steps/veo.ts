import fs from "fs";
import os from "os";
import path from "path";
import { VideoSchema } from "@/types/segment";
import { CharacterAdServices } from "../services";
import { db } from "@/lib/database";
import { fileUrlToBuffer } from "../../common/utils/common";
import { generateId } from "@/utils/id";
import { getVideoDuration } from "../../../services/ffmpeg";
import { buildCharacterAdNegativePrompt } from "../prompts";

/**
 * Stage 2: Generate natively lip-synced video clips from Veo 3.1 Fast.
 * Each segment contains dialogue and a link to a character with a base image.
 * Image-to-Video is used to maintain character consistency based on the seed image.
 */
export const generateSegmentVideo = async (
  schemeId: string,
  scheme: VideoSchema,
  services: CharacterAdServices,
  runToken: string
) => {
  const segments = scheme.segments || [];
  const characters = scheme.characters || [];
  const globalStyle = scheme.visuals.style;

  console.log(`[Character Orchestrator] Generating ${segments.length} lip-synced clips...`);

  const results = await Promise.all(
    segments.map(async (segment) => {
      const character = characters.find((c) => c.id === segment.characterId);
      
      if (!character) {
        console.warn(`Missing character config for segment ${segment.id}`);
        return { id: segment.id, success: false };
      }

      console.log(`Generating Veo 3.1 clips for: ${segment.id} (Character: ${character.name})`);

      const updatedShots = await Promise.all(
        (segment.shots || []).map(async (shot: any) => {
          const rawDuration = shot.duration ? shot.duration / 1000 : 8;
          // Snap to Veo 3.1 Fast supported values: [4, 6, 8]
          let requestedDuration = 8;
          if (rawDuration <= 4) requestedDuration = 4;
          else if (rawDuration <= 6) requestedDuration = 6;
          else requestedDuration = 8;

          // Use the pre-built shot.videoPrompt from mapping (includes product interaction type)
          // Fall back to a simple segment prompt if missing
          const characterDesc = character.visualDescription?.trim() || `${character.role} character`;
          const shotPrompt = shot.videoPrompt
            || `${globalStyle}, ${characterDesc}, ${segment.emotion || "natural"} expression, cinematic lighting`;

          const finalPrompt = `${shotPrompt}

DIALOGUE: "${segment.text}"
VOICE: ${character.voiceDescription || "natural, friendly"}`.trim();

          console.log(`Generating Veo 3.1 clip for shot: ${shot.words?.slice(0, 30)}... (${requestedDuration}s)`);

          let generatorParams: any = {
            prompt: finalPrompt,
            negativePrompt: buildCharacterAdNegativePrompt(),
            style: globalStyle,
            aspectRatio: scheme.aspectRatio,
            durationSeconds: requestedDuration,
          };

          if (shot.type === "product") {
            // Product shot: product asset is the primary reference (exact packaging).
            // Scene composition image (shot.imageUrl) is secondary context.
            const productAssetUrl = scheme.assets?.[0]?.url;
            const productAssetUrl2 = scheme.assets?.[1]?.url;
            const refs = [productAssetUrl, productAssetUrl2, shot.imageUrl].filter(Boolean) as string[];
            if (refs.length > 0) {
              generatorParams.referenceImageUrls = refs;
            } else {
              // No references available, fall back to firstFrameUrl
              generatorParams.firstFrameUrl = shot.imageUrl;
            }
          } else {
            // Non-product shot: use shot.imageUrl as the locked first frame.
            generatorParams.firstFrameUrl = shot.imageUrl;
          }

          const generatorOutput = await services.videoGenerator.create(generatorParams);
          const finalVideoUrl = typeof generatorOutput === "string" ? generatorOutput : generatorOutput.url;

          // Convert output to buffer and upload to R2
          const { buffer, contentType } = await fileUrlToBuffer(finalVideoUrl);
          
          // Accurate duration calculation using FFprobe
          const tempPath = path.join(os.tmpdir(), `veo-clip-${generateId(8)}.mp4`);
          fs.writeFileSync(tempPath, buffer);
          const realDuration = await getVideoDuration(tempPath);
          const realDurationMs = Math.round(realDuration * 1000);
          if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath); // Cleanup

          const storagePath = `character-driven-ad/${schemeId}/videos/${segment.id}-${generateId(4)}.mp4`;
          const videoUrl = await services.r2.uploadData(storagePath, buffer, contentType);

          return {
            ...shot,
            videoUrl,
            duration: realDurationMs,
            display: { 
              from: shot.display?.from || 0, 
              to: (shot.display?.from || 0) + realDurationMs 
            }
          };
        })
      );

      // Calculate total segment duration from individual shots
      const totalDurationMs = updatedShots.reduce((acc, s: any) => acc + (s.duration || 0), 0);

      // Persist the generated clips to the database via segment_data JSONB
      await db
        .updateTable("segments")
        .set({ 
          segment_data: {
              ...segment,
              status: "ready",
              duration: totalDurationMs,
              estimatedDuration: totalDurationMs / 1000,
              shots: updatedShots
          },
          updated_at: new Date()
        })
        .where("id", "=", segment.id)
        .execute();

      return {
        id: segment.id,
        videoUrl: updatedShots[0]?.videoUrl,
        success: true,
      };
    })
  );

  return results;
};
