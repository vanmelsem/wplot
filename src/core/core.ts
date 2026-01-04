import type { Point, Size, Bounds, Edges, Corners } from "./geometry";

export type Color = readonly [r: number, g: number, b: number, a: number];
export type { Point, Size, Bounds, Edges, Corners } from "./geometry";

export type AxisId = "x" | "y";
export type ScaleMode = "linear" | "log";
export type AxisMode = "numeric" | "time";
export type TimezoneMode = "utc" | "local";

export interface Range {
  min: number;
  max: number;
}

export type Layout = {
  dpr: number;
  canvas: Size<number>;
  plot: Bounds<number>;
};

export interface Viewport {
  world: { x: Range; y: Range };
  dpr: number;
  canvas: Size<number>;
  plot: Bounds<number>;
}

export type ViewTransform = {
  x: unknown;
  y: unknown;
  originX: number;
  originY: number;
  screenW: number;
  screenH: number;
  dpr: number;
  renderOriginWorldX: number;
  renderOriginWorldY: number;
};

export type Selection =
  | { kind: "none" }
  | { kind: "x"; start: number; end: number }
  | { kind: "xy"; start: [number, number]; end: [number, number] };

export type TickFormatter = (args: {
  axis: AxisId;
  value: number;
  step: number;
  mode: AxisMode;
  scale: ScaleMode;
}) => string;

export interface AxisSpec {
  mode: AxisMode;
  scale: ScaleMode;
  offset?: number;
  timezone?: TimezoneMode;
  formatter?: TickFormatter;
}

export interface Tick {
  value: number;
  major: boolean;
  index?: number;
  label?: string;
}

export interface TickSet {
  step: number;
  ticks: readonly Tick[];
}


type AxisTransform = {
  mode: ScaleMode;
  worldMin: number;
  worldMax: number;
  screenMin: number;
  screenMax: number;
  scale: number;
  invScale: number;
  logMin?: number;
  logMax?: number;
};

function buildAxisTransform(
  world: Range,
  screenMin: number,
  screenMax: number,
  mode: ScaleMode,
): AxisTransform {
  const worldMin = world.min;
  const worldMax = world.max;
  if (mode === "log" && worldMin > 0 && worldMax > 0) {
    const logMin = Math.log10(worldMin);
    const logMax = Math.log10(worldMax);
    const scale = (screenMax - screenMin) / (logMax - logMin || 1);
    return {
      mode,
      worldMin,
      worldMax,
      screenMin,
      screenMax,
      scale,
      invScale: 1 / scale,
      logMin,
      logMax,
    };
  }
  const scale = (screenMax - screenMin) / (worldMax - worldMin || 1);
  return {
    mode: "linear",
    worldMin,
    worldMax,
    screenMin,
    screenMax,
    scale,
    invScale: 1 / scale,
  };
}

export function buildViewTransform(args: {
  worldX: Range;
  worldY: Range;
  originX: number;
  originY: number;
  screenW: number;
  screenH: number;
  dpr: number;
  scaleX: ScaleMode;
  scaleY: ScaleMode;
}): ViewTransform {
  const renderOriginWorldX = (args.worldX.min + args.worldX.max) * 0.5;
  const renderOriginWorldY = (args.worldY.min + args.worldY.max) * 0.5;
  const x = buildAxisTransform(
    args.worldX,
    args.originX,
    args.originX + args.screenW,
    args.scaleX,
  );
  const y = buildAxisTransform(
    args.worldY,
    args.originY + args.screenH,
    args.originY,
    args.scaleY,
  );
  return {
    x,
    y,
    originX: args.originX,
    originY: args.originY,
    screenW: args.screenW,
    screenH: args.screenH,
    dpr: args.dpr,
    renderOriginWorldX,
    renderOriginWorldY,
  };
}

function worldToScreenAxis(t: AxisTransform, v: number): number {
  if (t.mode === "log" && t.logMin != null && t.logMax != null && v > 0) {
    const lv = Math.log10(v);
    return t.screenMin + (lv - t.logMin) * t.scale;
  }
  return t.screenMin + (v - t.worldMin) * t.scale;
}

function screenToWorldAxis(t: AxisTransform, s: number): number {
  if (t.mode === "log" && t.logMin != null && t.logMax != null) {
    const lv = t.logMin + (s - t.screenMin) * t.invScale;
    return Math.pow(10, lv);
  }
  return t.worldMin + (s - t.screenMin) * t.invScale;
}

export function worldToScreen(
  t: ViewTransform,
  x: number,
  y: number,
): Point<number> {
  return {
    x: worldToScreenAxis(t.x as AxisTransform, x),
    y: worldToScreenAxis(t.y as AxisTransform, y),
  };
}

export function screenToWorld(
  t: ViewTransform,
  sx: number,
  sy: number,
): Point<number> {
  return {
    x: screenToWorldAxis(t.x as AxisTransform, sx),
    y: screenToWorldAxis(t.y as AxisTransform, sy),
  };
}

export function containsBounds(
  bounds: Bounds<number>,
  x: number,
  y: number,
): boolean {
  return (
    x >= bounds.origin.x &&
    x <= bounds.origin.x + bounds.size.width &&
    y >= bounds.origin.y &&
    y <= bounds.origin.y + bounds.size.height
  );
}

export function lowerBound(
  arr: Float32Array,
  value: number,
  count: number,
): number {
  let lo = 0;
  let hi = count;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    const v = arr[mid] ?? 0;
    if (v < value) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

export function upperBound(
  arr: Float32Array,
  value: number,
  count: number,
): number {
  let lo = 0;
  let hi = count;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    const v = arr[mid] ?? 0;
    if (v <= value) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

export function viewportRect(t: ViewTransform): Bounds<number> {
  return {
    origin: { x: t.originX, y: t.originY },
    size: { width: t.screenW, height: t.screenH },
  };
}

export function panRangesByPixels(
  t: ViewTransform,
  dxPx: number,
  dyPx: number,
): { x: Range; y: Range } {
  const ax = t.x as AxisTransform;
  const ay = t.y as AxisTransform;
  const dxWorld = dxPx / ax.scale;
  const dyWorld = dyPx / ay.scale;
  return {
    x: { min: ax.worldMin - dxWorld, max: ax.worldMax - dxWorld },
    y: { min: ay.worldMin - dyWorld, max: ay.worldMax - dyWorld },
  };
}

export function zoomRange(
  range: Range,
  pivotWorld: number,
  factor: number,
  scale: ScaleMode,
): Range {
  if (scale === "log" && range.min > 0 && range.max > 0 && pivotWorld > 0) {
    const lmin = Math.log10(range.min);
    const lmax = Math.log10(range.max);
    const lp = Math.log10(pivotWorld);
    const nmin = lp + (lmin - lp) * factor;
    const nmax = lp + (lmax - lp) * factor;
    return { min: Math.pow(10, nmin), max: Math.pow(10, nmax) };
  }
  return {
    min: pivotWorld + (range.min - pivotWorld) * factor,
    max: pivotWorld + (range.max - pivotWorld) * factor,
  };
}
