import type { ScaleMode } from "../domain/config";
import type { ViewValue } from "../domain/view";
import type { RenderLayout } from "../render/layout";

export type Viewport = {
  value: ViewValue;
  dpr: number;
  canvas: RenderLayout["canvas"];
  plot: RenderLayout["plot"];
  scales: RenderLayout["scales"];
};

type AxisTransform = {
  mode: ScaleMode;
  valueMin: number;
  valueMax: number;
  pxMin: number;
  pxMax: number;
  scale: number;
  invScale: number;
  logMin?: number;
  logMax?: number;
};

export type ViewTransform = {
  x: AxisTransform;
  y: AxisTransform;
  originX: number;
  originY: number;
  widthPx: number;
  heightPx: number;
  dpr: number;
};

function buildAxisTransform(
  min: number,
  max: number,
  pxMin: number,
  pxMax: number,
  mode: ScaleMode,
): AxisTransform {
  if (mode === "log" && min > 0 && max > 0) {
    const logMin = Math.log10(min);
    const logMax = Math.log10(max);
    const scale = (pxMax - pxMin) / (logMax - logMin || 1);
    return {
      mode,
      valueMin: min,
      valueMax: max,
      pxMin,
      pxMax,
      scale,
      invScale: 1 / scale,
      logMin,
      logMax,
    };
  }
  const scale = (pxMax - pxMin) / (max - min || 1);
  return {
    mode: "linear",
    valueMin: min,
    valueMax: max,
    pxMin,
    pxMax,
    scale,
    invScale: 1 / scale,
  };
}

export function createViewport(
  layout: RenderLayout,
  view: ViewValue,
): Viewport {
  return {
    value: {
      x: { min: view.x.min, max: view.x.max },
      y: { min: view.y.min, max: view.y.max },
    },
    dpr: layout.dpr,
    canvas: {
      width: layout.canvas.width,
      height: layout.canvas.height,
    },
    plot: {
      origin: { x: layout.plot.origin.x, y: layout.plot.origin.y },
      size: { width: layout.plot.size.width, height: layout.plot.size.height },
    },
    scales: layout.scales,
  };
}

export function buildViewTransform(args: {
  viewport: Viewport;
  scaleX: ScaleMode;
  scaleY: ScaleMode;
}): ViewTransform {
  const { viewport, scaleX, scaleY } = args;
  return {
    x: buildAxisTransform(
      viewport.value.x.min,
      viewport.value.x.max,
      viewport.plot.origin.x,
      viewport.plot.origin.x + viewport.plot.size.width,
      scaleX,
    ),
    y: buildAxisTransform(
      viewport.value.y.min,
      viewport.value.y.max,
      viewport.plot.origin.y + viewport.plot.size.height,
      viewport.plot.origin.y,
      scaleY,
    ),
    originX: viewport.plot.origin.x,
    originY: viewport.plot.origin.y,
    widthPx: viewport.plot.size.width,
    heightPx: viewport.plot.size.height,
    dpr: viewport.dpr,
  };
}

function valueToPxAxis(transform: AxisTransform, value: number): number {
  if (
    transform.mode === "log" &&
    transform.logMin != null &&
    transform.logMax != null &&
    value > 0
  ) {
    return transform.pxMin + (Math.log10(value) - transform.logMin) * transform.scale;
  }
  return transform.pxMin + (value - transform.valueMin) * transform.scale;
}

function pxToValueAxis(transform: AxisTransform, px: number): number {
  if (
    transform.mode === "log" &&
    transform.logMin != null &&
    transform.logMax != null
  ) {
    const logValue = transform.logMin + (px - transform.pxMin) * transform.invScale;
    return Math.pow(10, logValue);
  }
  return transform.valueMin + (px - transform.pxMin) * transform.invScale;
}

export function valueToPx(
  transform: ViewTransform,
  x: number,
  y: number,
): { x: number; y: number } {
  return {
    x: valueToPxAxis(transform.x, x),
    y: valueToPxAxis(transform.y, y),
  };
}

export function pxToValue(
  transform: ViewTransform,
  x: number,
  y: number,
): { x: number; y: number } {
  return {
    x: pxToValueAxis(transform.x, x),
    y: pxToValueAxis(transform.y, y),
  };
}

export function containsBounds(
  bounds: Viewport["plot"],
  x: number,
  y: number,
): boolean {
  return (
    x >= bounds.origin.x &&
    x <= bounds.origin.x + bounds.size.width &&
    y >= bounds.origin.y &&
    y <= bounds.origin.y + bounds.size.height
  );
}

export function panRangesByPixels(
  transform: ViewTransform,
  dxPx: number,
  dyPx: number,
): ViewValue {
  const dxValue = dxPx / transform.x.scale;
  const dyValue = dyPx / transform.y.scale;
  return {
    x: {
      min: transform.x.valueMin - dxValue,
      max: transform.x.valueMax - dxValue,
    },
    y: {
      min: transform.y.valueMin - dyValue,
      max: transform.y.valueMax - dyValue,
    },
  };
}

export function zoomRange(
  range: { min: number; max: number },
  pivotValue: number,
  factor: number,
  scale: ScaleMode,
): { min: number; max: number } {
  if (scale === "log" && range.min > 0 && range.max > 0 && pivotValue > 0) {
    const logMin = Math.log10(range.min);
    const logMax = Math.log10(range.max);
    const logPivot = Math.log10(pivotValue);
    return {
      min: Math.pow(10, logPivot + (logMin - logPivot) * factor),
      max: Math.pow(10, logPivot + (logMax - logPivot) * factor),
    };
  }
  return {
    min: pivotValue + (range.min - pivotValue) * factor,
    max: pivotValue + (range.max - pivotValue) * factor,
  };
}
