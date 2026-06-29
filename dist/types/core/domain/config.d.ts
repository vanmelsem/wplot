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
    axisMode?: {
        x?: Partial<AxisSpec>;
        y?: Partial<AxisSpec>;
    };
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
    axisMode?: {
        x?: Partial<AxisSpec>;
        y?: Partial<AxisSpec>;
    };
    yAxes?: AxisDef[];
    layout?: LayoutConfigUpdate;
};
export declare const DefaultPlotConfig: PlotConfig;
export declare function resolveAxisSpec(partial?: Partial<AxisSpec>): AxisSpec;
/** Resolve a secondary-axis declaration into a full {@link AxisSpec}. */
export declare function resolveAxisDefSpec(def: AxisDef): AxisSpec;
export declare function clonePlotConfig(config: PlotConfig): PlotConfig;
export declare function resolvePlotConfig(prev: PlotConfig, patch?: PlotConfigUpdate): PlotConfig;
export declare function getConfiguredAxisSpec(config: PlotConfig, axis: AxisId): AxisSpec;
