import { nanoid } from "nanoid";
import { NonRetriableError } from "inngest";

import { inngest } from "../client";
import { config } from "../config";

import { VideoGenerator } from "@/lib/video-generation";
import { R2StorageService } from "@/lib/r2-storage";
import { db } from "@/lib/database";
import { projectQueries } from "@/lib/database/project-queries";
import { segmentQueries } from "@/lib/database/segment-queries";
import { buildUgcPrompt, buildUgcNegativePrompt } from "@/lib/prompts";
import { transcribe } from "@/lib/transcribe";
import { GeminiService } from "@/lib/gemini/generator";

import { generateId } from "@/utils/id";
import { workflowChannel } from "../utils/common";
import { ToastType } from "../utils/types";

export const generateUGCVideo = inngest.createFunction(
  { id: "ugc-generate-video" },
  { event: "ugc/video.generate" },
  async ({ event, step, publish }) => {
    const schemaId = event.data.schemaId;
    const channel = workflowChannel(schemaId);

    try {
      const {
        //schemaId,
        segmentId,
        prompt,
        firstFrameUrl,
        lastFrameUrl,
        aspectRatio,
        text,
        scenePrompt,
        videoPrompt,
        assetId, // Passed from frontend or API
        productUrls,
      } = event.data;

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

      const videoGenerator = new VideoGenerator({
        provider: "veo",
        params: {
          geminiApiKey: config.gemini.key,
        },
      });

      const gemini = new GeminiService(config.gemini.key, "gemini-2.0-flash-exp");

      // Fetch project and schema early to get product/avatar context
      const project = await step.run("fetch-project-ugc", async () =>
        projectQueries.findByGenerationId(schemaId),
      );
      if (!project) throw new Error("Project not found for generation ID");

      const schema = await step.run("fetch-schema-ugc", async () =>
        segmentQueries.findSchemaByProjectId(project.id),
      );
      if (!schema) throw new Error("Schema not found for project");

      const avatarUrl = (schema as any)?.avatar?.url;
      const productDescription = (schema as any)?.product?.description ?? "";

      let finalPrompt = prompt?.trim() || "";
      if (!finalPrompt && (text || scenePrompt || videoPrompt)) {
        finalPrompt = buildUgcPrompt(text, videoPrompt, scenePrompt);
      }

      // 1 & 2. Submit Veo Task & Poll (With Internal Retry)
      const r2Url = await step.run("generate-and-upload-veo-video", async () => {
        const MAX_RETRIES = 3;
        let retryCount = 0;
        let finalVideoUrl: string | null = null;

        while (retryCount < MAX_RETRIES && !finalVideoUrl) {
          try {
            let firstFrameToUse = firstFrameUrl;
            let lastFrameToUse = lastFrameUrl;
            const slicedProductUrls = (productUrls || []).slice(0, 2);
            let referenceImageUrlsToUse: string[] | undefined = [...slicedProductUrls];
            if (avatarUrl) referenceImageUrlsToUse.unshift(avatarUrl);

            let finalPromptToUse = finalPrompt;
            let durationSeconds = event.data.durationSeconds || 5;

            // --- PRODUCT CONTINUITY CHECK ---
            if (lastFrameToUse) {
              console.log(`[UGC] Checking product visibility in lastFrameUrl: ${lastFrameToUse}`);
              const visibility = await gemini.checkProductVisibility(
                lastFrameToUse,
                productDescription,
              );

              const segments = await segmentQueries.findSegmentsBySchemaId(schema.id);
              const segment = segments.find((s) => (s.segment_data as any).id === segmentId);
              const currentShot = (segment?.segment_data as any)?.shots?.[0];
              const isProductShot = currentShot?.type === "product";
              const isClearlyVisible = visibility.isVisible && visibility.confidence > 0.7;

              if (!isClearlyVisible) {
                console.log(
                  `[UGC] Product NOT clearly visible in last frame (Confidence: ${visibility.confidence}). Applying fallback...`,
                );

                if (isProductShot && durationSeconds > 4) {
                  console.log(`[UGC] Falling back to Reference Mode.`);
                  lastFrameToUse = undefined;
                  firstFrameToUse = undefined;
                  durationSeconds = 8;
                  // Mode: No frames, just references
                  referenceImageUrlsToUse = [...slicedProductUrls];
                  if (avatarUrl) referenceImageUrlsToUse.unshift(avatarUrl);
                } else if (isProductShot) {
                  console.log(`[UGC] Transforming to Generic talking head.`);
                  const avatarDescription =
                    (schema as any)?.avatar?.description ?? "A professional avatar speaker";

                  const rewrittenVideoPrompt = await gemini.rewriteToGenericPrompt(
                    currentShot,
                    avatarDescription,
                    productDescription,
                  );

                  finalPromptToUse = buildUgcPrompt(
                    text,
                    rewrittenVideoPrompt,
                    currentShot?.scenePrompt,
                    "",
                  );

                  lastFrameToUse = undefined;
                  firstFrameToUse = avatarUrl;
                  // Mode: One frame, NO references
                  referenceImageUrlsToUse = undefined;
                } else {
                  console.log(`[UGC] Generic segment, using avatarUrl for continuity.`);
                  lastFrameToUse = undefined;
                  firstFrameToUse = avatarUrl;
                  // Mode: One frame, NO references
                  referenceImageUrlsToUse = undefined;

                  const avatarDescription =
                    (schema as any)?.avatar?.description ?? "A professional avatar speaker";
                  const rewrittenVideoPrompt = await gemini.rewriteToGenericPrompt(
                    currentShot,
                    avatarDescription,
                    productDescription,
                  );

                  finalPromptToUse = buildUgcPrompt(
                    text,
                    rewrittenVideoPrompt,
                    currentShot?.scenePrompt,
                    "",
                  );
                }
              } else {
                // Product IS visible. Use last frame as first frame.
                firstFrameToUse = lastFrameToUse;
                lastFrameToUse = undefined;
                // Mode: One frame, NO references
                referenceImageUrlsToUse = undefined;
              }
            } else {
              // No last frame provided. Check if we should use references or avatar.
              const segments = await segmentQueries.findSegmentsBySchemaId(schema.id);
              const segmentIndex = segments.findIndex(
                (s) => (s.segment_data as any).id === segmentId,
              );
              const segment = segments[segmentIndex];
              const currentShot = (segment?.segment_data as any)?.shots?.[0];
              const isProductShot = currentShot?.type === "product";

              if (segmentIndex === 0 || isProductShot || durationSeconds > 7) {
                // Mode: References, NO first frame
                // Exception: segmentIndex === 0 always uses references regardless of duration
                firstFrameToUse = undefined;
                referenceImageUrlsToUse = [...slicedProductUrls];
                if (avatarUrl) referenceImageUrlsToUse.unshift(avatarUrl);
              } else {
                // Mode: First frame (avatar), NO references
                firstFrameToUse = avatarUrl;
                referenceImageUrlsToUse = undefined;
              }
            }

            const operationName = await videoGenerator.create({
              prompt: finalPromptToUse,
              negativePrompt: buildUgcNegativePrompt(),
              firstFrameUrl: firstFrameToUse,
              lastFrameUrl: lastFrameToUse,
              aspectRatio,
              text,
              style: "Cinematic",
              durationSeconds,
              referenceImageUrls: referenceImageUrlsToUse,
            });

            // POLL
            let attempts = 0;
            let localRawVideoUrl: string | null = null;
            while (!localRawVideoUrl && attempts < 60) {
              attempts++;
              await new Promise((r) => setTimeout(r, 5000));
              const status = await videoGenerator.getStatus(operationName);

              if (status.status === "COMPLETED" && status.videos?.length > 0) {
                localRawVideoUrl = status.videos[0];
              } else if (status.status === "FAILED") {
                const errorMsg = `Veo generation failed for operation ${operationName}: ${status.error || "Unknown error"}`;
                console.error(errorMsg);
                throw new Error(errorMsg);
              }
            }

            if (!localRawVideoUrl) {
              throw new Error("Video generation timed out");
            }

            // UPLOAD to R2
            const [meta, data] = localRawVideoUrl.split(",");
            if (!meta || !data) {
              throw new Error("Invalid input string format");
            }

            const contentTypeMatch = meta.match(/data:(.*?);base64/);
            const contentType = contentTypeMatch ? contentTypeMatch[1] : "video/mp4";

            const buffer = Buffer.from(data, "base64");
            const fileName = `ugc-videos/${schemaId}/${segmentId}/${nanoid()}.mp4`;

            const r2 = new R2StorageService({
              bucketName: config.r2.bucket,
              accessKeyId: config.r2.accessKeyId,
              secretAccessKey: config.r2.secretAccessKey,
              accountId: config.r2.accountId,
              cdn: config.r2.cdn,
            });

            finalVideoUrl = await r2.uploadData(fileName, buffer, contentType);
          } catch (e: any) {
            retryCount++;
            console.error(
              `[UGC Veo Retry ${retryCount}/${MAX_RETRIES}] Failed to generate:`,
              e.message,
            );
            if (retryCount >= MAX_RETRIES) {
              throw new Error(
                `Failed to generate video after ${MAX_RETRIES} attempts. Last error: ${e.message}`,
              );
            }
            await new Promise((r) => setTimeout(r, 5000));
          }
        } // end while

        if (!finalVideoUrl) {
          throw new Error(`Veo failed to generate after ${MAX_RETRIES} attempts.`);
        }

        return finalVideoUrl;
      });

      // 4. Update DB with Video URL
      await step.run("update-segment-video", async () => {
        // Resolve schema from generationId (which is passed as schemaId)
        const project = await projectQueries.findByGenerationId(schemaId);
        if (!project) throw new Error("Project not found for generation ID");

        const schema = await segmentQueries.findSchemaByProjectId(project.id);
        if (!schema) throw new Error("Schema not found for project");

        const segments = await segmentQueries.findSegmentsBySchemaId(schema.id);

        const segmentIndex = segments.findIndex((s) => (s.segment_data as any).id === segmentId);
        if (segmentIndex === -1) throw new Error("Segment not found");

        const segment = segments[segmentIndex];
        const segmentData = segment.segment_data as any;

        // Update the asset with the new URL and status
        const assets = (segmentData.assets || []).map((a: any) => ({
          ...a,
          active: a.type === "video" ? false : a.active,
        }));

        const assetIndex = assets.findIndex((a: any) => a.id === assetId);

        if (assetIndex !== -1) {
          assets[assetIndex] = {
            ...assets[assetIndex],
            url: r2Url,
            status: "completed",
            active: true,
          };
        } else {
          assets.push({
            id: assetId || nanoid(),
            type: "video",
            url: r2Url,
            status: "completed",
            active: true,
            prompt: videoPrompt || prompt,
          });
        }

        const updatedSegmentData = {
          ...segmentData,
          assets,
          clips: assets.filter((a: any) => a.active),
        };

        // Update the segment in DB
        await db
          .updateTable("segments")
          .set({
            segment_data: updatedSegmentData,
            updated_at: new Date(),
          })
          .where("id", "=", segment.id)
          .execute();
      });

      // 5. Transcribe
      const speechToText = await step.run("transcribe-video", async () => {
        try {
          // ... (transcription logic)
          const result = await transcribe({ url: r2Url });

          // Upload transcription to R2
          const fileName = `transcriptions/${schemaId}/${segmentId}/${generateId()}.json`;
          const buffer = Buffer.from(JSON.stringify(result));

          const r2 = new R2StorageService({
            bucketName: config.r2.bucket,
            accessKeyId: config.r2.accessKeyId,
            secretAccessKey: config.r2.secretAccessKey,
            accountId: config.r2.accountId,
            cdn: config.r2.cdn,
          });

          const url = await r2.uploadData(fileName, buffer, "application/json");
          return { src: url, type: "json", ...result }; // Return full result for trimming calculation
        } catch (error) {
          console.error("Transcription failed:", error);
          return null;
        }
      });

      // 6. Trim Video (Smart Trimming)
      let finalVideoUrl = r2Url;
      let trimmedTranscription: any = speechToText; // Use any to bypass strict type checks for intermediate manipulation

      if (
        speechToText &&
        speechToText.results &&
        speechToText.results.main &&
        speechToText.results.main.words &&
        speechToText.results.main.words.length > 0
      ) {
        const trimResult = await step.run("trim-video", async () => {
          try {
            // Safe access guaranteed by outer check, but TS might need help
            const words = speechToText.results!.main.words;
            const firstWord = words[0];
            const lastWord = words[words.length - 1];
            const maxDuration = speechToText.duration || 0;

            // Calculate start and end with buffer (0.35s)
            const start = Math.max(0, firstWord.start - 0.35);
            const end =
              maxDuration > 0 ? Math.min(maxDuration, lastWord.end + 0.35) : lastWord.end + 0.35;

            // Format times as HH:MM:SS.mmm
            const formatTime = (seconds: number) => {
              return new Date(seconds * 1000).toISOString().slice(11, 23);
            };

            const trimStart = formatTime(start);
            const trimEnd = formatTime(end);

            // Call Trim API
            const trimResponse = await fetch(
              "https://auto-reframe-api-eekuywuwcq-uc.a.run.app/trim",
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  url: r2Url,
                  trims: [{ start: trimStart, end: trimEnd }],
                }),
              },
            );

            if (!trimResponse.ok) {
              console.error("Trim API failed", await trimResponse.text());
              return null;
            }

            const trimData = await trimResponse.json();
            if (trimData.status === "success" && trimData.trimmed?.length > 0) {
              return {
                url: trimData.trimmed[0].url,
                trimOffset: start, // The amount we cut from the start
              };
            }
            return null;
          } catch (error) {
            console.error("Trimming failed:", error);
            return null;
          }
        });

        if (trimResult) {
          finalVideoUrl = trimResult.url;

          // Shift transcription timestamps
          const offset = trimResult.trimOffset;

          // Deep clone to avoid mutating original step result
          trimmedTranscription = JSON.parse(JSON.stringify(speechToText));

          // Update words
          if (trimmedTranscription?.results?.main?.words) {
            trimmedTranscription.results.main.words = trimmedTranscription.results.main.words
              .map((w: any) => ({
                ...w,
                start: Math.max(0, w.start - offset),
                end: Math.max(0, w.end - offset),
              }))
              .filter((w: any) => w.end > 0);
          }

          // Update paragraphs
          if (trimmedTranscription?.results?.main?.paragraphs) {
            trimmedTranscription.results.main.paragraphs =
              trimmedTranscription.results.main.paragraphs.map((p: any) => ({
                ...p,
                start: Math.max(0, p.start - offset),
                end: Math.max(0, p.end - offset),
                sentences: p.sentences.map((s: any) => ({
                  ...s,
                  start: Math.max(0, s.start - offset),
                  end: Math.max(0, s.end - offset),
                })),
              }));
          }

          // Update duration
          if (trimmedTranscription?.duration) {
            trimmedTranscription.duration -= offset;
          }

          const newTranscriptionUrl = await step.run("upload-trimmed-transcription", async () => {
            const fileName = `transcriptions/${schemaId}/${segmentId}/${generateId()}-trimmed.json`;
            const buffer = Buffer.from(JSON.stringify(trimmedTranscription));

            const r2 = new R2StorageService({
              bucketName: config.r2.bucket,
              accessKeyId: config.r2.accessKeyId,
              secretAccessKey: config.r2.secretAccessKey,
              accountId: config.r2.accountId,
              cdn: config.r2.cdn,
            });
            return await r2.uploadData(fileName, buffer, "application/json");
          });

          if (trimmedTranscription) {
            trimmedTranscription.src = newTranscriptionUrl;
            // Also ensure the root URL property is set if consumers rely on it
            trimmedTranscription.url = newTranscriptionUrl;
          }
        }
      }

      // 7. Final DB Update (Video + Transcription)
      await step.run("update-segment-final", async () => {
        const project = await projectQueries.findByGenerationId(schemaId);
        if (!project) return;

        const schema = await segmentQueries.findSchemaByProjectId(project.id);
        if (!schema) return;

        const segments = await segmentQueries.findSegmentsBySchemaId(schema.id);
        const segment = segments.find((s) => (s.segment_data as any).id === segmentId);

        if (segment) {
          const segmentData = segment.segment_data as any;

          // Update Assets with final video URL
          const assets = segmentData.assets || [];
          const assetIndex = assets.findIndex((a: any) => a.id === assetId);

          if (assetIndex !== -1) {
            assets[assetIndex] = {
              ...assets[assetIndex],
              url: finalVideoUrl,
              status: "completed",
            };
          }

          const updatedSegmentData = {
            ...segmentData,
            assets,
            speechToText: trimmedTranscription
              ? {
                  src: trimmedTranscription.src || trimmedTranscription.url, // Handle legacy/new mismatch
                  type: "json",
                }
              : undefined,
          };

          await db
            .updateTable("segments")
            .set({
              segment_data: updatedSegmentData,
              updated_at: new Date(),
            })
            .where("id", "=", segment.id)
            .execute();
        }
      });

      return {
        videoUrl: finalVideoUrl,
        speechToText: trimmedTranscription
          ? {
              src: trimmedTranscription.src || trimmedTranscription.url,
              url: trimmedTranscription.url || trimmedTranscription.src,
              type: "json",
            }
          : null,
      };
    } catch (err: any) {
      console.error("error-error", err);
      if (schemaId) {
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
      }
      throw new NonRetriableError(`Error resolving schema${schemaId ? ` [${schemaId}]` : ""}`, {
        cause: err,
      });
    }
  },
);
