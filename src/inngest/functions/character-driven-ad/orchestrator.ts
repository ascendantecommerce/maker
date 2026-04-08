import { nanoid } from "nanoid";
import { getInngestApp } from "../../index";
import { initializeCharacterAdServices } from "./services";
import {
  generateCharacterSeedImages,
  generateSegmentVideo,
  refineCharacterClips,
  generateCharacterSoundEffects,
} from "./steps";
import { mapInputToSchema } from "./utils/mapping";
import { saveSchema } from "../common/steps";
import { db } from "@/lib/database";
import { ResolverStatus } from "@/utils/enum";
import { ToastType, VideoSchema } from "../../utils/types";
import { workflowChannel } from "../../utils/common";
import { GeminiService } from "@/lib/gemini/generator";
import { getCharacterAdParserSystemPrompt, CHARACTER_AD_SCRIPT_OUTPUT_SCHEMA } from "./prompts";

const inngest = getInngestApp();

/**
 * Character-Driven Ad Orchestrator
 *
 * Specialized pipeline for generating multi-character ads with native lip-sync.
 * Uses Veo 3.1 Fast's ability to generate video and lip-synced audio from a single payload.
 */
export const characterDrivenAdOrchestrator = inngest.createFunction(
  { id: "character-driven-ad-orchestrator", concurrency: 2 },
  { event: "character-ad/video.orchestrate" },
  async ({ event, step, publish }) => {
    let scheme: VideoSchema = event.data.scheme;
    const schemeId = scheme.id;
    const channel = workflowChannel(schemeId);
    const runToken = (event.id ?? nanoid()).slice(0, 8);
    const services = initializeCharacterAdServices();

    try {
      // 0. Stage 0: Schema Generation (from raw script or missing segments)
      if (!scheme.segments || scheme.segments.length === 0) {
        scheme = await step.run("generate-schema-from-content", async () => {
          let segmentsInput: any = scheme.segments;

          // If segments are missing but script is present, parse the script into segments
          if ((!segmentsInput || segmentsInput.length === 0) && scheme.script) {
            const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
            if (!apiKey) throw new Error("GOOGLE_GENERATIVE_AI_API_KEY is not set");

            const gemini = new GeminiService(apiKey, "gemini-2.5-flash-lite");
            const systemPrompt = getCharacterAdParserSystemPrompt(scheme.visuals?.style);
            const result = await gemini.generateScriptAssistant({
              message: `Parse this script into structured segments: \n\n${scheme.script}`,
              productName: scheme.product?.name,
              productDescription: scheme.product?.description,
              systemPrompt,
              outputSchema: CHARACTER_AD_SCRIPT_OUTPUT_SCHEMA,
            });

            segmentsInput = result.segments;
          }

          const mapped = mapInputToSchema({
            segments: segmentsInput,
            blocks: scheme.blocks,
            product: scheme.product,
            assets: scheme.assets,
            visuals: scheme.visuals,
          });
          
          const updated = { ...scheme, ...mapped, id: schemeId };

          // Stage 0.5: Persist the generated schema to DB
          await saveSchema(schemeId, updated, ResolverStatus.PROGRESS);

          return updated;
        });
      }


      // 1. Initial Status Update
      await step.run("mark-orchestration-start", async () => {
        await db
          .updateTable("generations")
          .set({ status: ResolverStatus.PROGRESS })
          .where("id", "=", schemeId)
          .execute();
      });

      await step.run("publish-analysis-start-toast", async () => {
        await publish({
          channel,
          topic: "steps",
          data: {
            type: ToastType.STEP_START,
            step: "Character Initialization",
            stepIndex: 1,
            message: `Analyzing characters and generating seed images...`,
          },
        });
      });

      // 2. Stage 1: Generate Scene Composition Images per Shot
      // We generate one scene image per shot to use as firstFrameUrl/referenceImages in Stage 2.
      const characterResults = await step.run(
        "initialize-character-images",
        async () => {
          const shotUpdates = await generateCharacterSeedImages(
            schemeId,
            scheme,
            services,
            runToken,
          );

          // 1. Update segments (shot imageUrl + segment firstFrameUrl)
          const updatedSegments = scheme.segments.map((seg) => {
            const shotUpdate = shotUpdates.find((u) => u.segmentId === seg.id && u.shotIndex === 0);
            return {
              ...seg,
              firstFrameUrl: shotUpdate?.imageUrl || seg.firstFrameUrl,
              imageUrl: shotUpdate?.imageUrl || seg.imageUrl,
              shots: (seg.shots || []).map((shot, shotIndex) => {
                const update = shotUpdates.find(
                  (u) => u.segmentId === seg.id && u.shotIndex === shotIndex,
                );
                return update ? { ...shot, imageUrl: update.imageUrl } : shot;
              }),
            };
          });

          // 2. Update character baseImageUrl for global consistency
          const updatedCharacters = (scheme.characters || []).map((char) => {
            const firstAppearance = shotUpdates.find((u) => {
              const seg = scheme.segments.find((s) => s.id === u.segmentId);
              return seg?.characterId === char.id;
            });
            return firstAppearance
              ? { ...char, baseImageUrl: firstAppearance.imageUrl }
              : char;
          });

          const fullUpdatedScheme = {
            ...scheme,
            segments: updatedSegments,
            characters: updatedCharacters,
          };

          // 3. Persist the full scheme back to DB metadata
          await db
            .updateTable("generations")
            .set({ metadata: JSON.stringify(fullUpdatedScheme) })
            .where("id", "=", schemeId)
            .execute();

          return { 
            segments: updatedSegments, 
            characters: updatedCharacters,
            count: shotUpdates.length 
          };
        },
      );

      // Update local state for subsequent stages
      scheme.segments = characterResults.segments as typeof scheme.segments;
      scheme.characters = characterResults.characters as typeof scheme.characters;
      
      await step.run("publish-veo-start-toast", async () => {
        await publish({
          channel,
          topic: "steps",
          data: {
            type: ToastType.STEP_START,
            step: "Generating Videos",
            stepIndex: 2,
            message: `Building ${scheme.segments.length} character scenes in parallel...`,
          },
        });
      });

      // 3. Stage 2: Generate Videos (Veo 3.1 Fast)
      // Every segment iterates through Veo 3.1 Fast with Dialogue + VoiceDescription.
      const videoResults = await step.run("generate-video-clips", async () => {
        const results = await generateSegmentVideo(
          schemeId,
          scheme,
          services,
          runToken,
        );

        return {
          clips: results.map((r) => ({ id: r.id, url: r.videoUrl })),
          successCount: results.filter((r) => r.success).length,
          totalCount: results.length,
        };
      });

      // 4. Stage 3: Audio Refinement (ElevenLabs Audio Isolation + ffmpeg merge)
      await step.run("publish-refinement-start-toast", async () => {
        await publish({
          channel,
          topic: "steps",
          data: {
            type: ToastType.STEP_START,
            step: "Refining Audio",
            stepIndex: 3,
            message: `Enhancing ${videoResults.clips.length} videos with studio-quality audio isolation...`,
          },
        });
      });

      const refinedVideoResults = await step.run("refine-generated-videos", async () => {
        const refinedClips = await refineCharacterClips(
          schemeId,
          videoResults.clips,
          services,
          runToken,
        );

        return {
          clips: refinedClips,
          successCount: refinedClips.length,
        };
      });

      // 5. Stage 4: Generate Sound Effects
      await step.run("publish-sfx-start-toast", async () => {
        await publish({
          channel,
          topic: "steps",
          data: {
            type: ToastType.STEP_START,
            step: "Generating Foley & SFX",
            stepIndex: 4,
            message: `Creating AI sound effects for ${refinedVideoResults.clips.length} videos...`,
          },
        });
      });

      const sfxResults = await step.run("generate-sound-effects", async () => {
        const finalClips = await generateCharacterSoundEffects(
          schemeId,
          refinedVideoResults.clips,
          services,
          runToken,
        );

        return {
          clips: finalClips,
          successCount: finalClips.length,
        };
      });

      // Update scheme metadata with refined URLs
      scheme.segments = scheme.segments.map((seg) => {
        const finalClip = sfxResults.clips.find((c) => c.id === seg.id);
        return {
          ...seg,
          ...(finalClip?.soundEffects ? { soundEffects: finalClip.soundEffects } : {}),
          shots: (seg.shots || []).map((shot) => {
            return finalClip
              ? { ...shot, videoUrl: finalClip.url, effects: finalClip.effects }
              : shot;
          }),
        };
      });

      // Synchronize the fully refined segments back into the segments database table
      await step.run("sync-segments-table", async () => {
        await Promise.all(
          scheme.segments.map(async (segmentData) => {
            await db
              .updateTable("segments")
              .set({
                segment_data: segmentData,
                updated_at: new Date(),
              })
              .where("id", "=", segmentData.id)
              .execute();
          })
        );
      });

      // 5. Final Status Update
      await step.run("mark-orchestration-complete", async () => {
        // Update generations metadata with the finalized character/segment mapping
        await db
          .updateTable("generations")
          .set({
            status: ResolverStatus.COMPLETED,
            metadata: JSON.stringify(scheme),
          })
          .where("id", "=", schemeId)
          .execute();
      });

      await step.run("publish-done-toast", async () => {
        await publish({
          channel,
          topic: "steps",
          data: {
            type: ToastType.FUNCTION_COMPLETE,
            step: "Completed",
            message: "All character scenes refined with studio-quality audio!",
          },
        });
      });

      return { success: true };
    } catch (err: any) {
      console.error("[Character Ad Orchestrator Error]:", err);
      const message = err.message || "Unknown error";

      await step.run("publish-error-toast", async () => {
        await publish({
          channel,
          topic: "steps",
          data: {
            type: ToastType.FUNCTION_ERROR,
            error: message,
            message: `Character workflow failed: ${message}`,
          },
        });
      });

      await db
        .updateTable("generations")
        .set({ status: ResolverStatus.FAILED })
        .where("id", "=", schemeId)
        .execute();

      throw err;
    }
  },
);
