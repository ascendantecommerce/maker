import { NonRetriableError } from "inngest";

import { getInngestApp } from "../../index";

import { initializeServices } from "../common/services";
import * as pipelineSteps from "../common/steps";

import * as productSteps from "./steps";
import { applyLipsyncToScheme } from "../lipsync-resolver";

import { db } from "@/lib/database";
import { withDbRetry } from "@/lib/database/retry";

import { ResolverStatus } from "@/utils/enum";
import { workflowChannel } from "../../utils/common";
import { ToastType, type PriceItem, type VideoSchema } from "../../utils/types";
import { advanceGenerationTask } from "../../utils/generation-progress";

import { ensureObject, fetchWorkflowState, getMediaMetadata } from "../common/services/utils";
import { PRODUCT_TASK_KEYS, PRODUCT_TASKS } from "./constants";

const inngest = getInngestApp();

export const productVideoOrchestrator = inngest.createFunction(
  { id: "product-video-orchestrator" },
  { event: "video/product.orchestrate" },

  async ({ event, step, attempt, publish }) => {
    let scheme: VideoSchema = event.data.scheme;
    const schemeId = scheme.id;
    const channel = workflowChannel(schemeId);
    const services = initializeServices();

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
        await advanceGenerationTask(schemeId, PRODUCT_TASK_KEYS.ANALYSIS, PRODUCT_TASKS);
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
      const STAGE_3_TIMINGS_MEDIA = true;
      const STAGE_4_LIPSYNC = true;
      const STAGE_5_FINALIZING = true;

      let prePrice: PriceItem | undefined = undefined;
      let audioData: any = null;
      let context: any = null;
      let userId: string | null = null;
      let projectId: string = "";
      let segmentTimings: any = null;
      let previewData: any = null;
      let baseBrollData: any = null;
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
          await productSteps.generateProductPrompts(scheme, generatedSchema, step);
        prePrice = resolvedPrePrice;

        if (generatedPrompts && generatedPrompts.length > 0) {
          scheme.segments = productSteps.applyPromptsToSegments(scheme, generatedPrompts);

          await step.run("save-schema-with-prompts", async () => {
            return pipelineSteps.saveSchema(schemeId, scheme, ResolverStatus.PROGRESS);
          });
        }
      }

      // ========================================================================
      // STAGE 2: AUDIO AND CAPTIONS
      // ========================================================================
      if (STAGE_2_AUDIO_CAPTIONS) {
        const { dbSegments, projectId: fetchedProjectId } = await step.run(
          "fetch-stage-2-state",
          async () => fetchWorkflowState(schemeId),
        );
        projectId = fetchedProjectId;
        scheme.segments = dbSegments.map((s: any) => s.segment_data);

        await step.run("mark-generation-progress-assets", async () => {
          return advanceGenerationTask(schemeId, PRODUCT_TASK_KEYS.ASSETS, PRODUCT_TASKS);
        });

        const validationData = await step.run("Validation data preprocessing", () =>
          pipelineSteps.validateUserId(schemeId),
        );
        userId = validationData.userId;

        await step.run("mark-generation-progress-audio", async () => {
          return advanceGenerationTask(schemeId, PRODUCT_TASK_KEYS.AUDIO, PRODUCT_TASKS);
        });

        audioData = await step.run("Processing audio and captions", () =>
          pipelineSteps.processAudioAndCaptions(
            { services, scheme, schemeId, attempt },
            userId,
            projectId,
          ),
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
      if (STAGE_3_TIMINGS_MEDIA) {
        const { dbSegments } = await step.run("fetch-stage-3-state", async () =>
          fetchWorkflowState(schemeId),
        );
        scheme.segments = dbSegments.map((s: any) => s.segment_data);

        context = { services, scheme, schemeId, attempt };
        const mediaMetadata = audioData?.mediaMetadata || getMediaMetadata(scheme.segments);

        await step.run("mark-generation-progress-timings", async () => {
          return advanceGenerationTask(schemeId, PRODUCT_TASK_KEYS.TIMINGS, PRODUCT_TASKS);
        });

        segmentTimings = await step.run("Calculate segment timings", () =>
          pipelineSteps.calculateSegmentTimings(context, mediaMetadata),
        );

        await step.run("mark-generation-progress-media", async () => {
          return advanceGenerationTask(schemeId, PRODUCT_TASK_KEYS.MEDIA, PRODUCT_TASKS);
        });

        const [resBaseBrollData, resPreviewData, resVisualResults] = await Promise.all([
          step.run("Generating base B-roll video", () =>
            pipelineSteps.processBaseBRoll(context, segmentTimings, userId, projectId),
          ),
          step.run("Generating preview image", () =>
            pipelineSteps.generatePreviewImage(context, userId, projectId),
          ),
          step.run("Generating visual clips", () =>
            pipelineSteps.processVisualScenes(
              context,
              mediaMetadata,
              segmentTimings,
              [],
              userId,
              projectId,
            ),
          ),
        ]);
        baseBrollData = resBaseBrollData;
        previewData = resPreviewData;
        visualResults = resVisualResults;

        await step.run("mark-generation-progress-vfx", async () => {
          return advanceGenerationTask(schemeId, PRODUCT_TASK_KEYS.VFX, PRODUCT_TASKS);
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

        await step.run("mark-generation-progress-assembling", async () => {
          return advanceGenerationTask(schemeId, PRODUCT_TASK_KEYS.ASSEMBLING, PRODUCT_TASKS);
        });

        finalResult = (await step.run("Assembling final video", () =>
          pipelineSteps.assembleFinalVideo(
            context,
            mediaMetadata,
            visualResults.segResults,
            segmentBrolls.results as any,
            segmentTimings,
            [
              ...(previewData?.price || []),
              ...(audioData?.prices || []),
              ...(baseBrollData?.prices || []),
              ...(visualResults?.prices || []),
            ],
            [
              previewData.segmentAssets,
              Object.fromEntries(
                Object.entries(audioData?.segmentAssets || {}).map(([id, data]: [string, any]) => [
                  id,
                  data.assets,
                ]),
              ),
              baseBrollData.segmentAssets,
              segmentBrolls.segmentAssets,
            ],
            prePrice!,
            previewData.url,
          ),
        )) as { scheme: VideoSchema };

        result = finalResult.scheme;
      }

      // ========================================================================
      // STAGE 4: LIPSYNC
      // ========================================================================
      if (STAGE_4_LIPSYNC && scheme.avatar?.url) {
        await step.run("mark-generation-progress-lipsync", async () => {
          return advanceGenerationTask(schemeId, PRODUCT_TASK_KEYS.LIPSYNC, PRODUCT_TASKS);
        });
        result = await step.run("apply-lipsync-to-schema", async () => {
          return applyLipsyncToScheme(result || scheme, schemeId);
        });
      }

      // ========================================================================
      // STAGE 5: FINALIZING
      // ========================================================================
      if (STAGE_5_FINALIZING) {
        await step.run("mark-generation-progress-finalizing", async () => {
          return advanceGenerationTask(schemeId, PRODUCT_TASK_KEYS.FINALIZING, PRODUCT_TASKS);
        });

        await step.run("update-segments-post-resolver", async () => {
          const { segmentQueries: sq } = await import("@/lib/database/segment-queries");
          let finalScheme = result || scheme;

          // Re-fetch current schema from DB if result is null (stateless resume)
          if (!result) {
            const currentGen = await db
              .selectFrom("generations")
              .select("output")
              .where("id", "=", schemeId)
              .executeTakeFirst();
            if (
              currentGen?.output &&
              typeof currentGen.output === "object" &&
              (currentGen.output as any).segments
            ) {
              finalScheme = currentGen.output as any;
            }
          }

          await sq.bulkUpdateSegments(
            finalScheme.segments.map((s: any, index: number) => ({
              id: s.id,
              order: index,
              segment_data: JSON.parse(JSON.stringify(ensureObject(s))),
            })),
          );

          const currentGeneration = await db
            .selectFrom("generations")
            .select("metadata")
            .where("id", "=", schemeId)
            .executeTakeFirst();

          const currentMetadata = (currentGeneration?.metadata as object) || {};

          await withDbRetry(() =>
            db
              .updateTable("generations")
              .set({
                output: JSON.parse(JSON.stringify(finalScheme)),
                metadata: JSON.parse(
                  JSON.stringify({
                    ...currentMetadata,
                    title: finalScheme.title,
                    preview_url: previewData?.url,
                  }),
                ),
                preview_url: previewData?.url,
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
      console.error("Product orchestrator error:", err);
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
        `Error resolving product schema${schemeId ? ` [${schemeId}]` : ""}`,
        { cause: err },
      );
    }
  },
);
