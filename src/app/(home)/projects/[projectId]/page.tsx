"use client";
import * as Sentry from "@sentry/nextjs";
import { usePostHog } from "posthog-js/react";

import { use, useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import Editor from "@/components/editor/editor";
import { Project as UIProject } from "@/hooks/use-projects";
import { Asset, DbSegment, VideoSchemaDb, Project as DbProject } from "@/lib/database";
import { convertSchemaToDesign } from "@/utils/schema-converter";
import { Design } from "@/types/editor";
import { QuickPreview } from "@/components/quick-preview";

interface ProjectData {
  project: UIProject;
  assets: Asset[];
  segments: DbSegment[];
  schemas: VideoSchemaDb[];
}

const fetchProject = async (projectId: string): Promise<ProjectData> => {
  const response = await fetch(`/api/projects/${projectId}`);
  if (!response.ok) {
    throw new Error("Failed to fetch project data");
  }
  const data = await response.json();

  // Transform db project to UI project (camelCase)
  const dbProject: DbProject = data.project;
  const transformedProject: UIProject = {
    ...dbProject,
    generationId: dbProject.generation_id,
    sceneId: dbProject.scene_id,
    folderId: dbProject.folder_id,
    createdAt: new Date(dbProject.created_at),
    updatedAt: new Date(dbProject.updated_at),
  };

  return {
    ...data,
    project: transformedProject,
  };
};

export default function Page({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = use(params);
  const [isConverting, setIsConverting] = useState(false);
  const [design, setDesign] = useState<Design | null>(null);
  const posthog = usePostHog();

  useEffect(() => {
    Sentry.setTag("page_name", "project-view");
    posthog.capture("project_details_viewed", { projectId });
  }, [projectId, posthog]);
  const {
    data: projectData,
    isLoading: loading,
    error,
  } = useQuery({
    queryKey: ["project", projectId],
    queryFn: () => fetchProject(projectId),
    enabled: !!projectId,
  });

  useEffect(() => {
    if (projectData?.project?.type === "script-to-video") {
      const convertAndSave = async () => {
        try {
          setIsConverting(true);
          const schemaWithSegments = {
            ...projectData.schemas[0],
            segments: projectData.segments,
          };
          const exportedSchema = await convertSchemaToDesign(schemaWithSegments);

          localStorage.setItem("project", JSON.stringify(exportedSchema));
          setDesign(exportedSchema);
          setIsConverting(false);
        } catch (err) {
          console.error("Conversion failed:", err);
          setIsConverting(false);
        }
      };

      convertAndSave();
    }
  }, [projectData]);

  if (loading || !projectData || isConverting) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center text-red-500">
        Error: {(error as Error).message}
      </div>
    );
  }

  if (projectData?.project?.type === "script-to-video" && isConverting) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Converting schema...</span>
      </div>
    );
  }

  if (projectData?.project?.type === "ai-editor") {
    return <Editor design={null} />;
  }

  if (projectData?.project?.type === "script-to-video") {
    return (
      <QuickPreview
        design={design}
        title={projectData.project.name}
        schemaId={projectData.schemas[0].id}
      />
    );
  }

  return <div>Project {projectId}</div>;
}
