import { describe, expect, it } from "vitest";

import {
  createBuiltInObjectModelRegistry as createCoreObjectModelRegistry,
  createBuiltInSeriesModelRegistry,
} from "../src/core/domain/built_ins";
import {
  registerAnnotationObjectModels,
  registerAnnotationObjectScenes,
} from "../src/plugins/annotations";
function createBuiltInObjectModelRegistry() {
  const r = createCoreObjectModelRegistry();
  registerAnnotationObjectModels(r);
  return r;
}
import { PlotDomainModel } from "../src/core/domain/model";
import { AnnotationObjectKinds as BuiltInObjectKinds } from "../src/plugins/annotations";
import { BuiltInSeriesKinds } from "../src/core/domain/series";
import {
  createBuiltInObjectSceneRegistry as createCoreObjectSceneRegistry,
  createBuiltInSeriesSceneRegistry,
} from "../src/core/scene/built_ins";
function createBuiltInObjectSceneRegistry() {
  const r = createCoreObjectSceneRegistry();
  registerAnnotationObjectScenes(r);
  return r;
}
import { SceneFrameBuilder } from "../src/core/scene/builder";
import { pickScene } from "../src/core/scene/picking";

// Characterization tests for hit-testing (pickScene). They lock the CURRENT
// observable behavior of cursor -> hit resolution so any change during the
// upcoming refactor is caught.
//
// Picking works in value space: with view values < 1e6 the model's axis offset
// is 0, so the cursor coordinates (wx, wy) passed to pickScene equal the
// series/object value coordinates.

type Built = ReturnType<SceneFrameBuilder["build"]>;

// Stable ids: series ids and object ids are assigned from INDEPENDENT counters,
// so the line series and the guide object both get id 0. pickScene
// disambiguates purely by hit `kind`, never by the numeric id.
const SERIES = { line: 0, scatter: 1, candles: 2 } as const;
const OBJECT = { guide: 0, rect: 1 } as const;

function buildFixture(selectedObjectId?: number): Built {
  const model = new PlotDomainModel({
    seriesRegistry: createBuiltInSeriesModelRegistry(),
    objectRegistry: createBuiltInObjectModelRegistry(),
    initialValue: {
      x: { min: 0, max: 100 },
      y: { min: 0, max: 100 },
    },
  });

  const lineId = model.addSeries("line", {
    kind: BuiltInSeriesKinds.line,
    x: [0, 25, 50, 75, 100],
    y: [10, 40, 20, 60, 30],
  });
  const scatterId = model.addSeries("scatter", {
    kind: BuiltInSeriesKinds.scatter,
    x: [10, 30, 50, 70, 90],
    y: [20, 50, 30, 70, 40],
  });
  const candleId = model.addSeries("candles", {
    kind: BuiltInSeriesKinds.candles,
    x: [20, 40, 60, 80],
    open: [10, 30, 15, 40],
    high: [25, 35, 30, 45],
    low: [5, 15, 10, 25],
    close: [20, 20, 25, 30],
    width: 8,
  });
  const guideId = model.addObject({ kind: BuiltInObjectKinds.guideH, y: 70 });
  const rectId = model.addObject({
    kind: BuiltInObjectKinds.rect,
    xMin: 15,
    xMax: 45,
    yMin: 20,
    yMax: 60,
  });

  // Sanity-check the assumed stable ids (incl. the deliberate id collision:
  // lineId and guideId are both 0).
  expect([lineId, scatterId, candleId]).toEqual([
    SERIES.line,
    SERIES.scatter,
    SERIES.candles,
  ]);
  expect([guideId, rectId]).toEqual([OBJECT.guide, OBJECT.rect]);

  const builder = new SceneFrameBuilder({
    seriesRegistry: createBuiltInSeriesSceneRegistry(),
    objectRegistry: createBuiltInObjectSceneRegistry(),
  });
  return builder.build(model, {
    dpr: 1,
    plotWidthPx: 800,
    plotHeightPx: 400,
    selectedObjectId,
  });
}

describe("char: picking index composition", () => {
  it("emits one picking entry per visible series and object, series first", () => {
    const built = buildFixture();
    expect(built.picking.entries.map((e) => e.kind)).toEqual([
      "polyline-series",
      "marker-series",
      "candles-series",
      "object-horizontal-line",
      "object-rect",
    ]);
  });

  it("appends object-handle entries only when the object is selected", () => {
    const plain = buildFixture();
    expect(
      plain.picking.entries.filter((e) => e.kind === "object-handle"),
    ).toHaveLength(0);

    const selected = buildFixture(OBJECT.rect);
    // rect contributes 8 resize handles when selected.
    expect(
      selected.picking.entries.filter((e) => e.kind === "object-handle"),
    ).toHaveLength(8);
  });
});

