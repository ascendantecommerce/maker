"use client";

import { User, Check, Loader2, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useAvatarStore, type GeneratedAvatar } from "@/stores/avatar-store";
import { useState, useEffect } from "react";
import { AvatarGenerationModal } from "./avatar-generation-modal";

interface AvatarConfigProps {
  selectedAvatar?: {
    id: string;
    name: string;
    url: string;
  };
  onAvatarChange: (avatar?: { id: string; name: string; url: string }) => void;
  aspectRatio: string;
}

export function AvatarConfig({ selectedAvatar, onAvatarChange, aspectRatio }: AvatarConfigProps) {
  const { generatedAvatars, isGenerating, fetchAvatars } = useAvatarStore();
  const [isGenerationModalOpen, setIsGenerationModalOpen] = useState(false);

  useEffect(() => {
    fetchAvatars();
  }, [fetchAvatars]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h3 className="text-sm font-semibold flex items-center gap-2">Avatar</h3>
          <p className="text-xs text-muted-foreground">Select an avatar for your video.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsGenerationModalOpen(true)}
            className="h-8 text-[11px] font-bold gap-1.5 border-border bg-background hover:bg-muted"
          >
            <Wand2 className="w-3 h-3" />
            Create
          </Button>
        </div>
      </div>

      <ScrollArea className="h-50">
        {isGenerating ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(120px,1fr))] gap-3 pr-4">
            {generatedAvatars.map((avatar: GeneratedAvatar) => (
              <div
                key={avatar.id}
                onClick={() =>
                  onAvatarChange({
                    id: avatar.id,
                    name: `Avatar ${avatar.id.slice(0, 4)}`,
                    url: avatar.url,
                  })
                }
                className={cn(
                  "relative group flex flex-col gap-2 p-2 rounded-lg border transition-all duration-200",
                  selectedAvatar?.id === avatar.id
                    ? "bg-secondary/40 border-primary ring-1 ring-primary"
                    : "bg-background border-border hover:bg-muted/50 hover:border-border-muted",
                )}
              >
                <div className="aspect-3/4 max-h-32 rounded-md overflow-hidden bg-muted/20 border border-border/50">
                  <img
                    src={avatar.url}
                    alt={`Avatar ${avatar.id}`}
                    className="w-full h-full object-contain"
                  />
                  {selectedAvatar?.id === avatar.id && (
                    <div className="absolute top-2 right-2 bg-primary text-primary-foreground p-1 rounded-full shadow-lg scale-100 animate-in zoom-in-50 duration-200">
                      <Check className="w-3 h-3" />
                    </div>
                  )}
                </div>
                <div className="px-1 py-0.5">
                  <span className="text-[11px] font-medium truncate block w-full text-left">
                    Avatar {avatar.id.slice(0, 4)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>

      <AvatarGenerationModal
        isOpen={isGenerationModalOpen}
        onClose={() => setIsGenerationModalOpen(false)}
        onSelect={(avatar) => onAvatarChange(avatar)}
        aspectRatio={aspectRatio}
      />
    </div>
  );
}
