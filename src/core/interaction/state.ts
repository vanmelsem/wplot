import type { BuiltScene } from "../scene/builder";
import type { RenderLayout } from "../render/layout";

export const HIT_TEST_TOLERANCE_PX = 6;
export const SNAP_TOLERANCE_PX = 12;
export const SELECT_MIN_DRAG_PX = 6;

export type RenderState = {
  layout: RenderLayout;
  scene: BuiltScene;
};

export type CrosshairAxis = "x" | "y" | "xy";

/**
 * Which axis gutter a pointer is over. For `"y"`, `id` names the target axis:
 * `"y"` is the primary y-axis, any other id is a declared secondary axis.
 */
export type AxisHit = { kind: "x" } | { kind: "y"; id: string };

export type Gesture =
  | {
      kind: "pan";
      lastX: number;
      lastY: number;
    }
  | {
      kind: "axis-zoom";
      axis: "x" | "y";
      // Target y-axis id when axis === "y" ("y" = primary); ignored for "x".
      yAxisId: string;
      anchorX: number;
      anchorY: number;
      lastX: number;
      lastY: number;
    }
  | {
      kind: "select";
      axis: "x" | "y" | "xy";
      start: [number, number];
      startPx: [number, number];
      currentPx: [number, number];
    }
  | {
      kind: "drag-object";
      objectId: number;
      startX: number;
      startY: number;
    }
  | {
      kind: "drag-handle";
      objectId: number;
      handleId: number;
      startX: number;
      startY: number;
    };
