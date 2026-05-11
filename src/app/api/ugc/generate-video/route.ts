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
    const {
      schemaId,
      segmentId,
      shotId,
      firstFrameUrl,
      lastFrameUrl,
      aspectRatio = "9:16",
      text,
      scenePrompt,
      videoPrompt,
      avatarUrl,
      productUrls,
    } = body;

    // Get authenticated user
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const inngest = getInngestApp();
    const generationId = `gen-${nanoid()}`;
    const assetId = nanoid();

    // Trigger Inngest function
    const { ids } = await inngest.send({
      name: "ugc/shot.generate.video",
      data: {
        generationId,
        schemaId,
        segmentId,
        shotId,
        firstFrameUrl,
        lastFrameUrl,
        aspectRatio,
        text,
        scenePrompt,
        videoPrompt,
        userId,
        assetId,
        avatarUrl,
        productUrls,
      },
    });

    const taskId = ids[0];

    await db
      .insertInto("generations")
      .values({
        id: generationId, // Using generationId as the primary key for tracking
        status: "PENDING",
        user_id: userId,
        progress: 0,
        input: JSON.stringify(body),
        metadata: JSON.stringify({
          type: "ugc-video",
          schemaId,
          segmentId,
          shotId,
          assetId,
          inngestId: taskId,
        }),
      } as any)
      .execute();

    return NextResponse.json({ generationId, taskId, assetId, success: true }, { status: 200 });
  } catch (error: any) {
    console.error("Error in /api/ugc/generate-video:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message },
      { status: 500 },
    );
  }
}
