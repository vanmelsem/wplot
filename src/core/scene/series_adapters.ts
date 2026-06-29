import type { TimeSeriesWindow } from "../storage/time_series_store";
import type { BandSeriesState, BarsSeriesState, CandlesSeriesState } from "../domain/range_series";
import type { InfiniteLinesSeriesState } from "../domain/infinite_lines_series";
import type {
  LineSeriesState,
  ScatterSeriesState,
  StepSeriesState,
} from "../domain/time_value_series";
import { BuiltInSeriesKinds, type SeriesRecord } from "../domain/series";
import type { SceneFragment, SeriesSceneAdapter } from "./contracts";
import type { SceneMarker, ScenePrimitive } from "./frame";

function queryWindow(
  state: {
    store: {
      queryWindow(
        xMin: number,
        xMax: number,
        padStart?: number,
        padEnd?: number,
      ): readonly TimeSeriesWindow[];
    };
    offsetX: number;
  },
  xMin: number,
  xMax: number,
  padStart: number,
  padEnd: number,
): TimeSeriesWindow | null {
  const windows = state.store.queryWindow(
    xMin - state.offsetX,
    xMax - state.offsetX,
    padStart,
    padEnd,
  );
  return windows[0] ?? null;
}

function subarray(
  values: Float32Array | Float64Array,
  start: number,
  end: number,
): Float32Array | Float64Array {
  return values.subarray(start, end);
}

/**
 * Per-series reusable Float64Array pool. Scene adapters are singletons shared
 * across every series of their kind and `build()` runs once per frame, so
 * keying the scratch buffer by series id keeps each series' geometry isolated
 * while avoiding a fresh allocation each frame.
 *
 * Buffers grow monotonically (never shrink) and are fully overwritten by the
 * caller every frame. Only the emitted primitive's `count` drives rendering and
 * picking (verified: CanvasRenderer.drawMarkers/drawRects/drawPath and
 * scene/picking iterate `count`, never `buffer.length`), so a buffer larger
 * than the current window is safe — the stale tail is never read.
 */
class ScratchPool {
  private readonly buffers = new Map<number, Float64Array>();

  acquire(id: number, length: number): Float64Array {
    let buf = this.buffers.get(id);
    if (buf === undefined || buf.length < length) {
      buf = new Float64Array(length);
      this.buffers.set(id, buf);
    }
    return buf;
  }
}

function createOrigin(state: { offsetX: number; offsetY: number }) {
  return { x: state.offsetX, y: state.offsetY };
}

function formatSingleValue(value: number | undefined): string | undefined {
  return typeof value === "number" ? value.toFixed(2) : undefined;
}

