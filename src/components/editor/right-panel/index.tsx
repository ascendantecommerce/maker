"use client";

import { useRightPanelStore } from "./store";
import { TabBar } from "./tabbar";
import { Separator } from "@/components/ui/separator";
import { PropertiesPanel } from "../properties-panel";
import { AIToolsPanel } from "./ai-tools-panel";
import type { IClip } from "openvideo";

export function RightPanel({ selectedClips }: { selectedClips: IClip[] }) {
  const { activeTab } = useRightPanelStore();

  return (
    <div className="h-full flex flex-row bg-transparent overflow-hidden w-full gap-1">
      <div className="flex-1 min-h-0 min-w-0 overflow-hidden relative bg-card rounded-sm border border-border/50 shadow-sm">
        {activeTab === "properties" && <PropertiesPanel selectedClips={selectedClips} />}
        {activeTab === "ai" && <AIToolsPanel selectedClips={selectedClips} />}
      </div>
      <div className="h-full w-12 flex-none bg-transparent z-10 flex flex-col items-center">
        <TabBar />
      </div>
    </div>
  );
}
