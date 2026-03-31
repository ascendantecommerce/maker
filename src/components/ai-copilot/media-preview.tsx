import { useEffect, useState } from "react";
import { Segment } from "./store";
import { Studio } from "openvideo";
import { convertSegmentToProject } from "./clip";
import { useRef } from "react";
import { Button } from "../ui/button";
import { Loader2Icon, PauseIcon, PlayIcon } from "lucide-react";
import { IconPlayerSkipBack, IconPlayerSkipForward } from "@tabler/icons-react";

export function MediaPreview({ segment }: { segment: Segment }) {
  const studioRef = useRef<Studio | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  useEffect(() => {
    const studio = new Studio({
      width: 1080,
      height: 1920,
      canvas: document.getElementById("studio-container") as HTMLCanvasElement,
      bgColor: "#1C161D",
      spacing: 20,
    });
    studioRef.current = studio;
    const initStudio = async () => {
      if (!segment) return;
      try {
        const project = await convertSegmentToProject(segment);
        localStorage.setItem("project", JSON.stringify(project));
        if (project && studio) {
          await studio.loadFromJSON(project);
          setIsLoading(false);
        }
      } catch (error) {
        console.error("Failed to load segment in studio", error);
      }
    };

    initStudio();

    return () => {
      studio.destroy();
    };
  }, [segment]);

  const handlePlay = async () => {
    if (studioRef.current) {
      await studioRef.current.play();
      setIsPlaying(true);
    }
  };

  const handlePause = async () => {
    if (studioRef.current) {
      await studioRef.current.pause();
      setIsPlaying(false);
    }
  };
  const handleReset = async () => {
    if (studioRef.current) {
      await studioRef.current.seek(0);
      setIsPlaying(false);
    }
  };
  return (
    <div className="h-full w-full flex flex-col relative">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#1c1917]">
          <Loader2Icon className="w-5 h-5 animate-spin" />
        </div>
      )}
      <div className="flex-1 flex items-center justify-center bg-[#1c1917]">
        <canvas id="studio-container" className="max-h-full max-w-full object-contain shadow-2xl" />
      </div>
      <div className="h-14 bg-[#161412] items-center justify-center flex px-4">
        <Button onClick={handleReset} variant="ghost" size="icon">
          <IconPlayerSkipBack />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          onClick={isPlaying ? handlePause : handlePlay}
          className="hover:bg-primary/10 hover:text-foreground transition-colors"
          aria-label={isPlaying ? "Pause" : "Play"}
        >
          {isPlaying ? <PauseIcon className="h-6 w-6" /> : <PlayIcon className="h-6 w-6 ml-0.5" />}
        </Button>
        <Button onClick={handleReset} variant="ghost" size="icon">
          <IconPlayerSkipForward />
        </Button>
      </div>
    </div>
  );
}
