import { useState, useCallback, useEffect } from "react";
import { IconShare } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { useStudioStore } from "@/stores/studio-store";
import { usePanelStore } from "@/stores/panel-store";
import { Log, type IClip } from "openvideo";
import { ExportModal } from "./export-modal";
import { DriveExportModal } from "./drive-export-modal";
import { LogoIcons } from "../shared/logos";
import Link from "next/link";
import { Icons } from "../shared/icons";
import {
  Keyboard,
  ArrowLeftIcon,
} from "lucide-react";
import { ShortcutsModal } from "./shortcuts-modal";

import { Separator } from "../ui/separator";
import AutosizeInput from "../ui/autosize-input";
import { debounce } from "lodash";
import GoogleIcon from "../logos/google";

export default function Header({
  projectId,
  projectName,
  isOwner = true,
}: {
  projectId?: string;
  projectName?: string;
  isOwner?: boolean;
}) {
  const { studio } = useStudioStore();
  const { toggleCopilot, isCopilotVisible } = usePanelStore();
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isShortcutsModalOpen, setIsShortcutsModalOpen] = useState(false);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [title, setTitle] = useState(projectName || "Untitled video");
  const [isDriveExportModalOpen, setIsDriveExportModalOpen] = useState(false);

  useEffect(() => {
    if (projectName) {
      setTitle(projectName);
    }
  }, [projectName]);

  const saveTitle = useCallback(
    debounce(async (newTitle: string) => {
      if (!projectId) return;
      try {
        await fetch(`/api/projects/${projectId}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ name: newTitle }),
        });
        console.log("Project name saved:", newTitle);
      } catch (error) {
        console.error("Failed to save project name:", error);
      }
    }, 2000),
    [projectId],
  );

  useEffect(() => {
    if (!studio) return;

    setCanUndo(studio.history.canUndo());
    setCanRedo(studio.history.canRedo());

    const handleHistoryChange = ({
      canUndo,
      canRedo,
    }: {
      canUndo: boolean;
      canRedo: boolean;
    }) => {
      setCanUndo(canUndo);
      setCanRedo(canRedo);
    };

    studio.on("history:changed", handleHistoryChange);

    return () => {
      studio.off("history:changed", handleHistoryChange);
    };
  }, [studio]);

  const handleNew = () => {
    if (!studio) return;
    const confirmed = window.confirm(
      "Are you sure you want to start a new project? Unsaved changes will be lost.",
    );
    if (confirmed) {
      studio.clear();
    }
  };

  const handleExportJSON = () => {
    if (!studio) return;

    try {
      // Get all clips from studio
      const clips = (studio as any).clips as IClip[];
      if (clips.length === 0) {
        alert("No clips to export");
        return;
      }

      // Export to JSON
      const json = studio.exportToJSON();
      const jsonString = JSON.stringify(json, null, 2);
      const blob = new Blob([jsonString], { type: "application/json" });
      const url = URL.createObjectURL(blob);

      // Download the JSON file
      const aEl = document.createElement("a");
      document.body.appendChild(aEl);
      aEl.href = url;
      aEl.download = `combo-project-${Date.now()}.json`;
      aEl.click();

      // Cleanup
      setTimeout(() => {
        if (document.body.contains(aEl)) {
          document.body.removeChild(aEl);
        }
        URL.revokeObjectURL(url);
      }, 100);
    } catch (error) {
      Log.error("Export to JSON error:", error);
      alert("Failed to export to JSON: " + (error as Error).message);
    }
  };

  const handleImportJSON = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json,application/json";
    input.style.display = "none";

    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        const text = await file.text();
        const json = JSON.parse(text);

        if (!json.clips || !Array.isArray(json.clips)) {
          throw new Error("Invalid JSON format: missing clips array");
        }

        if (!studio) {
          throw new Error("Studio not initialized");
        }

        // Filter out clips with empty sources (except Text, Caption, and Effect)
        const validClips = json.clips.filter((clipJSON: any) => {
          if (
            clipJSON.type === "Text" ||
            clipJSON.type === "Caption" ||
            clipJSON.type === "Effect" ||
            clipJSON.type === "Transition"
          ) {
            return true;
          }
          return clipJSON.src && clipJSON.src.trim() !== "";
        });

        if (validClips.length === 0) {
          throw new Error(
            "No valid clips found in JSON. All clips have empty source URLs.",
          );
        }

        const validJson = { ...json, clips: validClips };
        await studio.loadFromJSON(validJson);
      } catch (error) {
        Log.error("Load from JSON error:", error);
        alert("Failed to load from JSON: " + (error as Error).message);
      } finally {
        document.body.removeChild(input);
      }
    };

    document.body.appendChild(input);
    input.click();
  };
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value;
    setTitle(newTitle);
    saveTitle(newTitle);
  };


  const handleSaveToDrive = () => {
    setIsDriveExportModalOpen(true);
  };
  return (
    <header className="relative flex h-[52px] w-full shrink-0 items-center justify-between px-4 bg-card z-10 border-b">
      {/* Left Section */}
      <div className="flex items-center gap-2">
        <Link
          href="/home"
          className="pointer-events-auto gap-2 flex h-11 text-sm items-center justify-center rounded-md font-semibold hover:bg-stone-800/50 px-2 transition-colors"
        >
          <ArrowLeftIcon className="size-5" /> Back
        </Link>
        <Separator
          orientation="vertical"
          className="!h-6 w-1 bg-stone-600 ml-2"
        />
        <div className=" pointer-events-auto flex h-10 items-center">
          <Button
            onClick={() => studio?.undo()}
            disabled={!canUndo}
            variant="ghost"
            size="icon"
          >
            <Icons.undo className="size-5" />
          </Button>
          <Button
            onClick={() => studio?.redo()}
            disabled={!canRedo}
            variant="ghost"
            size="icon"
          >
            <Icons.redo className="size-5" />
          </Button>
        </div>
      </div>

      {/* Center Section */}
      <div className="flex h-13 items-center justify-center gap-2">
        <div className=" pointer-events-auto flex h-10 items-center gap-2 rounded-md px-2.5">
          <AutosizeInput
            name="title"
            value={title}
            onChange={handleTitleChange}
            width={200}
            inputClassName="border-none outline-none px-1 text-sm font-medium disabled:cursor-default disabled:opacity-70"
            disabled={!isOwner}
          />
        </div>
      </div>

      {/* Right Section */}
      <div className="flex items-center gap-2">
        <div className="flex items-center mr-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            onClick={() => setIsShortcutsModalOpen(true)}
          >
            <Keyboard className="size-5" />
          </Button>

          <Button
            size={"sm"}
            variant="outline"
            onClick={toggleCopilot}
            className="h-7"
            title="Toggle Chat Copilot"
          >
            <Icons.ai className="size-5" />
            <span className="hidden md:block">AI Chat</span>
          </Button>
        </div>

        <ExportModal
          open={isExportModalOpen}
          onOpenChange={setIsExportModalOpen}
        />
        <DriveExportModal
          open={isDriveExportModalOpen}
          onOpenChange={setIsDriveExportModalOpen}
          title={title}
          onTitleChange={(t) => {
            setTitle(t);
            saveTitle(t);
          }}
          studio={studio}
        />
        <ShortcutsModal
          open={isShortcutsModalOpen}
          onOpenChange={setIsShortcutsModalOpen}
        />

        <Button
          className="flex h-7 gap-1 border border-border"
          variant="outline"
          size={"sm"}
          onClick={() => {
            console.log(studio?.exportToJSON());
          }}
        >
          <IconShare width={18} />{" "}
          <span className="hidden md:block">Share</span>
        </Button>

        <Button
          size="sm"
          variant="outline"
          onClick={handleSaveToDrive}
          title="Export and save to Google Drive"
        >
          <span className="hidden md:block">
            Save to Drive
          </span>
        </Button>

        <Button
          size="sm"
          className="gap-2 rounded-full"
          onClick={() => setIsExportModalOpen(true)}
        >
          Download
        </Button>
      </div>
    </header>
  );
}
