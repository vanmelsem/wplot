import { describe, expect, it } from "vitest";

import { createBuiltInSeriesModelRegistry } from "../src/core/domain/built_ins";
import { PlotDomainModel } from "../src/core/domain/model";
import { BuiltInSeriesKinds } from "../src/core/domain/series";

function createModel() {
  return new PlotDomainModel({
    seriesRegistry: createBuiltInSeriesModelRegistry(),
    initialValue: {
      x: { min: 0, max: 10 },
      y: { min: -10, max: 10 },
    },
  });
}

describe("series write semantics", () => {
  it("accepts plain arrays for line replace", () => {
    const model = createModel();
    const id = model.addSeries("line", {
      kind: BuiltInSeriesKinds.line,
      x: new Float64Array([0, 1]),
      y: new Float64Array([2, 3]),
    });

    const ok = model.replaceSeries(id, {
      kind: BuiltInSeriesKinds.line,
      x: [4, 5],
      y: [6, 7],
    });

    expect(ok).toBe(true);
    expect(model.getSeriesDatum(id, 0)).toEqual({ x: 4, y: 6 });
    expect(model.getSeriesDatum(id, 1)).toEqual({ x: 5, y: 7 });
  });

  it("accepts plain arrays for bars replace", () => {
    const model = createModel();
    const id = model.addSeries("bars", {
      kind: BuiltInSeriesKinds.bars,
      x: new Float64Array([0, 1]),
      y: new Float64Array([2, 3]),
    });

    const ok = model.replaceSeries(id, {
      kind: BuiltInSeriesKinds.bars,
      x: [4, 5],
      y: [6, 7],
      y0: [1, 2],
      width: 2,
    });

    expect(ok).toBe(true);
    expect(model.getSeriesDatum(id, 0)).toEqual({ x: 4, y: 6, y0: 1 });
    expect(model.getSeriesDatum(id, 1)).toEqual({ x: 5, y: 7, y0: 2 });
  });

  it("accepts plain arrays for band replace", () => {
    const model = createModel();
    const id = model.addSeries("band", {
      kind: BuiltInSeriesKinds.band,
      x: new Float64Array([0, 1]),
      y0: new Float64Array([2, 3]),
      y1: new Float64Array([4, 5]),
    });

    const ok = model.replaceSeries(id, {
      kind: BuiltInSeriesKinds.band,
      x: [4, 5],
      y0: [6, 7],
      y1: [8, 9],
    });

    expect(ok).toBe(true);
  });

  it("accepts plain arrays for candles replace", () => {
    const model = createModel();
    const id = model.addSeries("candles", {
      kind: BuiltInSeriesKinds.candles,
      x: new Float64Array([0, 1]),
      open: new Float64Array([2, 3]),
      high: new Float64Array([4, 5]),
      low: new Float64Array([1, 2]),
      close: new Float64Array([3, 4]),
    });

    const ok = model.replaceSeries(id, {
      kind: BuiltInSeriesKinds.candles,
      x: [4, 5],
      open: [6, 7],
      high: [8, 9],
      low: [5, 6],
      close: [7, 8],
      width: 2,
    });

    expect(ok).toBe(true);
    expect(model.getSeriesDatum(id, 0)).toEqual({
      x: 4,
      open: 6,
      high: 8,
      low: 5,
      close: 7,
    });
    expect(model.getSeriesDatum(id, 1)).toEqual({
      x: 5,
      open: 7,
      high: 9,
      low: 6,
      close: 8,
    });
  });

  it("keeps scatter domain values stable when replace runs under axis offsets", () => {
    const model = new PlotDomainModel({
      seriesRegistry: createBuiltInSeriesModelRegistry(),
      initialValue: {
        x: { min: 1_500_000, max: 1_500_100 },
        y: { min: 2_000_000, max: 2_000_100 },
      },
    });

    const id = model.addSeries("scatter", {
      kind: BuiltInSeriesKinds.scatter,
      x: [1_500_010, 1_500_020],
      y: [2_000_010, 2_000_020],
    });

    const ok = model.replaceSeries(id, {
      kind: BuiltInSeriesKinds.scatter,
      x: [1_500_030, 1_500_040],
      y: [2_000_030, 2_000_040],
      sizePx: 6,
    });

    expect(ok).toBe(true);
    expect(model.getSeriesDatum(id, 0)).toEqual({ x: 1_500_030, y: 2_000_030 });
    expect(model.getSeriesDatum(id, 1)).toEqual({ x: 1_500_040, y: 2_000_040 });
  });
});
