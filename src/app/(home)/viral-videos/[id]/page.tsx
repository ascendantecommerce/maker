"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { getGeneration } from "../actions";
import { VideoPlayer } from "@/components/ui/video-player";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  TrendingUp,
  DollarSign,
  ShoppingCart,
  Clock,
  Eye,
  Share2,
  ChevronRight,
  Sparkles,
  BarChart3,
  Calendar,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { ViralVideo } from "@/inngest/functions/viral-videos/utils/kalodata-agent";
import { cn } from "@/lib/utils";

export default function ViralVideosResultsPage() {
  const { id } = useParams() as { id: string };
  const [generation, setGeneration] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    const fetchStatus = async () => {
      try {
        const data = await getGeneration(id);
        setGeneration(data);

        if (data?.status === "COMPLETED" || data?.status === "FAILED") {
          setIsLoading(false);
          clearInterval(intervalId);
        }
      } catch (error) {
        console.error("Error fetching generation:", error);
        setIsLoading(false);
        clearInterval(intervalId);
      }
    };

    fetchStatus();
    intervalId = setInterval(fetchStatus, 3000);

    return () => clearInterval(intervalId);
  }, [id]);

  const ensureObject = (val: any) => {
    if (typeof val === "string") {
      try {
        return JSON.parse(val);
      } catch {
        return val;
      }
    }
    return val;
  };

  if (
    isLoading &&
    (!generation ||
      generation.status === "PENDING" ||
      generation.status === "PROGRESS")
  ) {
    return <LoadingState progress={generation?.progress || 0} />;
  }

  if (generation?.status === "FAILED") {
    const errorData = ensureObject(generation?.metadata);
    return (
      <ErrorState error={errorData?.error || generation?.metadata?.error} />
    );
  }

  const results: ViralVideo[] = ensureObject(generation?.output) || [];

  return (
    <main className="min-h-screen bg-card p-6 lg:p-8 space-y-8 max-w-7xl mx-auto">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-border/50">
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Badge
              variant="outline"
              className="px-2 py-0.5 rounded-full text-[10px] font-bold tracking-widest uppercase bg-primary/10 text-primary border-primary/20"
            >
              Live Analysis
            </Badge>
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Calendar className="size-3" />
              Analyzed today
            </span>
          </div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tight text-foreground flex items-center gap-3">
            Viral Performance <TrendingUp className="size-8 text-primary" />
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl leading-relaxed">
            Discovering high-performing creative content for{" "}
            <span className="font-semibold text-foreground underline decoration-primary/30 underline-offset-4">
              {generation?.input?.productUrl
                ? new URL(generation.input.productUrl).searchParams.get("id")
                : "Product"}
            </span>
            .
          </p>
        </div>

        <div className="flex gap-4">
          <div className="flex flex-col items-end px-6 py-4 rounded-2xl bg-muted/50 border border-border">
            <span className="text-[10px] font-black tracking-widest uppercase text-muted-foreground">
              Total Analyzed
            </span>
            <span className="text-2xl font-bold">{results.length} Videos</span>
          </div>
        </div>
      </header>

      <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        <AnimatePresence mode="popLayout">
          {results.map((video, index) => (
            <VideoResultCard
              key={video.id || index}
              video={video}
              index={index}
            />
          ))}
        </AnimatePresence>
      </section>

      {results.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center space-y-4 bg-muted/20 rounded-3xl border-2 border-dashed border-border">
          <div className="p-4 rounded-full bg-muted border border-border">
            <Sparkles className="size-8 text-muted-foreground" />
          </div>
          <h3 className="text-xl font-bold">No trending videos found</h3>
          <p className="text-muted-foreground max-w-md">
            We couldn't find any viral content for this specific product ID in
            the last 180 days. Try another product.
          </p>
        </div>
      )}
    </main>
  );
}