describe("char: picking series-point hits", () => {
  it("returns the nearest scatter marker point (series id + index)", () => {
    const built = buildFixture();
    // marker index 1 is (30, 50).
    expect(pickScene(built.picking, 30, 50, 1, 1)).toEqual({
      kind: "series-point",
      seriesId: SERIES.scatter,
      index: 1,
    });
    // marker index 4 is (90, 40).
    expect(pickScene(built.picking, 90, 40, 1, 1)).toEqual({
      kind: "series-point",
      seriesId: SERIES.scatter,
      index: 4,
    });
  });

  it("returns a polyline vertex and snaps to the nearer endpoint of a segment", () => {
    const built = buildFixture();
    // exact vertex (75, 60) -> line index 3.
    expect(pickScene(built.picking, 75, 60, 2, 2)).toEqual({
      kind: "series-point",
      seriesId: SERIES.line,
      index: 3,
    });
    // (52, 22) lies on the segment between idx 2 (50,20) and idx 3 (75,60),
    // nearer the idx-2 endpoint, so the reported index is 2.
    expect(pickScene(built.picking, 52, 22, 2, 2)).toEqual({
      kind: "series-point",
      seriesId: SERIES.line,
      index: 2,
    });
  });

  it("returns a candle body/wick hit by x-band containment", () => {
    const built = buildFixture();
    // candle index 1 sits at x=40 (within +/- width/2 = 4).
    expect(pickScene(built.picking, 40, 25, 1, 1)).toEqual({
      kind: "series-point",
      seriesId: SERIES.candles,
      index: 1,
    });
    // candle index 2 at x=60: a cursor up on the wick (high=30) still hits it.
    expect(pickScene(built.picking, 60, 29, 1, 1)).toEqual({
      kind: "series-point",
      seriesId: SERIES.candles,
      index: 2,
    });
  });
});

describe("char: picking object hits", () => {
  it("hits a horizontal guide within the y tolerance band", () => {
    const built = buildFixture();
    // guide at y=70; cursor anywhere along x within toly.
    expect(pickScene(built.picking, 5, 70, 1, 1)).toEqual({
      kind: "object",
      objectId: OBJECT.guide,
    });
  });

  it("hits a rect interior as object-area (pans), its border as object (moves)", () => {
    const built = buildFixture();
    // (30, 40) is strictly inside [15,45] x [20,60] and far from every edge:
    // a body hit reports object-area so a drag over it pans the plot.
    expect(pickScene(built.picking, 30, 40, 0.01, 0.01)).toEqual({
      kind: "object-area",
      objectId: OBJECT.rect,
    });
    // Within tolerance of the left edge -> object (a movable grab).
    expect(pickScene(built.picking, 15, 40, 0.5, 0.5)).toEqual({
      kind: "object",
      objectId: OBJECT.rect,
    });
  });

  it("returns the rect (not a handle) at a corner when nothing is selected", () => {
    const built = buildFixture();
    // corner (15,20) is on the border, so it grabs as a movable object.
    expect(pickScene(built.picking, 15, 20, 0.5, 0.5)).toEqual({
      kind: "object",
      objectId: OBJECT.rect,
    });
  });

  it("grabs each rect edge symmetrically, from just outside as well as inside", () => {
    const built = buildFixture();
    // rect is [15,45] x [20,60]; yMin=20 is the BOTTOM edge.
    const cases: Array<[number, number, string]> = [
      [30, 19.8, "below the bottom edge"],
      [30, 20.2, "above the bottom edge"],
      [30, 60.2, "above the top edge"],
      [30, 59.8, "below the top edge"],
      [14.8, 40, "left of the left edge"],
      [45.2, 40, "right of the right edge"],
    ];
    for (const [x, y, label] of cases) {
      expect(pickScene(built.picking, x, y, 0.5, 0.5), label).toEqual({
        kind: "object",
        objectId: OBJECT.rect,
      });
    }
    // Far outside the band (beyond tolerance) is a miss.
    expect(pickScene(built.picking, 30, 18, 0.5, 0.5)).toBeNull();
  });
});

describe("char: picking handle precedence", () => {
  it("prefers an object-handle over the object body when the object is selected", () => {
    const built = buildFixture(OBJECT.rect);
    // handle 0 is the (xMin,yMin) corner (15,20). Even though the rect body
    // also contains this point, pickNearestPoint promotes the handle.
    expect(pickScene(built.picking, 15, 20, 0.5, 0.5)).toEqual({
      kind: "object-handle",
      objectId: OBJECT.rect,
      handleId: 0,
    });
  });

  it("returns the area body when the cursor is away from every handle", () => {
    const built = buildFixture(OBJECT.rect);
    // interior point (30,40) is far from all 8 handles and every edge -> the
    // pan-through area body (object-area), not a handle.
    expect(pickScene(built.picking, 30, 40, 0.5, 0.5)).toEqual({
      kind: "object-area",
      objectId: OBJECT.rect,
    });
  });
});

describe("char: picking misses", () => {
  it("returns null over empty space", () => {
    const built = buildFixture();
    // (95, 5): below/right of all data, guides and the rect.
    expect(pickScene(built.picking, 95, 5, 0.5, 0.5)).toBeNull();
  });

  it("returns null when tolerance is too small to reach any geometry", () => {
    const built = buildFixture();
    // (88,40) is just left of the scatter point (90,40) -- outside the rect
    // and every other primitive -- so a tiny tolerance reaches nothing.
    expect(pickScene(built.picking, 88, 40, 0.001, 0.001)).toBeNull();
  });
});
