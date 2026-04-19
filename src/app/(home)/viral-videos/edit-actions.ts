"use server";

import { getInngestApp } from "@/inngest/index";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/lib/database";

export async function analyzeViralVideo(generationId: string, videoId: string) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    throw new Error("Unauthorized");
  }

  // Update DB to mark as PENDING to avoid frontend race conditions
  const generation = await db
    .selectFrom("generations")
    .select(["output"])
    .where("id", "=", generationId)
    .executeTakeFirst();

  if (generation && generation.output) {
    const results = typeof generation.output === "string" 
      ? JSON.parse(generation.output) 
      : generation.output;
    
    const videoIndex = results.findIndex((v: any) => v.id === videoId);
    if (videoIndex !== -1) {
      results[videoIndex].edit_status = "PENDING";
      delete results[videoIndex].schema_id; // Clear stale ID to force wait

      await db
        .updateTable("generations")
        .set({ output: JSON.stringify(results) })
        .where("id", "=", generationId)
        .execute();
    }
  }

  const inngest = getInngestApp();
  
  await inngest.send({
    name: "viral-videos/edit-analysis",
    data: {
      generationId,
      videoId,
    },
    user: {
      id: session.user.id,
    }
  });

  return { success: true };
}
