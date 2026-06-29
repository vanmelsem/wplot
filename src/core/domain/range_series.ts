import {
  normalizeNumericVector,
  type NumericVector,
} from "../storage/time_series_store";
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

export type BandSeriesInput = {
  kind: typeof BuiltInSeriesKinds.band;
  x: NumericVector;
  y0: NumericVector;
  y1: NumericVector;
  opacity?: number;
};

export type BarsSeriesInput = {
  kind: typeof BuiltInSeriesKinds.bars;
  x: NumericVector;
  y: NumericVector;
  y0?: NumericVector | number;
  width?: number;
};

export type CandlesSeriesInput = {
  kind: typeof BuiltInSeriesKinds.candles;
  x: NumericVector;
  open: NumericVector;
  high: NumericVector;
  low: NumericVector;
  close: NumericVector;
  width?: number;
  upColor?: RgbaColor;
  downColor?: RgbaColor;
};

export type BandSeriesAppendPayload = {
  x?: number | NumericVector;
  y0?: number | NumericVector;
  y1?: number | NumericVector;
  max?: number;
};

export type BarsSeriesAppendPayload = {
  x?: number | NumericVector;
  y?: number | NumericVector;
  y0?: number | NumericVector;
  max?: number;
};

export type CandlesSeriesAppendPayload = {
  x?: number | NumericVector;
  open?: number | NumericVector;
  high?: number | NumericVector;
  low?: number | NumericVector;
  close?: number | NumericVector;
  max?: number;
};

export type BandSeriesDatum = {
  x: number;
  y0: number;
  y1: number;
};

export type BarsSeriesDatum = {
  x: number;
  y: number;
  y0: number;
};

export type CandlesSeriesDatum = {
  x: number;
  open: number;
  high: number;
  low: number;
  close: number;
};

type RangeSeriesState = StoreBackedSeriesState;

export type BandSeriesState = RangeSeriesState & {
  opacity: number;
};

export type BarsSeriesState = RangeSeriesState & {
  baseY: number;
  width: number;
};

export type CandlesSeriesState = RangeSeriesState & {
  width: number;
  upColor?: RgbaColor;
  downColor?: RgbaColor;
};

function fillFloat64(length: number, value: number): Float64Array {
  const out = new Float64Array(length);
  out.fill(value);
  return out;
}

function yVectorOrScalar(
  input: NumericVector | number | undefined,
  length: number,
  offsetY: number,
  fallback: number,
): NumericVector {
  if (input == null) return fillFloat64(length, fallback);
  if (typeof input === "number") return fillFloat64(length, input - offsetY);
  return normalizeNumericVector(input, offsetY);
}

function readBandDatum(
  state: BandSeriesState,
  index: number,
): BandSeriesDatum | null {
  const datum = readStoreBackedDatum(state, index, ["y0", "y1"] as const);
  return datum ? { x: datum.x, y0: datum.y0, y1: datum.y1 } : null;
}

function readBarsDatum(
  state: BarsSeriesState,
  index: number,
): BarsSeriesDatum | null {
  const datum = readStoreBackedDatum(state, index, ["y", "y0"] as const);
  return datum ? { x: datum.x, y: datum.y, y0: datum.y0 } : null;
}

function readCandlesDatum(
  state: CandlesSeriesState,
  index: number,
): CandlesSeriesDatum | null {
  const datum = readStoreBackedDatum(state, index, [
    "open",
    "high",
    "low",
    "close",
  ] as const);
  return datum
    ? {
        x: datum.x,
        open: datum.open,
        high: datum.high,
        low: datum.low,
        close: datum.close,
      }
    : null;
}

function resolveBarsBase(
  inputBase: NumericVector | number | undefined,
  offsetY: number,
  fallbackBase: number,
): number {
  return typeof inputBase === "number" ? inputBase - offsetY : fallbackBase;
}

