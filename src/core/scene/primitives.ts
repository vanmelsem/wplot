import type { RgbaColor } from "../domain/series";
import type { SceneBuildContext } from "./contracts";
import type {
  SceneClampRect,
  ScenePrimitive,
  SceneText,
} from "./frame";

export const BOX_LABEL_TEXT_HEIGHT = 12;
export const BOX_LABEL_PAD_X = 5;
export const BOX_LABEL_PAD_Y = 3;
export const BOX_LABEL_RECT_HEIGHT =
  BOX_LABEL_TEXT_HEIGHT + BOX_LABEL_PAD_Y * 2;

export function measureBoxLabel(label: string): {
  textWidth: number;
  textHeight: number;
  rectWidth: number;
  rectHeight: number;
} {
  const textWidth = Math.max(8, label.length * 7);
  const textHeight = BOX_LABEL_TEXT_HEIGHT;
  return {
    textWidth,
    textHeight,
    rectWidth: textWidth + BOX_LABEL_PAD_X * 2,
    rectHeight: BOX_LABEL_RECT_HEIGHT,
  };
}

export function valueToPlotPx(
  ctx: SceneBuildContext,
  x: number,
  y: number,
): { x: number; y: number } {
  const spanX = ctx.view.x.max - ctx.view.x.min || 1;
  const spanY = ctx.view.y.max - ctx.view.y.min || 1;
  const nx = (x - ctx.view.x.min) / spanX;
  const ny = (y - ctx.view.y.min) / spanY;
  return {
    x: nx * ctx.plotWidthPx,
    y: (1 - ny) * ctx.plotHeightPx,
  };
}

export function plotClampRect(ctx: SceneBuildContext): SceneClampRect {
  return {
    minX: 0,
    maxX: ctx.plotWidthPx,
    minY: 0,
    maxY: ctx.plotHeightPx,
  };
}

export function xAxisClampRect(ctx: SceneBuildContext): SceneClampRect | null {
  const height = ctx.xAxisHeightPx ?? 0;
  if (height <= 0) return null;
  if ((ctx.xAxisSide ?? "bottom") === "top") {
    return {
      minX: 0,
      maxX: ctx.plotWidthPx,
      minY: -height,
      maxY: 0,
    };
  }
  return {
    minX: 0,
    maxX: ctx.plotWidthPx,
    minY: ctx.plotHeightPx,
    maxY: ctx.plotHeightPx + height,
  };
}

export function yAxisClampRect(ctx: SceneBuildContext): SceneClampRect | null {
  const width = ctx.yAxisWidthPx ?? 0;
  if (width <= 0) return null;
  if ((ctx.yAxisSide ?? "left") === "right") {
    return {
      minX: ctx.plotWidthPx,
      maxX: ctx.plotWidthPx + width,
      minY: 0,
      maxY: ctx.plotHeightPx,
    };
  }
  return {
    minX: -width,
    maxX: 0,
    minY: 0,
    maxY: ctx.plotHeightPx,
  };
}

export function pushPath(
  out: ScenePrimitive[],
  points: Float32Array | Float64Array,
  count: number,
  widthPx: number,
  color: RgbaColor,
  origin?: { x: number; y: number },
  segments = false,
): void {
  out.push({
    kind: "path",
    segments,
    points,
    count,
    widthPx,
    join: "miter",
    cap: "butt",
    color,
    opacity: 1,
    origin,
  });
}

export function pushBoxLabel(args: {
  out: SceneText[];
  x: number;
  y: number;
  label: string;
  color: RgbaColor;
  background: RgbaColor;
  border: RgbaColor;
  borderWidthPx: number;
  align?: "top-left" | "center";
  fixedBox?: boolean;
  boxOrigin?: { x: number; y: number };
  clampRect?: SceneClampRect;
  boxHeight?: number;
  boxTextOffsetY?: number;
  boxTextBaseline?: "top" | "middle";
  boxTextTrack?: "x-axis";
}): void {
  if (!args.label) return;
  const measured = measureBoxLabel(args.label);
  args.out.push({
    x: args.x,
    y: args.y,
    text: args.label,
    color: args.color,
    align: args.align ?? "top-left",
    fixedBox: args.fixedBox,
    boxOrigin: args.boxOrigin,
    boxTextOffsetY: args.boxTextOffsetY,
    boxTextBaseline: args.boxTextBaseline,
    boxTextTrack: args.boxTextTrack,
    clampRect: args.clampRect,
    box: {
      width: measured.textWidth,
      height: args.boxHeight ?? measured.textHeight,
      padX: BOX_LABEL_PAD_X,
      padY: BOX_LABEL_PAD_Y,
      background: args.background,
      border: args.border,
      borderWidth: args.borderWidthPx,
    },
  });
}
