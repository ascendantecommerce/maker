"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Link2Icon, Loader2, RefreshCw } from "lucide-react";
import { InputGroup, InputGroupAddon, InputGroupInput } from "./ui/input-group";

interface LinkToVideoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LinkToVideoModal({ open, onOpenChange }: LinkToVideoModalProps) {
  const [url, setUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const validateUrl = (value: string) => {
    try {
      new URL(value);
      return true;
    } catch {
      return false;
    }
  };

  const handleCreateVideo = async () => {
    if (!validateUrl(url)) {
      setError("Please enter a valid URL");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/link-to-video", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url }),
      });

      const data = await response.json();

      if (!response.ok || !data?.ok) {
        throw new Error("Video creation failed");
      }

      onOpenChange(false);
      router.push("/projects");
    } catch (err) {
      setError("Something went wrong while creating the video");
    } finally {
      setIsLoading(false);
    }
  };

  const reset = () => {
    setUrl("");
    setError(null);
    setIsLoading(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(val) => {
        onOpenChange(val);
        if (!val) reset();
      }}
    >
      <DialogContent className="sm:max-w-125 p-0 overflow-hidden bg-card border-border rounded-sm">
        <DialogHeader className="sr-only">
          <DialogTitle>Link to Video</DialogTitle>
          <DialogDescription>Turn any URL into a polished video presentation.</DialogDescription>
        </DialogHeader>

        <div className="p-10 flex flex-col items-center">
          <div className="w-full text-center space-y-2 mb-10">
            <h2 className="text-3xl font-bold text-foreground tracking-tight">Link to Video</h2>
            <p className="text-muted-foreground text-sm">
              Paste a product or webpage URL to generate a video.
            </p>
          </div>

          <div className="w-full space-y-4">
            <div className="relative group">
              <InputGroup className="h-11">
                <InputGroupInput
                  placeholder="Paste URL here..."
                  value={url}
                  onChange={(e) => {
                    setUrl(e.target.value);
                    setError(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleCreateVideo();
                    }
                  }}
                  disabled={isLoading}
                />
                <InputGroupAddon
                  className={cn(
                    "cursor-pointer hover:text-primary transition-colors",
                    isLoading && "pointer-events-none opacity-50",
                  )}
                  onClick={handleCreateVideo}
                >
                  {isLoading ? <Loader2 className="size-4 animate-spin" /> : <Link2Icon />}
                </InputGroupAddon>
              </InputGroup>
            </div>

            {error && <p className="text-sm text-destructive text-center">{error}</p>}

            <Button
              onClick={handleCreateVideo}
              disabled={!url || isLoading}
              className="w-full h-11 text-sm font-bold rounded-lg mt-4"
            >
              {isLoading ? "Creating video..." : "Create video"}
            </Button>
          </div>

          <p className="mt-6 text-muted-foreground text-xs text-center">
            AI will analyze the content and create a video for you.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
