import {
  normalizeNumericVector,
  type NumericVector,
} from "../storage/time_series_store";
import {
  colorsFromValues,
  type ColormapName,
} from "../shared/colormap";
import {
  BuiltInSeriesKinds,
  type RgbaColor,
  type SeriesModelAdapter,
  type SeriesNormalizeContext,
} from "./series";
import {
  appendStoreBackedBatch,
  appendStoreBackedPoint,
  createStoreBackedSeriesState,
  readStoreBackedDatum,
  storeBackedExtent,
  replaceStoreBackedSeriesState,
  setStoreBackedOffsets,
  type StoreBackedSeriesState,
} from "./store_backed_series";

export type TimeValueDatum = {
  x: number;
  y: number;
};

export type TimeValueAppendPayload = {
  x?: number | NumericVector;
  y?: number | NumericVector;
  max?: number;
};

export type LineSeriesInput = {
  kind: typeof BuiltInSeriesKinds.line;
  x: NumericVector;
  y: NumericVector;
  widthPx?: number;
  /** When set, also shade the area between the line and `fillTo`. */
  fill?: RgbaColor;
  /** Baseline value the fill extends to (in y value space). Defaults to 0. */
  fillTo?: number;
};

export type StepSeriesInput = {
  kind: typeof BuiltInSeriesKinds.step;
  x: NumericVector;
  y: NumericVector;
  widthPx?: number;
  align?: "start" | "center" | "end";
};

export type ScatterShape = "square" | "round" | "circle";

export type ScatterSeriesInput = {
  kind: typeof BuiltInSeriesKinds.scatter;
  x: NumericVector;
  y: NumericVector;
  sizePx?: number;
  shape?: ScatterShape;
  strokeWidthPx?: number;
  strokeColor?: RgbaColor;
  /** Explicit per-point fill colors, aligned 1:1 with x/y. */
  colors?: readonly RgbaColor[];
  /** Per-point diameters in px, aligned 1:1 with x/y. */
  sizes?: Float32Array | readonly number[];
  /**
   * Per-point scalar values auto-mapped to colors via {@link colormap}. Ignored
   * when explicit `colors` are provided.
   */
  colorValues?: readonly number[];
  /** Colormap used to turn `colorValues` into per-point colors. */
  colormap?: ColormapName;
};

type TimeValueSeriesState = StoreBackedSeriesState;

export type LineSeriesState = TimeValueSeriesState & {
  widthPx: number;
  fill?: RgbaColor;
  /** Baseline value the fill extends to, already offset-adjusted (value - offsetY). */
  fillTo: number;
};

export type StepSeriesState = TimeValueSeriesState & {
  widthPx: number;
  align: "start" | "center" | "end";
};

export type ScatterSeriesState = TimeValueSeriesState & {
  sizePx: number;
  shape: ScatterShape;
  strokeWidthPx: number;
  strokeColor?: RgbaColor;
  /** Resolved per-point colors (from `colors` or `colorValues`+`colormap`). */
  colors?: readonly RgbaColor[];
  /** Per-point diameters in px, aligned 1:1 with the stored points. */
  sizes?: Float32Array | readonly number[];
};

function resolveScatterColors(
  input: ScatterSeriesInput,
): readonly RgbaColor[] | undefined {
  if (input.colors) return input.colors;
  const values = input.colorValues;
  if (values && input.colormap) {
    let min = Infinity;
    let max = -Infinity;
    for (let i = 0; i < values.length; i += 1) {
      const v = values[i] ?? 0;
      if (v < min) min = v;
      if (v > max) max = v;
    }
    if (!Number.isFinite(min) || !Number.isFinite(max)) return undefined;
    return colorsFromValues(values, min, max, input.colormap);
  }
  return undefined;
}

function createTimeValueStore(
  x: NumericVector,
  y: NumericVector,
  ctx: SeriesNormalizeContext,
): TimeValueSeriesState {
  return createStoreBackedSeriesState(x, { y }, ctx);
}

function replaceTimeValueStore(
  state: TimeValueSeriesState,
  x: NumericVector,
  y: NumericVector,
  ctx: SeriesNormalizeContext,
): void {
  replaceStoreBackedSeriesState(state, x, { y }, ctx);
}

function appendBatch(
  state: TimeValueSeriesState,
  x: NumericVector,
  y: NumericVector,
  maxCount?: number,
): boolean {
  if (x.length !== y.length) return false;
  return appendStoreBackedBatch(state, x, { y }, maxCount);
}

function appendTimeValuePayload(
  state: TimeValueSeriesState,
  payload: TimeValueAppendPayload,
  ctx: SeriesNormalizeContext,
): boolean {
  if (payload.x == null || payload.y == null) return false;
  const offsetX = ctx.axisOffsetX;
  const offsetY = ctx.axisOffsetY;
  setStoreBackedOffsets(state, ctx);

  if (typeof payload.x === "number" && typeof payload.y === "number") {
    appendStoreBackedPoint(state, payload.x - offsetX, {
      y: payload.y - offsetY,
    }, payload.max);
    return true;
  }
  if (typeof payload.x === "number" || typeof payload.y === "number") {
    return false;
  }

  const x = normalizeNumericVector(payload.x, offsetX);
  const y = normalizeNumericVector(payload.y, offsetY);
  return appendBatch(state, x, y, payload.max);
}

