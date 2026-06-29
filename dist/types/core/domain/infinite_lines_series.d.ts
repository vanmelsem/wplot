import { type StoredNumericArray } from "../storage/time_series_store";
import { BuiltInSeriesKinds, type RgbaColor, type SeriesModelAdapter } from "./series";
/**
 * Infinite-lines series: full-height vertical lines at each `x` and/or
 * full-width horizontal lines at each `y`, spanning the current view.
 */
export type InfiniteLinesSeriesInput = {
    kind: typeof BuiltInSeriesKinds.infiniteLines;
    x?: readonly number[];
    y?: readonly number[];
    color?: RgbaColor;
    widthPx?: number;
};
export type InfiniteLinesSeriesState = {
    x: StoredNumericArray;
    y: StoredNumericArray;
    offsetX: number;
    offsetY: number;
    color?: RgbaColor;
    widthPx: number;
};
export type InfiniteLinesDatum = {
    x?: number;
    y?: number;
};
export declare const InfiniteLinesSeriesModelAdapter: SeriesModelAdapter<InfiniteLinesSeriesInput, InfiniteLinesSeriesState, InfiniteLinesDatum>;
