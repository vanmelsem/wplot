import { Registry } from "../shared/registry";

export type SeriesId = number;
export type SeriesKind = string;

export const BuiltInSeriesKinds = {
  line: "series/line",
  step: "series/step",
  scatter: "series/scatter",
  bars: "series/bars",
  band: "series/band",
  candles: "series/candles",
  infiniteLines: "series/infinite-lines",
} as const;

export type RgbaColor = readonly [
  number,
  number,
  number,
  number,
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
  x: { min: number; max: number };
  y: { min: number; max: number };
};

export interface SeriesModelAdapter<TInput, TState, TDatum, TAppend = TInput> {
  readonly kind: SeriesKind;
  normalize(input: TInput, ctx: SeriesNormalizeContext): TState;
  append?(state: TState, payload: TAppend, ctx: SeriesNormalizeContext): boolean;
  appendMany?(
    state: TState,
    payloads: readonly TAppend[],
    ctx: SeriesNormalizeContext,
  ): boolean;
  replace?(state: TState, input: TInput, ctx: SeriesNormalizeContext): boolean;
  readDatum?(state: TState, index: number): TDatum | null;
  /**
   * Full data bounds in value space, or null when the series has no finite
   * extent (e.g. infinite guide lines) or no data. Drives `view.fit()`.
   */
  extent?(state: TState): SeriesExtent | null;
}

export class SeriesModelRegistry extends Registry<
  SeriesModelAdapter<any, any, any, any>
> {
  constructor() {
    super("series kind");
  }
}
