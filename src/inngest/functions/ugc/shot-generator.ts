import { getInngestApp } from "../../index";
import { db } from "@/lib/database";
import { initializeUgcServices } from "./services";
import { generateUgcVideo } from "./steps/veo";
import { generateSegmentFrame } from "@/lib/ugc/frame-generator";
import { generationQueries } from "@/lib/database/generation-queries";
import { segmentQueries } from "@/lib/database/segment-queries";
import { ensureObject } from "../common/services/utils";
import { DistributedSemaphore } from "../../services/semaphore";
import { nanoid } from "nanoid";
import { Segment, VideoSchema } from "@/types/segment";

const inngest = getInngestApp();
const phonosSemaphore = new DistributedSemaphore("phonos:audio_enhancement_slots", 5, 300000);

/**
 * UGC SHOT IMAGE GENERATION
 */
export const generateUGCImage = inngest.createFunction(
  {
    id: "generate-ugc-image",
    triggers: { event: "ugc/shot.generate.image" },
  },
  async ({ event, step }) => {
    const { generationId, schemaId, segments, avatarUrl, productUrls, aspectRatio } = event.data;
    const segment = segments[0]; // UGC frames API usually takes one segment at a time from UI
    
    try {
      await generationQueries.update(generationId, { progress: 10, status: "PROGRESS" });

      await generationQueries.update(generationId, { progress: 30 });

      const url = await step.run("generate-frame", async () => {
        return await generateSegmentFrame({
          segmentDescription: segment.description,
          segmentText: segment.text,
          firstFrame: segment.firstFrame,
          shotType: segment.type as any,
          avatarUrl,
          productUrls: segment.shotType === "generic" ? undefined : productUrls,
          aspectRatio: aspectRatio || "9:16",
        });
      });

      await generationQueries.update(generationId, { progress: 70 });

      // Update segment in DB
      await step.run("update-db", async () => {
        const freshSeg = await db
          .selectFrom("segments")
          .select("segment_data")
          .where("id", "=", segment.id)
          .executeTakeFirst();

        const currentSegData = freshSeg ? ensureObject(freshSeg.segment_data) : segment;
        
        const newAsset = {
          id: `asset-${nanoid()}`,
          type: "image" as const,
          url,
          status: "completed" as const,
          active: true,
          prompt: segment.description,
        };
        
        currentSegData.assets = [...(currentSegData.assets || []), newAsset];
        if (currentSegData.shots?.[0]) {
            currentSegData.shots[0].imageUrl = url;
            currentSegData.shots[0].status = "completed";
        }

        await db
          .updateTable("segments")
          .set({ segment_data: currentSegData, updated_at: new Date() })
          .where("id", "=", segment.id)
          .execute();
      });

      await generationQueries.update(generationId, { 
        status: "COMPLETED", 
        progress: 100, 
        output: { url } 
      });

      return { success: true, url };
    } catch (error: any) {
      await generationQueries.update(generationId, { status: "FAILED", output: { error: error.message } });
      throw error;
    }
  }
);

/**
 * UGC SHOT VIDEO GENERATION
 */
export const generateUGCVideo = inngest.createFunction(
  {
    id: "generate-ugc-video",
    triggers: { event: "ugc/shot.generate.video" },
  },
  async ({ event, step }) => {
    const { 
      generationId, schemaId, segmentId, shotId, 
      firstFrameUrl, lastFrameUrl, aspectRatio, 
      text, scenePrompt, videoPrompt, 
      userId, assetId, avatarUrl, productUrls 
    } = event.data;

    try {
      const services = initializeUgcServices();
      await generationQueries.update(generationId, { progress: 10 });

      // Fetch segment data
      const dbSegment = await step.run("fetch-segment", async () => {
        const res = await db.selectFrom("segments").selectAll().where("id", "=", segmentId).executeTakeFirst();
        if (!res) throw new Error("Segment not found");
        return { 
          ...res, 
          segment_data: ensureObject(res.segment_data) as Segment 
        };
      });

      const schema = await step.run("fetch-schema", async () => {
        const res = await db.selectFrom("schemas").selectAll().where("id", "=", schemaId).executeTakeFirst();
        if (!res) throw new Error("Schema not found");
        
        // Map DB snake_case to Interface camelCase
        return {
          ...res,
          aspectRatio: res.aspect_ratio,
          promptPreview: res.prompt_preview,
          segments: [], // Will be filled if needed, but generateUgcVideo handles individual segments
        } as unknown as VideoSchema;
      });

      await generationQueries.update(generationId, { progress: 30 });

      const result = await step.run("generate-video", async () => {
        // Construct the surrogate schema needed by generateUgcVideo
        const surrogateSchema = {
          id: schemaId,
          type: "ugc-video-ad",
          aspect_ratio: aspectRatio,
          product: schema?.product,
          avatar: schema?.avatar,
          segments: [],
        };

        return await generateUgcVideo({
          segData: dbSegment.segment_data,
          isExpand: false,
          previousSegmentDbId: null,
          globalIndex: 0,
          videoUrlByDbId: firstFrameUrl ? { "manual-first-frame": firstFrameUrl } : {},
          avatarUrl,
          productUrls: productUrls || [],
          schemaId,
          projectId: schema?.project_id || "",
          segmentId,
          schema: surrogateSchema as any,
          services,
          mode: firstFrameUrl ? "first frame to video" : "reference to video",
          firstFrameSource: firstFrameUrl ? "none" : "avatar", // if manual url provided, we handle it in videoUrlByDbId
          isProductShot: dbSegment.segment_data.shots?.[0]?.type === "product",
          isFirstProductMention: true,
          runToken: generationId,
          phonosSemaphore,
        });
      });

      await generationQueries.update(generationId, { progress: 70 });

      await step.run("update-db", async () => {
        // Logic adapted from updateVeoSegmentInDb
        const finalUrl = result.finalTrimmedUrl || result.rawR2Url;
        
        const existingAssets = (dbSegment.segment_data.assets ?? []).map((a: any) => ({
          ...a,
          active: a.type === "video" ? false : a.active,
        }));
        
        const updatedAssets = [
          ...existingAssets,
          {
            id: assetId || `asset-${nanoid()}`,
            type: "video" as const,
            url: finalUrl,
            status: "completed" as const,
            active: true,
            prompt: videoPrompt || text,
          },
        ];

        const updatePayload = {
          ...dbSegment.segment_data,
          assets: updatedAssets,
          estimatedDuration: result.actualDuration,
        };

        if (updatePayload.shots?.[0]) {
          updatePayload.shots[0].videoUrl = finalUrl;
          updatePayload.shots[0].status = "completed";
          updatePayload.shots[0].duration = result.actualDuration;
        }

        await db
          .updateTable("segments")
          .set({ segment_data: updatePayload, updated_at: new Date() })
          .where("id", "=", segmentId)
          .execute();
      });

      const finalVideoUrl = result.finalTrimmedUrl || result.rawR2Url;
      await generationQueries.update(generationId, { 
        status: "COMPLETED", 
        progress: 100, 
        output: { url: finalVideoUrl } 
      });

      return { success: true, url: result.finalTrimmedUrl || result.rawR2Url };
    } catch (error: any) {
      await generationQueries.update(generationId, { status: "FAILED", output: { error: error.message } });
      throw error;
    }
  }
);
