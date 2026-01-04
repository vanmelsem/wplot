import type { Color, Range, Viewport } from "./core";
import { lowerBound, upperBound } from "./core";
import type { Primitive, TextEntry } from "./scene";
import type { HitTest } from "./engine";

export const SeriesKinds = {
  line: "series/line",
  step: "series/step",
  scatter: "series/scatter",
  bars: "series/bars",
  band: "series/band",
  candles: "series/candles",
} as const;

export type SeriesKind = (typeof SeriesKinds)[keyof typeof SeriesKinds];
export type SeriesId = number;

export type SeriesInput = { kind: SeriesKind; [k: string]: unknown };

export type AxisOffset = { x: number; y: number };
export type SeriesNormalizeContext = { axisOffset: AxisOffset };

type NumericArray = Float32Array | Float64Array | number[];

export type SeriesView = Readonly<{
  id: SeriesId;
  name: string;
  kind: SeriesKind;
  color: Color;
  visible: boolean;
  showInLegend: boolean;
}>;

export type ChangeState = { dirty: boolean; revision: number };

export function initChange(): ChangeState {
  return { dirty: true, revision: 1 };
}

export function markChange(change: ChangeState): void {
  change.dirty = true;
  change.revision += 1;
}

export function clearChange(change: ChangeState): void {
  change.dirty = false;
}

export function fillStepPoints(
  x: Float32Array,
  y: Float32Array,
  count: number,
  align: "start" | "center" | "end",
  out: Float32Array,
): number {
  if (count < 2) return 0;
  let o = 0;
  out[o++] = x[0] ?? 0;
  out[o++] = y[0] ?? 0;
  for (let i = 0; i < count - 1; i++) {
    const x0 = x[i] ?? 0;
    const y0 = y[i] ?? 0;
    const x1 = x[i + 1] ?? 0;
    const y1 = y[i + 1] ?? 0;
    if (align === "start") {
      out[o++] = x0;
      out[o++] = y1;
      out[o++] = x1;
      out[o++] = y1;
    } else if (align === "center") {
      const xm = (x0 + x1) * 0.5;
      out[o++] = xm;
      out[o++] = y0;
      out[o++] = xm;
      out[o++] = y1;
    } else {
      out[o++] = x1;
      out[o++] = y0;
      out[o++] = x1;
      out[o++] = y1;
    }
  }
  return o;
}

export type SeriesRecord = {
  id: SeriesId;
  name: string;
  kind: SeriesKind;
  data: unknown;
  style: { color: Color; visible: boolean; showInLegend: boolean };
  change: ChangeState;
  cache: Record<string, unknown>;
};

type SeriesBuildArgs<TData> = {
  seriesId: SeriesId;
  data: TData;
  style: { color: Color };
  out: Primitive[];
  scratch: { f32(n: number): Float32Array };
};

type ItemBuildArgs<TData> = {
  itemId: ItemId;
  data: TData;
  style: Record<string, unknown>;
  view: Viewport;
  out: Primitive[];
  text: TextEntry[];
  scratch: { f32(n: number): Float32Array };
  axisOffset?: AxisOffset;
};

type SeriesHitTestArgs<TData> = {
  seriesId: SeriesId;
  data: TData;
  wx: number;
  wy: number;
  tolx: number;
  toly: number;
};

type ItemHitTestArgs<TData> = {
  itemId: ItemId;
  data: TData;
  wx: number;
  wy: number;
  tolx: number;
  toly: number;
};

interface BaseAdapter<TData, TBuildArgs, THitArgs> {
  readonly kind: string;
  normalize(input: any, ctx?: any): TData;
  buildPrimitives(args: TBuildArgs): void;
  hitTest?(args: THitArgs): HitTest | null;
  getDatum?(data: TData, index: number): unknown | null;
}

export interface SeriesAdapter<
  TInput extends SeriesInput = SeriesInput,
  TData = unknown,
> extends BaseAdapter<TData, SeriesBuildArgs<TData>, SeriesHitTestArgs<TData>> {
  readonly kind: SeriesKind;
  normalize(input: TInput, ctx: SeriesNormalizeContext): TData;
  append?(data: TData, payload: unknown, ctx: SeriesNormalizeContext): boolean;
  write?(data: TData, input: TInput, ctx: SeriesNormalizeContext): boolean;
}

class AdapterRegistry<TAdapter extends { kind: string }> {
  private map = new Map<string, TAdapter>();
  constructor(private label: string) {}
  register(adapter: TAdapter): void {
    this.map.set(adapter.kind, adapter);
  }
  get(kind: string): TAdapter {
    const a = this.map.get(kind);
    if (!a) throw new Error(`Unknown ${this.label} kind: ${kind}`);
    return a;
  }
}

