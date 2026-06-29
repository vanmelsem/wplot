import { describe, expect, it } from "vitest";

import { BuiltInSeriesKinds, SeriesModelRegistry } from "../src/core/domain/series";
import {
  LineSeriesModelAdapter,
  ScatterSeriesModelAdapter,
  StepSeriesModelAdapter,
} from "../src/core/domain/time_value_series";

describe("core time-value series model adapters", () => {
  it("registers and resolves adapters by kind", () => {
    const registry = new SeriesModelRegistry();
    registry.register(LineSeriesModelAdapter);
    registry.register(StepSeriesModelAdapter);
    registry.register(ScatterSeriesModelAdapter);

    expect(registry.get(BuiltInSeriesKinds.line)).toBe(LineSeriesModelAdapter);
    expect(registry.get(BuiltInSeriesKinds.step)).toBe(StepSeriesModelAdapter);
    expect(registry.get(BuiltInSeriesKinds.scatter)).toBe(
      ScatterSeriesModelAdapter,
    );
  });

  it("normalizes and reads line data under active axis offsets", () => {
    const state = LineSeriesModelAdapter.normalize(
      {
        kind: BuiltInSeriesKinds.line,
        x: [1_500_010, 1_500_020],
        y: [2_000_010, 2_000_020],
        widthPx: 2,
      },
      { axisOffsetX: 1_500_000, axisOffsetY: 2_000_000 },
    );

    expect(LineSeriesModelAdapter.readDatum?.(state, 0)).toEqual({
      x: 1_500_010,
      y: 2_000_010,
    });
    expect(LineSeriesModelAdapter.readDatum?.(state, 1)).toEqual({
      x: 1_500_020,
      y: 2_000_020,
    });
  });

  it("appends many line payloads and trims to max", () => {
    const state = LineSeriesModelAdapter.normalize(
      {
        kind: BuiltInSeriesKinds.line,
        x: [0],
        y: [10],
      },
      { axisOffsetX: 0, axisOffsetY: 0 },
    );

    LineSeriesModelAdapter.appendMany?.(
      state,
      [
        { x: 1, y: 11 },
        { x: 2, y: 12, max: 2 },
      ],
      { axisOffsetX: 0, axisOffsetY: 0 },
    );

    expect(state.store.count).toBe(2);
    expect(LineSeriesModelAdapter.readDatum?.(state, 0)).toEqual({
      x: 1,
      y: 11,
    });
    expect(LineSeriesModelAdapter.readDatum?.(state, 1)).toEqual({
      x: 2,
      y: 12,
    });
  });

  it("preserves step align and width when replace omits them", () => {
    const state = StepSeriesModelAdapter.normalize(
      {
        kind: BuiltInSeriesKinds.step,
        x: [0, 1],
        y: [10, 11],
        widthPx: 3,
        align: "center",
      },
      { axisOffsetX: 0, axisOffsetY: 0 },
    );

    StepSeriesModelAdapter.replace?.(
      state,
      {
        kind: BuiltInSeriesKinds.step,
        x: [4, 5],
        y: [14, 15],
      },
      { axisOffsetX: 0, axisOffsetY: 0 },
    );

    expect(state.widthPx).toBe(3);
    expect(state.align).toBe("center");
    expect(StepSeriesModelAdapter.readDatum?.(state, 1)).toEqual({
      x: 5,
      y: 15,
    });
  });

  it("keeps scatter domain values stable when replace runs under axis offsets", () => {
    const state = ScatterSeriesModelAdapter.normalize(
      {
        kind: BuiltInSeriesKinds.scatter,
        x: [1_500_010],
        y: [2_000_010],
        sizePx: 4,
        shape: "circle",
      },
      { axisOffsetX: 1_500_000, axisOffsetY: 2_000_000 },
    );

    ScatterSeriesModelAdapter.replace?.(
      state,
      {
        kind: BuiltInSeriesKinds.scatter,
        x: [1_500_030, 1_500_040],
        y: [2_000_030, 2_000_040],
        sizePx: 6,
        shape: "round",
      },
      { axisOffsetX: 1_500_000, axisOffsetY: 2_000_000 },
    );

    expect(state.sizePx).toBe(6);
    expect(state.shape).toBe("round");
    expect(ScatterSeriesModelAdapter.readDatum?.(state, 0)).toEqual({
      x: 1_500_030,
      y: 2_000_030,
    });
    expect(ScatterSeriesModelAdapter.readDatum?.(state, 1)).toEqual({
      x: 1_500_040,
      y: 2_000_040,
    });
  });
});
