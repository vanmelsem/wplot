import {
  normalizeNumericVector,
  type StoredNumericArray,
} from "../storage/time_series_store";
import {
  BuiltInSeriesKinds,
  type RgbaColor,
  type SeriesModelAdapter,
  type SeriesNormalizeContext,
} from "./series";

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
  // Offset-adjusted (value - offset) so emitted primitives share the standard
  // {offsetX, offsetY} origin, like every other series.
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

function toStored(
  values: readonly number[] | undefined,
  offset: number,
): StoredNumericArray {
  return normalizeNumericVector(values ?? [], offset);
}

export const InfiniteLinesSeriesModelAdapter: SeriesModelAdapter<
  InfiniteLinesSeriesInput,
  InfiniteLinesSeriesState,
  InfiniteLinesDatum
> = {
  kind: BuiltInSeriesKinds.infiniteLines,

  normalize(input, ctx: SeriesNormalizeContext) {
    return {
      x: toStored(input.x, ctx.axisOffsetX),
      y: toStored(input.y, ctx.axisOffsetY),
      offsetX: ctx.axisOffsetX,
      offsetY: ctx.axisOffsetY,
      color: input.color,
      widthPx: input.widthPx ?? 1,
    };
  },

  replace(state, input, ctx) {
    state.x = toStored(input.x, ctx.axisOffsetX);
    state.y = toStored(input.y, ctx.axisOffsetY);
    state.offsetX = ctx.axisOffsetX;
    state.offsetY = ctx.axisOffsetY;
    state.color = input.color ?? state.color;
    state.widthPx = input.widthPx ?? state.widthPx;
    return true;
  },
};