export class SeriesRegistry extends AdapterRegistry<SeriesAdapter> {
  constructor() {
    super("series");
  }
}

function toFloat32(input: NumericArray, offset: number): Float32Array {
  const out = new Float32Array(input.length);
  if (input instanceof Float32Array || input instanceof Float64Array) {
    for (let i = 0; i < input.length; i++) {
      out[i] = (input[i] ?? 0) - offset;
    }
    return out;
  }
  for (let i = 0; i < input.length; i++) {
    out[i] = (input[i] ?? 0) - offset;
  }
  return out;
}

function datumXY(
  data: {
    x: Float32Array;
    y: Float32Array;
    count: number;
    offsetX: number;
    offsetY: number;
  },
  index: number,
): { x: number; y: number } | null {
  if (index < 0 || index >= data.count) return null;
  if (index >= data.x.length || index >= data.y.length) return null;
  return {
    x: (data.x[index] ?? 0) + data.offsetX,
    y: (data.y[index] ?? 0) + data.offsetY,
  };
}

function hitTestPolyline(
  seriesId: number,
  x: Float32Array,
  y: Float32Array,
  count: number,
  wx: number,
  wy: number,
  tolx: number,
  toly: number,
): HitTest | null {
  if (count < 2) return null;
  const invTolX = tolx > 0 ? 1 / tolx : 0;
  const invTolY = toly > 0 ? 1 / toly : 0;
  const xMin = wx - tolx;
  const xMax = wx + tolx;
  const i0 = lowerBound(x, xMin, count);
  const i1 = upperBound(x, xMax, count);
  const lastSeg = count - 2;
  const start = Math.max(0, Math.min(lastSeg, i0 - 1));
  const end = Math.max(0, Math.min(lastSeg, i1));
  if (start > end) return null;
  let bestIndex = -1;
  let bestDist2 = Infinity;
  for (let i = start; i <= end; i++) {
    const ax = x[i] ?? 0;
    const ay = y[i] ?? 0;
    const bx = x[i + 1] ?? 0;
    const by = y[i + 1] ?? 0;
    const vx = bx - ax;
    const vy = by - ay;
    const wx0 = wx - ax;
    const wy0 = wy - ay;
    const c1 = wx0 * vx + wy0 * vy;
    let t = 0;
    if (c1 > 0) {
      const c2 = vx * vx + vy * vy;
      if (c2 > 0) t = Math.min(1, c1 / c2);
    }
    const px = ax + t * vx;
    const py = ay + t * vy;
    const dx = wx - px;
    const dy = wy - py;
    const ndx = invTolX ? dx * invTolX : 0;
    const ndy = invTolY ? dy * invTolY : 0;
    if (ndx * ndx + ndy * ndy > 1) continue;
    const dist2 = dx * dx + dy * dy;
    if (dist2 < bestDist2) {
      const dax = wx - ax;
      const day = wy - ay;
      const dbx = wx - bx;
      const dby = wy - by;
      bestIndex = dax * dax + day * day <= dbx * dbx + dby * dby ? i : i + 1;
      bestDist2 = dist2;
    }
  }
  if (bestIndex < 0) return null;
  return {
    hit: { kind: "series-point", seriesId, index: bestIndex },
    dist2: bestDist2,
  };
}

function pushGuideLine(
  out: Primitive[],
  scratch: { f32(n: number): Float32Array },
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  widthPx: number,
  color: Color,
): void {
  const pts = scratch.f32(4);
  pts[0] = x0;
  pts[1] = y0;
  pts[2] = x1;
  pts[3] = y1;
  out.push({
    kind: "path",
    points: pts,
    count: 2,
    widthPx,
    join: "miter",
    cap: "butt",
    color,
    opacity: 1,
  });
}

function pushRectQuad(args: {
  out: Primitive[];
  scratch: { f32(n: number): Float32Array };
  x: number;
  y: number;
  width: number;
  height: number;
  fill: Color;
  stroke: Color;
  strokeWidthPx: number;
  roundness?: number;
  opacity?: number;
}): void {
  const rects = args.scratch.f32(4);
  rects[0] = args.x;
  rects[1] = args.y;
  rects[2] = args.width;
  rects[3] = args.height;
  args.out.push({
    kind: "quad",
    mode: "rect",
    rects,
    count: 1,
    fill: args.fill,
    stroke: args.stroke,
    strokeWidthPx: args.strokeWidthPx,
    roundness: args.roundness ?? 0,
    opacity: args.opacity ?? 1,
  });
}

export const ItemKinds = {
  guideH: "item/guide/hline",
  guideV: "item/guide/vline",
  rect: "item/annotation/rect",
  xBand: "item/annotation/xband",
  yBand: "item/annotation/yband",
} as const;

