import { MutableTimeSeriesStore, type NumericVector } from "../storage/time_series_store";
import type { SeriesNormalizeContext } from "./series";
export type StoreBackedSeriesState = {
    store: MutableTimeSeriesStore;
    offsetX: number;
    offsetY: number;
};
export type ChannelInputMap = Record<string, NumericVector>;
export type ChannelScalarMap = Record<string, number>;
export declare function createStoreBackedSeriesState(x: NumericVector, channels: ChannelInputMap, ctx: SeriesNormalizeContext): StoreBackedSeriesState;
export declare function replaceStoreBackedSeriesState(state: StoreBackedSeriesState, x: NumericVector, channels: ChannelInputMap, ctx: SeriesNormalizeContext): void;
export declare function setStoreBackedOffsets(state: StoreBackedSeriesState, ctx: SeriesNormalizeContext): void;
export declare function appendStoreBackedPoint(state: StoreBackedSeriesState, x: number, channels: ChannelScalarMap, maxCount?: number): void;
export declare function appendStoreBackedBatch(state: StoreBackedSeriesState, x: NumericVector, channels: ChannelInputMap, maxCount?: number): boolean;
/**
 * Data bounds of a store-backed series: x from the (sorted) x column endpoints,
 * y by scanning the given y-channels for min/max. Returns null when empty.
 */
export declare function storeBackedExtent(state: StoreBackedSeriesState, yChannelKeys: readonly string[]): {
    x: {
        min: number;
        max: number;
    };
    y: {
        min: number;
        max: number;
    };
} | null;
export declare function readStoreBackedDatum<TKey extends string>(state: StoreBackedSeriesState, index: number, channelKeys: readonly TKey[]): ({
    x: number;
} & {
    [K in TKey]: number;
}) | null;
