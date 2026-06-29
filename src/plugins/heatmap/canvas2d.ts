// Canvas-2D fallback heatmap renderer. Bakes the colormapped grid into an
// offscreen ImageData once, then each frame blits it (scaled/positioned) into the
// projected data rect, clipped to the plot bounds. Used when WebGPU is absent or
// disabled. All DOM access is deferred to draw-time so importing this module (and
// constructing the layer) stays safe in non-DOM environments.

import type { Layer, LayerFrame } from "../../core/runtime/dom_runtime";
import { viridis } from "./colormap";
import { buildRgbaGrid, inferValueRange, projectDataRect } from "./math";
import { ensureBackingSize } from "./surface";
import type { HeatmapData } from "./types";

export function createCanvas2dHeatmapLayer(data: HeatmapData): Layer {
  const range = inferValueRange(data.values, data.valueMin, data.valueMax);
  const colormap = data.colormap ?? viridis;
  const smoothing = (data.sampling ?? "nearest") === "linear";

  // Lazily built on first draw (needs a DOM document).
  let source: HTMLCanvasElement | null = null;
  let ctx: CanvasRenderingContext2D | null = null;
  let unavailable = false;

  function ensureSource(): HTMLCanvasElement | null {
    if (source || unavailable) return source;
    if (typeof document === "undefined" || data.cols <= 0 || data.rows <= 0) {
      unavailable = true;
      return null;
    }
    const rgba = buildRgbaGrid(
      data.values,
      data.rows,
      data.cols,
      range,
      colormap,
    );
    const canvas = document.createElement("canvas");
    canvas.width = data.cols;
    canvas.height = data.rows;
    const sctx = canvas.getContext("2d");
    if (!sctx) {
      unavailable = true;
      return null;
    }
    sctx.putImageData(new ImageData(rgba, data.cols, data.rows), 0, 0);
    source = canvas;
    return source;
  }

  return {
    draw(frame: LayerFrame): void {
      const canvas = frame.canvas;
      const { cssW, cssH } = ensureBackingSize(canvas, frame.dpr);
      const c = ctx ?? (ctx = canvas.getContext("2d"));
      if (!c) return;

      // Draw in CSS-pixel space; the backing store is dpr-scaled.
      c.setTransform(frame.dpr, 0, 0, frame.dpr, 0, 0);
      c.clearRect(0, 0, cssW, cssH);

      const img = ensureSource();
      if (!img) return;

      const rect = projectDataRect(data, frame.valueToPx);
      if (rect.width <= 0 || rect.height <= 0) return;

      const b = frame.bounds;
      c.save();
      c.beginPath();
      c.rect(b.origin.x, b.origin.y, b.size.width, b.size.height);
      c.clip();
      c.imageSmoothingEnabled = smoothing;
      // Row 0 / column 0 of the grid map to the rect's top-left, so no flip.
      c.drawImage(img, rect.left, rect.top, rect.width, rect.height);
      c.restore();
    },
  };
}
