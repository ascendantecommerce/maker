"use client";

import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Loader2, ArrowUpIcon, Check, PaperclipIcon, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupTextarea,
} from "@/components/ui/input-group";
import { useAiCopilotStore } from "./store";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useVideoUpload } from "./use-video-upload";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  clips?: any[];
  status?: string;
  segments?: any[];
  reframing_urls?: string[];
  workflow?: any[];
}

interface AssistantProps {
  projectId: string;
  videoId?: string;
  videoUrl?: string;
  projectName: string;
}

export const Assistant = ({ projectId, videoId, videoUrl, projectName }: AssistantProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [activeVideoId, setActiveVideoId] = useState(videoId);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Sync activeVideoId if prop changes from parent
  useEffect(() => {
    if (videoId) {
      setActiveVideoId(videoId);
    }
  }, [videoId]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { setTrimming, setSegments, updateSegment, segments, clearProjectState } =
    useAiCopilotStore();

  // Clear state when project changes
  useEffect(() => {
    clearProjectState();
  }, [projectId, clearProjectState]);

  const { uploadFile, isWorking, statusMessage } = useVideoUpload({
    onSuccess: (data) => {
      // Upon success, we'll wait for the process-gemini to finish (indexing status)
      // but once it's success in status, it should already be an asset.
      // The parent will re-sync via videoUrl/videoId props if it's the main project asset,
      // but here we might want to proactively add it to clips if it's a new upload.
      setActiveVideoId(data.videoId);
      // We'll update clips in handleSend to avoid race conditions with the fetch call
    },
  });

  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPendingFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const removePendingFile = () => {
    setPendingFile(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Ensure original video is in clips state if empty
  useEffect(() => {
    if (videoUrl && segments.length === 0) {
      setSegments([
        {
          id: `original-${projectId}`,
          url: videoUrl,
          trimStartTime: "0:00",
          trimEndTime: "full",
          description: "Original Video",
          title: "Original Video",
        },
      ]);
    }
  }, [videoUrl, projectId, setSegments, segments.length]);

  // Fetch chat history on mount
  useEffect(() => {
    if (!projectId) return;

    const fetchHistory = async () => {
      try {
        const response = await fetch(
          `/api/chat/ai-copilot?projectId=${projectId}${videoId ? `&videoId=${videoId}` : ""}`,
        );
        if (response.ok) {
          const data = await response.json();
          if (data.messages) {
            setMessages(data.messages);
          }
          if (data.clips && data.clips.length > 0) {
            setSegments(data.clips);
          }
        }
      } catch (error) {
        console.error("Failed to fetch chat history:", error);
      }
    };

    fetchHistory();
  }, [projectId, videoId, setSegments]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const formatDuration = (start?: string, end?: string) => {
    const parseTime = (time?: string) => {
      if (!time) return 0;

      const parts = time.split(":").map(Number);

      if (parts.length === 2) {
        return parts[0] * 60 + parts[1];
      }

      if (parts.length === 3) {
        return parts[0] * 3600 + parts[1] * 60 + parts[2];
      }

      return 0;
    };

    const durationInSeconds = Math.abs(parseTime(end) - parseTime(start));

    const minutes = Math.floor(durationInSeconds / 60);
    const seconds = durationInSeconds % 60;

    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const handleSend = async () => {
    if ((!input.trim() && !pendingFile) || isLoading || isWorking) return;

    let videoIdToUse = activeVideoId;
    let bodySegments = segments;

    // Handle deferred upload if there's a pending file
    if (pendingFile) {
      setIsLoading(true); // Show thinking/loading for the upload phase too
      try {
        const uploadResult = await uploadFile(pendingFile, projectId, projectName);
        if (uploadResult?.videoId && uploadResult?.publicUrl) {
          videoIdToUse = uploadResult.videoId;
          setActiveVideoId(uploadResult.videoId);

          // Add it to clips state immediately so it's included in currentClips
          const newClip = {
            id: `original-${Date.now()}`,
            url: uploadResult.publicUrl,
            trimStartTime: "0:00",
            trimEndTime: "full",
            description: "Original Video",
            title: "Original Video",
          };
          setSegments([newClip]);
          // Use the new segments for the request
          bodySegments = [newClip];
        }
      } catch (err) {
        console.error("Deferred upload failed:", err);
        // Error is handled by useVideoUpload status
        setIsLoading(false);
        return;
      } finally {
        // We don't revoke here because it might be needed for UI,
        // but we'll clear pending state after successful send
      }
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const assistantMessageId = (Date.now() + 1).toString();
      setMessages((prev) => [
        ...prev,
        {
          id: assistantMessageId,
          role: "assistant",
          content: "",
        },
      ]);

      const response = await fetch("/api/chat/ai-copilot", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: [
            ...messages,
            {
              role: "user",
              content: input.trim() || (pendingFile ? "Analyzed attached video" : ""),
            },
          ].map((m) => ({
            role: m.role,
            content: m.content,
          })),
          projectId,
          currentClips: bodySegments,
        }),
      });

      // Clear pending file after successful send initiation
      if (pendingFile) {
        removePendingFile();
      }

      if (!response.ok) {
        throw new Error("Failed to send message");
      }

      const reader = response.body?.getReader();
      if (!reader) return;

      const decoder = new TextDecoder();
      let accumulatedText = "";
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");

        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.trim()) {
            try {
              const data = JSON.parse(line);
              if (data.text) {
                accumulatedText += data.text;
                setMessages((prev) =>
                  prev.map((msg) =>
                    msg.id === assistantMessageId
                      ? {
                          ...msg,
                          content: accumulatedText,
                        }
                      : msg,
                  ),
                );
              } else {
                if (data.videoId) {
                  setActiveVideoId(data.videoId);
                  console.log("Context updated to video:", data.videoId);
                }
                if ("status" in data) {
                  setMessages((prev) =>
                    prev.map((msg) =>
                      msg.id === assistantMessageId
                        ? {
                            ...msg,
                            status: data.status,
                          }
                        : msg,
                    ),
                  );
                }
                if (data.segments) {
                  const mappedSegments = data.segments.map((s: any) => ({
                    ...s,
                    trimStartTime: s.trimStartTime || s.trim_start_time || s.start_time || s.start,
                    trimEndTime: s.trimEndTime || s.trim_end_time || s.end_time || s.end,
                    hookScore: s.hookScore || s.hook_score,
                    retentionScore: s.retentionScore || s.retention_score,
                    title: s.title || "Untitled Segment",
                  }));

                  const placeholders = mappedSegments.map((s: any, idx: number) => ({
                    id: `trimming-${idx}`,
                    url: "",
                    trimStartTime: s.trimStartTime,
                    trimEndTime: s.trimEndTime,
                    title: s.title,
                    description: s.description,
                    preset: s.preset,
                    status: "trimming",
                    hookScore: s.hookScore,
                    retentionScore: s.retentionScore,
                  }));

                  // Replace all segments with placeholders
                  setSegments(placeholders);
                  setTrimming(true);
                  setMessages((prev) =>
                    prev.map((msg) =>
                      msg.id === assistantMessageId
                        ? {
                            ...msg,
                            segments: mappedSegments,
                          }
                        : msg,
                    ),
                  );
                }
                if (data.reframing_urls) {
                  // Mark relevant clips as reframing
                  const currentSegments = useAiCopilotStore.getState().segments;
                  data.reframing_urls.forEach((url: string) => {
                    const segment = currentSegments.find((c) => c.url === url);
                    if (segment) {
                      updateSegment(segment.id, {
                        isReframing: true,
                        status: "reframing",
                        action: "Reframe",
                      });
                    }
                  });
                  setMessages((prev) =>
                    prev.map((msg) =>
                      msg.id === assistantMessageId
                        ? {
                            ...msg,
                            reframing_urls: data.reframing_urls,
                          }
                        : msg,
                    ),
                  );
                }
                if (data.workflow) {
                  setMessages((prev) =>
                    prev.map((msg) =>
                      msg.id === assistantMessageId
                        ? {
                            ...msg,
                            workflow: data.workflow,
                            // Ensure segments/status don't conflict nicely
                          }
                        : msg,
                    ),
                  );
                }
                if (data.reframed_clips) {
                  const currentSegments = useAiCopilotStore.getState().segments;
                  data.reframed_clips.forEach((result: any) => {
                    if (result.url && result.original_url) {
                      const segment = currentSegments.find((c) => c.url === result.original_url);
                      if (segment) {
                        updateSegment(segment.id, {
                          url: result.url,
                          isReframing: false,
                          status: "ready",
                          action: result.action || "Reframe",
                          description: result.description || segment.description,
                          trimStartTime:
                            result.trim_start_time || result.start || segment.trimStartTime,
                          trimEndTime: result.trim_end_time || result.end || segment.trimEndTime,
                        });
                      }
                    }
                  });

                  setMessages((prev) =>
                    prev.map((msg) =>
                      msg.id === assistantMessageId
                        ? {
                            ...msg,
                            status: undefined,
                            reframing_urls: undefined,
                            clips: data.reframed_clips, // Update message history too
                            workflow: data.workflow || msg.workflow, // Keep workflow state if present
                          }
                        : msg,
                    ),
                  );
                }
                if (data.clips) {
                  const currentSegments = useAiCopilotStore.getState().segments;

                  // Update individual clips in store for status changes (reframing/transcribing/sounds)
                  const mappedSegments = data.clips.map((c: any) => ({
                    ...c,
                    trimStartTime: c.trimStartTime || c.trim_start_time || c.start_time || c.start,
                    trimEndTime: c.trimEndTime || c.trim_end_time || c.end_time || c.end,
                    hookScore: c.hookScore || c.hook_score,
                    retentionScore: c.retentionScore || c.retention_score,
                    speechToText: c.speechToText,
                  }));

                  // Update individual clips in store for status changes (reframing/transcribing/sounds)
                  mappedSegments.forEach((c: any) => {
                    // Try to match by ID first (more reliable), then by URL
                    const existing = currentSegments.find(
                      (segment) =>
                        (c.id !== undefined && segment.id === c.id) ||
                        segment.url === c.url ||
                        segment.url === c.original_url,
                    );
                    if (existing) {
                      updateSegment(existing.id, {
                        isReframing: c.isReframing,
                        isTranscribing: c.isTranscribing,
                        status:
                          c.status === "generating_sounds"
                            ? "generating_sounds"
                            : c.status === "transcribing"
                              ? "transcribing"
                              : c.status === "reframing"
                                ? "reframing"
                                : c.isReframing
                                  ? "reframing"
                                  : c.isTranscribing
                                    ? "transcribing"
                                    : c.status === "editing"
                                      ? "editing"
                                      : "ready",
                        speechToText: c.speechToText,
                        soundEffects: c.soundEffects,
                        bRolls: c.bRolls,
                        hookScore: c.hookScore,
                        retentionScore: c.retentionScore,
                        trimStartTime: c.trimStartTime || existing.trimStartTime,
                        trimEndTime: c.trimEndTime || existing.trimEndTime,
                        action:
                          c.status === "generating_sounds" ||
                          (c.soundEffects && c.soundEffects.length > 0)
                            ? "Sounds"
                            : c.bRolls && c.bRolls.length > 0
                              ? "B-Rolls"
                              : c.action || existing.action,
                      });
                    }
                  });

                  // If it's a structural change (new clips from trimming) or final result, set whole array
                  const isFinal = data.status === null && data.clips;
                  if (isFinal) {
                    const newSegments = mappedSegments.map((c: any) => ({
                      ...c,
                      // Only set to ready if no explicit status is provided
                      status: c.status || "ready",
                    }));
                    // Replace all segments with new ones
                    setSegments(newSegments);
                    setTrimming(false);
                  }

                  setMessages((prev) =>
                    prev.map((msg) =>
                      msg.id === assistantMessageId
                        ? {
                            ...msg,
                            status: data.status !== undefined ? data.status : msg.status,
                            segments:
                              data.segments ||
                              (isFinal ? undefined : mappedSegments || msg.segments),
                            workflow: data.workflow || msg.workflow,
                          }
                        : msg,
                    ),
                  );
                }
              }
            } catch (e) {
              console.error("Failed to parse JSON chunk:", line, e);
            }
          }
        }
      }
    } catch (error) {
      console.error("Chat error:", error);
      setMessages((prev) => [
        ...prev,
        {
          id: "error-" + Date.now().toString(),
          role: "assistant",
          content: "Sorry, I encountered an error processing your request.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const clearChat = () => {
    setMessages([]);
  };

  return (
    <div className="flex flex-col h-full w-full overflow-hidden border-r bg-card">
      <ScrollArea className="h-[calc(100vh-160px)]">
        <div ref={scrollRef} className="flex-1 overflow-x-hidden p-4 md:p-6 space-y-2">
          {messages.length === 0 ? (
            <>
              <div>
                <div className="text-muted-foreground text-center font-medium">Jan 7, 2026</div>
                <div className="flex gap-4 max-w-[95%] w-full animate-in fade-in slide-in-from-bottom-2 duration-700">
                  <div className="flex flex-col space-y-3 max-w-[95%] min-w-0 items-start">
                    <div className="py-3.5 rounded-3xl text-[15px] leading-relaxed shadow-sm transition-all min-w-0 flex flex-col bg-card text-card-foreground rounded-tl-none">
                      <div>
                        Fresh project — share a video link, upload a file, or let&apos;s brainstorm
                        where to start.
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "flex gap-4   w-full group animate-in fade-in slide-in-from-bottom-2 duration-300 ",
                  message.role === "user" ? "flex-row-reverse" : "flex-row max-w-[90%]",
                )}
              >
                <div
                  className={cn(
                    "flex flex-col space-y-3 w-full min-w-0",
                    message.role === "user" ? "items-end" : "items-start",
                  )}
                >
                  <div
                    className={cn(
                      "py-3.5 rounded-3xl text-[15px] leading-relaxed shadow-sm transition-all min-w-0 flex flex-col",
                      message.role === "user"
                        ? "bg-foreground/10 rounded-tr-none font-medium px-5"
                        : "bg-card text-card-foreground rounded-tl-none w-full",
                    )}
                  >
                    <div className="w-full grid overflow-hidden">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          h1: ({ className, ...props }) => (
                            <h1
                              className={cn(
                                "aui-md-h1 mb-8 scroll-m-20 text-4xl font-extrabold tracking-tight last:mb-0",
                                className,
                              )}
                              {...props}
                            />
                          ),
                          h2: ({ className, ...props }) => (
                            <h2
                              className={cn(
                                "aui-md-h2 mt-8 mb-4 scroll-m-20 text-3xl font-semibold tracking-tight first:mt-0 last:mb-0",
                                className,
                              )}
                              {...props}
                            />
                          ),
                          h3: ({ className, ...props }) => (
                            <h3
                              className={cn(
                                "aui-md-h3 mt-6 mb-4 scroll-m-20 text-2xl font-semibold tracking-tight first:mt-0 last:mb-0",
                                className,
                              )}
                              {...props}
                            />
                          ),
                          h4: ({ className, ...props }) => (
                            <h4
                              className={cn(
                                "aui-md-h4 mt-6 mb-4 scroll-m-20 text-xl font-semibold tracking-tight first:mt-0 last:mb-0",
                                className,
                              )}
                              {...props}
                            />
                          ),
                          h5: ({ className, ...props }) => (
                            <h5
                              className={cn(
                                "aui-md-h5 my-4 text-lg font-semibold first:mt-0 last:mb-0",
                                className,
                              )}
                              {...props}
                            />
                          ),
                          h6: ({ className, ...props }) => (
                            <h6
                              className={cn(
                                "aui-md-h6 my-4 font-semibold first:mt-0 last:mb-0",
                                className,
                              )}
                              {...props}
                            />
                          ),
                          p: ({ className, ...props }) => (
                            <p
                              className={cn(
                                "aui-md-p mt-5 mb-5 leading-7 first:mt-0 last:mb-0",
                                className,
                              )}
                              {...props}
                            />
                          ),
                          a: ({ className, ...props }) => (
                            <a
                              className={cn(
                                "aui-md-a font-medium text-primary underline underline-offset-4",
                                className,
                              )}
                              {...props}
                            />
                          ),
                          blockquote: ({ className, ...props }) => (
                            <blockquote
                              className={cn("aui-md-blockquote border-l-2 pl-6 italic", className)}
                              {...props}
                            />
                          ),
                          ul: ({ className, ...props }) => (
                            <ul
                              className={cn("aui-md-ul my-5 ml-6 list-disc [&>li]:mt-2", className)}
                              {...props}
                            />
                          ),
                          ol: ({ className, ...props }) => (
                            <ol
                              className={cn(
                                "aui-md-ol my-5 ml-6 list-decimal [&>li]:mt-2",
                                className,
                              )}
                              {...props}
                            />
                          ),
                          hr: ({ className, ...props }) => (
                            <hr className={cn("aui-md-hr my-5 border-b", className)} {...props} />
                          ),
                          table: ({ className, ...props }) => (
                            <table
                              className={cn(
                                "aui-md-table my-5 w-full border-separate border-spacing-0 overflow-y-auto",
                                className,
                              )}
                              {...props}
                            />
                          ),
                          th: ({ className, ...props }) => (
                            <th
                              className={cn(
                                "aui-md-th bg-muted px-4 py-2 text-left font-bold first:rounded-tl-lg last:rounded-tr-lg [[align=center]]:text-center [[align=right]]:text-right",
                                className,
                              )}
                              {...props}
                            />
                          ),
                          td: ({ className, ...props }) => (
                            <td
                              className={cn(
                                "aui-md-td border-b border-l px-4 py-2 text-left last:border-r [[align=center]]:text-center [[align=right]]:text-right",
                                className,
                              )}
                              {...props}
                            />
                          ),
                          tr: ({ className, ...props }) => (
                            <tr
                              className={cn(
                                "aui-md-tr m-0 border-b p-0 first:border-t [&:last-child>td:first-child]:rounded-bl-lg [&:last-child>td:last-child]:rounded-br-lg",
                                className,
                              )}
                              {...props}
                            />
                          ),
                          sup: ({ className, ...props }) => (
                            <sup
                              className={cn(
                                "aui-md-sup [&>a]:text-xs [&>a]:no-underline",
                                className,
                              )}
                              {...props}
                            />
                          ),
                          pre: ({ className, ...props }) => (
                            <pre
                              className={cn(
                                "aui-md-pre overflow-x-auto min-w-0 max-w-full rounded-t-none! rounded-b-lg bg-black p-4 text-white",
                                className,
                              )}
                              {...props}
                            />
                          ),
                          code: ({ className, children, ...props }) => {
                            const isInline = !className?.includes("language-");
                            return (
                              <code
                                className={cn(
                                  isInline &&
                                    "aui-md-inline-code rounded border bg-muted font-semibold px-1",
                                  className,
                                )}
                                {...props}
                              >
                                {children}
                              </code>
                            );
                          },
                        }}
                      >
                        {message.content}
                      </ReactMarkdown>
                    </div>

                    {message.workflow && (
                      <div className="mt-4 w-full max-w-full overflow-hidden border border-border rounded-2xl animate-in fade-in duration-500 bg-muted/30">
                        {message.workflow.length > 1 && (
                          <div className="px-4 py-3 border-b border-border/50 flex items-center justify-between bg-muted/20">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/80">
                              Workflow Process
                            </p>
                            <div className="flex gap-1">
                              {message.workflow.map((t) => (
                                <div
                                  key={t.id}
                                  className={cn(
                                    "w-1.5 h-1.5 rounded-full transition-colors duration-500",
                                    t.status === "done"
                                      ? "bg-emerald-500"
                                      : t.status === "in_progress"
                                        ? "bg-primary animate-pulse"
                                        : "bg-muted-foreground/20",
                                  )}
                                />
                              ))}
                            </div>
                          </div>
                        )}
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b border-border/50 text-left">
                                <th className="h-8 px-4 font-medium text-muted-foreground text-[11px] uppercase tracking-wider w-full">
                                  Task
                                </th>
                                <th className="h-8 px-4 font-medium text-muted-foreground text-[11px] uppercase tracking-wider text-right whitespace-nowrap">
                                  Status
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {message.workflow.map((task: any, idx: number) => (
                                <tr
                                  key={task.id}
                                  className={cn(
                                    "border-b border-border/50 last:border-0 transition-colors hover:bg-muted/30",
                                    task.status === "in_progress" ? "bg-primary/[0.02]" : "",
                                  )}
                                >
                                  <td className="p-3 px-4 font-medium text-foreground">
                                    <div className="flex items-center gap-2.5">
                                      <div
                                        className={cn(
                                          "w-1.5 h-1.5 rounded-full shrink-0",
                                          task.status === "done"
                                            ? "bg-emerald-500"
                                            : task.status === "in_progress"
                                              ? "bg-primary animate-pulse"
                                              : "bg-muted-foreground/30",
                                        )}
                                      />
                                      <span
                                        className={cn(
                                          task.status === "pending"
                                            ? "text-muted-foreground/60"
                                            : "text-foreground",
                                        )}
                                      >
                                        {task.label}
                                      </span>
                                    </div>
                                  </td>
                                  <td className="p-3 px-4 text-right align-middle">
                                    <div className="flex justify-end items-center">
                                      {task.status === "done" ? (
                                        <div className="inline-flex items-center justify-center px-2 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                                          <Check
                                            className="w-3 h-3 text-emerald-500 mr-1"
                                            strokeWidth={3}
                                          />
                                          <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider">
                                            Done
                                          </span>
                                        </div>
                                      ) : task.status === "in_progress" ? (
                                        <div className="inline-flex items-center justify-center px-2 py-1 rounded-full bg-primary/10 border border-primary/20">
                                          <Loader2 className="w-3 h-3 animate-spin text-primary mr-1" />
                                          <span className="text-[10px] font-bold text-primary uppercase tracking-wider">
                                            Running
                                          </span>
                                        </div>
                                      ) : (
                                        <span className="text-[10px] uppercase font-bold text-muted-foreground/40 tracking-wider px-2">
                                          Pending
                                        </span>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {message.segments && !message.clips && !message.workflow && (
                      <div className="mt-4 space-y-3 w-full max-w-full overflow-hidden border border-border p-2 rounded-2xl animate-in fade-in duration-500">
                        {message.segments.map((segment: any, idx: number) => (
                          <div key={idx} className="space-y-3">
                            <div
                              className="flex items-center justify-between gap-4 animate-in fade-in slide-in-from-left-2 duration-300 min-w-0 max-w-full"
                              style={{ animationDelay: `${idx * 100}ms` }}
                            >
                              <div className="flex items-center gap-2 min-w-0 flex-1 overflow-hidden">
                                <p className="text-sm text-foreground font-medium min-w-0 flex-1">
                                  <span className="truncate block font-bold text-base text-primary">
                                    {segment.title || "Clip Candidate"}
                                  </span>
                                  {/* <span className="truncate block text-xs">
                                    {segment.description ||
                                      "Synthesizing content..."}
                                  </span> */}
                                  <span className="text-muted-foreground font-normal text-xs">
                                    Segment {idx + 1} - (
                                    {formatDuration(segment.trimStartTime, segment.trimEndTime)})
                                  </span>
                                </p>
                              </div>
                              <div className="flex gap-2 shrink-0">
                                {segment.hookScore && (
                                  <div className="px-1.5 py-0.5 rounded bg-orange-500/10 border border-orange-500/20 flex items-center">
                                    <span className="text-[9px] text-orange-600 font-bold uppercase tracking-tighter">
                                      H: {segment.hookScore}
                                    </span>
                                  </div>
                                )}
                                {segment.retentionScore && (
                                  <div className="px-1.5 py-0.5 rounded bg-blue-500/10 border border-blue-500/20 flex items-center">
                                    <span className="text-[9px] text-blue-600 font-bold uppercase tracking-tighter">
                                      R: {segment.retentionScore}
                                    </span>
                                  </div>
                                )}
                              </div>
                              <div className="flex items-center justify-center w-5 h-5 rounded-full shrink-0">
                                <Loader2 className="w-3.5 h-3.5 animate-spin text-primary shrink-0" />
                              </div>
                            </div>
                            {idx < (message.segments?.length ?? 0) - 1 && <Separator />}
                          </div>
                        ))}
                      </div>
                    )}

                    {message.reframing_urls && !message.workflow && (
                      <div className="mt-4 space-y-3 w-full max-w-full overflow-hidden border border-border p-2 rounded-2xl animate-in fade-in duration-500">
                        {message.reframing_urls.map((url: string, idx: number) => (
                          <div key={idx} className="space-y-3">
                            <div
                              className="flex items-center justify-between gap-4 animate-in fade-in slide-in-from-left-2 duration-300 min-w-0 max-w-full"
                              style={{ animationDelay: `${idx * 100}ms` }}
                            >
                              <div className="flex items-center gap-2 min-w-0 flex-1 overflow-hidden">
                                <p className="text-sm text-foreground font-medium min-w-0 flex-1">
                                  <span className="truncate block">Reframing video...</span>
                                  <span className="text-muted-foreground font-normal text-xs truncate block max-w-full">
                                    {url.split("/").pop()}
                                  </span>
                                </p>
                              </div>
                              <div className="flex items-center justify-center w-5 h-5 rounded-full shrink-0">
                                <Loader2 className="w-3.5 h-3.5 animate-spin text-primary shrink-0" />
                              </div>
                            </div>
                            {idx < (message.reframing_urls?.length ?? 0) - 1 && <Separator />}
                          </div>
                        ))}
                      </div>
                    )}

                    {message.status && !message.workflow && (
                      <div className="mt-4 w-full max-w-full overflow-hidden border border-border p-2 rounded-2xl animate-in fade-in duration-500">
                        <div className="flex items-center justify-between gap-4 min-w-0 max-w-full">
                          <div className="flex items-center gap-2 min-w-0 flex-1 overflow-hidden">
                            <p className="text-sm text-foreground font-medium min-w-0 flex-1">
                              {message.status}
                            </p>
                          </div>
                          <div className="flex items-center justify-center w-5 h-5 rounded-full shrink-0">
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-primary shrink-0" />
                          </div>
                        </div>
                      </div>
                    )}

                    {message.clips && message.clips.length > 0 && (
                      <div className="mt-4 space-y-3 w-full max-w-full overflow-hidden border border-border p-2 rounded-2xl">
                        {message.clips.map((clip: any, idx: number) => (
                          <div key={idx} className="space-y-3">
                            <div
                              className="flex items-center justify-between gap-4 animate-in fade-in slide-in-from-left-2 duration-300 min-w-0 max-w-full"
                              style={{ animationDelay: `${idx * 100}ms` }}
                            >
                              <div className="flex items-center gap-2 min-w-0 flex-1 overflow-hidden">
                                <p className="text-sm text-foreground font-medium min-w-0 flex-1">
                                  <span className="truncate block font-bold text-base text-primary">
                                    {clip.title || "Video Clip"}
                                  </span>
                                  {/* {clip.preset && (
                                    <div className="flex items-center gap-1 px-1.5 py-0.5 mt-0.5 rounded bg-primary/10 border border-primary/20 w-fit">
                                      <span className="text-[9px] text-primary font-bold uppercase tracking-tighter italic">
                                        {clip.preset}
                                      </span>
                                    </div>
                                  )} */}
                                  {/* <span className="truncate block text-xs">
                                    {clip.description || "Video segment"}
                                  </span> */}
                                  <span className="text-muted-foreground font-normal text-xs">
                                    {clip.action || "short"} - (
                                    {formatDuration(clip.trimStartTime, clip.trimEndTime)})
                                  </span>
                                </p>
                              </div>
                              <div className="flex items-center justify-center w-5 h-5 rounded-full shrink-0">
                                {clip.isReframing ||
                                clip.isTranscribing ||
                                clip.status === "generating_sounds" ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                                ) : (
                                  <div className="flex items-center justify-center w-5 h-5 rounded-full bg-emerald-500/10">
                                    <Check className="w-3 h-3 text-emerald-500" strokeWidth={3} />
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              {clip.speechToText?.src && (
                                <div className="pl-0">
                                  <a
                                    href={clip.speechToText.src}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-[10px] text-primary hover:underline font-medium uppercase tracking-wider"
                                  >
                                    View Captions
                                  </a>
                                </div>
                              )}
                              {clip.soundEffects && clip.soundEffects.length > 0 && (
                                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-primary/5 border border-primary/10">
                                  <div className="w-1 h-1 rounded-full bg-primary animate-pulse" />
                                  <span className="text-[10px] text-primary font-bold uppercase tracking-wider">
                                    {clip.soundEffects.length} Sound Effects
                                  </span>
                                </div>
                              )}
                              {clip.bRolls && clip.bRolls.length > 0 && (
                                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-primary/5 border border-primary/10">
                                  <div className="w-1 h-1 rounded-full bg-primary animate-pulse" />
                                  <span className="text-[10px] text-primary font-bold uppercase tracking-wider">
                                    {clip.bRolls.length} B-Rolls
                                  </span>
                                </div>
                              )}
                              {clip.hookScore && (
                                <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-500/10 border border-orange-500/20">
                                  <span className="text-[10px] text-orange-600 font-bold uppercase tracking-wider">
                                    Hook: {clip.hookScore}
                                  </span>
                                </div>
                              )}
                              {clip.retentionScore && (
                                <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20">
                                  <span className="text-[10px] text-blue-600 font-bold uppercase tracking-wider">
                                    Retention: {clip.retentionScore}
                                  </span>
                                </div>
                              )}
                            </div>
                            {idx < (message.clips?.length ?? 0) - 1 && <Separator />}
                          </div>
                        ))}
                      </div>
                    )}

                    {message.role === "assistant" &&
                      message.content === "" &&
                      !message.status &&
                      isLoading && (
                        <div className="flex items-center gap-3 py-2 px-1">
                          <div className="flex gap-1">
                            <div className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce [animation-delay:-0.3s]" />
                            <div className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce [animation-delay:-0.15s]" />
                            <div className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" />
                          </div>
                          <span className="text-[11px] uppercase tracking-widest text-muted-foreground font-bold">
                            Thinking
                          </span>
                        </div>
                      )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>

      <div className="p-4 md:p-6 space-y-4">
        {pendingFile && previewUrl && (
          <div className="relative group w-24 h-14 rounded-lg overflow-hidden border border-border shadow-md bg-zinc-900 animate-in fade-in slide-in-from-bottom-1">
            <video
              src={previewUrl}
              className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
              onLoadedData={(e) => ((e.target as HTMLVideoElement).currentTime = 1)}
            />
            <button
              onClick={removePendingFile}
              className="absolute top-1 right-1 p-1 rounded-md bg-black/80 text-white hover:bg-red-500 transition-colors shadow-lg shadow-black/50 opacity-0 group-hover:opacity-100"
              title="Remove file"
            >
              <Trash2 className="w-3 h-3" />
            </button>
            <div className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded bg-black/60 backdrop-blur-sm border border-white/10">
              <p className="text-[8px] font-bold text-white uppercase tracking-tighter truncate max-w-[60px]">
                {pendingFile.name}
              </p>
            </div>
          </div>
        )}

        {isWorking && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/50 rounded-lg text-[11px] text-muted-foreground animate-pulse">
            <Loader2 className="w-3 h-3 animate-spin" />
            <span>{statusMessage || "Processing..."}</span>
          </div>
        )}
        <InputGroup>
          <InputGroupTextarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Ask, Search or Chat..."
          />
          <InputGroupAddon align="block-end">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="video/*"
              className="hidden"
            />
            <InputGroupButton
              variant="secondary"
              // className="rounded-full bg-stone-200 hover:bg-stone-300 text-stone-700"
              size="icon-xs"
              onClick={handleFileSelect}
              disabled={isWorking}
            >
              <PaperclipIcon className="w-4 h-4" />
              <span className="sr-only">Attach file</span>
            </InputGroupButton>
            <InputGroupButton
              variant="default"
              className="rounded-full ml-auto bg-stone-200 hover:bg-stone-300 text-stone-700"
              size="icon-xs"
              onClick={handleSend}
              disabled={!input.trim() && !pendingFile}
            >
              <ArrowUpIcon />
              <span className="sr-only">Send</span>
            </InputGroupButton>
          </InputGroupAddon>
        </InputGroup>
      </div>
    </div>
  );
};