function appendBarsPayload(
  state: BarsSeriesState,
  payload: BarsSeriesAppendPayload,
  ctx: SeriesNormalizeContext,
): boolean {
  if (payload.x == null || payload.y == null) return false;
  const offsetX = ctx.axisOffsetX;
  const offsetY = ctx.axisOffsetY;
  setStoreBackedOffsets(state, ctx);

  if (typeof payload.x === "number" && typeof payload.y === "number") {
    const y0 =
      typeof payload.y0 === "number"
        ? payload.y0 - offsetY
        : state.baseY;
    appendStoreBackedPoint(
      state,
      payload.x - offsetX,
      {
        y: payload.y - offsetY,
        y0,
      },
      payload.max,
    );
    return true;
  }
  if (typeof payload.x === "number" || typeof payload.y === "number") {
    return false;
  }

  const x = normalizeNumericVector(payload.x, offsetX);
  const y = normalizeNumericVector(payload.y, offsetY);
  const y0 = yVectorOrScalar(payload.y0, y.length, offsetY, state.baseY);
  if (x.length !== y.length || x.length !== y0.length) return false;
  return appendStoreBackedBatch(state, x, { y, y0 }, payload.max);
}

function appendBandPayload(
  state: BandSeriesState,
  payload: BandSeriesAppendPayload,
  ctx: SeriesNormalizeContext,
): boolean {
  if (payload.x == null || payload.y0 == null || payload.y1 == null) return false;
  const offsetX = ctx.axisOffsetX;
  const offsetY = ctx.axisOffsetY;
  setStoreBackedOffsets(state, ctx);

  if (
    typeof payload.x === "number" &&
    typeof payload.y0 === "number" &&
    typeof payload.y1 === "number"
  ) {
    appendStoreBackedPoint(
      state,
      payload.x - offsetX,
      {
        y0: payload.y0 - offsetY,
        y1: payload.y1 - offsetY,
      },
      payload.max,
    );
    return true;
  }
  if (
    typeof payload.x === "number" ||
    typeof payload.y0 === "number" ||
    typeof payload.y1 === "number"
  ) {
    return false;
  }

  const x = normalizeNumericVector(payload.x, offsetX);
  const y0 = normalizeNumericVector(payload.y0, offsetY);
  const y1 = normalizeNumericVector(payload.y1, offsetY);
  if (x.length !== y0.length || x.length !== y1.length) return false;
  return appendStoreBackedBatch(state, x, { y0, y1 }, payload.max);
}

function appendCandlesPayload(
  state: CandlesSeriesState,
  payload: CandlesSeriesAppendPayload,
  ctx: SeriesNormalizeContext,
): boolean {
  if (
    payload.x == null ||
    payload.open == null ||
    payload.high == null ||
    payload.low == null ||
    payload.close == null
  ) {
    return false;
  }
  const offsetX = ctx.axisOffsetX;
  const offsetY = ctx.axisOffsetY;
  setStoreBackedOffsets(state, ctx);

  if (
    typeof payload.x === "number" &&
    typeof payload.open === "number" &&
    typeof payload.high === "number" &&
    typeof payload.low === "number" &&
    typeof payload.close === "number"
  ) {
    appendStoreBackedPoint(
      state,
      payload.x - offsetX,
      {
        open: payload.open - offsetY,
        high: payload.high - offsetY,
        low: payload.low - offsetY,
        close: payload.close - offsetY,
      },
      payload.max,
    );
    return true;
  }
  if (
    typeof payload.x === "number" ||
    typeof payload.open === "number" ||
    typeof payload.high === "number" ||
    typeof payload.low === "number" ||
    typeof payload.close === "number"
  ) {
    return false;
  }

  const x = normalizeNumericVector(payload.x, offsetX);
  const open = normalizeNumericVector(payload.open, offsetY);
  const high = normalizeNumericVector(payload.high, offsetY);
  const low = normalizeNumericVector(payload.low, offsetY);
  const close = normalizeNumericVector(payload.close, offsetY);
  const count = Math.min(x.length, open.length, high.length, low.length, close.length);
  if (
    count <= 0 ||
    x.length !== count ||
    open.length !== count ||
    high.length !== count ||
    low.length !== count ||
    close.length !== count
  ) {
    return false;
  }
  return appendStoreBackedBatch(
    state,
    x,
    { open, high, low, close },
    payload.max,
  );
}

export const BandSeriesModelAdapter: SeriesModelAdapter<
  BandSeriesInput,
  BandSeriesState,
  BandSeriesDatum,
  BandSeriesAppendPayload
