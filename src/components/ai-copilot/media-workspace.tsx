"use client";

import { useRef, useState } from "react";
import {
  Loader2,
  AlertCircle,
  EllipsisIcon,
  Pencil,
  Trash2,
  Download,
  PenIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useVideoUpload } from "./use-video-upload";
import { cn } from "@/lib/utils";
import { useAiCopilotStore } from "./store";
import { motion, AnimatePresence } from "motion/react";
import { useRouter } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MediaPreview } from "./media-preview";

interface MediaWorkspaceProps {
  projectId: string;
  videoId?: string;
  videoUrl?: string;
  projectName: string;
  onUploadComplete: (videoId: string) => void;
}

export function MediaWorkspace({
  projectId,
  videoId,
  videoUrl,
  projectName,
  onUploadComplete,
}: MediaWorkspaceProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const router = useRouter();
  const { segments, isTrimming } = useAiCopilotStore();
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [selectedSegmentId, setSelectedSegmentId] = useState<string | null>(null);
  const selectedSegment = segments.find((c) => c.id === selectedSegmentId) || null;
  const { uploadFile, status, progress, statusMessage, error, isWorking, reset } = useVideoUpload({
    onSuccess: (data) => {
      onUploadComplete(data.videoId);
    },
  });

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadFile(file, projectId, projectName);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!isWorking) setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (isWorking) return;

    const file = e.dataTransfer.files?.[0];
    if (file) {
      uploadFile(file, projectId, projectName);
    }
  };

  const handleBackToGrid = () => {
    setSelectedSegmentId(null);
  };

  const handleDeleteProject = async () => {
    if (!confirm("Are you sure you want to delete this project?")) return;

    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        router.push("/");
        router.refresh();
      }
    } catch (error) {
      console.error("Failed to delete project:", error);
    }
  };
  const handleEditMore = () => {
    if (selectedSegment && selectedSegment.schema_id) {
      router.push(`/edit/${selectedSegment.schema_id}`);
    } else {
      console.error("No schema ID found for selected segment");
    }
  };

  // 1. Progress State
  if (isWorking || status === "error") {
    // ... (rest of progress state remains similar, but header might need update)
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-background text-muted-foreground p-8 text-center space-y-8 relative overflow-hidden">
        {/* Progress content */}
        <div className="relative w-32 h-32 flex items-center justify-center text-primary">
          <svg className="w-full h-full transform -rotate-90">
            <circle
              cx="64"
              cy="64"
              r="60"
              stroke="currentColor"
              strokeWidth="4"
              fill="transparent"
              className="text-muted"
            />
            <circle
              cx="64"
              cy="64"
              r="60"
              stroke="currentColor"
              strokeWidth="4"
              fill="transparent"
              strokeDasharray={377}
              strokeDashoffset={377 - (377 * progress) / 100}
              className={cn(
                "transition-all duration-500 ease-out",
                status === "error" ? "text-destructive" : "text-primary",
              )}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
            {status === "error" ? (
              <AlertCircle className="size-10 text-destructive" />
            ) : (
              <span className="text-2xl font-bold text-foreground">{progress}%</span>
            )}
          </div>
        </div>

        <div className="space-y-3 z-10 max-w-sm">
          <h3
            className={cn(
              "text-xl font-bold tracking-tight",
              status === "error" ? "text-destructive" : "text-foreground",
            )}
          >
            {status === "error"
              ? "Upload Failed"
              : status === "uploading"
                ? "Uploading Video"
                : "Analyzing Content"}
          </h3>
          <p className="text-muted-foreground text-sm leading-relaxed">
            {error || statusMessage || "Please wait while we process your video..."}
          </p>
          {status === "error" && (
            <Button
              size="sm"
              variant="outline"
              onClick={reset}
              className="mt-4 rounded-full border-border hover:bg-accent"
            >
              Try Again
            </Button>
          )}
        </div>
      </div>
    );
  }

  // 3. Main State
  return (
    <div
      className="flex-1 flex flex-col overflow-hidden relative"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Breadcrumb Header */}
      <div className="h-14 shrink-0 flex items-center justify-between px-6 bg-stone-900 border-b">
        <div className="flex items-center text-sm font-medium">
          <span className="text-muted-foreground h-14 flex items-center cursor-pointer hover:text-foreground">
            Projects
          </span>
          <span className="text-muted-foreground h-14 flex items-center px-1">/</span>
          <span
            className={cn(
              "h-14 flex items-center cursor-pointer transition-colors",
              selectedSegment
                ? "text-muted-foreground hover:text-foreground"
                : "text-foreground font-bold",
            )}
            onClick={handleBackToGrid}
          >
            {projectName}
          </span>
          {selectedSegment && (
            <>
              <span className="text-muted-foreground h-14 flex items-center px-1">/</span>
              <span className="text-foreground font-bold h-14 flex items-center truncate max-w-[200px]">
                {selectedSegment.id}
              </span>
            </>
          )}
        </div>

        <div className="flex items-center gap-2">
          {selectedSegment && (
            <Button variant="outline" size="sm" onClick={handleEditMore}>
              Edit more
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size={"icon"} variant={"outline"} className="size-8">
                <EllipsisIcon className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem className="cursor-pointer">
                <Pencil className="mr-2 h-4 w-4" />
                <span>Rename Project</span>
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer" onSelect={() => router.push("/editor")}>
                <PenIcon className="mr-2 h-4 w-4" />
                <span>Edit Project</span>
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer">
                <Download className="mr-2 h-4 w-4" />
                <span>Export Clips</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="cursor-pointer text-destructive focus:text-destructive">
                <Trash2 className="mr-2 h-4 w-4" />
                <span>Delete Project</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept="video/*"
        onChange={handleFileChange}
      />

      <div className="flex-1 overflow-hidden relative">
        <AnimatePresence mode="wait">
          {segments.length === 0 && !videoId ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="h-full flex flex-col items-center justify-center p-12 text-center bg-stone-900"
            >
              <div className="max-w-md space-y-4">
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Paste a social media link in the assistant chat or upload a video file to begin
                  extracting viral moments.
                </p>
              </div>
            </motion.div>
          ) : !selectedSegment ? (
            <motion.div
              key="grid"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="h-full overflow-y-auto p-6 bg-stone-900"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-3 gap-8 auto-rows-max pb-12">
                {segments.map((segment, idx) => {
                  const isReady = segment.status === "ready" || (!segment.status && !!segment.url);
                  const loadingText =
                    segment.status === "reframing" || segment.isReframing
                      ? "REFRAMING..."
                      : segment.status === "transcribing" || segment.isTranscribing
                        ? "TRANSCRIBING..."
                        : segment.status === "generating_sounds"
                          ? "GENERATING SOUND EFFECTS..."
                          : segment.status === "trimming"
                            ? "TRIMMING..."
                            : segment.status === "editing"
                              ? "EDITING..."
                              : "PROCESSING...";

                  return (
                    <motion.div
                      key={segment.id}
                      layoutId={segment.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.03 }}
                      onMouseEnter={() => setHoveredId(segment.id)}
                      onMouseLeave={() => setHoveredId(null)}
                      onClick={() => isReady && setSelectedSegmentId(segment.id)}
                      className={cn(
                        "group relative flex flex-col bg-card border border-border rounded-sm overflow-hidden transition-all duration-300",
                        isReady
                          ? "cursor-pointer hover:border-primary/50 hover:shadow-md"
                          : "opacity-90",
                      )}
                    >
                      <div className="relative aspect-video w-full bg-muted overflow-hidden">
                        {segment.url && (
                          <video
                            src={segment.url}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                          />
                        )}

                        {!isReady && (
                          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 backdrop-blur-sm gap-4 transition-all duration-300 z-10">
                            <div className="relative">
                              <Loader2
                                className="w-10 h-10 text-primary animate-spin"
                                strokeWidth={1.5}
                              />
                              <div className="absolute inset-0 bg-primary/20 blur-2xl animate-pulse rounded-full" />
                            </div>
                            <span className="text-[11px] font-black text-white uppercase tracking-[0.2em] animate-pulse">
                              {loadingText}
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="p-4 space-y-2">
                        <div className="flex flex-col gap-0.5 min-w-0">
                          <h3 className="text-sm font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                            {segment.description ||
                              (String(segment.id).startsWith("original")
                                ? "Original source video"
                                : "No description")}
                          </h3>
                          {(segment.hookScore !== undefined ||
                            segment.retentionScore !== undefined) && (
                            <div className="flex items-center gap-2.5 mt-1">
                              {segment.hookScore !== undefined && (
                                <div className="flex items-center gap-1.5">
                                  <div className="size-1.5 rounded-full bg-primary shadow-[0_0_8px_rgba(var(--primary),0.5)]" />
                                  <span className="text-[10px] font-bold text-foreground/70 uppercase tracking-wider">
                                    Hook {segment.hookScore}
                                  </span>
                                </div>
                              )}
                              {segment.retentionScore !== undefined && (
                                <div className="flex items-center gap-1.5">
                                  <div className="size-1.5 rounded-full bg-emerald-500/80 shadow-[0_0_8px_rgba(16,185,129,0.4)]" />
                                  <span className="text-[10px] font-bold text-foreground/70 uppercase tracking-wider">
                                    Retention {segment.retentionScore}
                                  </span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center justify-between mt-1">
                          <p className="text-[10px] font-bold text-muted-foreground/50 uppercase tracking-widest">
                            {String(segment.id).startsWith("original")
                              ? "Full Video"
                              : `${segment.trimStartTime} - ${segment.trimEndTime}`}
                            {segment.status === "trimming" && " (Queued)"}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          ) : (
            <MediaPreview segment={selectedSegment} />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
