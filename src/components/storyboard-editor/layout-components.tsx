import React from "react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Image as ImageIcon,
  Film,
  SlidersHorizontal,
  Wand2,
  ArrowRight,
  Upload,
  Loader2,
  Check,
} from "lucide-react";
import type { Segment } from "@/lib/schema-generator/types";
import type { GeneratedFrame } from "@/stores/schema-store";

// --- Left Panel: Segments List ---
interface SegmentsSidebarProps {
  segments: Segment[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  frames?: Record<string, GeneratedFrame>;
  videos?: Record<string, { url: string }>;
}

export const SegmentsSidebar = ({
  segments,
  selectedId,
  onSelect,
  frames = {},
  videos = {},
}: SegmentsSidebarProps) => {
  return (
    <div className="flex flex-col h-full border-r border-zinc-900 bg-zinc-950 w-60">
      <div className="p-4 border-b border-zinc-900 flex items-center justify-between">
        <h3 className="font-semibold text-sm text-zinc-300">Storyboard</h3>
        <span className="text-xs text-zinc-500">{segments.length} scenes</span>
      </div>
      <ScrollArea className="flex-1">
        <div className="flex flex-col gap-2 p-3">
          {segments.map((seg, index) => {
            const isSelected = selectedId === seg.id;
            const frame = frames[seg.id];

            return (
              <div
                key={seg.id}
                onClick={() => onSelect(seg.id)}
                className={cn(
                  "relative group cursor-pointer rounded-lg border p-2 text-left transition-all",
                  isSelected
                    ? "bg-zinc-900 border-primary/50 ring-1 ring-primary/20"
                    : "border-zinc-900 bg-zinc-900/30 hover:bg-zinc-900/50",
                )}
              >
                <div className="absolute top-2 left-2 z-10 bg-zinc-950/80 backdrop-blur-xs px-1.5 py-0.5 rounded text-[10px] font-mono border border-zinc-800 text-zinc-400">
                  {index + 1 < 10 ? `0${index + 1}` : index + 1}
                </div>

                {/* Thumbnail / Placeholder */}
                <div className="aspect-9/16 w-full bg-zinc-900 rounded-md mb-2 overflow-hidden flex items-center justify-center border border-zinc-800 relative">
                  {videos[seg.id]?.url ? (
                    <>
                      <video src={videos[seg.id].url} className="w-full h-full object-cover" />
                      <div className="absolute top-1 right-1 bg-primary/80 backdrop-blur-xs p-1 rounded-full shadow-lg">
                        <Film className="w-2.5 h-2.5 text-primary-foreground" />
                      </div>
                    </>
                  ) : frame?.url ? (
                    <img src={frame.url} alt="Frame" className="w-full h-full object-cover" />
                  ) : (
                    <ImageIcon className="w-6 h-6 text-zinc-800" />
                  )}
                </div>

                <div className="space-y-1">
                  <p className="text-xs font-medium truncate text-zinc-300">
                    {seg.text || "No narration"}
                  </p>
                  <p className="text-[10px] text-zinc-500 truncate">
                    {seg.description || "No visual prompt"}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
};

// --- Center Panel: Preview ---
interface PreviewPanelProps {
  selectedSegment: Segment | undefined;
  frame?: GeneratedFrame;
  video?: { url: string };
}

export const PreviewPanel = ({ selectedSegment, frame, video }: PreviewPanelProps) => {
  if (!selectedSegment) {
    return (
      <div className="flex-1 flex items-center justify-center text-zinc-600 bg-zinc-950 h-full">
        Select a scene to preview
      </div>
    );
  }

  return (
    <div className="flex-1 bg-zinc-950 relative flex flex-col items-center justify-center p-8 h-full overflow-hidden">
      {/* Canvas Container */}
      <div className="relative h-full aspect-9/16 max-h-full shadow-2xl rounded-lg border border-zinc-900 bg-black overflow-hidden group">
        {video?.url ? (
          <video
            src={video.url}
            className="w-full h-full object-cover"
            controls
            autoPlay
            loop
            playsInline
          />
        ) : frame?.url ? (
          <img src={frame.url} className="w-full h-full object-cover" alt="Preview" />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-4 bg-zinc-900">
            <Film className="w-12 h-12 text-zinc-800" />
            <p className="text-zinc-600 text-sm">No frame/video generated</p>
          </div>
        )}
      </div>
    </div>
  );
};

// --- Right Panel: Properties ---
interface SegmentPropertiesProps {
  segment: Segment | undefined;
  onChange: (updates: Partial<Segment>) => void;
  onGenerateFrame?: () => void;
  onGenerateVideo?: () => void;
  isGeneratingFrame?: boolean;
  isGeneratingVideo?: boolean;
}

export const SegmentProperties = ({
  segment,
  onChange,
  onGenerateFrame,
  onGenerateVideo,
  isGeneratingFrame,
  isGeneratingVideo,
}: SegmentPropertiesProps) => {
  if (!segment)
    return (
      <div className="w-[320px] border-l border-zinc-900 bg-zinc-950 p-6 text-sm text-zinc-500">
        No segment selected
      </div>
    );

  return (
    <div className="w-[320px] border-l bg-card flex flex-col h-full">
      <div className="p-4 border-b border-zinc-900">
        <h3 className="font-semibold text-sm flex items-center gap-2 text-zinc-300">Properties</h3>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          {/* Visual Prompts */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-[10px] font-bold uppercase tracking-widest text-zinc-600">
                Visual Prompts
              </Label>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-zinc-500 hover:text-zinc-300"
              >
                <Wand2 className="w-3 h-3" />
              </Button>
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <Label className="text-[9px] text-zinc-500 uppercase">Initial Frame (Static)</Label>
                <Textarea
                  value={segment.shots?.[0]?.firstFrame || segment.description}
                  onChange={(e) => {
                    const shots = [...(segment.shots || [])];
                    if (shots[0]) shots[0].firstFrame = e.target.value;
                    onChange({ shots, description: e.target.value });
                  }}
                  className="min-h-20 text-[11px] resize-none font-sans text-zinc-400 bg-zinc-900/50 border-zinc-800 focus:border-zinc-700 p-2"
                  placeholder="Describe the starting image..."
                />
              </div>

              <div className="space-y-1">
                <Label className="text-[9px] text-zinc-500 uppercase">
                  Video Action (Movement)
                </Label>
                <Textarea
                  value={segment.shots?.[0]?.videoPrompt || ""}
                  onChange={(e) => {
                    const shots = [...(segment.shots || [])];
                    if (shots[0]) shots[0].videoPrompt = e.target.value;
                    onChange({ shots });
                  }}
                  className="min-h-20 text-[11px] resize-none font-sans text-zinc-400 bg-zinc-900/50 border-zinc-800 focus:border-zinc-700 p-2"
                  placeholder="Describe the movement and action..."
                />
              </div>

              <div className="space-y-1">
                <Label className="text-[9px] text-zinc-500 uppercase">Scene Aesthetic (Mood)</Label>
                <Textarea
                  value={segment.shots?.[0]?.scenePrompt || ""}
                  onChange={(e) => {
                    const shots = [...(segment.shots || [])];
                    if (shots[0]) shots[0].scenePrompt = e.target.value;
                    onChange({ shots });
                  }}
                  className="min-h-15 text-[11px] resize-none font-sans text-zinc-400 bg-zinc-900/50 border-zinc-800 focus:border-zinc-700 p-2"
                  placeholder="Describe the environment and lighting..."
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-4 space-y-3">
            <Button
              onClick={onGenerateFrame}
              className="w-full gap-2 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground"
              size="sm"
              disabled={isGeneratingFrame}
            >
              <ImageIcon className="w-3.5 h-3.5" />
              {isGeneratingFrame ? "Generating Frame..." : "Generate Frame"}
            </Button>

            <Button
              onClick={onGenerateVideo}
              variant="secondary"
              className="w-full gap-2 rounded-full border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-300"
              size="sm"
              disabled={isGeneratingVideo}
            >
              <Film className="w-3.5 h-3.5" />
              {isGeneratingVideo ? "Generating Video..." : "Generate Final Video"}
            </Button>

            <p className="text-[10px] text-center text-zinc-500 italic px-4">
              First generate the frame to lock in the visual style, then generate the final video.
            </p>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
};

// --- Bottom Panel: Generations ---
interface GenerationsPanelProps {
  segmentId: string | null;
  currentFrameUrl?: string;
  onSelectFrame: (url: string) => void;
}

export const GenerationsPanel = ({
  segmentId,
  currentFrameUrl,
  onSelectFrame,
}: GenerationsPanelProps) => {
  const [generations, setGenerations] = React.useState<any[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);

  React.useEffect(() => {
    if (!segmentId) {
      setGenerations([]);
      return;
    }

    const fetchGenerations = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/ugc/generations?segmentId=${segmentId}`);
        if (response.ok) {
          const data = await response.json();
          setGenerations(data.generations || []);
        }
      } catch (error) {
        console.error("Error fetching generations:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchGenerations();
  }, [segmentId]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Placeholder: In a real app, you'd upload to R2 here
      console.log("File upload triggered:", file.name);
      // alert('Upload logic to be implemented');
    }
  };

  return (
    <div className="h-48 border-t bg-card flex flex-col">
      <div className="px-4 py-2 border-b flex items-center justify-between flex-none">
        <div className="flex items-center gap-4">
          <h4 className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
            Generation History
          </h4>
          {isLoading && <Loader2 className="w-3 h-3 animate-spin text-zinc-500" />}
        </div>
        <div className="flex items-center gap-2">
          <input
            type="file"
            id="custom-image-upload"
            className="hidden"
            accept="image/*"
            onChange={handleFileUpload}
          />
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-[10px] text-zinc-400 hover:text-zinc-200 gap-1.5"
            onClick={() => document.getElementById("custom-image-upload")?.click()}
          >
            <Upload className="w-3 h-3" />
            Upload Custom
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="flex items-center gap-3 p-4 h-full min-w-full">
          {/* Upload Placeholder Card */}
          <button
            onClick={() => document.getElementById("custom-image-upload")?.click()}
            className="flex-none w-24 aspect-9/16 rounded-md border border-dashed border-zinc-800 bg-zinc-900/30 hover:bg-zinc-900/50 transition-colors flex flex-col items-center justify-center gap-2 group"
          >
            <Upload className="w-4 h-4 text-zinc-700 group-hover:text-zinc-500 transition-colors" />
            <span className="text-[10px] text-zinc-700 group-hover:text-zinc-500 font-medium">
              Upload
            </span>
          </button>

          {generations.length === 0 && !isLoading && (
            <div className="flex-1 flex items-center justify-center text-[10px] text-zinc-600 italic">
              No generations found for this segment
            </div>
          )}

          {generations.map((gen) => {
            const url = gen.output?.url || gen.preview_url;
            const isSelected = currentFrameUrl === url;

            return (
              <div
                key={gen.id}
                onClick={() => url && onSelectFrame(url)}
                className={cn(
                  "flex-none w-24 aspect-9/16 rounded-md border bg-zinc-900 overflow-hidden cursor-pointer transition-all relative group",
                  isSelected
                    ? "border-primary ring-1 ring-primary/30"
                    : "border-zinc-800 hover:border-zinc-700",
                )}
              >
                {url ? (
                  <img src={url} alt="Generation" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <ImageIcon className="w-4 h-4 text-zinc-800" />
                  </div>
                )}

                {isSelected && (
                  <div className="absolute top-1 right-1 bg-primary text-primary-foreground rounded-full p-0.5 shadow-lg">
                    <Check className="w-2.5 h-2.5" />
                  </div>
                )}

                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <span className="text-[8px] text-white font-bold uppercase tracking-wider">
                    Select
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
};

function Separator() {
  return <div className="h-px bg-zinc-900 my-4" />;
}
