"use client";
import * as Sentry from "@sentry/nextjs";
import { usePostHog } from "posthog-js/react";
import { useState, useEffect } from "react";
import { MediaPanel } from "@/components/editor/media-panel";
import { CanvasPanel } from "@/components/editor/canvas-panel";
import { Timeline } from "@/components/editor/timeline";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { usePanelStore } from "@/stores/panel-store";
import Header from "@/components/editor/header";
import { Loading } from "@/components/editor/loading";
import FloatingControl from "@/components/editor/floating-controls/floating-control";
import { Compositor } from "openvideo";
import { WebCodecsUnsupportedModal } from "@/components/editor/webcodecs-unsupported-modal";
import { Design } from "@/types/editor";
import { useStudioStore } from "@/stores/studio-store";
import { debounce } from "lodash";
import { RightPanel } from "@/components/editor/right-panel";
// import template from './template.json';
export default function Editor({
  design,
  schemaId,
  projectId,
  projectName,
  isOwner = true,
}: {
  design: Design | null;
  schemaId?: string;
  projectId?: string;
  projectName?: string;
  isOwner?: boolean;
}) {
  const {
    toolsPanel,
    propertiesPanel,
    mainContent,
    timeline,
    setToolsPanel,
    setPropertiesPanel,
    setMainContent,
    setTimeline,
  } = usePanelStore();

  const { studio, selectedClips, setSelectedClips } = useStudioStore();

  useEffect(() => {
    if (!studio) return;

    const handleSelection = (data: any) => {
      setSelectedClips(data.selected);
    };

    const handleClear = () => {
      setSelectedClips([]);
    };

    studio.on("selection:created", handleSelection);
    studio.on("selection:updated", handleSelection);
    studio.on("selection:cleared", handleClear);

    return () => {
      studio.off("selection:created", handleSelection);
      studio.off("selection:updated", handleSelection);
      studio.off("selection:cleared", handleClear);
    };
  }, [studio, setSelectedClips]);
  const [isReady, setIsReady] = useState(false);
  const [isWebCodecsSupported, setIsWebCodecsSupported] = useState(true);
  const posthog = usePostHog();

  // Sentry and PostHog tracking for Editor mount
  useEffect(() => {
    Sentry.addBreadcrumb({
      category: "editor",
      message: "Editor component mounted",
      level: "info",
    });
    posthog.capture("editor_viewed", { schemaId, projectId });
  }, [posthog, schemaId, projectId]);

  // Check WebCodecs support on mount
  useEffect(() => {
    const checkSupport = async () => {
      const isSupported = await Compositor.isSupported();
      setIsWebCodecsSupported(isSupported);
    };
    checkSupport();
  }, []);
  // useEffect(() => {
  //   if (!studio) return;
  //   studio.loadFromJSON(template as any);
  // }, [studio]);

  useEffect(() => {
    if (!studio || !design || !isReady) return;
    try {
      console.log("design", design);
      studio.loadFromJSON(design);
    } catch (error) {
      console.error("Failed to load design:", error);
    }
  }, [design, studio, isReady]);

  useEffect(() => {
    if (!studio || !schemaId || !projectId || !isOwner) return;
    console.log(studio);
    const saveScene = debounce(async () => {
      try {
        // const json = studio.exportToJSON();
        // await fetch("/api/scenes", {
        //   method: "POST",
        //   headers: {
        //     "Content-Type": "application/json",
        //   },
        //   body: JSON.stringify({
        //     schemaId,
        //     projectId,
        //     sceneData: json,
        //   }),
        // });
        // console.log("Scene saved automatically");
        console.log("save disabled")
      } catch (error) {
        console.error("Failed to auto-save scene:", error);
      }
    }, 1000); // Debounce for 1 second

    // Listen to changes that should trigger a save
    const eventsToListen = [
      "history:changed",
      "clip:added",
      "clip:removed",
      "clip:updated",
      "clip:moved",
      "track:added",
      "track:removed",
      "clips:removed",
      "clip:replaced",
      "clip:propsChange",
      "propsChange",
    ];

    eventsToListen.forEach((event) => {
      studio.on(event, saveScene);
    });

    return () => {
      saveScene.cancel();
      eventsToListen.forEach((event) => {
        studio.off(event, saveScene);
      });
    };
  }, [studio, schemaId, projectId, isOwner]);

  return (
    <div className="h-screen w-screen flex flex-col bg-background overflow-hidden">
      {!isReady && (
        <div className="absolute inset-0 z-50">
          <Loading />
        </div>
      )}
      <Header projectId={projectId} projectName={projectName} isOwner={isOwner} />
      {/* {!isOwner && (
        <div className="flex-none border-b border-amber-500/30 bg-amber-500/10 px-4 py-2 flex items-center gap-2 text-amber-400 text-xs font-medium">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
          You&apos;re editing a shared project — changes are not saved to the database.
        </div>
      )} */}
      <div className="flex-1 min-h-0 min-w-0  bg-[#09090B]">
        <ResizablePanelGroup direction="vertical" className="h-full w-full gap-0">
          {/* Top Row: Workspace (Panels | Canvas | Properties) */}
          <ResizablePanel
            defaultSize={mainContent}
            minSize={30}
            maxSize={85}
            onResize={setMainContent}
            className="min-h-0 flex-1 p-1 pb-0 pt-0"
          >
            <ResizablePanelGroup direction="horizontal" className="h-full w-full gap-0">
              {/* Left Column: Media Panel */}
              <ResizablePanel
                defaultSize={toolsPanel}
                minSize={15}
                maxSize={40}
                onResize={setToolsPanel}
                className="max-w-7xl relative overflow-visible! min-w-0"
              >
                <MediaPanel />
              </ResizablePanel>

              <ResizableHandle className="bg-border" />

              {/* Middle Column: Canvas Panel */}
              <ResizablePanel
                defaultSize={100 - toolsPanel - propertiesPanel}
                minSize={30}
                className="min-w-0 min-h-0"
              >
                <CanvasPanel
                  onReady={() => {
                    setIsReady(true);
                  }}
                />
              </ResizablePanel>

              <ResizableHandle className="bg-border" />

              {/* Right Column: Properties Panel */}
              <ResizablePanel
                defaultSize={propertiesPanel}
                minSize={15}
                maxSize={40}
                onResize={setPropertiesPanel}
                className="max-w-7xl relative overflow-visible! min-w-0"
              >
                <RightPanel selectedClips={selectedClips} />
                <FloatingControl />
              </ResizablePanel>
            </ResizablePanelGroup>
          </ResizablePanel>

          <ResizableHandle className="h-1 bg-border z-10 w-full" />

          {/* Bottom Row: Timeline Panel */}
          <ResizablePanel
            defaultSize={timeline}
            minSize={15}
            maxSize={70}
            onResize={setTimeline}
            className="min-h-0 relative z-0"
          >
            <div className="h-full w-full bg-card rounded-xl border border-border/50 shadow-sm overflow-hidden">
              <Timeline />
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>

      {/* WebCodecs Support Check Modal */}
      <WebCodecsUnsupportedModal open={!isWebCodecsSupported} />
    </div>
  );
}
