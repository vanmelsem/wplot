import { describe, expect, it } from "vitest";

import { createPlotController as createCorePlotController } from "../src/core/api/controller";
import { registerAnnotationObjects } from "../src/plugins/annotations";
function createPlotController(
  init: Parameters<typeof createCorePlotController>[0],
) {
  const plot = createCorePlotController(init);
  registerAnnotationObjects(plot);
  return plot;
}
import { AnnotationObjectKinds as BuiltInObjectKinds } from "../src/plugins/annotations";
import { BuiltInSeriesKinds } from "../src/core/domain/series";
import { DrawListBuilder } from "../src/core/render/draw_list";

// Characterization tests for draw-list assembly (DrawListBuilder.build /
// .buildState). They lock the CURRENT observable structure of the produced
// draw list so any behavioral change during the upcoming refactor is caught.
//
// They intentionally avoid asserting volatile floating-point pixel
// coordinates; they assert primitive kinds/modes/counts, slot composition,
// ordering, and the stable parts of the viewport.

const measureText = ({ text }: { text: string }) => ({
  width: text.length * 7,
  height: 12,
});

// Small (< 1e6) view values keep the model's axis offset at 0, so series x/y
// stay in plain value space and counts/order are deterministic.
function buildFixtureDrawList() {
  const plot = createPlotController({
    initialValue: {
      x: { min: 0, max: 100 },
      y: { min: 0, max: 100 },
    },
  });

  // line: 5 points
  plot.series.add("line", {
    kind: BuiltInSeriesKinds.line,
    x: [0, 25, 50, 75, 100],
    y: [10, 40, 20, 60, 30],
  });
  // scatter: 5 points
  plot.series.add("scatter", {
    kind: BuiltInSeriesKinds.scatter,
    x: [10, 30, 50, 70, 90],
    y: [20, 50, 30, 70, 40],
  });
  // candles: 4 bars, split into 2 up (idx 0,2) and 2 down (idx 1,3) by
  // close >= open.
  plot.series.add("candles", {
    kind: BuiltInSeriesKinds.candles,
    x: [20, 40, 60, 80],
    open: [10, 30, 15, 40],
    high: [25, 35, 30, 45],
    low: [5, 15, 10, 25],
    close: [20, 20, 25, 30], // up, down, up, down
    width: 8,
  });

  // annotation objects: an hline guide and a labelled rect.
  plot.objects.add({ kind: BuiltInObjectKinds.guideH, y: 70 });
  plot.objects.add({
    kind: BuiltInObjectKinds.rect,
    xMin: 15,
    xMax: 45,
    yMin: 20,
    yMax: 60,
    label: "zone",
  });

  const builder = new DrawListBuilder();
  return builder.build({
    controller: plot,
    widthPx: 800,
    heightPx: 400,
    dpr: 1,
    measureText,
  });
}

describe("char: draw-list series primitives", () => {
  it("emits one ordered primitive stream per visible series in insertion order", () => {
    const dl = buildFixtureDrawList();

    // line(path) + scatter(marker) + candles(up wicks, up bodies, down wicks,
    // down bodies) => 6 series primitives, in that exact order.
    expect(dl.series).toHaveLength(6);

    const shape = dl.series.map((p) => ({
      kind: p.kind,
      mode: p.kind === "quad" ? p.mode : undefined,
      segments: p.kind === "path" ? p.segments === true : undefined,
      count: p.count,
    }));

    expect(shape).toEqual([
      // line series -> single polyline path with one point per datum
      { kind: "path", mode: undefined, segments: false, count: 5 },
      // scatter series -> marker quad with one center per datum
      { kind: "quad", mode: "marker", segments: undefined, count: 5 },
      // candles up wicks -> segmented path, 2 up candles
      { kind: "path", mode: undefined, segments: true, count: 2 },
      // candles up bodies -> rect quad, 2 up candles
      { kind: "quad", mode: "rect", segments: undefined, count: 2 },
      // candles down wicks -> segmented path, 2 down candles
      { kind: "path", mode: undefined, segments: true, count: 2 },
      // candles down bodies -> rect quad, 2 down candles
      { kind: "quad", mode: "rect", segments: undefined, count: 2 },
    ]);
  });

  it("maps scene 'marker'/'rect' kinds to quad primitives and keeps path as path", () => {
    const dl = buildFixtureDrawList();
    // mapScenePrimitive: marker -> quad(marker), rect -> quad(rect),
    // path -> path. There are no raw "rect"/"marker" kinds left in the list.
    for (const p of dl.series) {
      expect(["path", "quad", "area"]).toContain(p.kind);
    }
    const quadModes = dl.series
      .filter((p) => p.kind === "quad")
      .map((p) => (p as { mode: string }).mode);
    expect(quadModes).toEqual(["marker", "rect", "rect"]);
  });
});

