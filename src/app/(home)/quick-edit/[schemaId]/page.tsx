"use client";
import * as Sentry from "@sentry/nextjs";
import { usePostHog } from "posthog-js/react";

import { use, useState, useEffect } from "react";
import { Loader2Icon } from "lucide-react";
import Editor from "@/components/editor/editor";
import { Project as UIProject } from "@/hooks/use-projects";
import { Asset, DbSegment, VideoSchemaDb, Project as DbProject, Scene } from "@/lib/database";
import { convertSchemaToDesign } from "@/utils/schema-converter";
import { convertUgcSchemaToDesign } from "@/utils/ugc-schema-converter";
import { QuickPreview } from "@/components/quick-preview";
import { Design } from "@/types/editor";

interface ProjectData {
  project: UIProject;
  assets: Asset[];
  segments: DbSegment[];
  schemas: VideoSchemaDb[];
  scene: Scene | null;
}

export default function Page({ params }: { params: Promise<{ schemaId: string }> }) {
  const { schemaId } = use(params);
  const [projectData, setProjectData] = useState<ProjectData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isConverting, setIsConverting] = useState(false);
  const [design, setDesign] = useState<Design | null>(null);
  const posthog = usePostHog();

  useEffect(() => {
    Sentry.setTag("page_name", "quick-edit-view");
    posthog.capture("quick_edit_started", { schemaId });
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
      console.log("Project data fetched:", data);
      setProjectData(data);
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

      try {
        setIsConverting(true);
        const mainSchema = projectData.schemas[0];
        const schemaWithSegments = {
          ...mainSchema,
          segments: projectData.segments,
        };
        console.log("Converting schema:", schemaWithSegments);

        let exportedSchema: Design;
        if (mainSchema?.type === "ugc-video-ad") {
          console.log("Using UGC schema converter");
          exportedSchema = await convertUgcSchemaToDesign(schemaWithSegments);
        } else {
          console.log("Using standard schema converter");
          exportedSchema = await convertSchemaToDesign(schemaWithSegments);
        }

        console.log("Converted design:", exportedSchema);
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
    return (
      <div className="absolute inset-0 flex items-center flex-col justify-center bg-card w-full h-full gap-4 z-10">
        <Loader2Icon className="w-4 h-4 animate-spin" />
        <span className="text-muted-foreground text-sm">
          {loading ? "Loading project..." : "Converting schema..."}
        </span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center text-red-500">Error: {error}</div>
    );
  }

  if (!projectData) return null;

  if (projectData.project?.type === "ai-editor") {
    return <Editor design={null} />;
  }

  // All other types use QuickPreview
  return <QuickPreview design={design} title={projectData.project.name} schemaId={schemaId} />;
}
