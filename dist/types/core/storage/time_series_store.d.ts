export type NumericVector = Float32Array | Float64Array | readonly number[];
export type StoredNumericArray = Float32Array | Float64Array;
export type NumericRange = {
    min: number;
    max: number;
};
export type AxisOffset = {
    x: number;
    y: number;
};
export type TimeSeriesWindow = {
    x: StoredNumericArray;
    channels: Record<string, StoredNumericArray>;
    baseIndex: number;
    start: number;
    end: number;
};
export interface TimeSeriesStore {
    readonly monotonicX: boolean;
    readonly count: number;
    queryWindow(xMin: number, xMax: number, padStart?: number, padEnd?: number): readonly TimeSeriesWindow[];
}
export declare function computeAxisOffset(range: NumericRange, threshold?: number): number;
export declare function normalizeNumericVector(input: NumericVector, offset: number): StoredNumericArray;
export type MutableTimeSeriesStoreInit = {
    x: NumericVector;
    channels: Record<string, NumericVector>;
    count?: number;
    baseIndex?: number;
    monotonicX?: boolean;
};
export declare class MutableTimeSeriesStore implements TimeSeriesStore {
    readonly monotonicX: boolean;
    x: StoredNumericArray;
    channels: Record<string, StoredNumericArray>;
    count: number;
    capacity: number;
    baseIndex: number;
    private readonly channelKeys;
    private readonly queryResult;
    private readonly queryState;
    constructor(init: MutableTimeSeriesStoreInit);
    replace(args: {
        x: NumericVector;
        channels: Record<string, NumericVector>;
        count?: number;
        baseIndex?: number;
    }): void;
    appendPoint(x: number, channels: Record<string, number>): void;
    appendBatch(x: NumericVector, channels: Record<string, NumericVector>): boolean;
    keepLast(maxCount: number): void;
    queryWindow(xMin: number, xMax: number, padStart?: number, padEnd?: number): readonly TimeSeriesWindow[];
    private grow;
}