export type ItemKind = (typeof ItemKinds)[keyof typeof ItemKinds];
export type ItemId = number;

export type ItemInput = { kind: ItemKind; [k: string]: unknown };

export type ItemRecord = {
  id: ItemId;
  kind: ItemKind;
  data: unknown;
  style: Record<string, unknown>;
  visible: boolean;
  change: ChangeState;
  cache: Record<string, unknown>;
};

export type HandleDesc = {
  handleId: number;
  x: number;
  y: number;
  sizePx: number;
};

export type ItemEdit = {
  kind: "drag-handle";
  handleId: number;
  start: { x: number; y: number };
  now: { x: number; y: number };
  minSize?: { x: number; y: number };
};

export interface ItemAdapter<
  TInput extends ItemInput = ItemInput,
  TData = unknown,
> extends BaseAdapter<TData, ItemBuildArgs<TData>, ItemHitTestArgs<TData>> {
  readonly kind: ItemKind;
  normalize(input: TInput): TData;
  handles?(args: { itemId: ItemId; data: TData }): readonly HandleDesc[];
  applyEdit?(args: { data: TData; edit: ItemEdit }): TData;
}

export class ItemRegistry extends AdapterRegistry<ItemAdapter> {
  constructor() {
    super("item");
  }
}

export type LineInput = {
  kind: typeof SeriesKinds.line;
  x: NumericArray;
  y: NumericArray;
  widthPx?: number;
};

type LineData = {
  x: Float32Array;
  y: Float32Array;
  count: number;
  capacity: number;
  widthPx: number;
  offsetX: number;
  offsetY: number;
};

export const LineSeries: SeriesAdapter<LineInput, LineData> = {
  kind: SeriesKinds.line,

  normalize(input, ctx) {
    const offsetX = ctx.axisOffset.x ?? 0;
    const offsetY = ctx.axisOffset.y ?? 0;
    const x = toFloat32(input.x, offsetX);
    const y = toFloat32(input.y, offsetY);
    const count = Math.min(x.length, y.length);
    return {
      x,
      y,
      count,
      capacity: Math.min(x.length, y.length),
      widthPx: input.widthPx ?? 1,
      offsetX,
      offsetY,
    };
  },

  buildPrimitives({ data, style, out, scratch }) {
    const count = Math.min(data.count, data.x.length, data.y.length);
    if (count <= 0) return;
    const pts = scratch.f32(count * 2);
    for (let i = 0; i < count; i++) {
      pts[i * 2] = data.x[i] ?? 0;
      pts[i * 2 + 1] = data.y[i] ?? 0;
    }
    out.push({
      kind: "path",
      points: pts,
      count,
      widthPx: data.widthPx,
      join: "round",
      cap: "round",
      color: style.color,
      opacity: 1,
    });
  },

  append(data, payload, ctx) {
    if (!payload || typeof payload !== "object") return false;
    const p = payload as {
      x?: number | number[] | Float32Array | Float64Array;
      y?: number | number[] | Float32Array | Float64Array;
      max?: number;
    };
    if (p.x == null || p.y == null) return false;

    const offsetX = ctx.axisOffset.x ?? data.offsetX ?? 0;
    const offsetY = ctx.axisOffset.y ?? data.offsetY ?? 0;
    if (typeof p.x === "number" && typeof p.y === "number") {
      const needed = data.count + 1;
      if (needed > data.capacity) {
        const nextCap = Math.max(data.capacity * 2, needed, 16);
        const nextX = new Float32Array(nextCap);
        const nextY = new Float32Array(nextCap);
        nextX.set(data.x.subarray(0, data.count), 0);
        nextY.set(data.y.subarray(0, data.count), 0);
        data.x = nextX;
        data.y = nextY;
        data.capacity = nextCap;
      }
      data.x[data.count] = p.x - offsetX;
      data.y[data.count] = p.y - offsetY;
      data.count = needed;
      data.offsetX = offsetX;
      data.offsetY = offsetY;
    } else {
      const addX = toFloat32(p.x as NumericArray, offsetX);
      const addY = toFloat32(p.y as NumericArray, offsetY);

      if (addX.length !== addY.length) return false;

      const addCount = addX.length;
      const needed = data.count + addCount;
      if (needed > data.capacity) {
        const nextCap = Math.max(data.capacity * 2, needed, 16);
        const nextX = new Float32Array(nextCap);
        const nextY = new Float32Array(nextCap);
        nextX.set(data.x.subarray(0, data.count), 0);
        nextY.set(data.y.subarray(0, data.count), 0);
        data.x = nextX;
        data.y = nextY;
        data.capacity = nextCap;
      }

      data.x.set(addX, data.count);
      data.y.set(addY, data.count);
      data.count = needed;
      data.offsetX = offsetX;
      data.offsetY = offsetY;
    }

    if (typeof p.max === "number" && p.max > 0 && data.count > p.max) {
      const drop = data.count - p.max;
      data.x.copyWithin(0, drop, data.count);
      data.y.copyWithin(0, drop, data.count);
      data.count = p.max;
    }

    return true;
  },

  write(data, input, ctx) {
    if (
      !(input.x instanceof Float32Array) ||
      !(input.y instanceof Float32Array)
    ) {
      return false;
    }
    const count = Math.min(input.x.length, input.y.length);
    data.x = input.x;
    data.y = input.y;
    data.count = count;
    data.capacity = count;
    data.widthPx = input.widthPx ?? data.widthPx;
    data.offsetX = ctx.axisOffset.x ?? data.offsetX ?? 0;
    data.offsetY = ctx.axisOffset.y ?? data.offsetY ?? 0;
    return true;
  },

  getDatum(data, index) {
    return datumXY(data, index);
  },

  hitTest({ seriesId, data, wx, wy, tolx, toly }) {
    const count = Math.min(data.count, data.x.length, data.y.length);
    return hitTestPolyline(seriesId, data.x, data.y, count, wx, wy, tolx, toly);
  },
};

