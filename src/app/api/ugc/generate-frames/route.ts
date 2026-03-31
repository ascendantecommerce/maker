import { NextResponse } from "next/server";
import { generateSegmentFrame } from "@/lib/ugc/frame-generator";
import { db } from "@/lib/database";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { nanoid } from "nanoid";

export interface Segment {
  id: string;
  shotId?: string;
  type?: "product" | "generic" | "b-roll";
  description: string;
  text: string;
  prompt_preview?: string;
  previousFrameUrl?: string;
  shotType?: "product" | "generic";
  firstFrame?: string;
}

export interface GenerateFramesRequest {
  schemaId?: string;
  segments: Segment[];
  avatarUrl?: string;
  productUrls?: string[];
  aspectRatio?: string;
}

export const maxDuration = 300; // 5 minutes

export async function POST(req: Request) {
  try {
    const body: GenerateFramesRequest = await req.json();
    const { schemaId, segments, avatarUrl, productUrls, aspectRatio = "9:16" } = body;

    if (!segments || segments.length === 0) {
      return NextResponse.json({ error: "Segments are required" }, { status: 400 });
    }

    // Get authenticated user
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    const userId = session?.user?.id;

    console.log(`Generating frames for ${segments.length} segments in parallel...`);

    const urls: Record<string, string> = {};
    const errors: Record<string, string> = {};

    // Start generation for all segments in parallel
    await Promise.all(
      segments.map(async (segment) => {
        try {
          const url = await generateSegmentFrame({
            segmentDescription: segment.description,
            segmentText: segment.text,
            firstFrame: segment.firstFrame,
            shotType: segment.type as any,
            avatarUrl,
            // Only pass product reference images for product shots.
            // Generic (avatar-only) shots must not receive product URLs
            // or the image model will force the product into the frame.
            productUrls: segment.shotType === "generic" ? undefined : productUrls,
            // previousFrameUrl: segment.previousFrameUrl,
            aspectRatio,
          });

          urls[segment.id] = url;
          const generationId = `gen-${nanoid()}`;

          // Save to database as COMPLETED
          if (userId) {
            await db
              .insertInto("generations")
              .values({
                id: generationId,
                status: "COMPLETED",
                user_id: userId,
                input: {
                  segmentId: segment.id,
                  shotId: segment.shotId,
                  schemaId,
                  prompt: segment.description,
                  avatarUrl,
                  productUrls,
                  previousFrameUrl: segment.previousFrameUrl,
                  aspectRatio,
                },
                output: { url },
                metadata: {
                  type: "ugc-frame",
                  schemaId,
                  segmentId: segment.id,
                  shotId: segment.shotId,
                },
              } as any)
              .execute();
          }
        } catch (error: any) {
          console.error(`Error generating frame for segment ${segment.id}:`, error);
          errors[segment.id] = error.message || "Failed to generate frame";
        }
      }),
    );

    return NextResponse.json(
      {
        urls,
        errors: Object.keys(errors).length > 0 ? errors : undefined,
        success: Object.keys(urls).length > 0,
      },
      { status: 200 },
    );
  } catch (error: any) {
    console.error("Error in /api/ugc/generate-frames:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message },
      { status: 500 },
    );
  }
}
