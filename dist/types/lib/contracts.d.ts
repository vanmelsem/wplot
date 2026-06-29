import type { BandSeriesInput, BarsSeriesInput, CandlesSeriesInput } from "../core/domain/range_series";
import type { InfiniteLinesSeriesInput } from "../core/domain/infinite_lines_series";
import type { LineSeriesInput, ScatterSeriesInput, StepSeriesInput } from "../core/domain/time_value_series";
import type { Color } from "../core/shared/geometry";
export declare const SeriesKinds: {
    readonly line: "series/line";
    readonly step: "series/step";
    readonly scatter: "series/scatter";
    readonly bars: "series/bars";
    readonly band: "series/band";
    readonly candles: "series/candles";
    readonly infiniteLines: "series/infinite-lines";
};
export type SeriesKind = (typeof SeriesKinds)[keyof typeof SeriesKinds];
export type SeriesId = number;
export type SeriesInput = LineSeriesInput | StepSeriesInput | ScatterSeriesInput | BandSeriesInput | BarsSeriesInput | CandlesSeriesInput | InfiniteLinesSeriesInput;
/**
 * Input for a plugin-registered custom series kind. Built-in kinds are fully
 * typed via {@link SeriesInput}; custom kinds (registered with
 * `plot.registerSeries`) use this open shape, so they need no cast.
 */
export type CustomSeriesInput = {
    kind: string;
} & Record<string, unknown>;
export type SeriesView = Readonly<{
    id: SeriesId;
    name: string;
    kind: SeriesKind;
    color: Color;
    visible: boolean;
    showInLegend: boolean;
}>;
export type ObjectKind = string;
export type ObjectId = number;
/** Input for any registered object kind (built-in core ships none; see the plugin). */
export type ObjectInput = {
    kind: string;
} & Record<string, unknown>;
/** Alias kept for API symmetry with {@link CustomSeriesInput}. */
export type CustomObjectInput = {
    kind: string;
} & Record<string, unknown>;
export type ObjectState = Record<string, unknown>;
export type ObjectStatePatch = Record<string, unknown>;
export type ObjectRecord = Readonly<{
    id: ObjectId;
    kind: ObjectKind;
    state: ObjectState;
    visible: boolean;
    locked: boolean;
}>;