export type StepInput = {
  kind: typeof SeriesKinds.step;
  x: NumericArray;
  y: NumericArray;
  widthPx?: number;
  align?: "start" | "center" | "end";
};

type StepData = {
  x: Float32Array;
  y: Float32Array;
  count: number;
  widthPx: number;
  align: "start" | "center" | "end";
  offsetX: number;
  offsetY: number;
};

export const StepSeries: SeriesAdapter<StepInput, StepData> = {
  kind: SeriesKinds.step,

  normalize(input, ctx) {
    const offsetX = ctx.axisOffset.x ?? 0;
    const offsetY = ctx.axisOffset.y ?? 0;
    const x = toFloat32(input.x, offsetX);
    const y = toFloat32(input.y, offsetY);
    const count = Math.min(x.length, y.length);
    return {
      x,
      y,
      count,
      widthPx: input.widthPx ?? 1,
      align: input.align ?? "end",
      offsetX,
      offsetY,
    };
  },

  buildPrimitives({ data, style, out, scratch }) {
    const count = Math.min(data.count, data.x.length, data.y.length);
    if (count < 2) return;
    const pts = scratch.f32((count * 2 - 1) * 2);
    const o = fillStepPoints(data.x, data.y, count, data.align, pts);
    if (o <= 0) return;
    out.push({
      kind: "path",
      points: pts.subarray(0, o),
      count: o / 2,
      widthPx: data.widthPx,
      join: "miter",
      cap: "butt",
      color: style.color,
      opacity: 1,
    });
  },

  write(data, input, ctx) {
    if (
      !(input.x instanceof Float32Array) ||
      !(input.y instanceof Float32Array)
    ) {
      return false;
    }
    const count = Math.min(input.x.length, input.y.length);
    data.x = input.x;
    data.y = input.y;
    data.count = count;
    data.widthPx = input.widthPx ?? data.widthPx;
    data.align = input.align ?? data.align;
    data.offsetX = ctx.axisOffset.x ?? data.offsetX ?? 0;
    data.offsetY = ctx.axisOffset.y ?? data.offsetY ?? 0;
    return true;
  },

  getDatum(data, index) {
    return datumXY(data, index);
  },

  hitTest({ seriesId, data, wx, wy, tolx, toly }) {
    const count = Math.min(data.count, data.x.length, data.y.length);
    return hitTestPolyline(seriesId, data.x, data.y, count, wx, wy, tolx, toly);
  },
};

type ScatterShape = "square" | "round" | "circle";

export type ScatterInput = {
  kind: typeof SeriesKinds.scatter;
  x: NumericArray;
  y: NumericArray;
  sizePx?: number;
  shape?: ScatterShape;
  strokeWidthPx?: number;
};

type ScatterData = {
  x: Float32Array;
  y: Float32Array;
  count: number;
  sizePx: number;
  shape: ScatterShape;
  strokeWidthPx: number;
  grid?: ScatterGrid;
  offsetX: number;
  offsetY: number;
};

type ScatterGrid = {
  minX: number;
  minY: number;
  spanX: number;
  spanY: number;
  gx: number;
  gy: number;
  offsets: Uint32Array;
  indices: Uint32Array;
};

