"use client";

import { useStoryboardEditor } from "@/hooks/use-storyboard-editor";

import { Storyboard } from "./storyboard";
import { VideoPlayerColumn } from "./preview-columns";
import { useUGCGeneration } from "@/hooks/use-ugc-generation";
import { Segment } from "@/lib/schema-generator/types";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";

export function StoryboardEditor({
  isGenerating: isPageGenerating = false,
}: {
  isGenerating?: boolean;
}) {
  const {
    schema,
    frames,
    videos,
    selectedSegmentId,
    selectedSegment,
    selectedFrame,
    selectedVideo,
    handleSelectSegment,
    handleDeleteSegment,
    handleDeleteAsset,
    updateFrame,
    updateVideo,
  } = useStoryboardEditor();

  const {
    handleGenerateFrame,
    handleGenerateVideo,
    handleTranscribeVideo,
    generatingFrames,
    generatingVideos,
  } = useUGCGeneration();

  return (
    <div className="flex w-full overflow-hidden h-full min-h-0 bg-background">
      <ResizablePanelGroup direction="horizontal" className="h-full w-full gap-0">
        {/* Left Panel: Storyboard */}
        <ResizablePanel
          defaultSize={30}
          minSize={20}
          maxSize={45}
          className="relative overflow-hidden bg-card min-w-0 flex flex-col"
        >
          <Storyboard
            segments={(schema?.segments || []) as Segment[]}
            selectedId={selectedSegmentId}
            onSelect={handleSelectSegment}
            onDelete={handleDeleteSegment}
            onTranscribe={handleTranscribeVideo}
            frames={frames}
            videos={videos}
            generatingFrames={generatingFrames}
          />
        </ResizablePanel>

        <ResizableHandle className="bg-border/90" />

        {/* Right Side: Video Player Column */}
        <ResizablePanel defaultSize={70} minSize={40} className="min-w-0 min-h-0">
          <div className="flex-1 h-full flex overflow-hidden">
            <VideoPlayerColumn
              schema={schema}
              selectedSegment={selectedSegment as any}
              selectedVideo={selectedVideo}
              onSelectAsset={(asset) =>
                selectedSegmentId &&
                asset.url &&
                updateVideo(selectedSegmentId, {
                  segmentId: selectedSegmentId,
                  url: asset.url,
                  prompt: asset.prompt ?? "",
                })
              }
              onDeleteAsset={handleDeleteAsset}
              isGenerating={
                isPageGenerating ||
                generatingVideos[selectedSegmentId || ""] ||
                generatingFrames[selectedSegmentId || ""]
              }
            />
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
