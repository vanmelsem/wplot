import { describe, expect, it } from "vitest";

import {
  createBuiltInObjectModelRegistry,
  createBuiltInSeriesModelRegistry,
} from "../src/core/domain/built_ins";
import { PlotDomainModel } from "../src/core/domain/model";
import { BuiltInSeriesKinds, type RgbaColor } from "../src/core/domain/series";
import {
  createBuiltInObjectSceneRegistry,
  createBuiltInSeriesSceneRegistry,
} from "../src/core/scene/built_ins";
import { SceneFrameBuilder } from "../src/core/scene/builder";
import type {
  SceneArea,
  SceneMarker,
  ScenePath,
  ScenePrimitive,
} from "../src/core/scene/frame";
import { colormap, colorsFromValues } from "../src/core/shared/colormap";

function makeModel(initialValue?: {
  x: { min: number; max: number };
  y: { min: number; max: number };
}) {
  return new PlotDomainModel({
    seriesRegistry: createBuiltInSeriesModelRegistry(),
    objectRegistry: createBuiltInObjectModelRegistry(),
    initialValue: initialValue ?? {
      x: { min: 0, max: 100 },
      y: { min: 0, max: 100 },
    },
  });
}

function makeBuilder() {
  return new SceneFrameBuilder({
    seriesRegistry: createBuiltInSeriesSceneRegistry(),
    objectRegistry: createBuiltInObjectSceneRegistry(),
  });
}

function markerOf(series: readonly ScenePrimitive[]): SceneMarker {
  const marker = series.find((p): p is SceneMarker => p.kind === "marker");
  expect(marker).toBeDefined();
  return marker!;
}

describe("scatter marker background ring (task 1)", () => {
  it("defaults the marker stroke to the plot background when no strokeColor", () => {
    const model = makeModel();
    model.addSeries("scatter", {
      kind: BuiltInSeriesKinds.scatter,
      x: [10, 30, 50],
      y: [20, 40, 60],
    });
    const background: RgbaColor = [0.1, 0.12, 0.16, 1];
    const built = makeBuilder().build(model, {
      dpr: 1,
      plotWidthPx: 800,
      plotHeightPx: 400,
      background,
    });
    const marker = markerOf(built.frame.series);
    expect(marker.stroke).toEqual(background);
    // strokeWidthPx defaults to 1 when the input did not set one.
    expect(marker.strokeWidthPx).toBe(1);
  });

  it("prefers an explicit strokeColor over the background", () => {
    const model = makeModel();
    const strokeColor: RgbaColor = [1, 0, 0, 1];
    model.addSeries("scatter", {
      kind: BuiltInSeriesKinds.scatter,
      x: [10, 30],
      y: [20, 40],
      strokeColor,
    });
    const built = makeBuilder().build(model, {
      dpr: 1,
      plotWidthPx: 800,
      plotHeightPx: 400,
      background: [0.1, 0.12, 0.16, 1],
    });
    expect(markerOf(built.frame.series).stroke).toEqual(strokeColor);
  });

  it("falls back to the series color when no background is provided", () => {
    const model = makeModel();
    const id = model.addSeries(
      "scatter",
      { kind: BuiltInSeriesKinds.scatter, x: [10], y: [20] },
      { color: [0.2, 0.6, 0.9, 1] },
    );
    const built = makeBuilder().build(model, {
      dpr: 1,
      plotWidthPx: 800,
      plotHeightPx: 400,
    });
    const record = model.getSeries(id)!;
    expect(markerOf(built.frame.series).stroke).toEqual(record.style.color);
  });
});

