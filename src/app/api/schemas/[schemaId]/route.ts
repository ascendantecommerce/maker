import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { projectQueries } from "@/lib/database/project-queries";
import { segmentQueries } from "@/lib/database/segment-queries";
import { sceneQueries } from "@/lib/database/scene-queries";
import { db } from "@/lib/database";

export async function GET(req: Request, { params }: { params: Promise<{ schemaId: string }> }) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  const userId = session?.user?.id || null;

  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { schemaId } = await params;

  // 1. Fetch the schema
  const schema = await segmentQueries.findSchemaById(schemaId);

  if (!schema) {
    return Response.json({ error: "Schema not found" }, { status: 404 });
  }

  // 2. Fetch the project to verify access
  const project = await projectQueries.findById(schema.project_id);

  if (!project || project.user_id !== userId) {
    return Response.json({ error: "Project not found or access denied" }, { status: 404 });
  }

  // 3. Fetch related segments
  const segments = await segmentQueries.findSegmentsBySchemaId(schemaId);

  // 4. Fetch assets (optional but good for context if needed in editor)
  const assets = await db
    .selectFrom("assets")
    .selectAll()
    .where("project_id", "=", project.id)
    .orderBy("created_at", "desc")
    .execute();

  // 5. Check for existing scene
  const existingScene = await sceneQueries.findBySchemaId(schemaId);

  // Return structure compatible with the frontend ProjectData interface
  const cleanedProject = {
    id: project.id,
    name: project.name,
    type: project.type,
    description: project.description,
    thumbnail: project.thumbnail,
    public: project.public,
    user_id: project.user_id,
    folder_id: project.folder_id,
    created_at: project.created_at,
    updated_at: project.updated_at,
  };

  console.log("API schema response: animation =", (schema.metadata as any)?.animation);
  return Response.json({
    project: cleanedProject,
    schemas: [
      {
        ...schema,
        animation: (schema.metadata as any)?.animation,
      },
    ],
    segments: segments,
    assets: assets,
    scene: existingScene || null,
  });
}
