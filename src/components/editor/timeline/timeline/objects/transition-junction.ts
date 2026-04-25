import { Group, Rect, Path, type GroupProps } from "fabric";

export type TransitionJunctionMode = "hover" | "drop";

export interface TransitionJunctionProps extends Partial<GroupProps> {
  onClick?: () => void;
  mode?: TransitionJunctionMode;
}

export class TransitionJunction extends Group {
  static type = "TransitionJunction";
  public isTransitionJunction = true;
  public isAlignmentAuxiliary = true;

  private bg: Rect;
  private icon: Path;

  constructor(options: TransitionJunctionProps = {}) {
    const VISUAL_SIZE = 24;
    const mode = options.mode || "hover";

    // 1. Background
    const bg = new Rect({
      width: VISUAL_SIZE,
      height: VISUAL_SIZE,
      fill: mode === "hover" ? "black" : "rgba(0, 242, 255, 0.4)",
      stroke: mode === "hover" ? "rgba(255, 255, 255, 0.4)" : "white",
      strokeWidth: mode === "hover" ? 1 : 2,
      strokeDashArray: mode === "hover" ? undefined : [4, 4],
      rx: 4,
      ry: 4,
      originX: "center",
      originY: "center",
    });

    // 2. Icon (Plus for hover, nothing or different for drop)
    const icon = new Path("M 12 7 L 12 17 M 7 12 L 17 12", {
      stroke: "white",
      strokeWidth: 1.5,
      fill: "transparent",
      strokeLineCap: "round",
      strokeLineJoin: "round",
      originX: "center",
      originY: "center",
      left: 0,
      top: 0,
      visible: mode === "hover",
    });

    super([bg, icon], {
      ...options,
      selectable: false,
      evented: mode === "hover",
      hoverCursor: mode === "hover" ? "pointer" : "default",
      originX: "center",
      originY: "center",
    });

    this.bg = bg;
    this.icon = icon;

    if (mode === "hover") {
      this.on("mousedown", (e) => {
        if (options.onClick) {
          options.onClick();
        }
      });
    }
  }

  public setMode(mode: TransitionJunctionMode) {
    const isHover = mode === "hover";
    this.bg.set({
      fill: isHover ? "black" : "rgba(0, 242, 255, 0.4)",
      stroke: isHover ? "rgba(255, 255, 255, 0.4)" : "white",
      strokeWidth: isHover ? 1 : 2,
      strokeDashArray: isHover ? undefined : [4, 4],
    });
    this.icon.set({ visible: isHover });
    this.set({
      evented: isHover,
      hoverCursor: isHover ? "pointer" : "default",
    });
  }
}