function VideoResultCard({
  video,
  index,
}: {
  video: ViralVideo;
  index: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        delay: index * 0.1,
        duration: 0.5,
        ease: [0.16, 1, 0.3, 1],
      }}
      layout
    >
      <Card className="group overflow-hidden bg-card border-border hover:border-primary/50 transition-all duration-500 hover:shadow-2xl hover:shadow-primary/5 h-full flex flex-col">
        <div className="relative aspect-[9/16] bg-black overflow-hidden">
          {video.url ? (
            <VideoPlayer
              src={video.url}
              className="h-full w-full object-cover"
              size="full"
            />
          ) : (
            <div className="h-full w-full flex flex-col items-center justify-center bg-muted/10 text-muted-foreground gap-4">
              <Eye className="size-12 opacity-20" />
              <p className="text-xs uppercase tracking-widest font-bold">
                Video Unavailable
              </p>
            </div>
          )}

          <div className="absolute top-4 left-4 right-4 flex items-start justify-between z-10 pointer-events-none">
            <Badge className="bg-black/60 backdrop-blur-md border-white/20 text-white font-mono text-[10px] py-1 px-2 uppercase tracking-tight">
              {video.content_type || "Video"}
            </Badge>
            <div className="flex flex-col gap-2 items-end">
              <MetricBadge
                icon={Eye}
                label={video.views || "0"}
                color="bg-blue-500/80"
              />
              <MetricBadge
                icon={Clock}
                label={video.duration || "0:00"}
                color="bg-black/40"
              />
            </div>
          </div>
        </div>

        <CardContent className="p-5 flex flex-col flex-1 space-y-5">
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-1">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
                  Revenue generated
                </p>
                <p className="text-2xl font-black text-foreground tracking-tight">
                  {video.revenue || "$0"}
                </p>
              </div>
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
                <TrendingUp className="size-5" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 rounded-xl bg-muted/40 border border-border/50 space-y-1">
                <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1">
                  <ShoppingCart className="size-3" /> Sales
                </span>
                <p className="text-sm font-bold">{video.sale || "0"}</p>
              </div>
              <div className="p-3 rounded-xl bg-muted/40 border border-border/50 space-y-1">
                <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1">
                  <DollarSign className="size-3" /> GPM
                </span>
                <p className="text-sm font-bold text-green-500">
                  {video.gpm ? `${video.gpm.toFixed(2)}` : "0.00"}
                </p>
              </div>
            </div>
          </div>

          <p className="text-sm text-muted-foreground line-clamp-3 leading-relaxed font-medium bg-muted/20 p-3 rounded-xl border border-border/40 italic">
            "{video.description || "No description provided."}"
          </p>

          <p className="mt-auto pt-4 text-[10px] text-muted-foreground flex items-center gap-2 border-t border-border/50">
            <span className="font-bold uppercase tracking-widest">Added</span>
            {new Date(video.create_time).toLocaleDateString(undefined, {
              dateStyle: "long",
            })}
          </p>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function MetricBadge({
  icon: Icon,
  label,
  color,
}: {
  icon: any;
  label: string;
  color: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-white backdrop-blur-md border border-white/10 shadow-lg",
        color,
      )}
    >
      <Icon className="size-3" />
      <span className="text-[10px] font-black tracking-tight">{label}</span>
    </div>
  );
}

function LoadingState({ progress }: { progress: number }) {
  return (
    <main className="min-h-screen bg-card flex flex-col items-center justify-center p-6 text-center space-y-8 w-full">
      <div className="relative">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
          className="size-32 rounded-full border-4 border-primary/10 border-t-primary shadow-[0_0_40px_rgba(var(--primary-rgb),0.2)]"
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <Sparkles className="size-10 text-primary animate-pulse" />
        </div>
      </div>

      <div className="space-y-4 max-w-md">
        <h1 className="text-3xl font-black tracking-tight">AI Agent at work</h1>
        <p className="text-muted-foreground leading-relaxed">
          Stagehand is navigating Kalodata, analyzing historical trends, and
          fetching enriched video data. This typically takes 30-60 seconds.
        </p>

        <div className="space-y-2">
          <div className="h-2 w-full bg-muted rounded-full overflow-hidden border border-border">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.max(progress, 5)}%` }}
              className="h-full bg-primary shadow-[0_0_15px_rgba(var(--primary-rgb),0.5)] transition-all duration-1000"
            />
          </div>
          <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-muted-foreground">
            <span>Analyzing Data</span>
            <span>{progress}%</span>
          </div>
        </div>
      </div>
    </main>
  );
}

function ErrorState({ error }: { error?: string }) {
  return (
    <main className="min-h-screen bg-card flex flex-col items-center justify-center p-6 text-center space-y-6 w-full">
      <div className="p-6 rounded-3xl bg-destructive/10 border border-destructive/20 text-destructive">
        <AlertCircle className="size-12" />
      </div>
      <div className="space-y-2 max-w-md">
        <h1 className="text-3xl font-black tracking-tight text-foreground">
          Analysis Failed
        </h1>
        <p className="text-muted-foreground">
          {error ||
            "An unexpected error occurred while processing the viral data. Please verify the URL and try again."}
        </p>
      </div>
      <button
        onClick={() => (window.location.href = "/")}
        className="px-8 py-3 bg-foreground text-background font-black rounded-full hover:scale-105 transition-transform"
      >
        Return to Dashboard
      </button>
    </main>
  );
}

function AlertCircle(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}
