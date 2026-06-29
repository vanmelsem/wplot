import type { SeriesExtension } from "../lib/plugin";
/**
 * Reference custom series: a minimal "dots" scatter, implemented entirely
 * through the public extension API. It demonstrates the two halves a series
 * needs — a model adapter (input normalization, datum read-back) and a scene
 * adapter (geometry as draw primitives) — without touching library internals.
 */
export declare const DOTS_SERIES_KIND = "series/dots";
export type DotsSeriesInput = {
    kind: typeof DOTS_SERIES_KIND;
    x: readonly number[];
    y: readonly number[];
    sizePx?: number;
};
type DotsSeriesState = {
    x: Float64Array;
    y: Float64Array;
    sizePx: number;
};
type DotsSeriesDatum = {
    x: number;
    y: number;
};
export declare function dotsSeries(): SeriesExtension<DotsSeriesInput, DotsSeriesState, DotsSeriesDatum>;
export {};
