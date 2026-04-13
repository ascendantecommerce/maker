import { getInngestApp } from "@/inngest";
import { db } from "@/lib/database";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { projectQueries } from "@/lib/database/project-queries";
import { folderQueries } from "@/lib/database/folder-queries";
import { nanoid } from "nanoid";

const MODE_TO_EVENT: Record<string, string> = {
  "ugc-video-ad": "ugc/video.orchestrate",
  "fake-ugc-video-ad": "video/fake-ugc.orchestrate",
  "product-video-ad": "video/product.orchestrate",
  "narrative-video": "video/narrative.orchestrate",
  "character-driven-ad": "character-ad/video.orchestrate",
};

export async function POST(req: Request) {
  const inngest = getInngestApp();
  const payload = await req.json();
  const body = payload.scheme ? payload.scheme : payload;

  // Get authenticated user
  const session = await auth.api.getSession({ headers: await headers() });
  const userId = session?.user?.id || null;

  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!body.topic && !body.script && !body.product && !body.blocks) {
    return Response.json(
      { error: "Topic, script, product or blocks are required" },
      { status: 400 },
    );
  }

  const requestedFolderId: string | null = body.folderId || null;
  let folderId: string | null = null;
  if (requestedFolderId) {
    const folder = await folderQueries.findById(requestedFolderId);
    if (!folder || folder.user_id !== userId) {
      return Response.json({ error: "Folder not found or access denied" }, { status: 404 });
    }
    folderId = requestedFolderId;
  }

  const generationId = body.id || nanoid();
  const projectId = nanoid();

  const scheme = {
    id: generationId,
    script: body.script || "",
    voice: body.voice || { name: "Will", id: "CwhRBWXzGAHq8TQ4Fs17" },
    aspectRatio: body.aspectRatio || "9:16",
    visuals: body.visuals || { style: "Realism", type: "AI_VIDEOS" },
    caption: body.caption || {
      id: "caption-7",
      name: "Modern",
      position: "bottom",
      size: "medium",
    },
    avatar: body.avatar,
    music: body.music,
    animation: body.animation ?? true,
    pacing: body.pacing || "default",
    assets: body.assets || [],
    product: body.product,
    topic: body.topic,
    blocks: body.blocks,
    description: body.description,
    type: body.type || "narrative-video",
    title:
      body.title || body.topic?.name || body.product?.name || `Project ${generationId.slice(0, 8)}`,
    segments: [],
    promptPreview: "",
    resolution: body.resolution || "1080p",
    executionMode: body.executionMode || "live",
  };

  // Save generation record
  await db
    .insertInto("generations")
    .values({ id: scheme.id, input: scheme, output: [], user_id: userId } as any)
    .execute();

  // Create project
  const projectType = scheme.type;
  await projectQueries.create({
    id: projectId,
    name: scheme.title,
    generation_id: scheme.id,
    scene_id: null,
    folder_id: folderId,
    user_id: userId,
    description: scheme.description || null,
    thumbnail: null,
    public: body.public !== undefined ? body.public : true,
    type: projectType,
  });

  // Route to the correct orchestrator
  const eventName = MODE_TO_EVENT[scheme.type] ?? "video/narrative.orchestrate";
  await inngest.send({ name: eventName, data: { scheme } });

  return Response.json({ ok: true, id: scheme.id, projectId });
}
