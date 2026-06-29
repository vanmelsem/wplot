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
export declare function projectDataRect(rect: HeatmapRect, valueToPx: (x: number, y: number) => {
    x: number;
    y: number;
}): PixelRect;
/**
 * Resolve the value range used for color mapping. Any of `valueMin`/`valueMax`
 * left undefined is inferred from the finite entries of `values`. Guards against
 * an empty/degenerate range so callers never divide by zero.
 */
export declare function inferValueRange(values: Float32Array | ReadonlyArray<number>, valueMin?: number, valueMax?: number): {
    min: number;
    max: number;
};
/**
 * Bake the grid into a row-major rgba8 buffer (length `rows * cols * 4`) by
 * normalizing each value against `range` and looking it up in `colormap`. Row 0
 * is the top of the data rect (value Y = `y1`); column 0 is the left (`x0`).
 */
export declare function buildRgbaGrid(values: Float32Array | ReadonlyArray<number>, rows: number, cols: number, range: {
    min: number;
    max: number;
}, colormap: Colormap): Uint8ClampedArray<ArrayBuffer>;
