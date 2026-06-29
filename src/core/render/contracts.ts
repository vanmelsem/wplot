import type { NumericRange } from "../domain/view";
import type { Color, Px } from "../shared/geometry";
import type { RenderLayout } from "./layout";

export type ClampRect = {
  minX: Px;
  maxX: Px;
  minY: Px;
  maxY: Px;
};

export type StrokeJoin = "miter" | "bevel" | "round";
export type StrokeCap = "butt" | "square" | "round";

// Geometry coordinates are in value space. All *Px sizes are px; renderer applies DPR.
// `yRange`, when present, projects this primitive's Y through that range instead
// of the primary view y range (a series riding a secondary y-axis). Absent for
// the common single-axis case.
export type Primitive =
  | {
      kind: "path";
      segments?: boolean;
      points?: Float32Array | Float64Array;
      x?: Float32Array | Float64Array;
      y?: Float32Array | Float64Array;
      count: number;
      widthPx: Px;
      join: StrokeJoin;
      cap: StrokeCap;
      color: Color;
      opacity: number;
      origin?: { x: number; y: number };
      dashed?: { onPx: Px; offPx: Px; phasePx?: Px };
      yRange?: NumericRange;
    }
  | {
      kind: "quad";
      mode: "rect";
      rects: Float32Array | Float64Array;
      count: number;
      fill: Color;
      stroke: Color;
      strokeWidthPx: Px;
      roundness: Px;
      opacity: number;
      origin?: { x: number; y: number };
      yRange?: NumericRange;
    }
  | {
      kind: "quad";
      mode: "marker";
      centers: Float32Array | Float64Array;
      count: number;
      sizePx: Px;
      fill: Color;
      stroke: Color;
      strokeWidthPx: Px;
      roundness: Px;
      opacity: number;
      origin?: { x: number; y: number };
      // Optional per-point fill colors / px diameters, aligned 1:1 with centers.
      colors?: readonly Color[];
      sizes?: Float32Array | readonly number[];
      yRange?: NumericRange;
    }
  | {
      kind: "area";
      x: Float32Array | Float64Array;
      y0: Float32Array | Float64Array;
      y1: Float32Array | Float64Array;
      count: number;
      fill: Color;
      opacity: number;
      origin?: { x: number; y: number };
      yRange?: NumericRange;
    }
  | {
      kind: "mesh";
      positions: Float32Array | Float64Array;
      count: number;
      fill: Color;
      opacity: number;
      origin?: { x: number; y: number };
      yRange?: NumericRange;
    };

export enum TextAlign {
  TopLeft = "top-left",
  Center = "center",
}

export type TextEntry = {
  x: Px;
  y: Px;
  text: string;
  color: Color;
  align: TextAlign;
  fixedBox?: boolean;
  boxOrigin?: { x: Px; y: Px };
  boxTextOffsetY?: Px;
  boxTextBaseline?: "top" | "middle";
  boxTextTrack?: "x-axis";
  clampRect?: ClampRect;
  box?: {
    width: Px;
    height: Px;
    exactWidth?: boolean;
    padX: Px;
    padY: Px;
    background: Color;
    border: Color;
    borderWidth: Px;
  };
};

export type DrawList = {
  viewport: {
    value: {
      x: NumericRange;
      y: NumericRange;
    };
    dpr: number;
    canvas: RenderLayout["canvas"];
    plot: RenderLayout["plot"];
    scales: RenderLayout["scales"];
  };

  background: Color;
  borderColor: Color;
  scaleStyle: {
    x: {
      show: boolean;
      side: "top" | "bottom";
      background: Color;
      textColor: Color;
      lineColor: Color;
      lineWidthPx: Px;
    };
    y: {
      show: boolean;
      side: "left" | "right";
      background: Color;
      textColor: Color;
      lineColor: Color;
      lineWidthPx: Px;
    };
  };

  grid: readonly Primitive[];
  series: readonly Primitive[];
  objects: readonly Primitive[];
  overlays: readonly Primitive[];
  topOverlays: readonly Primitive[];
  text: readonly TextEntry[];
  overlayText: readonly TextEntry[];
  compactLinePaths?: boolean;
  // Precomputed focus decoration + raw accent for the selected object, lifted out
  // of the renderer into the scene adapter contract.
  selectedHighlight?: readonly Primitive[];
  selectedAccent?: Color;
  /** Per-object highlight (keyed by id) for drawing a faint hover affordance. */
  objectHighlights?: ReadonlyMap<number, readonly Primitive[]>;

  cursorIndicator?: { px: Px; color: Color };
  crosshair?: {
    px: Px;
    py: Px;
    axis: "x" | "y" | "xy";
    color: Color;
    dash?: { onPx: Px; offPx: Px };
  };
  stats?: {
    fps: number;
    frameMs: number;
    cpuMs: number;
    gpuMs: number;
    buffers?: {
      name: string;
      count: number;
      budget: number;
      total: number;
      ratio: number;
      color: Color;
    }[];
  };
};

export class Scratch {
  private f32buf = new Float32Array(1024);
  private f32off = 0;
  private f64buf = new Float64Array(1024);
  private f64off = 0;

  reset(): void {
    this.f32off = 0;
    this.f64off = 0;
  }

  f32(n: number): Float32Array {
    if (this.f32off + n > this.f32buf.length) {
      this.f32buf = new Float32Array(
        Math.max(this.f32buf.length * 2, this.f32off + n, 1024),
      );
    }
    const slice = this.f32buf.subarray(this.f32off, this.f32off + n);
    this.f32off += n;
    return slice;
  }

  f64(n: number): Float64Array {
    if (this.f64off + n > this.f64buf.length) {
      this.f64buf = new Float64Array(
        Math.max(this.f64buf.length * 2, this.f64off + n, 1024),
      );
    }
    const slice = this.f64buf.subarray(this.f64off, this.f64off + n);
    this.f64off += n;
    return slice;
  }
}

export type MeasureTextFn = (args: { text: string }) => {
  width: Px;
  height: Px;
};