function appendManyTimeValuePayloads(
  state: TimeValueSeriesState,
  payloads: readonly TimeValueAppendPayload[],
  ctx: SeriesNormalizeContext,
): boolean {
  if (payloads.length === 0) return true;
  for (let i = 0; i < payloads.length; i += 1) {
    if (!appendTimeValuePayload(state, payloads[i]!, ctx)) return false;
  }
  return true;
}

function readTimeValueDatum(
  state: TimeValueSeriesState,
  index: number,
): TimeValueDatum | null {
  const datum = readStoreBackedDatum(state, index, ["y"] as const);
  return datum ? { x: datum.x, y: datum.y } : null;
}

export const LineSeriesModelAdapter: SeriesModelAdapter<
  LineSeriesInput,
  LineSeriesState,
  TimeValueDatum,
  TimeValueAppendPayload
> = {
  kind: BuiltInSeriesKinds.line,

  normalize(input, ctx) {
    return {
      ...createTimeValueStore(input.x, input.y, ctx),
      widthPx: input.widthPx ?? 1,
      fill: input.fill,
      fillTo: (input.fillTo ?? 0) - ctx.axisOffsetY,
    };
  },

  append(state, payload, ctx) {
    return appendTimeValuePayload(state, payload, ctx);
  },

  appendMany(state, payloads, ctx) {
    return appendManyTimeValuePayloads(state, payloads, ctx);
  },

  replace(state, input, ctx) {
    state.widthPx = input.widthPx ?? state.widthPx;
    state.fill = input.fill ?? state.fill;
    if (input.fillTo !== undefined) state.fillTo = input.fillTo - ctx.axisOffsetY;
    replaceTimeValueStore(state, input.x, input.y, ctx);
    return true;
  },

  readDatum(state, index) {
    return readTimeValueDatum(state, index);
  },

  extent(state) {
    return storeBackedExtent(state, ["y"]);
  },
};

export const StepSeriesModelAdapter: SeriesModelAdapter<
  StepSeriesInput,
  StepSeriesState,
  TimeValueDatum,
  TimeValueAppendPayload
> = {
  kind: BuiltInSeriesKinds.step,

  normalize(input, ctx) {
    return {
      ...createTimeValueStore(input.x, input.y, ctx),
      widthPx: input.widthPx ?? 1,
      align: input.align ?? "end",
    };
  },

  append(state, payload, ctx) {
    return appendTimeValuePayload(state, payload, ctx);
  },

  appendMany(state, payloads, ctx) {
    return appendManyTimeValuePayloads(state, payloads, ctx);
  },

  replace(state, input, ctx) {
    state.widthPx = input.widthPx ?? state.widthPx;
    state.align = input.align ?? state.align;
    replaceTimeValueStore(state, input.x, input.y, ctx);
    return true;
  },

  readDatum(state, index) {
    return readTimeValueDatum(state, index);
  },

  extent(state) {
    return storeBackedExtent(state, ["y"]);
  },
};

export const ScatterSeriesModelAdapter: SeriesModelAdapter<
  ScatterSeriesInput,
  ScatterSeriesState,
  TimeValueDatum,
  TimeValueAppendPayload
> = {
  kind: BuiltInSeriesKinds.scatter,

  normalize(input, ctx) {
    return {
      ...createTimeValueStore(input.x, input.y, ctx),
      sizePx: input.sizePx ?? 4,
      shape: input.shape ?? "circle",
      strokeWidthPx: input.strokeWidthPx ?? 1,
      strokeColor: input.strokeColor,
      colors: resolveScatterColors(input),
      sizes: input.sizes,
    };
  },

  append(state, payload, ctx) {
    return appendTimeValuePayload(state, payload, ctx);
  },

  appendMany(state, payloads, ctx) {
    return appendManyTimeValuePayloads(state, payloads, ctx);
  },

  replace(state, input, ctx) {
    state.sizePx = input.sizePx ?? state.sizePx;
    state.shape = input.shape ?? state.shape;
    state.strokeWidthPx = input.strokeWidthPx ?? state.strokeWidthPx;
    state.strokeColor = input.strokeColor ?? state.strokeColor;
    state.colors = resolveScatterColors(input) ?? state.colors;
    state.sizes = input.sizes ?? state.sizes;
    replaceTimeValueStore(state, input.x, input.y, ctx);
    return true;
  },

  readDatum(state, index) {
    return readTimeValueDatum(state, index);
  },

  extent(state) {
    return storeBackedExtent(state, ["y"]);
  },
};
