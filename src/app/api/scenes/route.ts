import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { sceneQueries } from "@/lib/database/scene-queries";
import { projectQueries } from "@/lib/database/project-queries";

export async function POST(req: Request) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  const userId = session?.user?.id || null;

  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { schemaId, sceneData, projectId } = await req.json();

    if (!schemaId || !sceneData || !projectId) {
      return Response.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Verify project ownership
    const project = await projectQueries.findById(projectId);
    if (!project || project.user_id !== userId) {
      return Response.json({ error: "Project not found or access denied" }, { status: 403 });
    }

    // Check if scene exists for this schema
    const existingScene = await sceneQueries.findBySchemaId(schemaId);
    if (existingScene) {
      // Update existing scene
      const updatedScene = await sceneQueries.update(existingScene.id, {
        scene_data: sceneData,
      });
      return Response.json({ scene: updatedScene });
    }

    const newScene = await sceneQueries.create({
      id: crypto.randomUUID(),
      generation_id: project.generation_id || null, // Allow null if project has no generation
      schema_id: schemaId,
      scene_data: sceneData,
      user_id: userId,
    });

    return Response.json({ scene: newScene });
  } catch (err) {
    console.error("Error saving scene:", err);
    return Response.json(
      { error: `Failed to save scene: ${(err as Error).message}` },
      { status: 500 },
    );
  }
}