function fillStepPoints(
  x: Float32Array | Float64Array,
  y: Float32Array | Float64Array,
  count: number,
  align: "start" | "center" | "end",
): Float64Array {
  const out = new Float64Array(Math.max(0, (count * 2 - 1) * 2));
  if (count < 2) return out;
  let o = 0;
  out[o++] = x[0] ?? 0;
  out[o++] = y[0] ?? 0;
  for (let i = 0; i < count - 1; i += 1) {
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
  return out.subarray(0, o);
}

function buildLineLikeWindow(
  record: SeriesRecord<LineSeriesState | StepSeriesState | ScatterSeriesState>,
  padStart: number,
  padEnd: number,
  xMin: number,
  xMax: number,
): {
  x: Float32Array | Float64Array;
  y: Float32Array | Float64Array;
  count: number;
  baseIndex: number;
  start: number;
} | null {
  const window = queryWindow(record.state, xMin, xMax, padStart, padEnd);
  if (!window) return null;
  const y = window.channels.y;
  if (!y) return null;
  const x = subarray(window.x, window.start, window.end);
  const yValues = subarray(y, window.start, window.end);
  const count = Math.min(x.length, yValues.length);
  if (count <= 0) return null;
  return {
    x,
    y: yValues,
    count,
    baseIndex: window.baseIndex,
    start: window.start,
  };
}

const lineFillBaseline = new ScratchPool();

export const LineSeriesSceneAdapter: SeriesSceneAdapter<LineSeriesState> = {
  kind: BuiltInSeriesKinds.line,

  build(record, ctx) {
    const window = buildLineLikeWindow(record, 1, 1, ctx.view.x.min, ctx.view.x.max);
    if (!window) return null;
    const origin = createOrigin(record.state);
    const lastY = window.y[window.count - 1];
    const primitives: ScenePrimitive[] = [];
    if (record.state.fill && window.count >= 2) {
      const baseline = lineFillBaseline.acquire(record.id, window.count);
      baseline.fill(record.state.fillTo, 0, window.count);
      // Shaded area is emitted first so the stroke draws on top of it.
      primitives.push({
        kind: "area",
        x: window.x,
        y0: baseline,
        y1: window.y,
        count: window.count,
        fill: record.state.fill,
        opacity: 1,
        origin,
      });
    }
    primitives.push({
      kind: "path",
      x: window.x,
      y: window.y,
      count: window.count,
      widthPx: record.state.widthPx,
      join: "round",
      cap: "round",
      color: record.style.color,
      opacity: 1,
      origin,
    });
    return {
      primitives,
      picking: [
        {
          kind: "polyline-series",
          seriesId: record.id,
          x: window.x,
          y: window.y,
          count: window.count,
          baseIndex: window.baseIndex,
          origin,
        },
      ],
      legendValueText: formatSingleValue(
        typeof lastY === "number" ? lastY + record.state.offsetY : undefined,
      ),
    };
  },
};

export const StepSeriesSceneAdapter: SeriesSceneAdapter<StepSeriesState> = {
  kind: BuiltInSeriesKinds.step,

  build(record, ctx) {
    const window = buildLineLikeWindow(record, 1, 1, ctx.view.x.min, ctx.view.x.max);
    if (!window || window.count < 2) return null;
    const origin = createOrigin(record.state);
    const points = fillStepPoints(window.x, window.y, window.count, record.state.align);
    const lastY = window.y[window.count - 1];
    return {
      primitives: [
        {
          kind: "path",
          points,
          count: points.length / 2,
          widthPx: record.state.widthPx,
          join: "miter",
          cap: "butt",
          color: record.style.color,
          opacity: 1,
          origin,
        },
      ],
      picking: [
        {
          kind: "polyline-series",
          seriesId: record.id,
          x: window.x,
          y: window.y,
          count: window.count,
          baseIndex: window.baseIndex,
          origin,
        },
      ],
      legendValueText: formatSingleValue(
        typeof lastY === "number" ? lastY + record.state.offsetY : undefined,
      ),
    };
  },
};

const scatterCenters = new ScratchPool();

export const ScatterSeriesSceneAdapter: SeriesSceneAdapter<ScatterSeriesState> = {
  kind: BuiltInSeriesKinds.scatter,

  build(record, ctx) {
    const window = buildLineLikeWindow(record, 0, 0, ctx.view.x.min, ctx.view.x.max);
    if (!window) return null;
    const origin = createOrigin(record.state);
    const centers = scatterCenters.acquire(record.id, window.count * 2);
    for (let i = 0; i < window.count; i += 1) {
      centers[i * 2] = window.x[i] ?? 0;
      centers[i * 2 + 1] = window.y[i] ?? 0;
    }
    const roundness =
      record.state.shape === "circle"
        ? 1
        : record.state.shape === "round"
          ? 0.35
          : 0;
    const lastY = window.y[window.count - 1];
    const marker: SceneMarker = {
      kind: "marker",
      centers,
      count: window.count,
      sizePx: record.state.sizePx,
      fill: record.style.color,
      // Default to a ring in the plot background color so points stand out.
      stroke: record.state.strokeColor ?? ctx.background ?? record.style.color,
      strokeWidthPx: record.state.strokeWidthPx,
      roundness,
      opacity: 1,
      origin,
    };
    const end = window.start + window.count;
    const colors = record.state.colors;
    if (colors) {
      marker.colors = colors.slice(window.start, end);
    }
    const sizes = record.state.sizes;
    if (sizes) {
      marker.sizes =
        sizes instanceof Float32Array
          ? sizes.slice(window.start, end)
          : sizes.slice(window.start, end);
    }
    return {
      primitives: [marker],
      picking: [
        {
          kind: "marker-series",
          seriesId: record.id,
          x: window.x,
          y: window.y,
          count: window.count,
          baseIndex: window.baseIndex,
          origin,
        },
      ],
      legendValueText: formatSingleValue(
        typeof lastY === "number" ? lastY + record.state.offsetY : undefined,
      ),
    };
  },
};

export const BandSeriesSceneAdapter: SeriesSceneAdapter<BandSeriesState> = {
  kind: BuiltInSeriesKinds.band,

  build(record, ctx) {
    const window = queryWindow(record.state, ctx.view.x.min, ctx.view.x.max, 1, 1);
    if (!window) return null;
    const y0 = window.channels.y0;
    const y1 = window.channels.y1;
    if (!y0 || !y1) return null;
    const x = subarray(window.x, window.start, window.end);
    const y0Values = subarray(y0, window.start, window.end);
    const y1Values = subarray(y1, window.start, window.end);
    const count = Math.min(x.length, y0Values.length, y1Values.length);
    if (count < 2) return null;
    return {
      primitives: [
        {
          kind: "area",
          x,
          y0: y0Values,
          y1: y1Values,
          count,
          fill: record.style.color,
          opacity: record.state.opacity,
          origin: createOrigin(record.state),
        },
      ],
    };
  },
};

const barsRects = new ScratchPool();

export const BarsSeriesSceneAdapter: SeriesSceneAdapter<BarsSeriesState> = {
  kind: BuiltInSeriesKinds.bars,

  build(record, ctx) {
    const window = queryWindow(record.state, ctx.view.x.min, ctx.view.x.max, 1, 1);
    if (!window) return null;
    const y = window.channels.y;
    const y0 = window.channels.y0;
    if (!y || !y0) return null;
    const x = subarray(window.x, window.start, window.end);
    const yValues = subarray(y, window.start, window.end);
    const y0Values = subarray(y0, window.start, window.end);
    const count = Math.min(x.length, yValues.length, y0Values.length);
    if (count <= 0) return null;
    const rects = barsRects.acquire(record.id, count * 4);
    for (let i = 0; i < count; i += 1) {
      const xValue = x[i] ?? 0;
      const yValue = yValues[i] ?? 0;
      const yBase = y0Values[i] ?? record.state.baseY;
      rects[i * 4] = xValue - record.state.width * 0.5;
      rects[i * 4 + 1] = yBase;
      rects[i * 4 + 2] = record.state.width;
      rects[i * 4 + 3] = yValue - yBase;
    }
    const lastY = yValues[count - 1];
    const origin = createOrigin(record.state);
    return {
      primitives: [
        {
          kind: "rect",
          rects,
          count,
          fill: record.style.color,
          stroke: record.style.color,
          strokeWidthPx: 0,
          roundness: 0,
          opacity: 1,
          origin,
        },
      ],
      picking: [
        {
          kind: "bars-series",
          seriesId: record.id,
          x,
          y: yValues,
          y0: y0Values,
          count,
          width: record.state.width,
          baseIndex: window.baseIndex,
          origin,
        },
      ],
      legendValueText: formatSingleValue(
        typeof lastY === "number" ? lastY + record.state.offsetY : undefined,
      ),
    };
  },
};

// Candles split into up/down groups whose sizes vary per frame, so each group
// gets its own per-series pool (keyed by series id inside ScratchPool).
const candleUpRects = new ScratchPool();
const candleDownRects = new ScratchPool();
const candleUpWicks = new ScratchPool();
const candleDownWicks = new ScratchPool();

export const CandlesSeriesSceneAdapter: SeriesSceneAdapter<CandlesSeriesState> = {
  kind: BuiltInSeriesKinds.candles,

  build(record, ctx) {
    const window = queryWindow(record.state, ctx.view.x.min, ctx.view.x.max, 1, 1);
    if (!window) return null;
    const open = window.channels.open;
    const high = window.channels.high;
    const low = window.channels.low;
    const close = window.channels.close;
    if (!open || !high || !low || !close) return null;
    const x = subarray(window.x, window.start, window.end);
    const openValues = subarray(open, window.start, window.end);
    const highValues = subarray(high, window.start, window.end);
    const lowValues = subarray(low, window.start, window.end);
    const closeValues = subarray(close, window.start, window.end);
    const count = Math.min(
      x.length,
      openValues.length,
      highValues.length,
      lowValues.length,
      closeValues.length,
    );
    if (count <= 0) return null;

    let upCount = 0;
    let downCount = 0;
    for (let i = 0; i < count; i += 1) {
      if ((closeValues[i] ?? 0) >= (openValues[i] ?? 0)) upCount += 1;
      else downCount += 1;
    }
    const upRects = upCount > 0 ? candleUpRects.acquire(record.id, upCount * 4) : null;
    const downRects =
      downCount > 0 ? candleDownRects.acquire(record.id, downCount * 4) : null;
    const upWicks = upCount > 0 ? candleUpWicks.acquire(record.id, upCount * 4) : null;
    const downWicks =
      downCount > 0 ? candleDownWicks.acquire(record.id, downCount * 4) : null;
    let upIndex = 0;
    let downIndex = 0;
    for (let i = 0; i < count; i += 1) {
      const xValue = x[i] ?? 0;
      const openValue = openValues[i] ?? 0;
      const highValue = highValues[i] ?? 0;
      const lowValue = lowValues[i] ?? 0;
      const closeValue = closeValues[i] ?? 0;
      const bodyMin = Math.min(openValue, closeValue);
      const bodyMax = Math.max(openValue, closeValue);
      const isUp = closeValue >= openValue;
      const rects = isUp ? upRects : downRects;
      const wicks = isUp ? upWicks : downWicks;
      if (!rects || !wicks) continue;
      const target = isUp ? upIndex++ : downIndex++;
      rects[target * 4] = xValue - record.state.width * 0.5;
      rects[target * 4 + 1] = bodyMin;
      rects[target * 4 + 2] = record.state.width;
      rects[target * 4 + 3] = Math.max(0, bodyMax - bodyMin);
      wicks[target * 4] = xValue;
      wicks[target * 4 + 1] = Math.min(lowValue, highValue);
      wicks[target * 4 + 2] = xValue;
      wicks[target * 4 + 3] = Math.max(lowValue, highValue);
    }
    const origin = createOrigin(record.state);
    const primitives = [];
    const upColor = record.state.upColor ?? record.style.color;
    const downColor = record.state.downColor ?? record.style.color;
    if (upRects && upWicks && upCount > 0) {
      primitives.push({
        kind: "path" as const,
        segments: true,
        points: upWicks,
        count: upCount,
        widthPx: 1,
        join: "miter" as const,
        cap: "butt" as const,
        color: upColor,
        opacity: 0.9,
        origin,
      });
      primitives.push({
        kind: "rect" as const,
        rects: upRects,
        count: upCount,
        fill: upColor,
        stroke: upColor,
        strokeWidthPx: 0,
        roundness: 0,
        opacity: 1,
        origin,
      });
    }
    if (downRects && downWicks && downCount > 0) {
      primitives.push({
        kind: "path" as const,
        segments: true,
        points: downWicks,
        count: downCount,
        widthPx: 1,
        join: "miter" as const,
        cap: "butt" as const,
        color: downColor,
        opacity: 0.9,
        origin,
      });
      primitives.push({
        kind: "rect" as const,
        rects: downRects,
        count: downCount,
        fill: downColor,
        stroke: downColor,
        strokeWidthPx: 0,
        roundness: 0,
        opacity: 1,
        origin,
      });
    }
    const lastOpen = openValues[count - 1];
    const lastHigh = highValues[count - 1];
    const lastLow = lowValues[count - 1];
    const lastClose = closeValues[count - 1];
    const valueText =
      typeof lastOpen === "number" &&
      typeof lastHigh === "number" &&
      typeof lastLow === "number" &&
      typeof lastClose === "number"
        ? `O ${(lastOpen + record.state.offsetY).toFixed(2)} H ${(lastHigh + record.state.offsetY).toFixed(2)} L ${(lastLow + record.state.offsetY).toFixed(2)} C ${(lastClose + record.state.offsetY).toFixed(2)}`
        : undefined;
    return {
      primitives,
      picking: [
        {
          kind: "candles-series",
          seriesId: record.id,
          x,
          open: openValues,
          high: highValues,
          low: lowValues,
          close: closeValues,
          count,
          width: record.state.width,
          baseIndex: window.baseIndex,
          origin,
        },
      ],
      legendValueText: valueText,
    };
  },
};

export const InfiniteLinesSeriesSceneAdapter: SeriesSceneAdapter<InfiniteLinesSeriesState> = {
  kind: BuiltInSeriesKinds.infiniteLines,

  build(record, ctx) {
    const state = record.state;
    const xCount = state.x.length;
    const yCount = state.y.length;
    if (xCount + yCount <= 0) return null;
    const origin = { x: state.offsetX, y: state.offsetY };
    const color = state.color ?? record.style.color;
    // View bounds shifted into the series' offset-adjusted coordinate space.
    const yMin = ctx.view.y.min - state.offsetY;
    const yMax = ctx.view.y.max - state.offsetY;
    const xMin = ctx.view.x.min - state.offsetX;
    const xMax = ctx.view.x.max - state.offsetX;
    const primitives: ScenePrimitive[] = [];
    for (let i = 0; i < xCount; i += 1) {
      const xv = state.x[i] ?? 0;
      primitives.push({
        kind: "path",
        points: new Float64Array([xv, yMin, xv, yMax]),
        count: 2,
        widthPx: state.widthPx,
        join: "miter",
        cap: "butt",
        color,
        opacity: 1,
        origin,
      });
    }
    for (let i = 0; i < yCount; i += 1) {
      const yv = state.y[i] ?? 0;
      primitives.push({
        kind: "path",
        points: new Float64Array([xMin, yv, xMax, yv]),
        count: 2,
        widthPx: state.widthPx,
        join: "miter",
        cap: "butt",
        color,
        opacity: 1,
        origin,
      });
    }
    return { primitives };
  },
};
