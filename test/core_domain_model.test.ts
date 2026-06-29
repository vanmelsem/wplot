import { describe, expect, it } from "vitest";

import { PlotDomainModel } from "../src/core/domain/model";
import { BuiltInSeriesKinds, SeriesModelRegistry } from "../src/core/domain/series";
import {
  BandSeriesModelAdapter,
  BarsSeriesModelAdapter,
  CandlesSeriesModelAdapter,
} from "../src/core/domain/range_series";
import {
  LineSeriesModelAdapter,
  ScatterSeriesModelAdapter,
  StepSeriesModelAdapter,
} from "../src/core/domain/time_value_series";

function createSeriesRegistry() {
  const registry = new SeriesModelRegistry();
  registry.register(LineSeriesModelAdapter);
  registry.register(StepSeriesModelAdapter);
  registry.register(ScatterSeriesModelAdapter);
  registry.register(BandSeriesModelAdapter);
  registry.register(BarsSeriesModelAdapter);
  registry.register(CandlesSeriesModelAdapter);
  return registry;
}

describe("core plot domain model", () => {
  it("adds and lists built-in series with palette defaults", () => {
    const model = new PlotDomainModel({
      seriesRegistry: createSeriesRegistry(),
      initialValue: {
        x: { min: 0, max: 10 },
        y: { min: -10, max: 10 },
      },
    });

    const lineId = model.addSeries("line", {
      kind: BuiltInSeriesKinds.line,
      x: [0, 1],
      y: [10, 11],
    });
    const barsId = model.addSeries("bars", {
      kind: BuiltInSeriesKinds.bars,
      x: [0, 1],
      y: [2, 3],
      y0: 0,
    });

    expect(lineId).toBe(0);
    expect(barsId).toBe(1);
    expect(model.listSeries()).toHaveLength(2);
    expect(model.listSeries()[0]?.visible).toBe(true);
  });

  it("appends, replaces, and reads through the registry contract", () => {
    const model = new PlotDomainModel({
      seriesRegistry: createSeriesRegistry(),
      initialValue: {
        x: { min: 1_500_000, max: 1_500_100 },
        y: { min: 2_000_000, max: 2_000_100 },
      },
    });

    const scatterId = model.addSeries("scatter", {
      kind: BuiltInSeriesKinds.scatter,
      x: [1_500_010],
      y: [2_000_010],
    });

    expect(
      model.appendSeriesMany(scatterId, [
        { x: 1_500_020, y: 2_000_020 },
        { x: 1_500_030, y: 2_000_030, max: 2 },
      ]),
    ).toBe(true);
    expect(model.getSeriesDatum(scatterId, 0)).toEqual({
      x: 1_500_020,
      y: 2_000_020,
    });

    expect(
      model.replaceSeries(scatterId, {
        kind: BuiltInSeriesKinds.scatter,
        x: [1_500_040],
        y: [2_000_040],
      }),
    ).toBe(true);
    expect(model.getSeriesDatum(scatterId, 0)).toEqual({
      x: 1_500_040,
      y: 2_000_040,
    });
  });

  it("toggles visibility without mutating unrelated fields", () => {
    const model = new PlotDomainModel({
      seriesRegistry: createSeriesRegistry(),
      initialValue: {
        x: { min: 0, max: 10 },
        y: { min: 0, max: 10 },
      },
    });

    const id = model.addSeries("candles", {
      kind: BuiltInSeriesKinds.candles,
      x: [0],
      open: [1],
      high: [2],
      low: [0],
      close: [1.5],
    });

    expect(model.setSeriesVisible(id, false)).toBe(true);
    expect(model.setSeriesVisible(id, false)).toBe(false);
    expect(model.listSeries()[0]?.visible).toBe(false);
  });
});
