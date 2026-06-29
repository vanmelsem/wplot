// Heatmap extension: a big-data raster delivered as a render LAYER (its own
// stacked canvas behind the series) rather than a scene primitive, so it stays
// pixel-perfect under the series on pan/zoom. WebGPU-accelerated when available,
// with a Canvas-2D fallback. Opt in via `wplot/extensions`:
//
//   import { createPlot } from "wplot";
//   import { heatmap } from "wplot/extensions";
//
//   const plot = createPlot({ host, initialValue });
//   plot.use(heatmap({ x0, x1, y0, y1, rows, cols, values }));

import type { Plugin } from "../../lib/plugin";
import type { Layer } from "../../core/runtime/dom_runtime";
import { createCanvas2dHeatmapLayer } from "./canvas2d";
import { createWebgpuHeatmapLayer, isWebgpuAvailable } from "./webgpu";
import type { HeatmapData, HeatmapOptions } from "./types";

/**
 * Render a colormapped 2D grid as a backdrop layer under the series. The grid is
 * re-projected from the live transform every frame, so it stays aligned on
 * pan/zoom. Uses WebGPU when available, otherwise a Canvas-2D fallback.
 */
export function heatmap(
  data: HeatmapData,
  options: HeatmapOptions = {},
): Plugin {
  return {
    name: "heatmap",
    setup(plot) {
      // WebGPU init is async; redraw once the device is ready (or has failed
      // over to Canvas-2D) so the heatmap paints immediately instead of waiting
      // for the next pointer event.
      const layer: Layer =
        !options.forceCanvas2d && isWebgpuAvailable()
          ? createWebgpuHeatmapLayer(data, () => plot.redraw())
          : createCanvas2dHeatmapLayer(data);
      return plot.addLayer(layer);
    },
  };
}

export type { HeatmapData, HeatmapOptions } from "./types";
export type { Colormap, Rgba } from "./colormap";
export { viridis, grayscale, buildColormapLut } from "./colormap";
export {
  projectDataRect,
  inferValueRange,
  buildRgbaGrid,
  type HeatmapRect,
  type PixelRect,
} from "./math";
export { isWebgpuAvailable } from "./webgpu";