function buildScatterGrid(
  x: Float32Array,
  y: Float32Array,
  count: number,
): ScatterGrid | undefined {
  if (count <= 0) return undefined;
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (let i = 0; i < count; i++) {
    const xv = x[i] ?? 0;
    const yv = y[i] ?? 0;
    if (xv < minX) minX = xv;
    if (xv > maxX) maxX = xv;
    if (yv < minY) minY = yv;
    if (yv > maxY) maxY = yv;
  }
  if (!Number.isFinite(minX) || !Number.isFinite(minY)) return undefined;
  const spanX = Math.max(1e-9, maxX - minX);
  const spanY = Math.max(1e-9, maxY - minY);
  const target = Math.min(256, Math.max(32, Math.floor(Math.sqrt(count / 4))));
  const gx = target;
  const gy = target;
  const cellCount = gx * gy;
  const counts = new Uint32Array(cellCount);
  for (let i = 0; i < count; i++) {
    const ix = Math.min(
      gx - 1,
      Math.max(0, Math.floor((((x[i] ?? 0) - minX) / spanX) * gx)),
    );
    const iy = Math.min(
      gy - 1,
      Math.max(0, Math.floor((((y[i] ?? 0) - minY) / spanY) * gy)),
    );
    const cell = iy * gx + ix;
    counts[cell] = (counts[cell] ?? 0) + 1;
  }
  const offsets = new Uint32Array(cellCount + 1);
  for (let i = 0; i < cellCount; i++) {
    offsets[i + 1] = (offsets[i] ?? 0) + (counts[i] ?? 0);
  }
  const indices = new Uint32Array(count);
  const cursor = counts.slice();
  for (let i = 0; i < count; i++) {
    const ix = Math.min(
      gx - 1,
      Math.max(0, Math.floor((((x[i] ?? 0) - minX) / spanX) * gx)),
    );
    const iy = Math.min(
      gy - 1,
      Math.max(0, Math.floor((((y[i] ?? 0) - minY) / spanY) * gy)),
    );
    const cell = iy * gx + ix;
    const offset = offsets[cell] ?? 0;
    const cursorVal = cursor[cell] ?? 0;
    const dest = offset + (cursorVal - 1);
    indices[dest] = i;
    cursor[cell] = cursorVal - 1;
  }
  return { minX, minY, spanX, spanY, gx, gy, offsets, indices };
}

export const ScatterSeries: SeriesAdapter<ScatterInput, ScatterData> = {
  kind: SeriesKinds.scatter,

  normalize(input, ctx) {
    const offsetX = ctx.axisOffset.x ?? 0;
    const offsetY = ctx.axisOffset.y ?? 0;
    const x = toFloat32(input.x, offsetX);
    const y = toFloat32(input.y, offsetY);
    const count = Math.min(x.length, y.length);
    return {
      x,
      y,
      count,
      sizePx: input.sizePx ?? 4,
      shape: input.shape ?? "square",
      strokeWidthPx: input.strokeWidthPx ?? 1,
      grid: buildScatterGrid(x, y, count),
      offsetX,
      offsetY,
    };
  },

  buildPrimitives({ data, style, out, scratch }) {
    const count = Math.min(data.count, data.x.length, data.y.length);
    const centers = scratch.f32(count * 2);
    for (let i = 0; i < count; i++) {
      centers[i * 2] = data.x[i] ?? 0;
      centers[i * 2 + 1] = data.y[i] ?? 0;
    }
    const roundness =
      data.shape === "circle" ? 1 : data.shape === "round" ? 0.35 : 0;
    out.push({
      kind: "quad",
      mode: "marker",
      centers,
      count,
      sizePx: data.sizePx,
      fill: style.color,
      stroke: style.color,
      strokeWidthPx: data.strokeWidthPx,
      roundness,
      opacity: 1,
    });
  },

  getDatum(data, index) {
    return datumXY(data, index);
  },

  hitTest({ seriesId, data, wx, wy, tolx, toly }) {
    const count = Math.min(data.count, data.x.length, data.y.length);
    const grid = data.grid;
    let bestIndex = -1;
    let bestDist2 = Infinity;
    if (grid) {
      const minX = wx - tolx;
      const maxX = wx + tolx;
      const minY = wy - toly;
      const maxY = wy + toly;
      const ix0 = Math.max(
        0,
        Math.min(
          grid.gx - 1,
          Math.floor(((minX - grid.minX) / grid.spanX) * grid.gx),
        ),
      );
      const ix1 = Math.max(
        0,
        Math.min(
          grid.gx - 1,
          Math.floor(((maxX - grid.minX) / grid.spanX) * grid.gx),
        ),
      );
      const iy0 = Math.max(
        0,
        Math.min(
          grid.gy - 1,
          Math.floor(((minY - grid.minY) / grid.spanY) * grid.gy),
        ),
      );
      const iy1 = Math.max(
        0,
        Math.min(
          grid.gy - 1,
          Math.floor(((maxY - grid.minY) / grid.spanY) * grid.gy),
        ),
      );
      for (let iy = iy0; iy <= iy1; iy++) {
        for (let ix = ix0; ix <= ix1; ix++) {
          const cell = iy * grid.gx + ix;
          const start = grid.offsets[cell] ?? 0;
          const end = grid.offsets[cell + 1] ?? start;
          for (let i = start; i < end; i++) {
            const idx = grid.indices[i] ?? 0;
            if (idx >= count) continue;
            const dx = wx - (data.x[idx] ?? 0);
            if (Math.abs(dx) > tolx) continue;
            const dy = wy - (data.y[idx] ?? 0);
            if (Math.abs(dy) > toly) continue;
            const dist2 = dx * dx + dy * dy;
            if (dist2 < bestDist2) {
              bestDist2 = dist2;
              bestIndex = idx;
            }
          }
        }
      }
    } else {
      for (let i = 0; i < count; i++) {
        const dx = wx - (data.x[i] ?? 0);
        if (Math.abs(dx) > tolx) continue;
        const dy = wy - (data.y[i] ?? 0);
        if (Math.abs(dy) > toly) continue;
        const dist2 = dx * dx + dy * dy;
        if (dist2 < bestDist2) {
          bestDist2 = dist2;
          bestIndex = i;
        }
      }
    }
    if (bestIndex < 0) return null;
    return {
      hit: { kind: "series-point", seriesId, index: bestIndex },
      dist2: bestDist2,
    };
  },
};

