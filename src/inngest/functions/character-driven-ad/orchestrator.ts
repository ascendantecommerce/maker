import { nanoid } from "nanoid";
import { getInngestApp } from "../../index";
import { initializeCharacterAdServices } from "./services";
import { generateCharacterSeedImages, generateCharacterLipSyncClips } from "./steps";
import { mapInputToSchema } from "./utils/mapping";
import { saveSchema } from "../common/steps";
import { db } from "@/lib/database";
import { ResolverStatus } from "@/utils/enum";
import { ToastType, VideoSchema } from "../../utils/types";
import { workflowChannel } from "../../utils/common";

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
      // 0. Stage 0: Schema Generation (from raw blocks)
      if ((!scheme.segments || scheme.segments.length === 0) && scheme.blocks) {
        scheme = await step.run("generate-schema-from-blocks", async () => {
          const mapped = mapInputToSchema({ 
            blocks: scheme.blocks!,
            product: scheme.product,
            assets: scheme.assets 
          });
          const updated = { ...scheme, ...mapped, id: schemeId };
          
          // Stage 0.5: Persist the generated schema to DB (replaces manual initialization)
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
      const characterResults = await step.run("initialize-character-images", async () => {
        const shotUpdates = await generateCharacterSeedImages(
          schemeId,
          scheme,
          services,
          runToken
        );

        // Apply shot imageUrls onto the segments in-memory
        const updatedSegments = scheme.segments.map((seg) => ({
          ...seg,
          shots: (seg.shots || []).map((shot, shotIndex) => {
            const update = shotUpdates.find(
              (u) => u.segmentId === seg.id && u.shotIndex === shotIndex
            );
            return update ? { ...shot, imageUrl: update.imageUrl } : shot;
          }),
        }));

        const fullUpdatedScheme = { ...scheme, segments: updatedSegments };

        // Persist the full scheme back to DB
        await db
          .updateTable("generations")
          .set({ metadata: JSON.stringify(fullUpdatedScheme) })
          .where("id", "=", schemeId)
          .execute();

        return { segments: updatedSegments, count: shotUpdates.length };
      });

      // Update local state for subsequent stages
      scheme.segments = characterResults.segments as typeof scheme.segments;

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
        const results = await generateCharacterLipSyncClips(
          schemeId,
          scheme,
          services,
          runToken
        );
        
        return {
          clips: results.map(r => ({ id: r.id, url: r.videoUrl })),
          successCount: results.filter(r => r.success).length,
          totalCount: results.length
        };
      });

      // 4. Final Status Update
      await step.run("mark-orchestration-complete", async () => {
        // Update generations metadata with the finalized character/segment mapping
        await db
            .updateTable("generations")
            .set({ 
                status: ResolverStatus.COMPLETED,
                metadata: JSON.stringify(scheme) 
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
            message: "All character scenes generated successfully!",
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
  }
);
