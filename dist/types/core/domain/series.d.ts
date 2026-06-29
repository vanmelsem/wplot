import { Registry } from "../shared/registry";
export type SeriesId = number;
export type SeriesKind = string;
export declare const BuiltInSeriesKinds: {
    readonly line: "series/line";
    readonly step: "series/step";
    readonly scatter: "series/scatter";
    readonly bars: "series/bars";
    readonly band: "series/band";
    readonly candles: "series/candles";
    readonly infiniteLines: "series/infinite-lines";
};
export type RgbaColor = readonly [
    number,
    number,
    number,
    number
];
export type SeriesStyle = {
    color: RgbaColor;
    visible: boolean;
    showInLegend: boolean;
};
export type SeriesRecord<TState> = {
    id: SeriesId;
    name: string;
    kind: SeriesKind;
    style: SeriesStyle;
    state: TState;
    /**
     * Target y-axis id. Absent (or `"y"`) means the primary y-axis, keeping the
     * default single-axis record shape unchanged. A non-default id selects a
     * secondary axis declared via {@link PlotConfig.yAxes}.
     */
    yAxisId?: string;
};
export type SeriesNormalizeContext = {
    axisOffsetX: number;
    axisOffsetY: number;
};
/** Data bounds of a series in value space, used to auto-fit the view. */
export type SeriesExtent = {
    x: {
        min: number;
        max: number;
    };
    y: {
        min: number;
        max: number;
    };
};
export interface SeriesModelAdapter<TInput, TState, TDatum, TAppend = TInput> {
    readonly kind: SeriesKind;
    normalize(input: TInput, ctx: SeriesNormalizeContext): TState;
    append?(state: TState, payload: TAppend, ctx: SeriesNormalizeContext): boolean;
    appendMany?(state: TState, payloads: readonly TAppend[], ctx: SeriesNormalizeContext): boolean;
    replace?(state: TState, input: TInput, ctx: SeriesNormalizeContext): boolean;
    readDatum?(state: TState, index: number): TDatum | null;
    /**
     * Full data bounds in value space, or null when the series has no finite
     * extent (e.g. infinite guide lines) or no data. Drives `view.fit()`.
     */
    extent?(state: TState): SeriesExtent | null;
}
export declare class SeriesModelRegistry extends Registry<SeriesModelAdapter<any, any, any, any>> {
    constructor();
}
