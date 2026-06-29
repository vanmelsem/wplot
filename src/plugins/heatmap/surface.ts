// Backing-store sizing shared by the WebGPU and Canvas-2D heatmap renderers. The
// runtime syncs the layer canvas CSS size (style.width/height) each frame; the
// renderer owns the backing-store resolution (CSS pixels x devicePixelRatio).

export type CanvasSize = {
  /** CSS pixels. */
  cssW: number;
  cssH: number;
  /** Device (backing-store) pixels. */
  deviceW: number;
  deviceH: number;
};

function cssSize(canvas: HTMLCanvasElement): { w: number; h: number } {
  const styleW = parseFloat(canvas.style.width);
  const styleH = parseFloat(canvas.style.height);
  const w = Number.isFinite(styleW) && styleW > 0 ? styleW : canvas.clientWidth;
  const h = Number.isFinite(styleH) && styleH > 0 ? styleH : canvas.clientHeight;
  return { w: Math.max(1, Math.round(w)), h: Math.max(1, Math.round(h)) };
}

/**
 * Ensure the canvas backing store matches CSS size x dpr, resizing only when it
 * changed (resizing clears the canvas, so avoid doing it every frame). Returns
 * both the CSS and device dimensions.
 */
export function ensureBackingSize(
  canvas: HTMLCanvasElement,
  dpr: number,
): CanvasSize {
  const { w: cssW, h: cssH } = cssSize(canvas);
  const ratio = dpr > 0 ? dpr : 1;
  const deviceW = Math.max(1, Math.round(cssW * ratio));
  const deviceH = Math.max(1, Math.round(cssH * ratio));
  if (canvas.width !== deviceW) canvas.width = deviceW;
  if (canvas.height !== deviceH) canvas.height = deviceH;
  return { cssW, cssH, deviceW, deviceH };
}