export type BarsInput = {
  kind: typeof SeriesKinds.bars;
  x: NumericArray;
  y: NumericArray;
  width?: number;
};

type BarsData = {
  x: Float32Array;
  y: Float32Array;
  width: number;
  offsetX: number;
  offsetY: number;
};

export const BarsSeries: SeriesAdapter<BarsInput, BarsData> = {
  kind: SeriesKinds.bars,

  normalize(input, ctx) {
    const offsetX = ctx.axisOffset.x ?? 0;
    const offsetY = ctx.axisOffset.y ?? 0;
    const x = toFloat32(input.x, offsetX);
    const y = toFloat32(input.y, offsetY);
    return { x, y, width: input.width ?? 1, offsetX, offsetY };
  },

  buildPrimitives({ data, style, out, scratch }) {
    const count = Math.min(data.x.length, data.y.length);
    const rects = scratch.f32(count * 4);
    const baseY = -data.offsetY;
    for (let i = 0; i < count; i++) {
      const x = data.x[i] ?? 0;
      const y = data.y[i] ?? 0;
      rects[i * 4] = x - data.width * 0.5;
      rects[i * 4 + 1] = baseY;
      rects[i * 4 + 2] = data.width;
      rects[i * 4 + 3] = y - baseY;
    }
    out.push({
      kind: "quad",
      mode: "rect",
      rects,
      count,
      fill: style.color,
      stroke: style.color,
      strokeWidthPx: 0,
      roundness: 0,
      opacity: 1,
    });
  },

  hitTest({ seriesId, data, wx, wy, tolx, toly }) {
    const count = Math.min(data.x.length, data.y.length);
    const half = data.width * 0.5;
    const baseY = -data.offsetY;
    let bestIndex = -1;
    let bestDist2 = Infinity;
    for (let i = 0; i < count; i++) {
      const x = data.x[i] ?? 0;
      const y = data.y[i] ?? 0;
      const x0 = x - half;
      const x1 = x + half;
      const y0 = Math.min(baseY, y);
      const y1 = Math.max(baseY, y);
      if (wx < x0 - tolx || wx > x1 + tolx) continue;
      if (wy < y0 - toly || wy > y1 + toly) continue;
      const dx = wx - x;
      const dist2 = dx * dx;
      if (dist2 < bestDist2) {
        bestDist2 = dist2;
        bestIndex = i;
      }
    }
    if (bestIndex < 0) return null;
    return {
      hit: { kind: "series-point", seriesId, index: bestIndex },
      dist2: bestDist2,
    };
  },
};

export type BandInput = {
  kind: typeof SeriesKinds.band;
  x: NumericArray;
  y0: NumericArray;
  y1: NumericArray;
  opacity?: number;
};

type BandData = {
  x: Float32Array;
  y0: Float32Array;
  y1: Float32Array;
  opacity: number;
  offsetX: number;
  offsetY: number;
};

