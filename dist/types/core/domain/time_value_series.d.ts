import { type NumericVector } from "../storage/time_series_store";
import { type ColormapName } from "../shared/colormap";
import { BuiltInSeriesKinds, type RgbaColor, type SeriesModelAdapter } from "./series";
import { type StoreBackedSeriesState } from "./store_backed_series";
export type TimeValueDatum = {
    x: number;
    y: number;
};
export type TimeValueAppendPayload = {
    x?: number | NumericVector;
    y?: number | NumericVector;
    max?: number;
};
export type LineSeriesInput = {
    kind: typeof BuiltInSeriesKinds.line;
    x: NumericVector;
    y: NumericVector;
    widthPx?: number;
    /** When set, also shade the area between the line and `fillTo`. */
    fill?: RgbaColor;
    /** Baseline value the fill extends to (in y value space). Defaults to 0. */
    fillTo?: number;
};
export type StepSeriesInput = {
    kind: typeof BuiltInSeriesKinds.step;
    x: NumericVector;
    y: NumericVector;
    widthPx?: number;
    align?: "start" | "center" | "end";
};
export type ScatterShape = "square" | "round" | "circle";
export type ScatterSeriesInput = {
    kind: typeof BuiltInSeriesKinds.scatter;
    x: NumericVector;
    y: NumericVector;
    sizePx?: number;
    shape?: ScatterShape;
    strokeWidthPx?: number;
    strokeColor?: RgbaColor;
    /** Explicit per-point fill colors, aligned 1:1 with x/y. */
    colors?: readonly RgbaColor[];
    /** Per-point diameters in px, aligned 1:1 with x/y. */
    sizes?: Float32Array | readonly number[];
    /**
     * Per-point scalar values auto-mapped to colors via {@link colormap}. Ignored
     * when explicit `colors` are provided.
     */
    colorValues?: readonly number[];
    /** Colormap used to turn `colorValues` into per-point colors. */
    colormap?: ColormapName;
};
type TimeValueSeriesState = StoreBackedSeriesState;
export type LineSeriesState = TimeValueSeriesState & {
    widthPx: number;
    fill?: RgbaColor;
    /** Baseline value the fill extends to, already offset-adjusted (value - offsetY). */
    fillTo: number;
};
export type StepSeriesState = TimeValueSeriesState & {
    widthPx: number;
    align: "start" | "center" | "end";
};
export type ScatterSeriesState = TimeValueSeriesState & {
    sizePx: number;
    shape: ScatterShape;
    strokeWidthPx: number;
    strokeColor?: RgbaColor;
    /** Resolved per-point colors (from `colors` or `colorValues`+`colormap`). */
    colors?: readonly RgbaColor[];
    /** Per-point diameters in px, aligned 1:1 with the stored points. */
    sizes?: Float32Array | readonly number[];
};
export declare const LineSeriesModelAdapter: SeriesModelAdapter<LineSeriesInput, LineSeriesState, TimeValueDatum, TimeValueAppendPayload>;
export declare const StepSeriesModelAdapter: SeriesModelAdapter<StepSeriesInput, StepSeriesState, TimeValueDatum, TimeValueAppendPayload>;
export declare const ScatterSeriesModelAdapter: SeriesModelAdapter<ScatterSeriesInput, ScatterSeriesState, TimeValueDatum, TimeValueAppendPayload>;
export {};
