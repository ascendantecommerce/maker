"use client";

import { useEffect } from "react";
import { Assistant } from "./assistant";
import { MediaWorkspace } from "./media-workspace";

import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { Project } from "@/hooks/use-projects";
import { Asset } from "@/lib/database";

export default function AiCopilot({ project, assets }: { project: Project; assets: Asset[] }) {
  // Get the first video asset if available
  const firstVideoAsset = assets.find((asset) => asset.asset_type === "video");

  return (
    <main className="flex h-full w-full overflow-hidden">
      <ResizablePanelGroup direction="horizontal">
        <ResizablePanel className="min-w-[500px]" defaultSize={30} minSize={30}>
          <Assistant
            projectId={project.id}
            videoId={firstVideoAsset?.id}
            videoUrl={firstVideoAsset?.public_url}
            projectName={project.name}
          />
        </ResizablePanel>
        <ResizableHandle className="bg-transparent" />
        <ResizablePanel defaultSize={70} className="flex">
          <MediaWorkspace
            projectId={project.id}
            videoId={firstVideoAsset?.id || ""}
            videoUrl={firstVideoAsset?.public_url || ""}
            projectName={project.name}
            onUploadComplete={() => {
              // router.refresh();
              // fetchProject();
            }}
          />
        </ResizablePanel>
      </ResizablePanelGroup>
    </main>
  );
}
