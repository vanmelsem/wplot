import { type NumericVector } from "../storage/time_series_store";
import { BuiltInSeriesKinds, type RgbaColor, type SeriesModelAdapter } from "./series";
import { type StoreBackedSeriesState } from "./store_backed_series";
export type BandSeriesInput = {
    kind: typeof BuiltInSeriesKinds.band;
    x: NumericVector;
    y0: NumericVector;
    y1: NumericVector;
    opacity?: number;
};
export type BarsSeriesInput = {
    kind: typeof BuiltInSeriesKinds.bars;
    x: NumericVector;
    y: NumericVector;
    y0?: NumericVector | number;
    width?: number;
};
export type CandlesSeriesInput = {
    kind: typeof BuiltInSeriesKinds.candles;
    x: NumericVector;
    open: NumericVector;
    high: NumericVector;
    low: NumericVector;
    close: NumericVector;
    width?: number;
    upColor?: RgbaColor;
    downColor?: RgbaColor;
};
export type BandSeriesAppendPayload = {
    x?: number | NumericVector;
    y0?: number | NumericVector;
    y1?: number | NumericVector;
    max?: number;
};
export type BarsSeriesAppendPayload = {
    x?: number | NumericVector;
    y?: number | NumericVector;
    y0?: number | NumericVector;
    max?: number;
};
export type CandlesSeriesAppendPayload = {
    x?: number | NumericVector;
    open?: number | NumericVector;
    high?: number | NumericVector;
    low?: number | NumericVector;
    close?: number | NumericVector;
    max?: number;
};
export type BandSeriesDatum = {
    x: number;
    y0: number;
    y1: number;
};
export type BarsSeriesDatum = {
    x: number;
    y: number;
    y0: number;
};
export type CandlesSeriesDatum = {
    x: number;
    open: number;
    high: number;
    low: number;
    close: number;
};
type RangeSeriesState = StoreBackedSeriesState;
export type BandSeriesState = RangeSeriesState & {
    opacity: number;
};
export type BarsSeriesState = RangeSeriesState & {
    baseY: number;
    width: number;
};
export type CandlesSeriesState = RangeSeriesState & {
    width: number;
    upColor?: RgbaColor;
    downColor?: RgbaColor;
};
export declare const BandSeriesModelAdapter: SeriesModelAdapter<BandSeriesInput, BandSeriesState, BandSeriesDatum, BandSeriesAppendPayload>;
export declare const BarsSeriesModelAdapter: SeriesModelAdapter<BarsSeriesInput, BarsSeriesState, BarsSeriesDatum, BarsSeriesAppendPayload>;
export declare const CandlesSeriesModelAdapter: SeriesModelAdapter<CandlesSeriesInput, CandlesSeriesState, CandlesSeriesDatum, CandlesSeriesAppendPayload>;
export {};
