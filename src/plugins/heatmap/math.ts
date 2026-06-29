// Pure, DOM-free math for the heatmap extension. Everything here is exercised by
// unit tests; the WebGPU/Canvas-2D renderers build on top of it.

import type { Colormap } from "./colormap";

/** The data rect: the value-space rectangle the grid covers, plus its dimensions. */
export type HeatmapRect = {
  /** Value-space X of the first column edge. */
  x0: number;
  /** Value-space X of the last column edge. */
  x1: number;
  /** Value-space Y of the first row edge. */
  y0: number;
  /** Value-space Y of the last row edge. */
  y1: number;
};

/** A pixel-space axis-aligned rectangle (CSS pixels). */
export type PixelRect = {
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
};

/**
 * Project the data rect's value-space corners through a `valueToPx` transform to
 * a pixel-space rectangle. Orientation-agnostic: the Y axis is flipped in screen
 * space, so we min/max the projected corners. Re-running this every frame from
 * the live transform is what keeps the heatmap pixel-perfect under pan/zoom.
 */
export function projectDataRect(
  rect: HeatmapRect,
  valueToPx: (x: number, y: number) => { x: number; y: number },
): PixelRect {
  const a = valueToPx(rect.x0, rect.y0);
  const b = valueToPx(rect.x1, rect.y1);
  const left = Math.min(a.x, b.x);
  const right = Math.max(a.x, b.x);
  const top = Math.min(a.y, b.y);
  const bottom = Math.max(a.y, b.y);
  return { left, top, right, bottom, width: right - left, height: bottom - top };
}

/**
 * Resolve the value range used for color mapping. Any of `valueMin`/`valueMax`
 * left undefined is inferred from the finite entries of `values`. Guards against
 * an empty/degenerate range so callers never divide by zero.
 */
export function inferValueRange(
  values: Float32Array | ReadonlyArray<number>,
  valueMin?: number,
  valueMax?: number,
): { min: number; max: number } {
  const needMin = valueMin === undefined;
  const needMax = valueMax === undefined;
  let min = needMin ? Infinity : valueMin;
  let max = needMax ? -Infinity : valueMax;
  if (needMin || needMax) {
    for (let i = 0; i < values.length; i += 1) {
      const v = values[i]!;
      if (!Number.isFinite(v)) continue;
      if (needMin && v < min) min = v;
      if (needMax && v > max) max = v;
    }
  }
  if (!Number.isFinite(min)) min = 0;
  if (!Number.isFinite(max)) max = min + 1;
  if (max <= min) max = min + 1;
  return { min, max };
}

/**
 * Bake the grid into a row-major rgba8 buffer (length `rows * cols * 4`) by
 * normalizing each value against `range` and looking it up in `colormap`. Row 0
 * is the top of the data rect (value Y = `y1`); column 0 is the left (`x0`).
 */
export function buildRgbaGrid(
  values: Float32Array | ReadonlyArray<number>,
  rows: number,
  cols: number,
  range: { min: number; max: number },
  colormap: Colormap,
): Uint8ClampedArray<ArrayBuffer> {
  const span = range.max - range.min || 1;
  const count = rows * cols;
  const out = new Uint8ClampedArray(count * 4);
  for (let i = 0; i < count; i += 1) {
    const t = (values[i]! - range.min) / span;
    const [r, g, b, a] = colormap(t);
    const o = i * 4;
    out[o] = r;
    out[o + 1] = g;
    out[o + 2] = b;
    out[o + 3] = a;
  }
  return out;
}
