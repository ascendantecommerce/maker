import { BaseTimelineClip, BaseClipProps, CLIP_BORDER_RADIUS } from "./base";
import { Path } from "fabric";

export class Transition extends BaseTimelineClip {
  public isTransitionClip = true;
  isSelected: boolean;
  private transitionIcon: Path;

  static ownDefaults = {
    rx: CLIP_BORDER_RADIUS,
    ry: CLIP_BORDER_RADIUS,
    objectCaching: false,
    borderColor: "transparent",
    stroke: "transparent",
    strokeWidth: 0,
    fill: "#000000",
    borderOpacityWhenMoving: 1,
    hoverCursor: "default",
    lockMovementX: true,
    lockMovementY: true,
    originY: "center",
    hasControls: false,
    hasBorders: false
  } as const;

  constructor(options: BaseClipProps) {
    super(options);
    this.set(Transition.ownDefaults);
    this.set({
      fill: options.fill || Transition.ownDefaults.fill,
    });

    // Bow-tie transition icon
    this.transitionIcon = new Path(
      "M 6 8 L 11 12 L 6 16 Z M 18 8 L 13 12 L 18 16 Z",
      {
        stroke: "white",
        strokeWidth: 1.5,
        fill: "white",
        strokeLineCap: "round",
        strokeLineJoin: "round",
        originX: "center",
        originY: "center",
        left: 0,
        top: 0,
      },
    );
    this.setControlsVisibility({
      mt: false,
      mb: false,
      ml: false,
      mr: false,
      bl: false,
      br: false,
      tl: false,
      tr: false,
      mtr: false,
    });
  }

  public _render(ctx: CanvasRenderingContext2D) {
    const width = this.width;
    const height = this.height;
    
    // Visually, we want a 24x24 square centered in the track height
    const VISUAL_SIZE = 24;
    const radius = 4;

    ctx.save();

    // Draw Small Square Background
    ctx.fillStyle = this.fill as string;
    ctx.strokeStyle = "rgba(255, 255, 255, 0.4)";
    ctx.lineWidth = 1;
    
    ctx.beginPath();
    ctx.roundRect(-VISUAL_SIZE / 2, -VISUAL_SIZE / 2, VISUAL_SIZE, VISUAL_SIZE, radius);
    ctx.fill();
    ctx.stroke();

    // Draw Icon
    this.transitionIcon.render(ctx);

    ctx.restore();

    this.updateSelected(ctx);
  }

  public setSelected(selected: boolean) {
    this.isSelected = selected;
    this.set({ dirty: true });
  }

  public updateSelected(ctx: CanvasRenderingContext2D) {
    if (!this.isSelected) return;
    
    const borderColor = "rgba(255, 255, 255, 1.0)";
    const borderWidth = 2;
    const VISUAL_SIZE = 24;
    const radius = 4;

    ctx.save();
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = borderWidth;

    ctx.beginPath();
    ctx.roundRect(
      -VISUAL_SIZE / 2 - 1,
      -VISUAL_SIZE / 2 - 1,
      VISUAL_SIZE + 2,
      VISUAL_SIZE + 2,
      radius + 1,
    );
    ctx.stroke();

    ctx.restore();
  }
}