describe("scatter per-point colors / sizes (task 2)", () => {
  it("exposes explicit per-point colors on the SceneMarker", () => {
    const model = makeModel();
    const colors: RgbaColor[] = [
      [1, 0, 0, 1],
      [0, 1, 0, 1],
      [0, 0, 1, 1],
      [1, 1, 0, 1],
      [0, 1, 1, 1],
    ];
    model.addSeries("scatter", {
      kind: BuiltInSeriesKinds.scatter,
      x: [10, 30, 50, 70, 90],
      y: [20, 40, 60, 80, 50],
      colors,
      sizes: [4, 6, 8, 10, 12],
    });
    const built = makeBuilder().build(model, {
      dpr: 1,
      plotWidthPx: 800,
      plotHeightPx: 400,
    });
    const marker = markerOf(built.frame.series);
    expect(marker.colors).toEqual(colors);
    expect(Array.from(marker.sizes ?? [])).toEqual([4, 6, 8, 10, 12]);
  });

  it("auto-maps colorValues through a colormap into per-point colors", () => {
    const model = makeModel();
    model.addSeries("scatter", {
      kind: BuiltInSeriesKinds.scatter,
      x: [10, 30, 50],
      y: [20, 40, 60],
      colorValues: [0, 5, 10],
      colormap: "viridis",
    });
    const built = makeBuilder().build(model, {
      dpr: 1,
      plotWidthPx: 800,
      plotHeightPx: 400,
    });
    const marker = markerOf(built.frame.series);
    expect(marker.colors).toBeDefined();
    expect(marker.colors).toHaveLength(3);
    // Min value -> colormap low end, max value -> high end.
    expect(marker.colors![0]).toEqual(colormap("viridis")(0));
    expect(marker.colors![2]).toEqual(colormap("viridis")(1));
  });

  it("keeps plain scatter free of per-point fields", () => {
    const model = makeModel();
    model.addSeries("scatter", {
      kind: BuiltInSeriesKinds.scatter,
      x: [10, 30],
      y: [20, 40],
    });
    const built = makeBuilder().build(model, {
      dpr: 1,
      plotWidthPx: 800,
      plotHeightPx: 400,
    });
    const marker = markerOf(built.frame.series);
    expect(marker.colors).toBeUndefined();
    expect(marker.sizes).toBeUndefined();
  });
});

describe("colormap helper (task 2)", () => {
  it("anchors viridis endpoints and clamps out-of-range t", () => {
    const v = colormap("viridis");
    expect(v(0)).toEqual([0.267, 0.005, 0.329, 1]);
    expect(v(1)).toEqual([0.993, 0.906, 0.144, 1]);
    // Clamping.
    expect(v(-1)).toEqual(v(0));
    expect(v(2)).toEqual(v(1));
  });

  it("samples every channel inside [0,1] with full alpha", () => {
    for (const name of ["viridis", "magma", "plasma"] as const) {
      const sampler = colormap(name);
      for (const t of [0, 0.25, 0.5, 0.75, 1]) {
        const c = sampler(t);
        expect(c[3]).toBe(1);
        for (const ch of [c[0], c[1], c[2]]) {
          expect(ch).toBeGreaterThanOrEqual(0);
          expect(ch).toBeLessThanOrEqual(1);
        }
      }
    }
  });

  it("colorsFromValues normalizes across [min,max]", () => {
    const colors = colorsFromValues([0, 5, 10], 0, 10, "viridis");
    expect(colors).toHaveLength(3);
    expect(colors[0]).toEqual(colormap("viridis")(0));
    expect(colors[1]).toEqual(colormap("viridis")(0.5));
    expect(colors[2]).toEqual(colormap("viridis")(1));
  });

  it("maps everything to the low end for a zero-width range", () => {
    const colors = colorsFromValues([4, 4, 4], 4, 4, "magma");
    const low = colormap("magma")(0);
    for (const c of colors) expect(c).toEqual(low);
  });
});

