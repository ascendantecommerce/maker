import { create } from "zustand";
import { Segment } from "@/types/segment";

export type { Segment }; // Re-export for compatibility

interface ProjectState {
  isTrimming: boolean;
  segments: Segment[];
  setTrimming: (isTrimming: boolean) => void;
  setSegments: (segments: Segment[]) => void;
  updateSegment: (id: string, updates: Partial<Segment>) => void;
  clearProjectState: () => void;
}

export const useAiCopilotStore = create<ProjectState>((set) => ({
  isTrimming: false,
  segments: [],
  setTrimming: (isTrimming) => set({ isTrimming }),
  setSegments: (segments) => set({ segments }),
  updateSegment: (id, updates) =>
    set((state) => ({
      segments: state.segments.map((segment) =>
        segment.id === id ? { ...segment, ...updates } : segment,
      ),
    })),
  clearProjectState: () => set({ isTrimming: false, segments: [] }),
}));