export const BandSeries: SeriesAdapter<BandInput, BandData> = {
  kind: SeriesKinds.band,

  normalize(input, ctx) {
    const offsetX = ctx.axisOffset.x ?? 0;
    const offsetY = ctx.axisOffset.y ?? 0;
    const x = toFloat32(input.x, offsetX);
    const y0 = toFloat32(input.y0, offsetY);
    const y1 = toFloat32(input.y1, offsetY);
    return { x, y0, y1, opacity: input.opacity ?? 0.2, offsetX, offsetY };
  },

  buildPrimitives({ data, style, out, scratch }) {
    const count = Math.min(data.x.length, data.y0.length, data.y1.length);
    if (count < 2) return;
    const tris = scratch.f32((count - 1) * 12);
    let o = 0;
    for (let i = 0; i < count - 1; i++) {
      const x0 = data.x[i]!;
      const x1 = data.x[i + 1]!;
      const y0a = data.y0[i]!;
      const y0b = data.y0[i + 1]!;
      const y1a = data.y1[i]!;
      const y1b = data.y1[i + 1]!;
      tris[o++] = x0;
      tris[o++] = y0a;
      tris[o++] = x0;
      tris[o++] = y1a;
      tris[o++] = x1;
      tris[o++] = y1b;
      tris[o++] = x0;
      tris[o++] = y0a;
      tris[o++] = x1;
      tris[o++] = y1b;
      tris[o++] = x1;
      tris[o++] = y0b;
    }
    out.push({
      kind: "mesh",
      positions: tris,
      count: (count - 1) * 6,
      fill: style.color,
      opacity: data.opacity,
    });
  },
};

export type CandlesInput = { kind: typeof SeriesKinds.candles };

export const CandlesSeries: SeriesAdapter<CandlesInput, {}> = {
  kind: SeriesKinds.candles,

  normalize(_input, _ctx) {
    return {};
  },

  buildPrimitives() {
    return;
  },
};

type GuideHLineInput = {
  kind: typeof ItemKinds.guideH;
  y: number;
  color?: Color;
  widthPx?: number;
};

type GuideHLineData = { y: number; color: Color; widthPx: number };

export const GuideHLine: ItemAdapter<GuideHLineInput, GuideHLineData> = {
  kind: ItemKinds.guideH,

  normalize(input) {
    return {
      y: input.y,
      color: input.color ?? ([0.7, 0.7, 0.7, 1] as const),
      widthPx: input.widthPx ?? 1,
    };
  },

  buildPrimitives({ data, out, scratch, view, axisOffset }) {
    const offsetX = axisOffset?.x ?? 0;
    const offsetY = axisOffset?.y ?? 0;
    pushGuideLine(
      out,
      scratch,
      view.world.x.min - offsetX,
      data.y - offsetY,
      view.world.x.max - offsetX,
      data.y - offsetY,
      data.widthPx,
      data.color,
    );
  },
};

type GuideVLineInput = {
  kind: typeof ItemKinds.guideV;
  x: number;
  color?: Color;
  widthPx?: number;
};

type GuideVLineData = { x: number; color: Color; widthPx: number };

export const GuideVLine: ItemAdapter<GuideVLineInput, GuideVLineData> = {
  kind: ItemKinds.guideV,

  normalize(input) {
    return {
      x: input.x,
      color: input.color ?? ([0.7, 0.7, 0.7, 1] as const),
      widthPx: input.widthPx ?? 1,
    };
  },

  buildPrimitives({ data, out, scratch, view, axisOffset }) {
    const offsetX = axisOffset?.x ?? 0;
    const offsetY = axisOffset?.y ?? 0;
    pushGuideLine(
      out,
      scratch,
      data.x - offsetX,
      view.world.y.min - offsetY,
      data.x - offsetX,
      view.world.y.max - offsetY,
      data.widthPx,
      data.color,
    );
  },
};

type RectInput = {
  kind: typeof ItemKinds.rect;
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
  fill?: Color;
  stroke?: Color;
  strokeWidthPx?: number;
};

type RectData = {
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
  fill: Color;
  stroke: Color;
  strokeWidthPx: number;
};

