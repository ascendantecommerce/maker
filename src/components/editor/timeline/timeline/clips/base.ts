import { Rect, RectProps } from "fabric";

export const CLIP_BORDER_RADIUS = 2;

export interface BaseClipProps extends Partial<RectProps> {
  elementId: string;
  text: string;
  src?: string;
}

export abstract class BaseTimelineClip extends Rect {
  elementId: string;
  text: string;
  src?: string;
  public timeScale: number = 1;

  constructor(options: BaseClipProps) {
    super(options);
    this.elementId = options.elementId;
    this.text = options.text;
    this.src = options.src;

    this.set({
      rx: CLIP_BORDER_RADIUS, // Rounded corners
      ry: CLIP_BORDER_RADIUS,
      cornerSize: 6,
      selectable: true,
      hasControls: true,
      lockRotation: true,
      lockScalingY: true, // Only horizontal resizing makes sense usually
    });
  }

  isSelected: boolean = false;

  public setSelected(selected: boolean) {
    this.isSelected = selected;
    this.set({ dirty: true });
  }
}
