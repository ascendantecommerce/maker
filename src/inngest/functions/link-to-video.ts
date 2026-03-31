import { nanoid } from "nanoid";
import { NonRetriableError } from "inngest";

import { getInngestApp } from "../index";
import { execLinkToVideo } from "./scrap-to-url";

import { db } from "@/lib/database";
import { segmentQueries } from "@/lib/database/segment-queries";

import { aspectRatioType, ResolverStatus } from "@/utils/enum";
import { workflowChannel } from "../utils/common";
import { ToastType } from "../utils/types";

interface LinkToVideoJob {
  schemeId: string;
  projectId: string;
  userId: string;
  url: string;
  visualStyle: string;
  aspectRatio: aspectRatioType;
}

const inngest = getInngestApp();

export const linkToVideo = inngest.createFunction(
  { id: "link-to-video" },
  { event: "link/video" },
  async ({ event, step, attempt, publish }) => {
    const job: LinkToVideoJob = event.data;
    const { schemeId, aspectRatio, visualStyle, url } = job;
    const channel = workflowChannel(schemeId);

    try {
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

      const result = await execLinkToVideo(url, schemeId, aspectRatio, visualStyle, step);

      const schemaId = nanoid();
      await segmentQueries.createSchema({
        id: schemaId,
        project_id: job.projectId,
        title: result.title || null,
        description: result.description || null,
        prompt_preview: result.promptPreview || null,
        tags: result.tags || null,
        music: result.music || null,
        voice: result.voice || null,
        visuals: result.visuals || null,
        caption: result.caption || null,
        resolution: result.resolution || null,
        aspect_ratio: result.aspectRatio || null,
        type: "linked-video",
        execution_mode: result.executionMode || "live",
      });

      await segmentQueries.bulkCreateSegments(
        result.segments.map((s, index: number) => ({
          id: s.id || nanoid(),
          project_id: job.projectId,
          schema_id: schemaId,
          order: index,
          segment_data: s,
        })),
      );

      return { result };
    } catch (err) {
      console.error("error-error", err);
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
      throw new NonRetriableError(`Error resolving schema${schemeId ? ` [${schemeId}]` : ""}`, {
        cause: err,
      });
    }
  },
);
