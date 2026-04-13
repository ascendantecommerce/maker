import { IClip } from "openvideo";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Image as ImageIcon, Eraser, Video, AlignLeft, RefreshCw, ChevronLeft } from "lucide-react";
import { useSchemaStore } from "@/stores/schema-store";
import { useState, useEffect } from "react";
import { Textarea } from "@/components/ui/textarea";

export function AIToolsPanel({ selectedClips }: { selectedClips: IClip[] }) {
  const schema = useSchemaStore((state) => state.schema);
  const updateSegment = useSchemaStore((state) => state.updateSegment);

  const [activeView, setActiveView] = useState<"root" | "image-to-video" | "change-image">("root");

  const [promptData, setPromptData] = useState({
    videoPrompt: "",
    firstFramePrompt: "",
  });

  const clip = selectedClips.length === 1 ? selectedClips[0] : null;
  const clipSrc = clip ? (clip as any).src : null;

  let segment: any = null;
  let shot: any = null;

  if (schema?.segments && clipSrc) {
    for (const seg of schema.segments) {
      const match = seg.shots?.find(
        (s: any) =>
          (s.imageUrl && clipSrc === s.imageUrl) ||
          (s.videoUrl && clipSrc === s.videoUrl) ||
          (s.firstFrame && clipSrc === s.firstFrame),
      );
      if (match) {
        segment = seg;
        shot = match;
        break;
      }
    }
  }

  useEffect(() => {
    setActiveView("root");
  }, [clip?.id]);

  useEffect(() => {
    console.log("Shot:", shot);
    if (shot) {
      setPromptData({
        videoPrompt: shot.videoPrompt || "",
        firstFramePrompt: shot.firstFramePrompt || "",
      });
    }
  }, [shot]);

  useEffect(() => {
    console.log("Prompt data:", { promptData, selectedClips });
  }, [promptData]);

  const handleGenerateVideo = () => {
    console.log("Generating video with prompt:", promptData.videoPrompt);
  };

  const handleGenerateImage = () => {
    console.log("Generating image with prompt:", promptData.firstFramePrompt);
  };

  // Save modifications to the store when inputs lose focus or change view
  const handleSavePrompts = () => {
    if (segment && shot) {
      const newShots = segment.shots.map((s: any) => {
        if (s === shot) {
          return {
            ...s,
            ...promptData,
          };
        }
        return s;
      });
      updateSegment(segment.id, { shots: newShots });
    }
  };

  const renderImageToVideoView = () => {
    return (
      <div className="flex flex-col gap-4 p-4">
        <div className="flex items-center gap-2 mb-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => {
              handleSavePrompts();
              setActiveView("root");
            }}
          >
            <ChevronLeft className="size-4" />
          </Button>
          <div className="text-sm font-medium flex items-center gap-1.5">Image to Video</div>
        </div>

        <div className="space-y-2">
          <div className="text-xs font-semibold text-muted-foreground">Video Generation Prompt</div>
          <Textarea
            className="text-xs min-h-[120px] resize-none"
            placeholder="Describe how the image should animate..."
            value={promptData.videoPrompt}
            onChange={(e) => setPromptData({ ...promptData, videoPrompt: e.target.value })}
            onBlur={handleSavePrompts}
          />
        </div>

        <div className="pt-2">
          <Button onClick={handleGenerateVideo} className="w-full rounded-full">
            <RefreshCw className="mr-1.5 size-3.5" /> Generate Video
          </Button>
        </div>
      </div>
    );
  };

  const renderChangeImageView = () => {
    return (
      <div className="flex flex-col gap-4 p-4">
        <div className="flex items-center gap-2 mb-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => {
              handleSavePrompts();
              setActiveView("root");
            }}
          >
            <ChevronLeft className="size-4" />
          </Button>
          <div className="text-sm font-medium flex items-center gap-1.5">Change Image</div>
        </div>

        <div className="space-y-2">
          <div className="text-xs font-semibold text-muted-foreground">Image Generation Prompt</div>
          <Textarea
            className="text-xs min-h-[120px] resize-none"
            placeholder="Describe the image you want to see..."
            value={promptData.firstFramePrompt}
            onChange={(e) => setPromptData({ ...promptData, firstFramePrompt: e.target.value })}
            onBlur={handleSavePrompts}
          />
        </div>

        <div className="pt-2">
          <Button onClick={handleGenerateImage} className="w-full rounded-full">
            <RefreshCw className="mr-1.5 size-3.5" /> Generate Image
          </Button>
        </div>
      </div>
    );
  };

  if (selectedClips.length === 0) {
    return (
      <div className="bg-card h-full p-4 flex flex-col items-center justify-center gap-3">
        <div className="text-sm text-muted-foreground">Select an element to use AI tools</div>
      </div>
    );
  }

  if (selectedClips.length > 1) {
    return (
      <div className="bg-card h-full p-4 flex flex-col items-center justify-center gap-3">
        <div className="text-sm text-muted-foreground">AI tools exist for single clips only</div>
      </div>
    );
  }

  if (!clip) return null;

  if (activeView === "image-to-video")
    return <ScrollArea className="h-full w-full">{renderImageToVideoView()}</ScrollArea>;
  if (activeView === "change-image")
    return <ScrollArea className="h-full w-full">{renderChangeImageView()}</ScrollArea>;

  return (
    <ScrollArea className="h-full w-full">
      <div className="flex flex-col gap-4 p-4">
        <div className="text-sm font-medium flex items-center gap-2">
          {/* <Sparkles className="size-4 text-purple-400" /> */}
          AI Tools
        </div>

        {clip.type === "Text" && (
          <div className="space-y-2">
            <Button variant="secondary" className="w-full justify-start text-xs h-9">
              <AlignLeft className="size-3.5 mr-2" /> Enhance Text
            </Button>
          </div>
        )}

        {(clip.type === "Image" || clip.type === "Video") && (
          <div className="space-y-2">
            <Button variant="secondary" className="w-full justify-start text-xs h-9">
              <Eraser className="size-3.5 mr-2" /> Remove Background
            </Button>
            {clip.type === "Image" && (
              <>
                <Button
                  variant="secondary"
                  className="w-full justify-start text-xs h-9"
                  onClick={() => setActiveView("change-image")}
                >
                  <ImageIcon className="size-3.5 mr-2" /> Change Image
                </Button>
                <Button
                  variant="secondary"
                  className="w-full justify-start text-xs h-9"
                  onClick={() => setActiveView("image-to-video")}
                >
                  <Video className="size-3.5 mr-2" /> Image to Video
                </Button>
              </>
            )}
          </div>
        )}
      </div>
    </ScrollArea>
  );
}
