"use client";

import { Button } from "@/components/ui/button";
import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import { useInView } from "react-intersection-observer";
import React from "react";
import { Icons } from "./shared/icons";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Download, FolderPlus, Pencil, Eye, Sparkles, Circle, Bookmark } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Trash2 } from "lucide-react";

export interface MediaItem {
  id: string;
  title: string;
  aspectRatio: "9:16" | "1:1" | "16:9";
  thumbnailUrl: string;
  duration?: string;
  likes: number;
  views: number;
  generationId: string | null;
  sceneId: string;
  status?: "COMPLETED" | "FAILED" | "PENDING" | "PROGRESS" | "CANCELED" | "completed";
  createdAt?: string | Date;
}

// Default thumbnail URL
export const DEFAULT_THUMBNAIL_URL =
  "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=600&fit=crop";

const MediaCard = React.memo(
  ({
    item,
    onLoad,
    onDelete,
  }: {
    item: MediaItem;
    onLoad: () => void;
    onDelete?: (id: string) => void;
  }) => {
    const { ref } = useInView({
      triggerOnce: false,
      threshold: 0.5,
    });

    const handleImageLoad = useCallback(() => {
      onLoad();
    }, [onLoad]);

    const aspectClass = useMemo(() => {
      switch (item.aspectRatio) {
        case "9:16":
          return "aspect-[9/16]";
        case "1:1":
          return "aspect-square";
        case "16:9":
          return "aspect-[16/9]";
        default:
          return "aspect-[9/16]";
      }
    }, [item.aspectRatio]);

    return (
      <motion.div
        ref={ref}
        initial={{ opacity: 0.5 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1 }}
        className="w-full group/card relative"
      >
        <div className="relative">
          <div className="absolute top-3 right-3 z-20">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-full bg-black/40 text-white opacity-0 group-hover/card:opacity-100 transition-opacity hover:bg-black/60 border-none"
                >
                  <Icons.ellipsisVertical className="size-5" />
                  <span className="sr-only">Open actions</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent
                align="end"
                className="w-48 p-2 text-sm bg-zinc-900 text-foreground border-border"
              >
                <div className="space-y-1">
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 rounded-md px-3 py-2 hover:bg-white/5 text-left"
                  >
                    <FolderPlus className="size-4" />
                    Add to folder
                  </button>
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 rounded-md px-3 py-2 hover:bg-white/5 text-left"
                  >
                    <Download className="size-4" />
                    Download
                  </button>
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 rounded-md px-3 py-2 hover:bg-white/5 text-left"
                  >
                    <Pencil className="size-4" />
                    Rename
                  </button>
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 rounded-md px-3 py-2 hover:bg-white/5 text-left"
                  >
                    <Eye className="size-4" />
                    Preview
                  </button>
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 rounded-md px-3 py-2 hover:bg-white/5 text-left"
                  >
                    <Sparkles className="size-4" />
                    Remix
                  </button>
                  {onDelete && (
                    <button
                      type="button"
                      onClick={() => onDelete(item.id)}
                      className="flex w-full items-center gap-2 rounded-md px-3 py-2 hover:bg-red-500/10 text-red-500 text-left"
                    >
                      <Trash2 className="size-4" />
                      Delete
                    </button>
                  )}
                </div>
              </PopoverContent>
            </Popover>
          </div>

          <Link href={`/player/${item.id}`} className={!item.id ? "pointer-events-none" : ""}>
            <div
              className={`relative overflow-hidden bg-zinc-900 cursor-pointer ${aspectClass} rounded-lg`}
            >
              {item.status === "PENDING" || item.status === "PROGRESS" ? (
                <div className="relative w-full h-full">
                  {item.thumbnailUrl && item.thumbnailUrl !== DEFAULT_THUMBNAIL_URL ? (
                    <>
                      <img
                        src={item.thumbnailUrl}
                        alt={item.title}
                        className="w-full h-full object-cover"
                        onLoad={handleImageLoad}
                      />
                      <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                        <div className="flex flex-col items-center gap-2">
                          <Icons.spinner className="size-6 animate-spin text-white" />
                          <span className="text-xs text-white font-medium">Generating...</span>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-zinc-800 border border-zinc-800">
                      <div className="flex flex-col items-center gap-2">
                        <Icons.spinner className="size-6 animate-spin text-muted-foreground" />
                        <span className="text-xs text-muted-foreground font-medium">
                          Generating...
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <img
                    src={item.thumbnailUrl}
                    alt={item.title}
                    className="w-full h-full object-cover"
                    onLoad={handleImageLoad}
                  />

                  {/* Hover Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20 opacity-0 group-hover/card:opacity-100 transition-opacity duration-300">
                    <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[13px] text-zinc-300 font-medium tracking-tight">
                          {item.createdAt
                            ? new Date(item.createdAt).toLocaleDateString("en-US", {
                                month: "long",
                                day: "numeric",
                                year: "numeric",
                              })
                            : ""}
                        </span>
                        <h3 className="text-lg font-semibold text-white leading-tight">
                          {item.title}
                        </h3>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </Link>
        </div>
      </motion.div>
    );
  },
);

export function MasonryGrid({
  className,
  gap = 2,
  items = [],
  isLoadingItems,
  onDelete,
}: {
  className?: string;
  gap?: number;
  items?: MediaItem[];
  isLoadingItems?: boolean;
  onDelete?: (id: string) => void;
}) {
  const masonryRef = useRef<HTMLDivElement>(null);

  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Masonry layout function
  const layoutMasonry = useCallback(() => {
    if (!masonryRef.current) return;

    const container = masonryRef.current;
    const items = Array.from(container.children) as HTMLElement[];
    const containerWidth = container.offsetWidth;

    // Calculate number of columns based on screen size
    let columns = 2;
    if (containerWidth >= 1024)
      columns = 5; // lg
    else if (containerWidth >= 768)
      columns = 4; // md
    else if (containerWidth >= 640) columns = 3; // sm

    const columnWidth = (containerWidth - gap * (columns - 1)) / columns;
    const columnHeights = new Array(columns).fill(0);

    items.forEach((item) => {
      // Find the shortest column
      const shortestColumnIndex = columnHeights.indexOf(Math.min(...columnHeights));

      // Position the item
      const x = shortestColumnIndex * (columnWidth + gap);
      const y = columnHeights[shortestColumnIndex];

      item.style.position = "absolute";
      item.style.left = `${x}px`;
      item.style.top = `${y}px`;
      item.style.width = `${columnWidth}px`;

      // Update column height
      columnHeights[shortestColumnIndex] += item.offsetHeight + gap;
    });

    // Set container height
    container.style.height = `${Math.max(...columnHeights)}px`;
  }, [gap]);

  // Load more items (for future pagination)
  const loadMoreItems = useCallback(() => {
    setIsLoadingMore(true);
    // TODO: Implement pagination when needed
    setTimeout(() => setIsLoadingMore(false), 500);
  }, []);

  // Intersection observer for infinite loading
  const observer = useRef<IntersectionObserver | null>(null);
  const lastItemRef = useCallback(
    (node: HTMLDivElement) => {
      if (isLoadingMore) return;
      if (observer.current) observer.current.disconnect();
      observer.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting) {
          loadMoreItems();
        }
      });
      if (node) observer.current.observe(node);
    },
    [isLoadingMore, loadMoreItems],
  );

  // Layout masonry when items change or window resizes
  useEffect(() => {
    if (items.length === 0) return;
    const timer = setTimeout(layoutMasonry, 100);
    return () => clearTimeout(timer);
  }, [items.length, layoutMasonry]);

  useEffect(() => {
    const handleResize = () => layoutMasonry();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [layoutMasonry]);

  return (
    <div className={`w-full mx-auto ${className}`}>
      <motion.div
        ref={masonryRef}
        className="relative w-full"
        variants={{
          hidden: { opacity: 0 },
          show: {
            opacity: 1,
            transition: {
              staggerChildren: 0.1,
            },
          },
        }}
        initial="hidden"
        animate="show"
      >
        {items.map((item, index) => {
          if (items.length === index + 1) {
            return (
              <div ref={lastItemRef} key={item.id} className="w-full">
                <MediaCard item={item} onLoad={layoutMasonry} onDelete={onDelete} />
              </div>
            );
          }
          return <MediaCard key={item.id} item={item} onLoad={layoutMasonry} onDelete={onDelete} />;
        })}
      </motion.div>

      {isLoadingItems && (
        <div className="mt-1 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-1">
          {Array.from({ length: 10 }, () => {
            return (
              <Skeleton
                key={`loading-skeleton-${crypto.randomUUID()}`}
                className="w-full rounded-none"
                style={{ height: "300px" }}
              />
            );
          })}
        </div>
      )}
      {!isLoadingItems && items.length === 0 && (
        <div className="text-center mt-8">
          <p className="text-gray-400">No projects yet.</p>
        </div>
      )}
    </div>
  );
}
