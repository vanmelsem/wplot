import type { Colormap } from "./colormap";
/**
 * A heatmap is a big-data raster covering the value-space rectangle
 * `(x0, y0)`–`(x1, y1)`, sampled on a `rows` x `cols` grid stored row-major in
 * `values` (length `rows * cols`). Row 0 is the top of the rect (value Y = `y1`),
 * column 0 is the left (value X = `x0`).
 */
export type HeatmapData = {
    x0: number;
    x1: number;
    y0: number;
    y1: number;
    rows: number;
    cols: number;
    values: Float32Array;
    /** Lower end of the color range. Inferred from `values` when omitted. */
    valueMin?: number;
    /** Upper end of the color range. Inferred from `values` when omitted. */
    valueMax?: number;
    /** Color mapping. Defaults to viridis. */
    colormap?: Colormap;
    /** Magnification filtering. Defaults to `"nearest"` (crisp texels). */
    sampling?: "nearest" | "linear";
};
export type HeatmapOptions = {
    /** Force the Canvas-2D fallback even when WebGPU is available. */
    forceCanvas2d?: boolean;
};
