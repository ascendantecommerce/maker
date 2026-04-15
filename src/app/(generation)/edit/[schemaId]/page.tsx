"use client";

import { use, useEffect, useState } from "react";
import * as Sentry from "@sentry/nextjs";
import { usePostHog } from "posthog-js/react";
import Editor from "@/components/editor/editor";
import { convertSchemaToDesign } from "@/utils/schema-converter";
import { convertUgcSchemaToDesign } from "@/utils/ugc-schema-converter";
import { useStudioStore } from "@/stores/studio-store";
import { useSchemaStore } from "@/stores/schema-store";
import { Design } from "@/types/editor";
import { Scene } from "@/lib/database";

interface ProjectData {
  project: any;
  assets: any[];
  scene: Scene | null;
  schemas: any[];
  segments: any[];
  isOwner: boolean;
  isPublic: boolean;
}

export default function FolderPage({ params }: { params: Promise<{ schemaId: string }> }) {
  const { schemaId } = use(params);
  const [projectData, setProjectData] = useState<ProjectData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { studio } = useStudioStore();
  const [isConverting, setIsConverting] = useState(false);
  const [design, setDesign] = useState<Design | null>(null);
  const [isOwner, setIsOwner] = useState(true);
  const posthog = usePostHog();
  const { setSchema } = useSchemaStore();

  useEffect(() => {
    Sentry.setTag("page_name", "edit-scene");
    posthog.capture("editor_project_load_started", { schemaId });
  }, [schemaId, posthog]);
  const fetchProject = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/schemas/${schemaId}`);

      if (!response.ok) {
        throw new Error("Failed to fetch project data");
      }

      const data: ProjectData = await response.json();
      console.log({ data });
      setProjectData(data);
      setIsOwner(data.isOwner ?? true);
    } catch (err) {
      console.error("Error fetching project:", err);
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const convertAndSave = async () => {
      if (!projectData) return;

      const mainSchema = projectData.schemas?.[0];
      if (mainSchema) {
        setSchema({
          ...mainSchema,
          segments: projectData.segments || [],
        });
      }

      // // 1. If scene exists, load it directly
      if (projectData.scene) {
        // console.log("Loading existing scene:", projectData.scene);
        // // Ensure we parse scene_data if it's a string, or use directly if object
        // const sceneData =
        //   typeof projectData.scene.scene_data === "string"
        //     ? JSON.parse(projectData.scene.scene_data)
        //     : projectData.scene.scene_data;
        // setDesign(sceneData);
        // return;
      }

      // 2. If no scene, convert schema and save
      try {
        setIsConverting(true);
        const mainSchema = projectData.schemas[0];
        const schemaWithSegments = {
          ...mainSchema,
          segments: projectData.segments,
        };
        console.log({ schemaWithSegments });

        let exportedSchema: Design;
        if (mainSchema?.type === "ugc-video-ad" || mainSchema?.type === "character-driven-ad") {
          console.log("Using UGC schema converter");
          exportedSchema = await convertUgcSchemaToDesign(schemaWithSegments);
        } else {
          console.log("Using standard schema converter");
          exportedSchema = await convertSchemaToDesign(schemaWithSegments);
        }

        console.log({ exportedSchema, projectData });
        setDesign(exportedSchema);

        // Save the generated scene
        await fetch("/api/scenes", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            schemaId,
            projectId: projectData.project.id,
            sceneData: exportedSchema,
          }),
        });

        setIsConverting(false);
      } catch (err) {
        console.error("Conversion or save failed:", err);
        setIsConverting(false);
      }
    };

    convertAndSave();
  }, [projectData, schemaId]);

  useEffect(() => {
    fetchProject();
  }, [schemaId]);

  if (loading || isConverting) {
    return <div className="flex h-screen items-center justify-center">Loading project...</div>;
  }

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center text-red-500">Error: {error}</div>
    );
  }

  return (
    <Editor
      design={design}
      schemaId={schemaId}
      projectId={projectData?.project?.id}
      projectName={projectData?.project?.name}
      isOwner={isOwner}
    />
  );
}
