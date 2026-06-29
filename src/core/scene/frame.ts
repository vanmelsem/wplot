import type { RgbaColor } from "../domain/series";
import type { NumericRange, ViewState } from "../domain/view";

export type SceneOrigin = {
  x: number;
  y: number;
};

/**
 * Optional per-primitive y-axis range. When present, the renderer projects this
 * primitive's Y through this range instead of the primary view's y range — the
 * mechanism that lets a series ride a secondary y-axis. Absent for the common
 * single-axis case, so primary-axis primitives are unchanged.
 */
export type SceneYRange = NumericRange;

export type SceneStrokeJoin = "miter" | "bevel" | "round";
export type SceneStrokeCap = "butt" | "square" | "round";

export type SceneClampRect = {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
};

export type ScenePath = {
  kind: "path";
  segments?: boolean;
  points?: Float32Array | Float64Array;
  x?: Float32Array | Float64Array;
  y?: Float32Array | Float64Array;
  count: number;
  widthPx: number;
  join: SceneStrokeJoin;
  cap: SceneStrokeCap;
  color: RgbaColor;
  opacity: number;
  origin?: SceneOrigin;
  dashed?: { onPx: number; offPx: number; phasePx?: number };
  yRange?: SceneYRange;
};

export type SceneRect = {
  kind: "rect";
  rects: Float32Array | Float64Array;
  count: number;
  fill: RgbaColor;
  stroke: RgbaColor;
  strokeWidthPx: number;
  roundness: number;
  opacity: number;
  origin?: SceneOrigin;
  yRange?: SceneYRange;
};

export type SceneMarker = {
  kind: "marker";
  centers: Float32Array | Float64Array;
  count: number;
  sizePx: number;
  fill: RgbaColor;
  stroke: RgbaColor;
  strokeWidthPx: number;
  roundness: number;
  opacity: number;
  origin?: SceneOrigin;
  /**
   * Optional per-point fill colors, aligned 1:1 with `centers` (entry i applies
   * to point i). When present the renderer draws per-point instead of a single
   * batched fill. When absent every point uses `fill`.
   */
  colors?: readonly RgbaColor[];
  /**
   * Optional per-point diameters in px, aligned 1:1 with `centers`. When present
   * the renderer sizes each point individually; when absent every point uses
   * `sizePx`.
   */
  sizes?: Float32Array | readonly number[];
  yRange?: SceneYRange;
};

export type SceneArea = {
  kind: "area";
  x: Float32Array | Float64Array;
  y0: Float32Array | Float64Array;
  y1: Float32Array | Float64Array;
  count: number;
  fill: RgbaColor;
  opacity: number;
  origin?: SceneOrigin;
  yRange?: SceneYRange;
};

export type SceneTextAlign = "top-left" | "center";

export type SceneText = {
  x: number;
  y: number;
  text: string;
  color: RgbaColor;
  align: SceneTextAlign;
  fixedBox?: boolean;
  boxOrigin?: { x: number; y: number };
  boxTextOffsetY?: number;
  boxTextBaseline?: "top" | "middle";
  boxTextTrack?: "x-axis";
  clampRect?: SceneClampRect;
  box?: {
    width: number;
    height: number;
    exactWidth?: boolean;
    padX: number;
    padY: number;
    background: RgbaColor;
    border: RgbaColor;
    borderWidth: number;
  };
};

export type ScenePrimitive = ScenePath | SceneRect | SceneMarker | SceneArea;

export type SceneFrame = {
  view: ViewState;
  background: RgbaColor;
  grid: readonly ScenePrimitive[];
  series: readonly ScenePrimitive[];
  objects: readonly ScenePrimitive[];
  overlays: readonly ScenePrimitive[];
  labels: readonly SceneText[];
  /** Focus decoration for the selected object, precomputed by the scene builder. */
  selectedHighlight?: readonly ScenePrimitive[];
  /** Raw selection accent of the selected object (drives the handle stroke). */
  selectedAccent?: RgbaColor;
  /**
   * Per-object focus-box highlight (full accent), keyed by object id, for every
   * unlocked object. The overlay pass draws the selected one at full strength and
   * the hovered one faintly — no scene rebuild needed on hover.
   */
  objectHighlights?: ReadonlyMap<number, readonly ScenePrimitive[]>;
};
