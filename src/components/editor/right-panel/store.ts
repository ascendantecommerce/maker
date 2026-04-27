import { Icons } from "@/components/shared/icons";
import { IconAdjustmentsHorizontal, IconSparkles, type IconProps } from "@tabler/icons-react";
import { create } from "zustand";

export type RightTab = "properties" | "ai" | "animations" | "adjustments";

export const rightTabs: {
  [key in RightTab]: { icon: any; label: string };
} = {
  properties: {
    icon: IconAdjustmentsHorizontal,
    label: "Properties",
  },
  animations: {
    icon: Icons.animations,
    label: "Animations",
  },
  adjustments: {
    icon: Icons.adjustments,
    label: "Color Adjustment",
  },
  ai: {
    icon: IconSparkles,
    label: "AI Tools",
  },
};

interface RightPanelStore {
  activeTab: RightTab;
  setActiveTab: (tab: RightTab) => void;
}

export const useRightPanelStore = create<RightPanelStore>((set) => ({
  activeTab: "properties",
  setActiveTab: (tab) => set({ activeTab: tab }),
}));