describe("char: draw-list object primitives", () => {
  it("emits object primitives after series, preserving object insertion order", () => {
    const dl = buildFixtureDrawList();

    // guide hline (path, count 2) then rect (quad/rect, count 1).
    expect(dl.objects).toHaveLength(2);

    const guide = dl.objects[0]!;
    expect(guide.kind).toBe("path");
    expect(guide.count).toBe(2);

    const rect = dl.objects[1]!;
    expect(rect.kind).toBe("quad");
    expect(rect.kind === "quad" && rect.mode).toBe("rect");
    expect(rect.count).toBe(1);
  });
});

describe("char: draw-list grid / text / overlay slots", () => {
  it("populates a non-empty grid built entirely from path primitives", () => {
    const dl = buildFixtureDrawList();
    expect(dl.grid.length).toBeGreaterThan(0);
    for (const p of dl.grid) {
      expect(p.kind).toBe("path");
    }
  });

  it("merges grid tick text first and object labels last, sharing the text slot", () => {
    const dl = buildFixtureDrawList();

    // text = [...gridText, ...sceneLabels]. The only object label is "zone".
    expect(dl.text.length).toBeGreaterThan(1);
    expect(dl.text.some((t) => t.text === "zone")).toBe(true);
    // object labels are appended after grid text, so "zone" is last.
    expect(dl.text[dl.text.length - 1]!.text).toBe("zone");

    // Current snapshot: 6 x-axis ticks + 6 y-axis ticks (0,20,..,100) + the
    // "zone" object label = 13 entries. Ticks come from grid/axis logic; this
    // exact count may shift if that (non-target) logic changes, but the
    // gridText-then-labels ordering above is the load-bearing invariant.
    expect(dl.text).toHaveLength(13);
  });

  it("leaves interaction-only slots empty when no interaction is applied", () => {
    const dl = buildFixtureDrawList();
    // build() (vs decorateWithInteraction) must not emit overlay/top-overlay
    // primitives, overlay text, or a crosshair.
    expect(dl.overlays).toHaveLength(0);
    expect(dl.topOverlays).toHaveLength(0);
    expect(dl.overlayText).toHaveLength(0);
    expect(dl.crosshair).toBeUndefined();
    expect(dl.cursorIndicator).toBeUndefined();
  });
});

describe("char: draw-list viewport and flags", () => {
  it("locks canvas size, value range, default scale sides and plot gutters", () => {
    const dl = buildFixtureDrawList();

    // canvas is CSS px (== widthPx/heightPx), independent of dpr.
    expect(dl.viewport.canvas).toEqual({ width: 800, height: 400 });
    expect(dl.viewport.dpr).toBe(1);

    // value range passes through unchanged from the view.
    expect(dl.viewport.value).toEqual({
      x: { min: 0, max: 100 },
      y: { min: 0, max: 100 },
    });

    // defaults: x-axis bottom, y-axis left.
    expect(dl.viewport.scales.xSide).toBe("bottom");
    expect(dl.viewport.scales.ySide).toBe("left");

    // y-axis gutter pushes the plot right; x-axis is on the bottom so the plot
    // starts at the top (origin.y === 0). Assert relationships, not exact px.
    expect(dl.viewport.plot.origin.x).toBeGreaterThan(0);
    expect(dl.viewport.plot.origin.y).toBe(0);
    expect(dl.viewport.plot.size.width).toBeGreaterThan(0);
    expect(dl.viewport.plot.size.width).toBeLessThan(800);
    expect(dl.viewport.plot.size.height).toBeGreaterThan(0);
    expect(dl.viewport.plot.size.height).toBeLessThan(400);
  });

  it("carries config-derived rendering flags onto the draw list", () => {
    const dl = buildFixtureDrawList();
    // compactLinePaths mirrors config.internalLod (default false).
    expect(dl.compactLinePaths).toBe(false);
    // background / borderColor are forwarded from config.
    expect(Array.isArray(dl.background)).toBe(true);
    expect(dl.background).toHaveLength(4);
    expect(Array.isArray(dl.borderColor)).toBe(true);
  });
});
