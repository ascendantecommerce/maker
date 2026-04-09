import { NonRetriableError } from "inngest";

import { getInngestApp } from "../../index";

import { initializeServices } from "../common/services";
import * as pipelineSteps from "../common/steps";

import * as narrativeSteps from "./steps";
import { applyLipsyncToScheme } from "../lipsync-resolver";

import { db } from "@/lib/database";
import { withDbRetry } from "@/lib/database/retry";

import { ResolverStatus, VideoType } from "@/utils/enum";
import { workflowChannel } from "../../utils/common";
import { ToastType, type PriceItem, type VideoSchema } from "../../utils/types";
import { advanceGenerationTask } from "../../utils/generation-progress";

import { ensureObject, fetchWorkflowState, getMediaMetadata } from "../common/services/utils";
import { NARRATIVE_TASK_KEYS, NARRATIVE_TASKS } from "./constants";

const inngest = getInngestApp();

export const narrativeVideoOrchestrator = inngest.createFunction(
  { id: "narrative-video-orchestrator" },
  { event: "video/narrative.orchestrate" },

  async ({ event, step, attempt, publish }) => {
    let scheme: VideoSchema = event.data.scheme;
    const schemeId = scheme.id;
    const channel = workflowChannel(schemeId);

    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));

      await step.run("publish-start-toast", async () => {
        await publish({
          channel,
          topic: "steps",
          data: { type: ToastType.STEP_START, step: "AI Analysis", stepIndex: 1 },
        });
      });

      await step.run("mark-generation-progress-analysis", async () => {
        await advanceGenerationTask(schemeId, NARRATIVE_TASK_KEYS.ANALYSIS, NARRATIVE_TASKS);
        await db
          .updateTable("generations")
          .set({ status: ResolverStatus.PROGRESS })
          .where("id", "=", schemeId)
          .execute();
      });

      // ========================================================================
      // PIPELINE STAGES - CONTROLS
      // ========================================================================
      const STAGE_1_SCHEMA_PROMPTS = true;
      const STAGE_2_AUDIO_CAPTIONS = true;
      const STAGE_3_TIMINGS = true;
      const STAGE_4_BASE_BROLL = true;
      const STAGE_5_PREVIEW = true;
      const STAGE_6_FIRST_FRAMES = true;
      const STAGE_7_AI_IMAGES = true;
      const STAGE_7_AI_VIDEOS = true;
      const STAGE_7_STOCK_VIDEOS = true;
      const STAGE_8_CONSOLIDATION = true;
      const STAGE_9_SEGMENT_BROLLS = true;
      const STAGE_10_ASSEMBLING = true;
      const STAGE_11_LIPSYNC = true;
      const STAGE_12_FINALIZING = true;

      let prePrice: PriceItem | undefined = undefined;
      let audioData: any = null;
      let context: any = null;
      let userId: string | null = null;
      let projectId: string = "";
      let segmentTimings: any = null;
      let previewData: any = null;
      let baseBrollData: any = null;
      let firstFramesData: any = null;
      let visualResults: any = null;
      let segmentBrolls: any = null;
      let finalResult: any = null;
      let result: any = null;

      // ========================================================================
      // STAGE 1: SCHEMA AND PROMPT GENERATION
      // ========================================================================
      if (STAGE_1_SCHEMA_PROMPTS) {
        const generatedSchema = await step.run("generate-schema", async () => {
          return pipelineSteps.generateInitialSchema(scheme);
        });

        const { segments: mergedSegments } = await step.run("merge-segments", async () => {
          return pipelineSteps.mergeSegments(generatedSchema);
        });

        scheme.segments = mergedSegments.map((s: any, index: number) => ({
          ...s,
          id: `${schemeId}-seg-${index}`,
          estimatedDuration: s.estimatedDuration ?? Math.round((s.text ?? "").length / 20),
        }));

        if (generatedSchema.segments) {
          generatedSchema.segments = scheme.segments as any;
        }

        scheme.title = generatedSchema.title || "";
        scheme.description = generatedSchema.description || "";
        scheme.tags = generatedSchema.tags || [];
        scheme.promptPreview = generatedSchema.prompt_preview || "";
        scheme.topic = generatedSchema.topic;

        await step.run("save-schema-initial", async () => {
          return pipelineSteps.saveSchema(schemeId, scheme, ResolverStatus.PROGRESS);
        });

        const { generatedPrompts, prePrice: resolvedPrePrice } =
          await narrativeSteps.generateNarrativePrompts(scheme, generatedSchema, step);
        prePrice = resolvedPrePrice;

        if (generatedPrompts && generatedPrompts.length > 0) {
          scheme.segments = narrativeSteps.applyPromptsToSegments(scheme, generatedPrompts);

          await step.run("save-schema-with-prompts", async () => {
            return pipelineSteps.saveSchema(schemeId, scheme, ResolverStatus.PROGRESS);
          });
        }
      }

      // ========================================================================
      // STAGE 2: AUDIO AND CAPTIONS
      // ========================================================================
      if (STAGE_2_AUDIO_CAPTIONS) {
        const { dbSegments, projectId: fetchedProjectId } = (await step.run(
          "fetch-stage-2-state",
          async () => fetchWorkflowState(schemeId),
        )) as any;
        projectId = fetchedProjectId;
        scheme.segments = dbSegments.map((s: any) => s.segment_data);

        const services = initializeServices();
        context = { services, scheme, schemeId, attempt };

        await step.run("mark-generation-progress-assets", async () => {
          return advanceGenerationTask(schemeId, NARRATIVE_TASK_KEYS.ASSETS, NARRATIVE_TASKS);
        });

        const validationData = await step.run("Validation data preprocessing", () =>
          pipelineSteps.validateUserId(schemeId),
        );
        userId = validationData.userId;

        await step.run("mark-generation-progress-audio", async () => {
          return advanceGenerationTask(schemeId, NARRATIVE_TASK_KEYS.AUDIO, NARRATIVE_TASKS);
        });

        audioData = await step.run("Processing audio and captions", () =>
          pipelineSteps.processAudioAndCaptions(context, userId, projectId),
        );

        if (audioData?.segmentAssets) {
          scheme.segments = scheme.segments.map((s) => ({
            ...s,
            speechToText: audioData.segmentAssets[s.id]?.speechToText || s.speechToText,
            textToSpeech: audioData.segmentAssets[s.id]?.textToSpeech || s.textToSpeech,
          }));
          await step.run("save-schema-with-audio", async () => {
            return pipelineSteps.saveSchema(schemeId, scheme, ResolverStatus.PROGRESS);
          });
        }
      }

      // ========================================================================
      // STAGE 3: MEDIA AND SET TIMINGS
      // ========================================================================
      if (STAGE_3_TIMINGS) {
        const { dbSegments } = (await step.run("fetch-stage-3-state", async () =>
          fetchWorkflowState(schemeId),
        )) as any;
        scheme.segments = dbSegments.map((s: any) => ({
          ...ensureObject(s.segment_data),
          id: s.id,
        }));

        const services = initializeServices();
        context = { services, scheme, schemeId, attempt };

        await step.run("mark-generation-progress-timings", async () => {
          return advanceGenerationTask(schemeId, NARRATIVE_TASK_KEYS.TIMINGS, NARRATIVE_TASKS);
        });

        const mediaMetadata = audioData?.mediaMetadata || getMediaMetadata(scheme.segments);

        segmentTimings = await step.run("Calculate segment timings", () =>
          pipelineSteps.calculateSegmentTimings(context, mediaMetadata),
        );
      }

      // ========================================================================
      // STAGE 4: BASE B-ROLL
      // ========================================================================
      if (STAGE_4_BASE_BROLL) {
        if (!segmentTimings) {
          const { dbSegments } = (await step.run("fetch-stage-4-state", async () => fetchWorkflowState(schemeId))) as any;
          scheme.segments = dbSegments.map((s: any) => ({
            ...ensureObject(s.segment_data),
            id: s.id,
          }));
          const services = initializeServices();
          context = { services, scheme, schemeId, attempt };
          const mediaMetadata = audioData?.mediaMetadata || getMediaMetadata(scheme.segments);
          segmentTimings = await pipelineSteps.calculateSegmentTimings(context, mediaMetadata);
        }

        baseBrollData = await step.run("Generating base B-roll video", () =>
          pipelineSteps.processBaseBRoll(context, segmentTimings, userId, projectId),
        );

        await step.run("save-base-broll-metadata", async () => {
          const currentGen = await db
            .selectFrom("generations")
            .select("metadata")
            .where("id", "=", schemeId)
            .executeTakeFirst();
          const metadata = (currentGen?.metadata as any) || {};
          await db
            .updateTable("generations")
            .set({ metadata: { ...metadata, base_broll_url: baseBrollData.url } })
            .where("id", "=", schemeId)
            .execute();
        });
      }

      // ========================================================================
      // STAGE 5: PREVIEW IMAGE
      // ========================================================================
      if (STAGE_5_PREVIEW) {
        if (!context) {
          const { dbSegments } = (await step.run("fetch-stage-5-state", async () => fetchWorkflowState(schemeId))) as any;
          scheme.segments = dbSegments.map((s: any) => ({
            ...ensureObject(s.segment_data),
            id: s.id,
          }));
          const services = initializeServices();
          context = { services, scheme, schemeId, attempt };
        }

        previewData = await step.run("Generating preview image", () =>
          pipelineSteps.generatePreviewImage(context, userId, projectId),
        );

        await step.run("save-preview-metadata", async () => {
          await db
            .updateTable("generations")
            .set({ preview_url: previewData.url })
            .where("id", "=", schemeId)
            .execute();
        });
      }

      // ========================================================================
      // STAGE 6: FIRST FRAMES (AI IMAGES)
      // ========================================================================
      if (
        STAGE_6_FIRST_FRAMES &&
        (scheme.visuals.type === VideoType.AI_IMAGES || scheme.visuals.type === VideoType.AI_VIDEOS)
      ) {
        if (!context) {
          const { dbSegments } = (await step.run("fetch-stage-6-state", async () =>
            fetchWorkflowState(schemeId),
          )) as any;
          scheme.segments = dbSegments.map((s: any) => ({
            ...ensureObject(s.segment_data),
            id: s.id,
          }));
          const services = initializeServices();
          context = { services, scheme, schemeId, attempt };
        }

        firstFramesData = await step.run("Generating shot first frames", () =>
          narrativeSteps.generateShotFirstFrames(context, userId, projectId),
        );
      }

      // ========================================================================
      // STAGE 7: AI IMAGES (CLIP WRAPPING)
      // ========================================================================
      if (STAGE_7_AI_IMAGES && scheme.visuals.type === VideoType.AI_IMAGES) {
        const { dbSegments } = (await step.run("fetch-stage-7-img-state", async () =>
          fetchWorkflowState(schemeId),
        )) as any;
        scheme.segments = dbSegments.map((s: any) => ({
          ...ensureObject(s.segment_data),
          id: s.id,
        }));
        console.log(`[PIPELINE] Stage 7 re-fetched ${scheme.segments.length} segments. Sample shot 0 imageUrl: ${scheme.segments[0]?.shots?.[0]?.imageUrl || "MISSING"}`);
        const services = initializeServices();
        context = { services, scheme, schemeId, attempt };
        const mediaMetadata = audioData?.mediaMetadata || getMediaMetadata(scheme.segments);
        segmentTimings = await pipelineSteps.calculateSegmentTimings(context, mediaMetadata);


        await step.run("mark-generation-progress-media", async () => {
          return advanceGenerationTask(schemeId, NARRATIVE_TASK_KEYS.MEDIA, NARRATIVE_TASKS);
        });

        visualResults = await step.run("Wrapping AI images into clips", () =>
          pipelineSteps.processAIImageScenes(
            context,
            mediaMetadata,
            segmentTimings,
            userId,
            projectId,
          ),
        );
      }

      // ========================================================================
      // STAGE 7.1: AI VIDEOS
      // ========================================================================
      if (STAGE_7_AI_VIDEOS && scheme.visuals.type === VideoType.AI_VIDEOS) {
        const { dbSegments } = (await step.run("fetch-stage-7-state", async () =>
          fetchWorkflowState(schemeId),
        )) as any;
        scheme.segments = dbSegments.map((s: any) => ({
          ...ensureObject(s.segment_data),
          id: s.id,
        }));
        console.log(`[PIPELINE] Stage 7.1 re-fetched ${scheme.segments.length} segments. Sample shot 0 imageUrl: ${scheme.segments[0]?.shots?.[0]?.imageUrl || "MISSING"}`);
        const services = initializeServices();
        context = { services, scheme, schemeId, attempt };
        const mediaMetadata = audioData?.mediaMetadata || getMediaMetadata(scheme.segments);
        segmentTimings = await pipelineSteps.calculateSegmentTimings(context, mediaMetadata);


        await step.run("mark-generation-progress-media", async () => {
          return advanceGenerationTask(schemeId, NARRATIVE_TASK_KEYS.MEDIA, NARRATIVE_TASKS);
        });

        visualResults = await step.run("Generating AI video clips", () =>
          narrativeSteps.generateShotVideos(
            context,
            mediaMetadata,
            segmentTimings,
            userId,
            projectId,
          ),
        );
      }

      // ========================================================================
      // STAGE 7.2: STOCK VIDEOS
      // ========================================================================
      if (STAGE_7_STOCK_VIDEOS && scheme.visuals.type === VideoType.STOCK_VIDEOS) {
        const { dbSegments } = (await step.run("fetch-stage-7-2-state", async () =>
          fetchWorkflowState(schemeId),
        )) as any;
        scheme.segments = dbSegments.map((s: any) => ({
          ...ensureObject(s.segment_data),
          id: s.id,
        }));
        console.log(`[PIPELINE] Stage 7.2 re-fetched ${scheme.segments.length} segments. Sample shot 0 imageUrl: ${scheme.segments[0]?.shots?.[0]?.imageUrl || "MISSING"}`);
        const services = initializeServices();
        context = { services, scheme, schemeId, attempt };
        const mediaMetadata = audioData?.mediaMetadata || getMediaMetadata(scheme.segments);
        segmentTimings = await pipelineSteps.calculateSegmentTimings(context, mediaMetadata);


        await step.run("mark-generation-progress-media", async () => {
          return advanceGenerationTask(schemeId, NARRATIVE_TASK_KEYS.MEDIA, NARRATIVE_TASKS);
        });

        visualResults = await step.run("Retrieving stock video clips", () =>
          pipelineSteps.processStockVideoScenes(
            context,
            mediaMetadata,
            segmentTimings,
            [],
            userId,
            projectId,
          ),
        );
      }

      // ========================================================================
      // STAGE 8: CONSOLIDATION & VFX PREP
      // ========================================================================
      if (STAGE_8_CONSOLIDATION) {
        visualResults = await step.run("Consolidating visual results", async () => {
          const { dbSegments, projectId: fetchedProjectId } = await fetchWorkflowState(schemeId);
          projectId = fetchedProjectId;
          scheme.segments = dbSegments.map((s: any) => ensureObject(s.segment_data));

          const allPrices: PriceItem[] = [];
          const allSegmentAssets: Record<string, any[]> = {};
          const segResults: any[] = [];

          scheme.segments.forEach((seg: any) => {
            if (seg.assets?.length) {
              allSegmentAssets[seg.id] = seg.assets;
            }
            if (seg.generatedMedia || seg.videoUrl || seg.imageUrl) {
              segResults.push({
                id: seg.id,
                generatedMedia: seg.generatedMedia || [],
                captionUrl: (seg.speechToText as any)?.src || "",
                audioUrl: (seg.textToSpeech as any)?.src || "",
                duration: seg.duration || 0,
                originalDuration: (seg.textToSpeech as any)?.duration || 0,
                assets: seg.assets || [],
              });
            }
          });

          return {
            segResults,
            prices: allPrices,
            segmentAssets: allSegmentAssets,
          };
        });
      }

      // ========================================================================
      // STAGE 9: SEGMENT B-ROLLS
      // ========================================================================
      if (STAGE_9_SEGMENT_BROLLS) {
        if (!context || !segmentTimings || !baseBrollData) {
          const { dbSegments } = await fetchWorkflowState(schemeId);
          scheme.segments = dbSegments.map((s: any) => ensureObject(s.segment_data));
          const services = initializeServices();
          context = { services, scheme, schemeId, attempt };
          const mediaMetadata = audioData?.mediaMetadata || getMediaMetadata(scheme.segments);
          segmentTimings = await pipelineSteps.calculateSegmentTimings(context, mediaMetadata);

          if (!baseBrollData) {
            const currentGen = await db
              .selectFrom("generations")
              .select("metadata")
              .where("id", "=", schemeId)
              .executeTakeFirst();
            baseBrollData = { url: (currentGen?.metadata as any)?.base_broll_url || "" };
          }
        }

        await step.run("mark-generation-progress-vfx", async () => {
          return advanceGenerationTask(schemeId, NARRATIVE_TASK_KEYS.VFX, NARRATIVE_TASKS);
        });

        segmentBrolls = await step.run("Processing all segment B-rolls", () =>
          pipelineSteps.processSegmentBRolls(
            context,
            segmentTimings,
            baseBrollData.url,
            userId,
            projectId,
          ),
        );
      }

      // ========================================================================
      // STAGE 10: ASSEMBLING
      // ========================================================================


      // ========================================================================
      // STAGE 11: LIPSYNC
      // ========================================================================
      if (STAGE_11_LIPSYNC && scheme.avatar?.url) {
        await step.run("mark-generation-progress-lipsync", async () => {
          return advanceGenerationTask(schemeId, NARRATIVE_TASK_KEYS.LIPSYNC, NARRATIVE_TASKS);
        });
        result = await step.run("apply-lipsync-to-schema", async () => {
          return applyLipsyncToScheme(result || scheme, schemeId);
        });
      }

      // ========================================================================
      // STAGE 12: FINALIZING
      // ========================================================================
      if (STAGE_12_FINALIZING) {
        await step.run("mark-generation-progress-finalizing", async () => {
          return advanceGenerationTask(schemeId, NARRATIVE_TASK_KEYS.FINALIZING, NARRATIVE_TASKS);
        });

        await step.run("update-segments-post-resolver", async () => {
          const { segmentQueries: sq } = await import("@/lib/database/segment-queries");
          const { dbSegments, dbSchema, projectId: fetchedProjectId } = await fetchWorkflowState(schemeId);
          
          let finalScheme = {
            ...dbSchema,
            segments: dbSegments.map((s: any) => ensureObject(s.segment_data)),
          } as any;

          // Aggregate total cost
          const allPrices = [
            ...(previewData?.price || []),
            ...(audioData?.prices || []),
            ...(baseBrollData?.prices || []),
            ...(firstFramesData?.prices || []),
            ...(visualResults?.prices || []),
            ...(segmentBrolls?.prices || []),
            ...(prePrice ? [prePrice] : []),
          ];
          const validPricing = allPrices.filter((p) => p && typeof p.price === "number");
          const totalCost = validPricing.reduce((acc, obj) => acc + obj.price, 0);

          await withDbRetry(() =>
            db
              .updateTable("generations")
              .set({
                output: JSON.parse(JSON.stringify(finalScheme)),
                metadata: JSON.parse(
                  JSON.stringify({
                    ...(dbSchema.metadata || {}),
                    title: finalScheme.title,
                    preview_url: finalScheme.preview?.src || previewData?.url,
                    totalCost,
                  }),
                ),
                preview_url: finalScheme.preview?.src || previewData?.url,
                status: ResolverStatus.COMPLETED,
                progress: 100,
              })
              .where("id", "=", schemeId)
              .execute(),
          );
        });
      }

      return { result: result || scheme };
    } catch (err) {
      console.error("Narrative orchestrator error:", err);
      if (schemeId) {
        const message = err instanceof Error ? err.message : "Unknown error";
        await step.run("publish-error-toast", async () => {
          await publish({
            channel,
            topic: "steps",
            data: {
              type: ToastType.FUNCTION_ERROR,
              error: message,
              message: `Workflow failed: ${message}`,
            },
          });
        });
        await db
          .updateTable("generations")
          .set({ status: ResolverStatus.FAILED })
          .where("id", "=", schemeId)
          .execute();
      }
      throw new NonRetriableError(
        `Error resolving narrative schema${schemeId ? ` [${schemeId}]` : ""}`,
        { cause: err },
      );
    }
  },
);
