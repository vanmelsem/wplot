import type { RgbaColor } from "./series";

export type AxisId = "x" | "y";
export type ScaleMode = "linear" | "log";
export type AxisMode = "numeric" | "time";
export type TimezoneMode = "utc" | "local";
export type NumericNotation = "auto" | "fixed" | "scientific" | "engineering";
export type TimeDisplay = "absolute" | "relative" | "duration";

export type BoxEdges<T> = {
  top: T;
  right: T;
  bottom: T;
  left: T;
};

export type TickFormatter = (args: {
  axis: AxisId;
  value: number;
  step: number;
  mode: AxisMode;
  scale: ScaleMode;
}) => string;

export interface AxisSpec {
  mode: AxisMode;
  scale: ScaleMode;
  offset?: number;
  timezone?: TimezoneMode;
  notation?: NumericNotation;
  precision?: number;
  timeDisplay?: TimeDisplay;
  formatter?: TickFormatter;
}

/**
 * Declaration of an additional ("secondary") y-axis layered on top of the
 * primary `y` axis. Series target an axis via {@link SeriesRecord.yAxisId};
 * series sharing an axis share its range, while different axes are independent
 * vertically but share the single x-axis. Formatting fields mirror
 * {@link AxisSpec} so secondary axes reuse the same tick pipeline.
 */
export interface AxisDef {
  id: string;
  side: "left" | "right";
  /** Initial range; defaults to the primary y initial range when omitted. */
  min?: number;
  max?: number;
  scale?: ScaleMode;
  mode?: AxisMode;
  offset?: number;
  timezone?: TimezoneMode;
  notation?: NumericNotation;
  precision?: number;
  timeDisplay?: TimeDisplay;
  formatter?: TickFormatter;
  /** Gutter width in px; "auto" reuses the primary y-axis default width. */
  size?: "auto" | number;
  /** Tick-label color; defaults to the primary y-axis `textColor`. */
  textColor?: RgbaColor;
}

export type ScaleLayoutConfig<TSide extends "top" | "bottom" | "left" | "right"> = {
  show: boolean;
  side: TSide;
  min: number;
  size: "auto" | number;
  background: RgbaColor;
  textColor: RgbaColor;
  lineColor: RgbaColor;
  lineWidthPx: number;
};

export interface LayoutConfig {
  margin: BoxEdges<number>;
  xScale: ScaleLayoutConfig<"top" | "bottom">;
  yScale: ScaleLayoutConfig<"left" | "right">;
}

export interface PlotConfig {
  gridSpacing: [number, number];
  gridColor: RgbaColor;
  crosshairColor: RgbaColor;
  crosshairDash: [number, number] | null;
  borderColor: RgbaColor;
  background: RgbaColor;
  internalLod: boolean;
  showStats: boolean;
  showLegend: boolean;
  showCrosshair: boolean;
  showCrosshairLabels: boolean;
  showCursorSeriesMarker: boolean;
  showIndicator: boolean;
  axisMode?: { x?: Partial<AxisSpec>; y?: Partial<AxisSpec> };
  /** Additional y-axes beyond the primary `y`. Omitted in the default config. */
  yAxes?: AxisDef[];
  tickFormatter?: (value: number, step: number, axis: AxisId) => string;
  layout: LayoutConfig;
}

export type LayoutConfigUpdate = Partial<Omit<LayoutConfig, "margin" | "xScale" | "yScale">> & {
  margin?: Partial<BoxEdges<number>>;
  xScale?: Partial<ScaleLayoutConfig<"top" | "bottom">>;
  yScale?: Partial<ScaleLayoutConfig<"left" | "right">>;
};

export type PlotConfigUpdate = Partial<Omit<PlotConfig, "layout" | "axisMode">> & {
  axisMode?: { x?: Partial<AxisSpec>; y?: Partial<AxisSpec> };
  yAxes?: AxisDef[];
  layout?: LayoutConfigUpdate;
};

function defaultScaleLayout<TSide extends "top" | "bottom" | "left" | "right">(
  side: TSide,
  min: number,
): ScaleLayoutConfig<TSide> {
  return {
    show: true,
    side,
    min,
    size: "auto",
    background: [0.058824, 0.058824, 0.058824, 1],
    textColor: [1, 1, 1, 0.92],
    lineColor: [0.159882, 0.159882, 0.159882, 0.88],
    lineWidthPx: 1,
  };
}

export const DefaultPlotConfig: PlotConfig = {
  gridSpacing: [80, 50],
  gridColor: [0.159882, 0.159882, 0.159882, 0.52],
  crosshairColor: [0.55, 0.58, 0.63, 0.96],
  crosshairDash: null,
  borderColor: [0.122222, 0.122222, 0.122222, 1],
  background: [0.058824, 0.058824, 0.058824, 1],
  internalLod: false,
  showStats: false,
  showLegend: false,
  showCrosshair: true,
  showCrosshairLabels: false,
  showCursorSeriesMarker: false,
  showIndicator: true,
  axisMode: {},
  layout: {
    margin: { top: 0, right: 0, bottom: 0, left: 0 },
    xScale: defaultScaleLayout("bottom", 28),
    yScale: defaultScaleLayout("left", 46),
  },
};

