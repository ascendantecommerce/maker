import { NextResponse } from "next/server";
import { getInngestApp } from "@/inngest";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { fetchWorkflowState, ensureObject } from "@/inngest/functions/common/services/utils";
import { segmentQueries } from "@/lib/database/segment-queries";
import { generationQueries } from "@/lib/database/generation-queries";
import { generateId } from "@/utils/id";

export async function POST(req: Request) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    const userId = session?.user?.id || null;

    const body = await req.json();
    const { schemeId, segmentId, shotId, shotIndex, prompt, shotType, projectId, model, mode } =
      body;

    if (!schemeId || !segmentId || (!shotId && shotIndex === undefined) || !prompt || !shotType) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const generationId = generateId();

    // Synchronously set status to generating and create generation record
    try {
      await generationQueries.create({
        id: generationId,
        status: "PENDING",
        progress: 0,
        user_id: userId || null,
        input: { segmentId, shotIndex, prompt, shotType, model },
        metadata: { type: "shot-generation", schemeId, model },
      });

      const schema = await segmentQueries.findSchemaById(schemeId);
      if (schema) {
        const dbSegments = await segmentQueries.findSegmentsBySchemaId(schemeId);
        const segsWithDbId = dbSegments.map((s: any) => {
          const data = ensureObject(s.segment_data);
          return { ...data, dbId: s.id };
        });

        const seg = segsWithDbId.find((s: any) => s.id === segmentId);
        if (seg && seg.shots) {
          let idx = -1;
          if (shotId) idx = seg.shots.findIndex((s: any) => s.id === shotId);
          if (idx === -1 && shotIndex !== undefined) idx = shotIndex;

          if (idx !== -1 && seg.shots[idx]) {
            seg.shots[idx].status = "generating";
            seg.shots[idx].generationId = generationId;
            seg.shots[idx].error = undefined;

            const dbId = seg.dbId;
            const cleanSeg = { ...seg };
            delete (cleanSeg as any).dbId;

            await segmentQueries.bulkUpdateSegments([{ id: dbId, segment_data: cleanSeg }]);
          }
        }
      }
    } catch (e) {
      console.error("Failed to update status synchronously", e);
    }

    // Trigger Inngest function
    const inngest = getInngestApp();

    await inngest.send({
      name: mode === "video" ? "standard/shot.generate.video" : "standard/shot.generate.image",
      data: {
        generationId,
        schemeId,
        segmentId,
        shotId,
        shotIndex,
        prompt,
        shotType,
        projectId,
        userId,
        model,
        mode: mode || "image",
      },
    });

    return NextResponse.json({ success: true, generationId, message: "Generation started" });
  } catch (error: any) {
    console.error("Shot generation API error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
