import { describe, expect, it } from "vitest";

import { BuiltInSeriesKinds, SeriesModelRegistry } from "../src/core/domain/series";
import {
  BandSeriesModelAdapter,
  BarsSeriesModelAdapter,
  CandlesSeriesModelAdapter,
} from "../src/core/domain/range_series";

describe("core range and ohlc series model adapters", () => {
  it("registers band, bars, and candles adapters", () => {
    const registry = new SeriesModelRegistry();
    registry.register(BandSeriesModelAdapter);
    registry.register(BarsSeriesModelAdapter);
    registry.register(CandlesSeriesModelAdapter);

    expect(registry.get(BuiltInSeriesKinds.band)).toBe(BandSeriesModelAdapter);
    expect(registry.get(BuiltInSeriesKinds.bars)).toBe(BarsSeriesModelAdapter);
    expect(registry.get(BuiltInSeriesKinds.candles)).toBe(
      CandlesSeriesModelAdapter,
    );
  });

  it("reads band data under offsets", () => {
    const state = BandSeriesModelAdapter.normalize(
      {
        kind: BuiltInSeriesKinds.band,
        x: [1_500_010, 1_500_020],
        y0: [2_000_000, 2_000_010],
        y1: [2_000_020, 2_000_030],
        opacity: 0.5,
      },
      { axisOffsetX: 1_500_000, axisOffsetY: 2_000_000 },
    );

    expect(BandSeriesModelAdapter.readDatum?.(state, 1)).toEqual({
      x: 1_500_020,
      y0: 2_000_010,
      y1: 2_000_030,
    });
  });

  it("supports scalar and array y0 values for bars", () => {
    const state = BarsSeriesModelAdapter.normalize(
      {
        kind: BuiltInSeriesKinds.bars,
        x: [0, 1],
        y: [10, 11],
        y0: 3,
        width: 2,
      },
      { axisOffsetX: 0, axisOffsetY: 0 },
    );

    BarsSeriesModelAdapter.append?.(
      state,
      { x: 2, y: 12, y0: 4, max: 3 },
      { axisOffsetX: 0, axisOffsetY: 0 },
    );

    expect(state.width).toBe(2);
    expect(BarsSeriesModelAdapter.readDatum?.(state, 2)).toEqual({
      x: 2,
      y: 12,
      y0: 4,
    });
  });

  it("keeps candles styling and datum semantics through replace", () => {
    const state = CandlesSeriesModelAdapter.normalize(
      {
        kind: BuiltInSeriesKinds.candles,
        x: [0, 1],
        open: [10, 11],
        high: [12, 13],
        low: [8, 9],
        close: [11, 12],
        width: 0.75,
        upColor: [0, 1, 0, 1],
      },
      { axisOffsetX: 0, axisOffsetY: 0 },
    );

    CandlesSeriesModelAdapter.replace?.(
      state,
      {
        kind: BuiltInSeriesKinds.candles,
        x: [4, 5],
        open: [14, 15],
        high: [16, 17],
        low: [13, 14],
        close: [15, 16],
        downColor: [1, 0, 0, 1],
      },
      { axisOffsetX: 0, axisOffsetY: 0 },
    );

    expect(state.width).toBe(0.75);
    expect(state.upColor).toEqual([0, 1, 0, 1]);
    expect(state.downColor).toEqual([1, 0, 0, 1]);
    expect(CandlesSeriesModelAdapter.readDatum?.(state, 1)).toEqual({
      x: 5,
      open: 15,
      high: 17,
      low: 14,
      close: 16,
    });
  });
});