describe("line fill-to-baseline (task 3)", () => {
  it("emits a SceneArea under the stroke when fill is set", () => {
    const model = makeModel();
    const fill: RgbaColor = [0.2, 0.6, 0.9, 0.25];
    model.addSeries("line", {
      kind: BuiltInSeriesKinds.line,
      x: [0, 25, 50, 75, 100],
      y: [10, 40, 20, 60, 30],
      fill,
    });
    const built = makeBuilder().build(model, {
      dpr: 1,
      plotWidthPx: 800,
      plotHeightPx: 400,
    });
    expect(built.frame.series).toHaveLength(2);
    const area = built.frame.series[0] as SceneArea;
    const path = built.frame.series[1] as ScenePath;
    expect(area.kind).toBe("area");
    expect(area.fill).toEqual(fill);
    expect(area.count).toBe(5);
    // Baseline defaults to 0 (offset is 0 for these small values). The scratch
    // buffer can be longer than count; only the first `count` entries are valid.
    expect(Array.from(area.y0).slice(0, area.count)).toEqual([0, 0, 0, 0, 0]);
    // y1 tracks the line values.
    expect(Array.from(area.y1).slice(0, area.count)).toEqual([
      10, 40, 20, 60, 30,
    ]);
    expect(path.kind).toBe("path");
    expect(path.count).toBe(5);
  });

  it("respects a custom fillTo baseline", () => {
    const model = makeModel();
    model.addSeries("line", {
      kind: BuiltInSeriesKinds.line,
      x: [0, 50, 100],
      y: [10, 20, 30],
      fill: [0, 0, 1, 0.2],
      fillTo: 15,
    });
    const built = makeBuilder().build(model, {
      dpr: 1,
      plotWidthPx: 800,
      plotHeightPx: 400,
    });
    const area = built.frame.series[0] as SceneArea;
    expect(Array.from(area.y0).slice(0, area.count)).toEqual([15, 15, 15]);
  });

  it("emits only the stroke path when fill is absent", () => {
    const model = makeModel();
    model.addSeries("line", {
      kind: BuiltInSeriesKinds.line,
      x: [0, 50, 100],
      y: [10, 20, 30],
    });
    const built = makeBuilder().build(model, {
      dpr: 1,
      plotWidthPx: 800,
      plotHeightPx: 400,
    });
    expect(built.frame.series).toHaveLength(1);
    expect(built.frame.series[0]!.kind).toBe("path");
  });
});

describe("infinite-lines series (task 4)", () => {
  it("emits one spanning primitive per x and per y", () => {
    const model = makeModel({
      x: { min: 0, max: 100 },
      y: { min: 0, max: 50 },
    });
    const color: RgbaColor = [1, 0.5, 0, 1];
    model.addSeries("levels", {
      kind: BuiltInSeriesKinds.infiniteLines,
      x: [25, 75],
      y: [10],
      color,
      widthPx: 2,
    });
    const built = makeBuilder().build(model, {
      dpr: 1,
      plotWidthPx: 800,
      plotHeightPx: 400,
    });
    // 2 vertical + 1 horizontal = 3 spanning primitives.
    expect(built.frame.series).toHaveLength(3);
    for (const p of built.frame.series) {
      expect(p.kind).toBe("path");
      expect(p.count).toBe(2);
      expect((p as ScenePath).color).toEqual(color);
      expect((p as ScenePath).widthPx).toBe(2);
    }

    // Vertical line at x = 25 spans the full y view [0, 50].
    const v0 = Array.from((built.frame.series[0] as ScenePath).points ?? []);
    expect(v0).toEqual([25, 0, 25, 50]);
    const v1 = Array.from((built.frame.series[1] as ScenePath).points ?? []);
    expect(v1).toEqual([75, 0, 75, 50]);
    // Horizontal line at y = 10 spans the full x view [0, 100].
    const h0 = Array.from((built.frame.series[2] as ScenePath).points ?? []);
    expect(h0).toEqual([0, 10, 100, 10]);
  });

  it("supports x-only and y-only configurations", () => {
    const xOnly = makeModel();
    xOnly.addSeries("vlines", {
      kind: BuiltInSeriesKinds.infiniteLines,
      x: [10, 50, 90],
    });
    const yOnly = makeModel();
    yOnly.addSeries("hlines", {
      kind: BuiltInSeriesKinds.infiniteLines,
      y: [20, 80],
    });
    const builder = makeBuilder();
    const xBuilt = builder.build(xOnly, {
      dpr: 1,
      plotWidthPx: 600,
      plotHeightPx: 300,
    });
    const yBuilt = builder.build(yOnly, {
      dpr: 1,
      plotWidthPx: 600,
      plotHeightPx: 300,
    });
    expect(xBuilt.frame.series).toHaveLength(3);
    expect(yBuilt.frame.series).toHaveLength(2);
  });

  it("falls back to the palette color when none is supplied", () => {
    const model = makeModel();
    const id = model.addSeries(
      "levels",
      { kind: BuiltInSeriesKinds.infiniteLines, x: [50] },
      { color: [0.3, 0.7, 0.4, 1] },
    );
    const built = makeBuilder().build(model, {
      dpr: 1,
      plotWidthPx: 600,
      plotHeightPx: 300,
    });
    const record = model.getSeries(id)!;
    expect((built.frame.series[0] as ScenePath).color).toEqual(
      record.style.color,
    );
  });
});