export function resolveAxisSpec(partial?: Partial<AxisSpec>): AxisSpec {
  return {
    mode: partial?.mode ?? "numeric",
    scale: partial?.scale ?? "linear",
    offset: partial?.offset,
    timezone: partial?.timezone ?? "local",
    notation: partial?.notation ?? "auto",
    precision: partial?.precision,
    timeDisplay: partial?.timeDisplay ?? "absolute",
    formatter: partial?.formatter,
  };
}

/** Resolve a secondary-axis declaration into a full {@link AxisSpec}. */
export function resolveAxisDefSpec(def: AxisDef): AxisSpec {
  return resolveAxisSpec({
    mode: def.mode,
    scale: def.scale,
    offset: def.offset,
    timezone: def.timezone,
    notation: def.notation,
    precision: def.precision,
    timeDisplay: def.timeDisplay,
    formatter: def.formatter,
  });
}

function cloneAxisDef(def: AxisDef): AxisDef {
  return { ...def };
}

function cloneRgba(color: RgbaColor): RgbaColor {
  return [color[0], color[1], color[2], color[3]];
}

function cloneBoxEdges(edges: BoxEdges<number>): BoxEdges<number> {
  return {
    top: edges.top,
    right: edges.right,
    bottom: edges.bottom,
    left: edges.left,
  };
}

function cloneScaleLayout<TSide extends "top" | "bottom" | "left" | "right">(
  scale: ScaleLayoutConfig<TSide>,
): ScaleLayoutConfig<TSide> {
  return {
    show: scale.show,
    side: scale.side,
    min: scale.min,
    size: scale.size,
    background: cloneRgba(scale.background),
    textColor: cloneRgba(scale.textColor),
    lineColor: cloneRgba(scale.lineColor),
    lineWidthPx: scale.lineWidthPx,
  };
}

function cloneAxisMode(
  axisMode?: { x?: Partial<AxisSpec>; y?: Partial<AxisSpec> },
): { x?: Partial<AxisSpec>; y?: Partial<AxisSpec> } {
  return {
    x: axisMode?.x ? { ...axisMode.x } : undefined,
    y: axisMode?.y ? { ...axisMode.y } : undefined,
  };
}

export function clonePlotConfig(config: PlotConfig): PlotConfig {
  return {
    ...config,
    gridSpacing: [config.gridSpacing[0], config.gridSpacing[1]],
    gridColor: cloneRgba(config.gridColor),
    crosshairColor: cloneRgba(config.crosshairColor),
    crosshairDash: config.crosshairDash
      ? [config.crosshairDash[0], config.crosshairDash[1]]
      : null,
    borderColor: cloneRgba(config.borderColor),
    background: cloneRgba(config.background),
    axisMode: cloneAxisMode(config.axisMode),
    yAxes: config.yAxes ? config.yAxes.map(cloneAxisDef) : undefined,
    layout: {
      margin: cloneBoxEdges(config.layout.margin),
      xScale: cloneScaleLayout(config.layout.xScale),
      yScale: cloneScaleLayout(config.layout.yScale),
    },
  };
}

export function resolvePlotConfig(
  prev: PlotConfig,
  patch?: PlotConfigUpdate,
): PlotConfig {
  const base = clonePlotConfig(prev);
  if (!patch) return base;
  const layoutPatch = patch.layout;
  const layout = layoutPatch
    ? {
        ...base.layout,
        ...layoutPatch,
        margin: { ...base.layout.margin, ...layoutPatch.margin },
        xScale: { ...base.layout.xScale, ...layoutPatch.xScale },
        yScale: { ...base.layout.yScale, ...layoutPatch.yScale },
      }
    : base.layout;
  return {
    ...base,
    ...patch,
    axisMode: {
      ...cloneAxisMode(base.axisMode),
      ...cloneAxisMode(patch.axisMode),
      x: { ...base.axisMode?.x, ...patch.axisMode?.x },
      y: { ...base.axisMode?.y, ...patch.axisMode?.y },
    },
    // Secondary axes are replaced wholesale (not deep-merged): declaring
    // `yAxes` in a patch redefines the full set, mirroring how a caller thinks
    // about axis topology. Omitting it keeps the previously resolved set.
    yAxes: patch.yAxes ? patch.yAxes.map(cloneAxisDef) : base.yAxes,
    layout,
  };
}

export function getConfiguredAxisSpec(
  config: PlotConfig,
  axis: AxisId,
): AxisSpec {
  const partial = axis === "x" ? config.axisMode?.x : config.axisMode?.y;
  const formatter =
    partial?.formatter ??
    (config.tickFormatter
      ? ({ value, step, axis: targetAxis }: {
          axis: AxisId;
          value: number;
          step: number;
          mode: AxisMode;
          scale: ScaleMode;
        }) => config.tickFormatter!(value, step, targetAxis)
      : undefined);
  return resolveAxisSpec({ ...partial, formatter });
}