> = {
  kind: BuiltInSeriesKinds.band,

  normalize(input, ctx) {
    return {
      ...createStoreBackedSeriesState(
        input.x,
        { y0: input.y0, y1: input.y1 },
        ctx,
      ),
      opacity: input.opacity ?? 0.2,
    };
  },

  append(state, payload, ctx) {
    return appendBandPayload(state, payload, ctx);
  },

  appendMany(state, payloads, ctx) {
    for (let i = 0; i < payloads.length; i += 1) {
      if (!appendBandPayload(state, payloads[i]!, ctx)) return false;
    }
    return true;
  },

  replace(state, input, ctx) {
    state.opacity = input.opacity ?? state.opacity;
    replaceStoreBackedSeriesState(
      state,
      input.x,
      { y0: input.y0, y1: input.y1 },
      ctx,
    );
    return true;
  },

  readDatum(state, index) {
    return readBandDatum(state, index);
  },

  extent(state) {
    return storeBackedExtent(state, ["y0", "y1"]);
  },
};

export const BarsSeriesModelAdapter: SeriesModelAdapter<
  BarsSeriesInput,
  BarsSeriesState,
  BarsSeriesDatum,
  BarsSeriesAppendPayload
> = {
  kind: BuiltInSeriesKinds.bars,

  normalize(input, ctx) {
    const offsetY = ctx.axisOffsetY;
    const baseY = resolveBarsBase(input.y0, offsetY, -offsetY);
    return {
      ...createStoreBackedSeriesState(
        input.x,
        {
          y: input.y,
          y0: yVectorOrScalar(input.y0, input.y.length, offsetY, baseY),
        },
        ctx,
      ),
      baseY,
      width: input.width ?? 1,
    };
  },

  append(state, payload, ctx) {
    return appendBarsPayload(state, payload, ctx);
  },

  appendMany(state, payloads, ctx) {
    for (let i = 0; i < payloads.length; i += 1) {
      if (!appendBarsPayload(state, payloads[i]!, ctx)) return false;
    }
    return true;
  },

  replace(state, input, ctx) {
    const offsetY = ctx.axisOffsetY;
    state.width = input.width ?? state.width;
    state.baseY = resolveBarsBase(input.y0, offsetY, state.baseY);
    replaceStoreBackedSeriesState(
      state,
      input.x,
      {
        y: input.y,
        y0: yVectorOrScalar(input.y0, input.y.length, offsetY, state.baseY),
      },
      ctx,
    );
    return true;
  },

  readDatum(state, index) {
    return readBarsDatum(state, index);
  },

  extent(state) {
    return storeBackedExtent(state, ["y", "y0"]);
  },
};

export const CandlesSeriesModelAdapter: SeriesModelAdapter<
  CandlesSeriesInput,
  CandlesSeriesState,
  CandlesSeriesDatum,
  CandlesSeriesAppendPayload
> = {
  kind: BuiltInSeriesKinds.candles,

  normalize(input, ctx) {
    return {
      ...createStoreBackedSeriesState(
        input.x,
        {
          open: input.open,
          high: input.high,
          low: input.low,
          close: input.close,
        },
        ctx,
      ),
      width: input.width ?? 0.8,
      upColor: input.upColor,
      downColor: input.downColor,
    };
  },

  append(state, payload, ctx) {
    return appendCandlesPayload(state, payload, ctx);
  },

  appendMany(state, payloads, ctx) {
    for (let i = 0; i < payloads.length; i += 1) {
      if (!appendCandlesPayload(state, payloads[i]!, ctx)) return false;
    }
    return true;
  },

  replace(state, input, ctx) {
    state.width = input.width ?? state.width;
    state.upColor = input.upColor ?? state.upColor;
    state.downColor = input.downColor ?? state.downColor;
    replaceStoreBackedSeriesState(
      state,
      input.x,
      {
        open: input.open,
        high: input.high,
        low: input.low,
        close: input.close,
      },
      ctx,
    );
    return true;
  },

  readDatum(state, index) {
    return readCandlesDatum(state, index);
  },

  extent(state) {
    // low/high bound the open/close, so they bound the whole candle.
    return storeBackedExtent(state, ["low", "high"]);
  },
};
