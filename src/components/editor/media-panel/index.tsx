"use client";

import { TabBar } from "./tabbar";
import { useMediaPanelStore, type Tab } from "./store";
import { Separator } from "@/components/ui/separator";
import PanelUploads from "./panel/uploads";
import PanelImages from "./panel/images";
import PanelVideos from "./panel/videos";
import PanelEffect from "./panel/effects";
import PanelTransition from "./panel/transition";
import PanelText from "./panel/text";
import PanelCaptions from "./panel/captions";
import PanelMusic from "./panel/music";
import PanelVoiceovers from "./panel/voiceovers";
import PanelSFX from "./panel/sfx";
import PanelElements from "./panel/elements";
import type { IClip } from "openvideo";
import { useEffect } from "react";
import { useStudioStore } from "@/stores/studio-store";

const viewMap: Record<Tab, React.ReactNode> = {
  uploads: <PanelUploads />,
  images: <PanelImages />,
  videos: <PanelVideos />,
  music: <PanelMusic />,
  voiceovers: <PanelVoiceovers />,
  sfx: <PanelSFX />,
  text: <PanelText />,
  captions: <PanelCaptions />,
  transitions: <PanelTransition />,
  effects: <PanelEffect />,
  elements: <PanelElements />,
};

export function MediaPanel() {
  const { activeTab } = useMediaPanelStore();
  const { studio } = useStudioStore();

  // Removed properties effect

  return (
    <div className="h-full flex flex-row bg-transparent overflow-hidden w-full gap-1">
      <div className="h-full w-12 flex-none bg-card z-10 flex flex-col items-center">
        <TabBar />
      </div>
      <div className="flex-1 min-h-0 min-w-0 overflow-hidden relative bg-card rounded-sm border border-border/50 shadow-sm">
        {viewMap[activeTab]}
      </div>
    </div>
  );
}
