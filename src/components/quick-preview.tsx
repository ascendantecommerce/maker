import { useEffect, useState } from "react";
import { Studio } from "openvideo";
import { useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  DownloadIcon,
  EllipsisIcon,
  Loader2Icon,
  PauseIcon,
  PencilIcon,
  PenIcon,
  PlayIcon,
  Trash2Icon,
} from "lucide-react";
import { IconPlayerSkipBack, IconPlayerSkipForward } from "@tabler/icons-react";
import { Design } from "@/types/editor";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { useRouter } from "next/navigation";

export function QuickPreview({
  design,
  title,
  schemaId,
}: {
  design: Design | null;
  title?: string;
  schemaId: string;
}) {
  const studioRef = useRef<Studio | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    console.log("INITIALIZING");
    const studio = new Studio({
      width: 1080,
      height: 1920,
      canvas: document.getElementById("studio-container") as HTMLCanvasElement,
      bgColor: "#1C161D",
      spacing: 20,
    });
    studioRef.current = studio;
    // const initStudio = async () => {
    //     if (!design) return;
    //     try {
    //         await studio.loadFromJSON(design);
    //         setIsLoading(false);
    //     } catch (error) {
    //         console.error('Failed to load segment in studio', error);
    //     }
    // };

    // initStudio();

    return () => {
      studio.destroy();
    };
  }, [design]);

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

  const loadDesign = async () => {
    if (design && studioRef.current) {
      await studioRef.current.loadFromJSON(design);
      setIsLoading(false);
    }
  };

  const handleEditMore = () => {
    router.push(`/edit/${schemaId}`);
  };

  useEffect(() => {
    console.log("UPDATING DESIGN", { design, studioRef });
    loadDesign();
  }, [design, studioRef]);
  return (
    <div className="h-full w-full flex flex-col relative">
      <div className="h-14 shrink-0 flex items-center justify-between px-6 bg-card/80 backdrop-blur-3xl border-b">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/projects">Projects</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage className="font-bold">{title || "Project name"}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleEditMore}>
            Edit more
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size={"icon"} variant={"outline"} className="size-8">
                <EllipsisIcon className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem className="cursor-pointer">
                <PencilIcon className="mr-2 h-4 w-4" />
                <span>Rename Project</span>
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer">
                <PenIcon className="mr-2 h-4 w-4" />
                <span>Edit Project</span>
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer">
                <DownloadIcon className="mr-2 h-4 w-4" />
                <span>Export Clips</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="cursor-pointer text-destructive focus:text-destructive">
                <Trash2Icon className="mr-2 h-4 w-4" />
                <span>Delete Project</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {isLoading && (
        <div className="absolute inset-0 flex items-center flex-col justify-center bg-card w-full h-full gap-4 z-10">
          <Loader2Icon className="w-4 h-4 animate-spin" />
          <span className="text-muted-foreground text-sm">Loading scene...</span>
        </div>
      )}
      <div className="flex-1 flex items-center justify-center bg-[#1c1917]">
        <canvas id="studio-container" className="max-h-full max-w-full object-contain shadow-2xl" />
      </div>
      <div className="h-14 bg-[#161412] items-center justify-center flex px-4">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={handleReset} disabled={isLoading}>
            <IconPlayerSkipBack className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={isPlaying ? handlePause : handlePlay}
            disabled={isLoading}
          >
            {isPlaying ? <PauseIcon className="h-4 w-4" /> : <PlayIcon className="h-4 w-4" />}
          </Button>
          <Button variant="ghost" size="icon" onClick={handleReset} disabled={isLoading}>
            <IconPlayerSkipForward className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
