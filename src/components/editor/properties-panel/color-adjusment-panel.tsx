import React, { useEffect, useRef } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AdjusmentBasic,
  AdjusmentCurves,
  AdjusmentHsl,
} from "./color-adjusment";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useState } from "react";
import { IClip } from "openvideo";
import { IconMovie } from "@tabler/icons-react";

const ColorAdjusmentPanel = ({ selectedClips }: { selectedClips: IClip[] }) => {
  const [activeTab, setActiveTab] = useState<"basic" | "hsl" | "curves">(
    "basic",
  );

  const videoClipCount = selectedClips.filter((clip) =>
    ["Video", "Image"].includes(clip?.type),
  ).length;

  return (
    <div className="flex flex-col h-full font-space-grotesk overflow-hidden">
      {videoClipCount === 0 && (
        <div className="flex-1">
          <div className="flex flex-col items-center justify-center h-full p-4 text-muted-foreground">
            <IconMovie className="size-8 mb-2 opacity-20" />
            <span className="text-sm font-space-grotesk">
              Select an image or video clip to adjust the color{" "}
            </span>
          </div>
        </div>
      )}

      {videoClipCount > 0 && (
        <>
          <div className="p-4 flex-shrink-0">
            <Tabs
              value={activeTab}
              onValueChange={(v) => setActiveTab(v as any)}
              className="w-full"
            >
              <TabsList className="w-full rounded-none">
                <TabsTrigger value="basic">Basic</TabsTrigger>
                <TabsTrigger value="hsl">HSL</TabsTrigger>
                <TabsTrigger value="curves">Curves</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <ScrollArea className="flex-1 px-4">
            {activeTab === "basic" && (
              <AdjusmentBasic selectedClips={selectedClips} />
            )}
            {activeTab === "hsl" && (
              <AdjusmentHsl selectedClips={selectedClips} />
            )}
            {activeTab === "curves" && (
              <AdjusmentCurves selectedClips={selectedClips} />
            )}
          </ScrollArea>
        </>
      )}
    </div>
  );
};

export default ColorAdjusmentPanel;
