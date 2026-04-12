import { IconAdjustmentsHorizontal, IconSparkles, type IconProps } from "@tabler/icons-react";
import { create } from "zustand";

export type RightTab = "properties" | "ai";

export const rightTabs: {
  [key in RightTab]: { icon: React.FC<IconProps>; label: string };
} = {
  properties: {
    icon: IconAdjustmentsHorizontal,
    label: "Properties",
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
