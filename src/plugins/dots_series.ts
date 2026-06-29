import type {
  ScenePrimitive,
  SeriesExtension,
  SeriesModelAdapter,
  SeriesSceneAdapter,
} from "../lib/plugin";

/**
 * Reference custom series: a minimal "dots" scatter, implemented entirely
 * through the public extension API. It demonstrates the two halves a series
 * needs — a model adapter (input normalization, datum read-back) and a scene
 * adapter (geometry as draw primitives) — without touching library internals.
 */
export const DOTS_SERIES_KIND = "series/dots";

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

type DotsSeriesDatum = { x: number; y: number };

const model: SeriesModelAdapter<DotsSeriesInput, DotsSeriesState, DotsSeriesDatum> =
  {
    kind: DOTS_SERIES_KIND,
    normalize(input) {
      return {
        x: Float64Array.from(input.x),
        y: Float64Array.from(input.y),
        sizePx: input.sizePx ?? 6,
      };
    },
    readDatum(state, index) {
      if (index < 0 || index >= state.x.length) return null;
      return { x: state.x[index]!, y: state.y[index]! };
    },
  };

const scene: SeriesSceneAdapter<DotsSeriesState> = {
  kind: DOTS_SERIES_KIND,
  build(record, ctx) {
    const { x, y, sizePx } = record.state;
    const count = x.length;
    if (count === 0) return null;

    // Geometry is emitted in local space (value minus axis offset); the origin
    // carries the offset back, matching the built-in adapters.
    const centers = new Float64Array(count * 2);
    for (let i = 0; i < count; i += 1) {
      centers[i * 2] = x[i]! - ctx.axisOffsetX;
      centers[i * 2 + 1] = y[i]! - ctx.axisOffsetY;
    }

    const marker: ScenePrimitive = {
      kind: "marker",
      centers,
      count,
      sizePx,
      fill: record.style.color,
      stroke: record.style.color,
      strokeWidthPx: 0,
      roundness: 1,
      opacity: 1,
      origin: { x: ctx.axisOffsetX, y: ctx.axisOffsetY },
    };

    return {
      primitives: [marker],
      legendValueText:
        count > 0 ? (y[count - 1] ?? 0).toFixed(2) : undefined,
    };
  },
};

export function dotsSeries(): SeriesExtension<
  DotsSeriesInput,
  DotsSeriesState,
  DotsSeriesDatum
> {
  return { model, scene };
}
