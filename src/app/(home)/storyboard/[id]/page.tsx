"use client";

import { useEffect, useRef, useState, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSchemaStore } from "@/stores/schema-store";
import { StoryboardEditor } from "@/components/storyboard-editor/storyboard-editor";
import { usePostHog } from "posthog-js/react";
import * as Sentry from "@sentry/nextjs";
import { Loader2, AlertCircle } from "lucide-react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { useProjects } from "@/hooks/use-projects";

function GenerationProgressBanner({ generationId }: { generationId: string }) {
  const { data: projects = [] } = useProjects();
  const activeProject = projects.find((p: any) => p.generationId === generationId);

  if (!activeProject || activeProject.status === "COMPLETED") return null;

  const statusMsg = activeProject?.generationMetadata?.message || "Generating your video...";
  const tasks: Array<{ key: string; label: string; status: "pending" | "active" | "completed" }> =
    activeProject?.generationMetadata?.tasks ?? [];

  const completedTasks = tasks.filter((t) => t.status === "completed").length;
  const totalTasks = tasks.length;
  const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  return (
    <div className="flex-none border-b border-border/60 bg-card/80 backdrop-blur-sm px-4 py-2.5 flex items-center gap-4 animate-in fade-in slide-in-from-top-2 duration-300">
      <Loader2 className="w-3.5 h-3.5 text-primary animate-spin shrink-0" />
      <span className="text-sm text-foreground font-medium truncate flex-1">{statusMsg}</span>
      {totalTasks > 0 && (
        <>
          <div className="w-32 shrink-0 h-1.5 rounded-full bg-border overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <span className="text-xs text-muted-foreground shrink-0 tabular-nums w-9 text-right">
            {progressPercent}%
          </span>
        </>
      )}
    </div>
  );
}

interface StoryboardPageProps {
  params: Promise<{ id: string }>;
}

export default function StoryboardPage({ params }: StoryboardPageProps) {
  const { id: generationId } = use(params);
  const router = useRouter();
  const posthog = usePostHog();
  const { setSchema, setFrames, setVideos, setAvatarUrl, setProductUrls } = useSchemaStore();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [schemaId, setSchemaId] = useState<string | null>(null);

  const schemaData = useSchemaStore((state) => state.schema);

  useEffect(() => {
    Sentry.setTag("page_name", "ugc-storyboard");
  }, []);

  const prevIsGeneratingRef = useRef(false);

  useEffect(() => {
    if (!generationId) return;

    const fetchSchema = async (silent = false) => {
      try {
        if (!silent) setIsLoading(true);
        const response = await fetch(`/api/scheme/${generationId}`);
        if (!response.ok) {
          throw new Error("Failed to fetch storyboard schema");
        }
        const data = await response.json();
        const schema = data.scheme ?? data; // API wraps schema under `scheme`

        // If generating, track that state regardless of segments
        const terminalStatuses = ["COMPLETED", "FAILED"];
        const isCurrentlyGenerating =
          !!data.message || // no schema yet → { message: "Schema is being generated" }
          !terminalStatuses.includes(data.status);
        setIsGenerating(isCurrentlyGenerating);

        console.log({ data });
        // Always load what we have — storyboard will render skeletons for missing shots
        if (schema.segments?.length) {
          setSchema(schema);
          if (schema.avatar?.url) setAvatarUrl(schema.avatar.url);
          if (schema.assets && Array.isArray(schema.assets)) {
            setProductUrls(schema.assets.map((a: any) => a.url));
          }
          setSchemaId(schema.schemaId ?? data.schemaId);
        }

        setIsLoading(false);
      } catch (err: any) {
        console.error("Error fetching storyboard:", err);
        setError(err.message || "An unexpected error occurred");
        setIsLoading(false);
      }
    };

    // Always fetch immediately on mount / when generationId changes
    fetchSchema();

    // Set up polling — interval re-created whenever isGenerating changes
    if (isGenerating) {
      const interval = setInterval(() => {
        fetchSchema(true);
      }, 3000);
      prevIsGeneratingRef.current = true;
      return () => clearInterval(interval);
    }

    // When transitioning from generating → done, do one final guaranteed fetch
    // with a short delay so the DB write has fully settled.
    if (prevIsGeneratingRef.current && !isGenerating) {
      prevIsGeneratingRef.current = false;
      const t = setTimeout(() => fetchSchema(true), 1500);
      return () => clearTimeout(t);
    }
  }, [generationId, setSchema, setFrames, setAvatarUrl, setProductUrls, isGenerating]);

  const handleContinue = async () => {
    if (!generationId || !schemaId) return;

    const { schema } = useSchemaStore.getState();
    if (!schema) return;
    try {
      router.push(`/edit/${schemaId}`);
    } catch (err) {
      console.error("Error during continue:", err);
      setError("Failed to save changes. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background text-white">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground text-sm">Loading workspace...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="max-w-md text-center flex flex-col items-center gap-4">
          <AlertCircle className="w-10 h-10 text-destructive" />
          <h1 className="text-xl font-semibold">Something went wrong</h1>
          <p className="text-muted-foreground text-sm">{error}</p>
          <button
            onClick={() => router.push("/script-to-video?mode=ugc-video-ad")}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:opacity-90 transition-opacity text-sm"
          >
            Back to Creator
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full bg-background flex-col relative">
      <div className="h-13 border-b w-full bg-card flex-none flex items-center justify-between px-4 text-sm">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href="/projects">Projects</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage className="font-semibold text-foreground truncate max-w-50">
                {schemaData?.title || "Project name"}
              </BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <div className="flex items-center gap-2">
          <Button
            size={"sm"}
            className="rounded-full"
            onClick={handleContinue}
            disabled={!schemaId || isGenerating || isSaving}
          >
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Edit more"
            )}
          </Button>
        </div>
      </div>

      {/* Inline generation progress strip — replaces the fullscreen overlay */}
      {isGenerating && <GenerationProgressBanner generationId={generationId} />}

      <div className="flex flex-row flex-1 overflow-hidden">
        <StoryboardEditor isGenerating={isGenerating} />
      </div>
    </div>
  );
}
