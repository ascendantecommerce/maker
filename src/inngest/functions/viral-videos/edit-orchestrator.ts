import { getInngestApp } from "../../index";
import { db } from "@/lib/database";
import { GeminiService } from "@/lib/gemini/copilot";
import { NonRetriableError } from "inngest";
import { ResolverStatus } from "@/utils/enum";
import { writeFile, unlink } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import { generateSceneFromCuts } from "@/lib/video-editor/scene-generator";
import { v4 as uuidv4 } from "uuid";
import { R2StorageService } from "@/lib/r2-storage";
import { config as appConfig } from "@/app/api/uploads/socials/config";

const inngest = getInngestApp();

export const viralVideoEditOrchestrator = inngest.createFunction(
  { id: "viral-video-edit-orchestrator", concurrency: 5 },
  { event: "viral-videos/edit-analysis" },
  async ({ event, step }) => {
    const { generationId, videoId } = event.data;

    // 1. Fetch the generation to get the video URL
    const generation = await step.run("get-generation", async () => {
      const data = await db
        .selectFrom("generations")
        .selectAll()
        .where("id", "=", generationId)
        .executeTakeFirst();
      
      if (!data) throw new NonRetriableError("Generation not found");
      return data;
    });

    const results = typeof generation.output === "string" 
      ? JSON.parse(generation.output) 
      : generation.output;
    
    const videoIndex = results.findIndex((v: any) => v.id === videoId);
    if (videoIndex === -1) throw new NonRetriableError("Video not found in results");
    
    const video = results[videoIndex];
    if (!video.url) throw new NonRetriableError("Video URL not found");

    // 2. Index the video (Download -> Upload to Gemini)
    // We'll create a temporary asset or check if one exists
    const asset = await step.run("index-video", async () => {
      // Check if we already have an asset for this URL/ID
      let existingAsset = await db
        .selectFrom("assets")
        .selectAll()
        .where("id", "=", `viral_${videoId}`)
        .executeTakeFirst();
      
      if (existingAsset && existingAsset.gemini_file_uri) {
        return existingAsset;
      }

      if (!existingAsset) {
        // Create a basic asset record first
        existingAsset = await db
          .insertInto("assets")
          .values({
            id: `viral_${videoId}`,
            user_id: event.user?.id || generation.user_id || "system",
            source_type: "ai_generated",
            asset_type: "video",
            original_filename: `viral_${videoId}.mp4`,
            unique_filename: `viral_${videoId}_${Date.now()}.mp4`,
            file_path: video.url, // Using URL as path for reference
            public_url: video.url,
            mime_type: "video/mp4",
          })
          .onConflict((oc) => 
            oc.column("id").doUpdateSet({
              public_url: video.url,
            })
          )
          .returningAll()
          .executeTakeFirstOrThrow();
      }

      // Index it in Gemini
      return await GeminiService.indexAsset(existingAsset);
    });

    // 3. Create Cache and Run Analysis
    const analysis = await step.run("run-gemini-analysis", async () => {
      const cacheKey = await GeminiService.ensureCache(asset as any);
      return await GeminiService.analyzeForEcommerceEdit(cacheKey);
    });

    // 4. Download original video and upload to R2
    const r2VideoUrl = await step.run("upload-to-r2", async () => {
      console.log(`Downloading viral video: ${video.url}`);
      const response = await fetch(video.url);
      if (!response.ok) {
        throw new NonRetriableError(`Failed to download video from origin: ${response.statusText}`);
      }
      
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      
      const r2Service = new R2StorageService({
        ...appConfig.r2,
        bucketName: appConfig.r2.bucket
      });
      const r2FileName = `viral_edits/${videoId}_${Date.now()}.mp4`;
      
      console.log(`Uploading to R2 as ${r2FileName}`);
      const uploadedUrl = await r2Service.uploadData(r2FileName, buffer, "video/mp4");
      return uploadedUrl;
    });

    // 5. Generate the Scenify JSON based on suggested cuts using the R2 URL
    const generatedScene = await step.run("generate-scene", async () => {
      const durationMs = asset.duration ? asset.duration * 1000 : 15000;
      return generateSceneFromCuts(
        r2VideoUrl, // Use the uploaded R2 URL here!
        durationMs,
        analysis.cuts || [],
        `viraledit_${videoId}.mp4`
      );
    });



    // 5. Create Project & Scene in DB for immediate editing
    const schemaId = await step.run("create-editor-project", async () => {
      const projectId = `proj_${uuidv4().substring(0, 8)}`;
      const newSchemaId = `schema_${uuidv4().substring(0, 8)}`;
      const sceneId = `scene_${uuidv4().substring(0, 8)}`;

      // Create Project
      await db.insertInto("projects").values({
        id: projectId,
        user_id: event.user?.id || generation.user_id || "system",
        name: `AI Edit - ${video.description?.substring(0, 20) || "Video"}`,
        type: "viral-edit",
        public: false,
      }).execute();

      // Create Schema
      await db.insertInto("schemas").values({
        id: newSchemaId,
        project_id: projectId,
        execution_mode: "auto",
        type: "viral-edit",
      }).execute();

      // Create Scene
      await db.insertInto("scenes").values({
        id: sceneId,
        schema_id: newSchemaId,
        user_id: event.user?.id || generation.user_id || "system",
        scene_data: JSON.stringify(generatedScene),
      }).execute();

      return newSchemaId;
    });

    // 6. Update the generation results with analysis
    await step.run("update-results", async () => {
      results[videoIndex] = {
        ...video,
        analysis: analysis,
        schema_id: schemaId,
        edit_status: "COMPLETED"
      };

      await db
        .updateTable("generations")
        .set({
          output: JSON.stringify(results)
        })
        .where("id", "=", generationId)
        .execute();
    });

    return { success: true, videoId, analysis };
  }
);
