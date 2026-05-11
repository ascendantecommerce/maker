import { NextResponse } from "next/server";
import { getInngestApp } from "@/inngest";
import { db } from "@/lib/database";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { nanoid } from "nanoid";

export const maxDuration = 300; // 5 minutes

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { schemaId, segments, avatarUrl, productUrls, aspectRatio = "9:16" } = body;

    if (!segments || segments.length === 0) {
      return NextResponse.json({ error: "Segments are required" }, { status: 400 });
    }

    // Get authenticated user
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const inngest = getInngestApp();
    const urls: Record<string, string> = {};
    const generationIds: Record<string, string> = {};

    // Start generation for all segments asynchronously via Inngest
    for (const segment of segments) {
      const generationId = `gen-${nanoid()}`;
      generationIds[segment.id] = generationId;

      // Initialize generation record
      await db
        .insertInto("generations")
        .values({
          id: generationId,
          status: "PENDING",
          user_id: userId,
          progress: 0,
          input: JSON.stringify({
            segmentId: segment.id,
            shotId: segment.shotId,
            schemaId,
            prompt: segment.description,
            avatarUrl,
            productUrls,
            aspectRatio,
          }),
          metadata: JSON.stringify({
            type: "ugc-frame",
            schemaId,
            segmentId: segment.id,
            shotId: segment.shotId,
          }),
        } as any)
        .execute();

      // Trigger Inngest
      await inngest.send({
        name: "ugc/shot.generate.image",
        data: {
          generationId,
          schemaId,
          segments: [segment],
          avatarUrl,
          productUrls,
          aspectRatio,
        },
      });
    }

    return NextResponse.json(
      {
        generationIds,
        success: true,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Error in /api/ugc/generate-frames:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message },
      { status: 500 },
    );
  }
}
