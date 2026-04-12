import { IClip } from "openvideo";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Sparkles, Image as ImageIcon, Eraser, Video } from "lucide-react";

export function AIToolsPanel({ selectedClips }: { selectedClips: IClip[] }) {
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

  const clip = selectedClips[0];

  return (
    <ScrollArea className="h-full w-full">
      <div className="flex flex-col gap-4 p-4">
        <div className="text-sm font-medium flex items-center gap-2">
          <Sparkles className="size-4 text-purple-400" />
          AI Magic
        </div>
        
        {clip.type === "Text" && (
          <div className="space-y-2">
            <Button variant="secondary" className="w-full justify-start text-xs h-9">
              <Sparkles className="size-3.5 mr-2" /> Enhance Text
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
                <Button variant="secondary" className="w-full justify-start text-xs h-9">
                  <ImageIcon className="size-3.5 mr-2" /> Change Image
                </Button>
                <Button variant="secondary" className="w-full justify-start text-xs h-9">
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
