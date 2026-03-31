"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { MasonryGrid } from "@/components/masonry-home";
import { Header } from "@/components/header";
import LandingHero from "@/components/landing-hero";
import { authClient } from "@/lib/auth-client";
import { usePublicProjects } from "@/hooks/use-projects";
import { useMemo } from "react";
import { DEFAULT_THUMBNAIL_URL, type MediaItem } from "@/components/masonry-home";

export default function Home() {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();
  const { data: projects = [], isLoading } = usePublicProjects();

  useEffect(() => {
    if (!isPending && session?.user) {
      router.replace("/home");
    }
  }, [session, isPending, router]);

  const mediaItems = useMemo<MediaItem[]>(() => {
    return projects.map((project: any) => ({
      id: project.id,
      title: project.name,
      aspectRatio: (project.aspectRatio || "9:16") as any,
      thumbnailUrl: project.thumbnail || DEFAULT_THUMBNAIL_URL,
      duration: undefined,
      likes: 0,
      views: 0,
      generationId: project.generationId as string,
      sceneId: project.sceneId as string,
      status: (project as any).status,
    }));
  }, [projects]);

  return (
    <div className="w-full bg-card">
      <Header />

      <LandingHero />

      <div className="max-w-[1440px] mx-auto px-4">
        <MasonryGrid
          className="md:mt-64 mt-40"
          gap={8}
          items={mediaItems}
          isLoadingItems={isLoading}
        />
      </div>
    </div>
  );
}