export const RectItem: ItemAdapter<RectInput, RectData> = {
  kind: ItemKinds.rect,

  normalize(input) {
    return {
      xMin: input.xMin,
      xMax: input.xMax,
      yMin: input.yMin,
      yMax: input.yMax,
      fill: input.fill ?? ([0.2, 0.6, 1, 0.15] as const),
      stroke: input.stroke ?? ([0.2, 0.6, 1, 1] as const),
      strokeWidthPx: input.strokeWidthPx ?? 2,
    };
  },

  buildPrimitives({ data, out, scratch, axisOffset }) {
    const offsetX = axisOffset?.x ?? 0;
    const offsetY = axisOffset?.y ?? 0;
    pushRectQuad({
      out,
      scratch,
      x: data.xMin - offsetX,
      y: data.yMin - offsetY,
      width: data.xMax - data.xMin,
      height: data.yMax - data.yMin,
      fill: data.fill,
      stroke: data.stroke,
      strokeWidthPx: data.strokeWidthPx,
    });
  },

  handles({ data }) {
    return [
      { handleId: 0, x: data.xMin, y: data.yMin, sizePx: 8 },
      { handleId: 1, x: data.xMax, y: data.yMin, sizePx: 8 },
      { handleId: 2, x: data.xMax, y: data.yMax, sizePx: 8 },
      { handleId: 3, x: data.xMin, y: data.yMax, sizePx: 8 },
    ];
  },

  applyEdit({ data, edit }) {
    if (edit.kind !== "drag-handle") return data;
    let { xMin, xMax, yMin, yMax } = data;
    if (!Number.isFinite(edit.now.x) || !Number.isFinite(edit.now.y)) {
      return data;
    }
    if (edit.handleId === 0) {
      xMin = edit.now.x;
      yMin = edit.now.y;
    } else if (edit.handleId === 1) {
      xMax = edit.now.x;
      yMin = edit.now.y;
    } else if (edit.handleId === 2) {
      xMax = edit.now.x;
      yMax = edit.now.y;
    } else if (edit.handleId === 3) {
      xMin = edit.now.x;
      yMax = edit.now.y;
    }
    const nxMin = Math.min(xMin, xMax);
    const nxMax = Math.max(xMin, xMax);
    const nyMin = Math.min(yMin, yMax);
    const nyMax = Math.max(yMin, yMax);
    return { ...data, xMin: nxMin, xMax: nxMax, yMin: nyMin, yMax: nyMax };
  },

  hitTest({ itemId, data, wx, wy }) {
    const xMin = Math.min(data.xMin, data.xMax);
    const xMax = Math.max(data.xMin, data.xMax);
    const yMin = Math.min(data.yMin, data.yMax);
    const yMax = Math.max(data.yMin, data.yMax);
    if (wx >= xMin && wx <= xMax && wy >= yMin && wy <= yMax) {
      return { hit: { kind: "item", itemId }, dist2: 0 };
    }
    return null;
  },
};

type XBandInput = {
  kind: typeof ItemKinds.xBand;
  xMin: number;
  xMax: number;
  fill?: Color;
  stroke?: Color;
  strokeWidthPx?: number;
};

type XBandData = {
  xMin: number;
  xMax: number;
  fill: Color;
  stroke: Color;
  strokeWidthPx: number;
};

export const XBandItem: ItemAdapter<XBandInput, XBandData> = {
  kind: ItemKinds.xBand,

  normalize(input) {
    return {
      xMin: input.xMin,
      xMax: input.xMax,
      fill: input.fill ?? ([0.2, 0.6, 1, 0.12] as const),
      stroke: input.stroke ?? ([0.2, 0.6, 1, 0.6] as const),
      strokeWidthPx: input.strokeWidthPx ?? 1,
    };
  },

  buildPrimitives({ data, out, scratch, view, axisOffset }) {
    const offsetX = axisOffset?.x ?? 0;
    const offsetY = axisOffset?.y ?? 0;
    pushRectQuad({
      out,
      scratch,
      x: data.xMin - offsetX,
      y: view.world.y.min - offsetY,
      width: data.xMax - data.xMin,
      height: view.world.y.max - view.world.y.min,
      fill: data.fill,
      stroke: data.stroke,
      strokeWidthPx: data.strokeWidthPx,
    });
  },
};

type YBandInput = {
  kind: typeof ItemKinds.yBand;
  yMin: number;
  yMax: number;
  fill?: Color;
  stroke?: Color;
  strokeWidthPx?: number;
};

type YBandData = {
  yMin: number;
  yMax: number;
  fill: Color;
  stroke: Color;
  strokeWidthPx: number;
};

export const YBandItem: ItemAdapter<YBandInput, YBandData> = {
  kind: ItemKinds.yBand,

  normalize(input) {
    return {
      yMin: input.yMin,
      yMax: input.yMax,
      fill: input.fill ?? ([0.2, 0.6, 1, 0.12] as const),
      stroke: input.stroke ?? ([0.2, 0.6, 1, 0.6] as const),
      strokeWidthPx: input.strokeWidthPx ?? 1,
    };
  },

  buildPrimitives({ data, out, scratch, view, axisOffset }) {
    const offsetX = axisOffset?.x ?? 0;
    const offsetY = axisOffset?.y ?? 0;
    pushRectQuad({
      out,
      scratch,
      x: view.world.x.min - offsetX,
      y: data.yMin - offsetY,
      width: view.world.x.max - view.world.x.min,
      height: data.yMax - data.yMin,
      fill: data.fill,
      stroke: data.stroke,
      strokeWidthPx: data.strokeWidthPx,
    });
  },
};
