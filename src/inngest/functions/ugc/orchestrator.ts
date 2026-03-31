import { NonRetriableError } from "inngest";
import { nanoid } from "nanoid";

import { getInngestApp } from "../../index";
import type { VideoSchema } from "../../utils/types";

import { db } from "@/lib/database";
import { withDbRetry } from "@/lib/database/retry";
import { initializeUgcServices } from "./services";
import * as pipelineSteps from "./steps";

import { ResolverStatus } from "@/utils/enum";
import { workflowChannel } from "../../utils/common";
import { ToastType } from "../../utils/types";
import { advanceGenerationTask } from "../../utils/generation-progress";
import { enhanceUgcSegment } from "./utils/audio-enhancer";
import { DistributedSemaphore } from "../../services/semaphore";

import { fetchWorkflowState } from "../common/services/utils";
import { UGC_TASK_KEYS, UGC_TASKS } from "./constants";

const phonosSemaphore = new DistributedSemaphore("phonos:audio_enhancement_slots", 5, 300000);

const inngest = getInngestApp();

export const ugcVideoOrchestrator = inngest.createFunction(
  { id: "ugc-video-orchestrator", concurrency: 1 },
  { event: "ugc/video.orchestrate" },

  async ({ event, step, publish }) => {
    let scheme: VideoSchema = event.data.scheme;
    const schemeId = scheme.id;
    const channel = workflowChannel(schemeId);

    try {
      // ========================================================================
      // PIPELINE STAGES - CONTROLS
      // ========================================================================
      const STAGE_1_ANALYSIS_SCHEMA = true; // Phase 1: Script Analysis & Rendering Schema
      const STAGE_2_A_ROLL_VIDEO = true; // Phase 2: Generating main Avatar shots
      const STAGE_3_CUTAWAY_B_ROLL = false; // Phase 3: Generating full-screen B-roll clips
      const STAGE_4_OVERLAY_IMAGE = true; // Phase 4: Generating demonstrative Image Overlays (nano-banana-2)
      const STAGE_5_VOICE_ALIGNMENT = false; // Phase 5: Optional Voice Cloning & Alignment (STS)
      const STAGE_6_AUDIO_ENHANCEMENT = true; // Phase 6: Phonos Refinement
      // ========================================================================

      // --- PHASE 1: AI ANALYSIS & SCHEMA GENERATION ---
      await step.run("publish-start-toast", async () => {
        await publish({
          channel,
          topic: "steps",
          data: {
            type: ToastType.STEP_START,
            step: "AI Analysis",
            stepIndex: 1,
          },
        });
      });

      await step.run("mark-generation-progress", async () => {
        await advanceGenerationTask(schemeId, UGC_TASK_KEYS.ANALYSIS, UGC_TASKS);
        await db
          .updateTable("generations")
          .set({ status: ResolverStatus.PROGRESS })
          .where("id", "=", schemeId)
          .execute();
      });

      const services = initializeUgcServices();
      const runToken = (event.id ?? nanoid()).slice(0, 8);

      // ========================================================================
      // STAGE 1: PLANSET GENERATION
      // ========================================================================
      if (STAGE_1_ANALYSIS_SCHEMA) {
        let generatedSchema: any = null;
        // 1. Generate Schema
        generatedSchema = await step.run("generate-schema", async () => {
          return pipelineSteps.generateInitialSchema(scheme);
        });

        // 2. Merge Segments
        const { segments: mergedSegments } = await step.run("merge-segments", async () => {
          return pipelineSteps.mergeSegments(generatedSchema);
        });

        // Ensure segments have deterministic IDs
        scheme.segments = mergedSegments.map((s: any, index: number) => ({
          ...s,
          id: `${schemeId}-seg-${index}`,
          estimatedDuration: s.estimatedDuration ?? Math.round((s.text ?? "").length / 20),
        }));

        if (generatedSchema.segments) {
          generatedSchema.segments = scheme.segments as any;
        }

        // Initial save to enable early rendering of the storyboard skeleton
        await step.run("save-schema-initial", async () => {
          return pipelineSteps.saveSchema(schemeId, scheme, ResolverStatus.PROGRESS);
        });

        await step.run("mark-generation-progress-assets", async () => {
          return await advanceGenerationTask(schemeId, UGC_TASK_KEYS.ASSETS, UGC_TASKS);
        });

        // 3. Preprocess assets
        const processedAssets = await step.run("preprocess-product-assets", async () => {
          return pipelineSteps.preprocessProductAssets(scheme, services);
        });

        if (processedAssets && processedAssets.length > 0) {
          scheme.assets = processedAssets as any;
        }

        await step.run("mark-generation-progress-shots", async () => {
          console.log("Marking generation progress for shots"); 
          return await advanceGenerationTask(schemeId, UGC_TASK_KEYS.SHOTS, UGC_TASKS);
        });

        // 4. Generate Prompts (Shots and B-Rolls) - Unified to reduce latency
        // 4. Generate Prompts (Shots and B-Rolls) - Unified to reduce latency
        console.log("Generating unified shots and b-rolls for scheme:");
        const { prompts: unifiedPrompts } = await pipelineSteps.generateUgcUnifiedPrompts(
          scheme,
          generatedSchema,
          services,
          step,
        );

        const shots = (unifiedPrompts || []).map((p: any) => ({
          segmentId: p.segmentId,
          shots: p.shots,
        }));
        const bRolls = (unifiedPrompts || []).map((p: any) => ({
          segmentId: p.segmentId,
          bRolls: p.bRolls,
        }));

        scheme.segments = pipelineSteps.mapPromptsToSegments(scheme, shots, bRolls);

        await step.run("mark-generation-progress-schema", async () => {
          return await advanceGenerationTask(schemeId, UGC_TASK_KEYS.SCHEMA, UGC_TASKS);
        });

        // 5. Finalize Schema
        scheme.title = generatedSchema.title || "";
        scheme.description = generatedSchema.description || "";
        scheme.tags = generatedSchema.tags || [];
        scheme.promptPreview = generatedSchema.prompt_preview || "";
        scheme.topic = generatedSchema.topic;

        await step.run("save-schema-with-prompts", async () => {
          return pipelineSteps.saveSchema(schemeId, scheme, ResolverStatus.PROGRESS);
        });
      }

      // ========================================================================
      // STAGE 2: A-ROLL VIDEO GENERATION (AVATAR)
      // ========================================================================
      if (STAGE_2_A_ROLL_VIDEO) {
        const { dbSegments, projectId, schemaId, dbSchema } = await step.run(
          "fetch-group-2-state",
          async () => fetchWorkflowState(schemeId),
        );

        await step.run("publish-veo-start-toast", async () => {
          await publish({
            channel,
            topic: "steps",
            data: {
              type: ToastType.STEP_START,
              step: "Generating Videos",
              stepIndex: 2,
              message: "Building generation plan...",
            },
          });
        });

        await step.run("update-generation-veo-progress", async () => {
          return await db
            .updateTable("generations")
            .set({ metadata: { message: "Building rendering plan..." } })
            .where("id", "=", schemeId)
            .execute();
        });

        const sortedSegments = dbSegments;
        const avatarUrl = (dbSchema.avatar as any)?.url || scheme.avatar?.url;
        const productUrls = (((dbSchema.assets as any[]) || scheme.assets) ?? [])
          .map((a: any) => a.url as string)
          .slice(0, 2);

        const { waves } = (await step.run("build-generation-plan", async () => {
          return pipelineSteps.buildGenerationPlan(sortedSegments as any);
        })) as { waves: any[][] };

        const taskPromiseByDbId: Record<string, Promise<any> | undefined> = {};
        const allWaveItems = waves.flat();

        const dbSchemaSurrogate = {
          ...scheme,
          aspect_ratio: scheme.aspectRatio,
          avatar: dbSchema.avatar || scheme.avatar,
          assets: dbSchema.assets || scheme.assets,
        };

        const allTasks = allWaveItems.map((waveItem) => {
          const {
            segment,
            previousSegmentDbId,
            needsPreviousFrame,
            mode,
            firstFrameSource,
            isProductShot,
            isFirstProductMention,
          } = waveItem;

          const segData = segment.segment_data as any;
          const segmentDbId = segment.id as string;
          const segmentId = segData.id as string;

          const taskPromise = (async () => {
            // 1. Dependency Resolution
            let resolvedUrls: Record<string, string> = {};
            if (needsPreviousFrame && previousSegmentDbId) {
              const prevResult = await taskPromiseByDbId[previousSegmentDbId];
              if (prevResult?.lastFrameUrl) {
                resolvedUrls[previousSegmentDbId] = prevResult.lastFrameUrl;
              }
            }

            // 2. Unified Generation Step
            const result: any = await step.run(
              `generate-ugc-video-${segmentId}-${runToken}`,
              async () => {
                return await pipelineSteps.generateUgcVideo({
                  segData,
                  isExpand: !!previousSegmentDbId,
                  previousSegmentDbId,
                  globalIndex: segment.order,
                  videoUrlByDbId: resolvedUrls,
                  avatarUrl,
                  productUrls,
                  schemaId: schemeId,
                  projectId,
                  segmentId,
                  schema: dbSchemaSurrogate,
                  services,
                  mode,
                  firstFrameSource,
                  isProductShot,
                  isFirstProductMention,
                  runToken,
                  phonosSemaphore,
                });
              },
            );

            // 3. Persist and Update Database
            await step.run(`update-segment-final-url-${segmentId}-${runToken}`, async () => {
              return await pipelineSteps.updateVeoSegmentInDb({
                segmentDbId,
                segData,
                finalR2Url: result.improvedUrl || result.finalTrimmedUrl,
                actualDuration: result.actualDuration,
                tsUrl: result.tsUrl,
              });
            });

            return result;
          })();

          taskPromiseByDbId[segmentDbId] = taskPromise;
          return taskPromise;
        });

        // Wait for all generations to complete
        await step.run("publish-rendering-toast", async () => {
          await publish({
            channel,
            topic: "steps",
            data: {
              type: ToastType.STEP_START,
              step: "Generating Videos",
              stepIndex: 2,
              message: `Processing ${allWaveItems.length} scenes in parallel...`,
            },
          });
        });

        await Promise.all(allTasks);

        await step.run("publish-generation-complete-toast", async () => {
          await publish({
            channel,
            topic: "steps",
            data: {
              type: ToastType.STEP_START,
              step: "Generating Videos",
              stepIndex: 2,
              message: "All scenes generated",
            },
          });
        });
      }

      // ========================================================================
      // STAGE 3: CUTAWAY B-ROLL VIDEO GENERATION
      // ========================================================================
      if (STAGE_3_CUTAWAY_B_ROLL) {
        const { dbSegments, projectId } = await step.run("fetch-stage-3-state", async () =>
          fetchWorkflowState(schemeId),
        );

        const cutawayTasks = dbSegments.flatMap((segment) => {
          const segData = segment.segment_data as any;
          const bRolls = (segData.bRolls || []) as any[];
          const cutaways = bRolls.filter((b) => b.displayMode === "cutaway");

          return cutaways.map(async (bRoll, bIndex) => {
            return await step.run(
              `generate-cutaway-${segment.id}-${bIndex}-${runToken}`,
              async () => {
                return await pipelineSteps.generateUgcBrollVideo({
                  segment,
                  bRoll,
                  projectId,
                  schemaId: schemeId,
                  services,
                  runToken,
                });
              },
            );
          });
        });

        if (cutawayTasks.length > 0) {
          await step.run("publish-cutaway-start-toast", async () => {
            await publish({
              channel,
              topic: "steps",
              data: {
                type: ToastType.STEP_START,
                step: "Generating B-Rolls",
                stepIndex: 3,
                message: `Generating ${cutawayTasks.length} cutaway videos...`,
              },
            });
          });
          await Promise.all(cutawayTasks);
        }
      }

      // ========================================================================
      // STAGE 4: OVERLAY B-ROLL IMAGE GENERATION
      // ========================================================================
      if (STAGE_4_OVERLAY_IMAGE) {
        const { dbSegments, projectId } = await step.run("fetch-stage-4-state", async () =>
          fetchWorkflowState(schemeId),
        );

        const overlayTasks = dbSegments.flatMap((segment) => {
          const segData = segment.segment_data as any;
          const bRolls = (segData.bRolls || []) as any[];
          const overlays = bRolls.filter((b) => b.displayMode === "overlay");

          return overlays.map(async (bRoll, bIndex) => {
            return await step.run(
              `generate-overlay-${segment.id}-${bIndex}-${runToken}`,
              async () => {
                return await pipelineSteps.generateUgcBrollImage({
                  segment,
                  bRoll,
                  projectId,
                  schemaId: schemeId,
                  services,
                  model: "gemini-3.1-flash-image-preview",
                });
              },
            );
          });
        });

        if (overlayTasks.length > 0) {
          await step.run("publish-overlay-start-toast", async () => {
            await publish({
              channel,
              topic: "steps",
              data: {
                type: ToastType.STEP_START,
                step: "Generating Overlays",
                stepIndex: 4,
                message: `Generating ${overlayTasks.length} image overlays...`,
              },
            });
          });
          await Promise.all(overlayTasks);
        }
      }

      // ========================================================================
      // STAGE 5: VOICE ALIGNMENT (STS)
      // ========================================================================
      if (STAGE_5_VOICE_ALIGNMENT) {
        const { dbSegments, projectId } = await step.run("fetch-stage-5-state", async () =>
          fetchWorkflowState(schemeId),
        );

        await step.run("publish-voice-start-toast", async () => {
          await publish({
            channel,
            topic: "steps",
            data: {
              type: ToastType.STEP_START,
              step: "Aligning Voice",
              stepIndex: 3,
              message: "Analyzing best voice source...",
            },
          });
        });

        await step.run("update-generation-voice-progress", async () => {
          return await advanceGenerationTask(schemeId, UGC_TASK_KEYS.VOICES, UGC_TASKS);
        });

        const bestVoiceSource = await step.run("select-best-voice", async () => {
          return pipelineSteps.selectBestVoiceSource(dbSegments, services);
        });

        const clonedVoiceId = await step.run("clone-voice", async () => {
          return pipelineSteps.cloneVoice(bestVoiceSource.videoUrl, services);
        });

        await step.run("mark-generation-progress-voice-align", async () => {
          return await advanceGenerationTask(schemeId, UGC_TASK_KEYS.VOICEALIGN, UGC_TASKS);
        });

        const stsTasks = dbSegments.map(async (segment) => {
          let currentUrl = (segment as any).videoUrl;
          if (!currentUrl) return;

          const stsResult = await step.run(`process-sts-${segment.id}-${runToken}`, async () => {
            return await pipelineSteps.processStsSegment(
              segment,
              clonedVoiceId!,
              projectId,
              services,
            );
          });

          return await step.run(`update-segment-sts-${segment.id}-${runToken}`, async () => {
            return await pipelineSteps.updateVeoSegmentInDb({
              segmentDbId: segment.id,
              segData: segment.segment_data,
              finalR2Url: stsResult.comparison.updated,
              actualDuration: (segment.segment_data as any).estimatedDuration || 5,
            });
          });
        });

        await Promise.all(stsTasks);
      }

      // ========================================================================
      // STAGE 6: AUDIO ENHANCEMENT (PHONOS)
      // ========================================================================
      if (STAGE_6_AUDIO_ENHANCEMENT) {
        const { dbSegments, projectId } = await step.run("fetch-stage-6-state", async () =>
          fetchWorkflowState(schemeId),
        );

        const enhanceTasks = dbSegments.map(async (segment) => {
          let currentUrl = (segment as any).videoUrl;
          if (!currentUrl) return;

          const enhancedResult = await step.run(
            `enhance-after-sts-${segment.id}-${runToken}`,
            async () => {
              const release = await phonosSemaphore.acquire();
              try {
                return await enhanceUgcSegment(
                  currentUrl,
                  {
                    schemaId: schemeId,
                    projectId,
                    segmentId: segment.id,
                    runToken,
                    phase: "post-sts",
                  },
                  services,
                );
              } finally {
                await release();
              }
            },
          );

          return await step.run(`update-segment-refinement-${segment.id}-${runToken}`, async () => {
            return await pipelineSteps.updateVeoSegmentInDb({
              segmentDbId: segment.id,
              segData: segment.segment_data,
              finalR2Url: enhancedResult?.improvedUrl || currentUrl,
              actualDuration: (segment.segment_data as any).estimatedDuration || 5,
            });
          });
        });

        await Promise.all(enhanceTasks);
      }

      // Final Step: Complete
      await step.run("publish-done-toast", async () => {
        await publish({
          channel,
          topic: "steps",
          data: {
            type: ToastType.FUNCTION_COMPLETE,
            step: "Completed",
            message: "All steps finished successfully!",
          },
        });
      });

      // Update generation status to COMPLETED
      await step.run("mark-generation-completed", async () => {
        return await withDbRetry(() =>
          db
            .updateTable("generations")
            .set({ status: ResolverStatus.COMPLETED })
            .where("id", "=", schemeId)
            .execute(),
        );
      });

      return { success: true };
    } catch (err: any) {
      console.error("UGC Master V3 Error:", err);
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

      if (schemeId) {
        await db
          .updateTable("generations")
          .set({ status: ResolverStatus.FAILED })
          .where("id", "=", schemeId)
          .execute();
      }

      throw new NonRetriableError(`UGC Master V3 workflow failed: ${message}`, { cause: err });
    }
  },
);
