"use client";

import { cn } from "@/lib/utils";
import { type RightTab, rightTabs, useRightPanelStore } from "./store";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { IClip } from "openvideo";

export function TabBar({ selectedClips }: { selectedClips: IClip[] }) {
  const { activeTab, setActiveTab } = useRightPanelStore();

  return (
    <div className="flex flex-col bg-card items-center w-full h-full py-2 overflow-y-auto scrollbar-hidden">
      <div className="flex flex-col items-center gap-1 w-full">
        {(Object.keys(rightTabs) as RightTab[]).map((tabKey) => {
          const tab = rightTabs[tabKey];
          const isActive = activeTab === tabKey;
          if (
            tabKey === "adjustments" &&
            !["Video", "Image"].includes(selectedClips[0]?.type)
          ) {
            return null;
          }
          return (
            <Tooltip key={tabKey} delayDuration={0}>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "size-9 rounded-md transition-colors",
                    isActive
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                  )}
                  onClick={() => setActiveTab(tabKey)}
                >
                  <tab.icon className="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="left" align="center" sideOffset={12}>
                {tab.label}
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </div>
  );
}
