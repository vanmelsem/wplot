import type { Plugin } from "../../lib/plugin";
import type { HeatmapData, HeatmapOptions } from "./types";
/**
 * Render a colormapped 2D grid as a backdrop layer under the series. The grid is
 * re-projected from the live transform every frame, so it stays aligned on
 * pan/zoom. Uses WebGPU when available, otherwise a Canvas-2D fallback.
 */
export declare function heatmap(data: HeatmapData, options?: HeatmapOptions): Plugin;
export type { HeatmapData, HeatmapOptions } from "./types";
export type { Colormap, Rgba } from "./colormap";
export { viridis, grayscale, buildColormapLut } from "./colormap";
export { projectDataRect, inferValueRange, buildRgbaGrid, type HeatmapRect, type PixelRect, } from "./math";
export { isWebgpuAvailable } from "./webgpu";
