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

describe("core scene frame builder", () => {
  it("builds visible series and object fragments with legend rows", () => {
    const model = new PlotDomainModel({
      seriesRegistry: createBuiltInSeriesModelRegistry(),
      objectRegistry: createBuiltInObjectModelRegistry(),
      initialValue: {
        x: { min: 1_500_000, max: 1_500_100 },
        y: { min: 2_000_000, max: 2_000_100 },
      },
    });

    model.addSeries("scatter", {
      kind: BuiltInSeriesKinds.scatter,
      x: [1_500_010, 1_500_030],
      y: [2_000_010, 2_000_040],
    });
    model.addSeries("line", {
      kind: BuiltInSeriesKinds.line,
      x: [1_500_000, 1_500_050, 1_500_100],
      y: [2_000_020, 2_000_030, 2_000_025],
    });
    model.addObject({
      kind: BuiltInObjectKinds.tag,
      x: 1_500_040,
      y: 2_000_050,
      text: "mark",
    });

    const builder = new SceneFrameBuilder({
      seriesRegistry: createBuiltInSeriesSceneRegistry(),
      objectRegistry: createBuiltInObjectSceneRegistry(),
    });

    const built = builder.build(model, {
      dpr: 1,
      plotWidthPx: 800,
      plotHeightPx: 400,
      xAxisHeightPx: 24,
      yAxisWidthPx: 48,
    });

    expect(built.frame.series.length).toBeGreaterThan(0);
    expect(built.frame.objects.length).toBeGreaterThan(0);
    expect(built.frame.labels).toHaveLength(1);
    expect(built.legend).toHaveLength(2);
  });

  it("queries picking hits from the built scene index", () => {
    const model = new PlotDomainModel({
      seriesRegistry: createBuiltInSeriesModelRegistry(),
      objectRegistry: createBuiltInObjectModelRegistry(),
      initialValue: {
        x: { min: 0, max: 10 },
        y: { min: 0, max: 10 },
      },
    });

    const scatterId = model.addSeries("scatter", {
      kind: BuiltInSeriesKinds.scatter,
      x: [2, 6],
      y: [3, 7],
    });
    const rectId = model.addObject({
      kind: BuiltInObjectKinds.rect,
      xMin: 4,
      xMax: 8,
      yMin: 1,
      yMax: 5,
    });

    const builder = new SceneFrameBuilder({
      seriesRegistry: createBuiltInSeriesSceneRegistry(),
      objectRegistry: createBuiltInObjectSceneRegistry(),
    });
    const built = builder.build(model, {
      dpr: 1,
      plotWidthPx: 600,
      plotHeightPx: 300,
    });

    expect(pickScene(built.picking, 6, 7, 0.2, 0.2)).toEqual({
      kind: "series-point",
      seriesId: scatterId,
      index: 1,
    });
    // Interior of the rect (far from edges) is the pan-through area body.
    expect(pickScene(built.picking, 6, 3, 0.2, 0.2)).toEqual({
      kind: "object-area",
      objectId: rectId,
    });
    // The (xMin,yMin) corner is on the border, so it grabs as a movable object.
    expect(pickScene(built.picking, 4, 1, 0.01, 0.01)).toEqual({
      kind: "object",
      objectId: rectId,
    });

    const builtWithSelection = builder.build(model, {
      dpr: 1,
      plotWidthPx: 600,
      plotHeightPx: 300,
      selectedObjectId: rectId,
    });

    expect(pickScene(builtWithSelection.picking, 4, 1, 0.01, 0.01)).toEqual({
      kind: "object-handle",
      objectId: rectId,
      handleId: 0,
    });
  });

  it("queries polyline series hits from a local x neighborhood", () => {
    const model = new PlotDomainModel({
      seriesRegistry: createBuiltInSeriesModelRegistry(),
      objectRegistry: createBuiltInObjectModelRegistry(),
      initialValue: {
        x: { min: 0, max: 50 },
        y: { min: 0, max: 50 },
      },
    });

    const lineId = model.addSeries("line", {
      kind: BuiltInSeriesKinds.line,
      x: [0, 10, 20, 30, 40, 50],
      y: [5, 15, 10, 30, 25, 35],
    });

    const builder = new SceneFrameBuilder({
      seriesRegistry: createBuiltInSeriesSceneRegistry(),
      objectRegistry: createBuiltInObjectSceneRegistry(),
    });
    const built = builder.build(model, {
      dpr: 1,
      plotWidthPx: 600,
      plotHeightPx: 300,
    });

    expect(pickScene(built.picking, 29.6, 29.2, 1.5, 1.5)).toEqual({
      kind: "series-point",
      seriesId: lineId,
      index: 3,
    });
  });

  it("renders y-bands as fill plus horizontal boundaries only", () => {
    const model = new PlotDomainModel({
      seriesRegistry: createBuiltInSeriesModelRegistry(),
      objectRegistry: createBuiltInObjectModelRegistry(),
      initialValue: {
        x: { min: 0, max: 10 },
        y: { min: 0, max: 10 },
      },
    });

    model.addObject({
      kind: BuiltInObjectKinds.yBand,
      yMin: 2,
      yMax: 6,
      fill: [0.8, 0.2, 0.2, 0.1],
      stroke: [0.8, 0.2, 0.2, 1],
      strokeWidthPx: 1,
    });

    const builder = new SceneFrameBuilder({
      seriesRegistry: createBuiltInSeriesSceneRegistry(),
      objectRegistry: createBuiltInObjectSceneRegistry(),
    });
    const built = builder.build(model, {
      dpr: 1,
      plotWidthPx: 600,
      plotHeightPx: 300,
    });

    expect(built.frame.objects).toHaveLength(2);
    expect(built.frame.objects[0]).toMatchObject({
      kind: "rect",
      strokeWidthPx: 0,
    });
    expect(built.frame.objects[1]).toMatchObject({
      kind: "path",
      segments: true,
      count: 2,
    });
  });

  it("does not retain removed objects between builds", () => {
    const model = new PlotDomainModel({
      seriesRegistry: createBuiltInSeriesModelRegistry(),
      objectRegistry: createBuiltInObjectModelRegistry(),
      initialValue: {
        x: { min: 0, max: 10 },
        y: { min: 0, max: 10 },
      },
    });

    const objectId = model.addObject({
      kind: BuiltInObjectKinds.tag,
      x: 5,
      y: 6,
      text: "cache-me",
    });

    const builder = new SceneFrameBuilder({
      seriesRegistry: createBuiltInSeriesSceneRegistry(),
      objectRegistry: createBuiltInObjectSceneRegistry(),
    });

    const builtBeforeRemoval = builder.build(model, {
      dpr: 1,
      plotWidthPx: 600,
      plotHeightPx: 300,
    });
    expect(builtBeforeRemoval.frame.objects.length).toBeGreaterThan(0);

    expect(model.removeObject(objectId)).toBe(true);
    const builtAfterRemoval = builder.build(model, {
      dpr: 1,
      plotWidthPx: 600,
      plotHeightPx: 300,
    });
    expect(builtAfterRemoval.frame.objects).toHaveLength(0);
    expect(builtAfterRemoval.picking.entries.some((entry) => (
      ("objectId" in entry ? entry.objectId === objectId : false)
    ))).toBe(false);
  });

  it("anchors segment labels against the segment and clamps them to the plot", () => {
    const model = new PlotDomainModel({
      seriesRegistry: createBuiltInSeriesModelRegistry(),
      objectRegistry: createBuiltInObjectModelRegistry(),
      initialValue: {
        x: { min: 0, max: 10 },
        y: { min: 0, max: 10 },
      },
    });

    model.addObject({
      kind: BuiltInObjectKinds.segment,
      x0: 2,
      y0: 2,
      x1: 8,
      y1: 9,
      label: "ramp",
    });

    const builder = new SceneFrameBuilder({
      seriesRegistry: createBuiltInSeriesSceneRegistry(),
      objectRegistry: createBuiltInObjectSceneRegistry(),
    });
    const built = builder.build(model, {
      dpr: 1,
      plotWidthPx: 600,
      plotHeightPx: 300,
    });

    expect(built.frame.labels).toHaveLength(1);
    expect(built.frame.labels[0]?.clampRect).toEqual({
      minX: 0,
      maxX: 600,
      minY: 0,
      maxY: 300,
    });
    expect(built.frame.labels[0]?.boxOrigin?.x).toBeGreaterThanOrEqual(0);
    expect(built.frame.labels[0]?.boxOrigin?.y).toBeGreaterThanOrEqual(0);
  });

  it("formats axis value chips from the active axis formatter", () => {
    const model = new PlotDomainModel({
      seriesRegistry: createBuiltInSeriesModelRegistry(),
      objectRegistry: createBuiltInObjectModelRegistry(),
      initialValue: {
        x: { min: 0, max: 10 },
        y: { min: 0, max: 100 },
      },
    });

    model.addObject({
      kind: BuiltInObjectKinds.guideH,
      y: 12,
      showAxisValueLabel: true,
    });

    const builder = new SceneFrameBuilder({
      seriesRegistry: createBuiltInSeriesSceneRegistry(),
      objectRegistry: createBuiltInObjectSceneRegistry(),
    });
    const built = builder.build(model, {
      dpr: 1,
      plotWidthPx: 600,
      plotHeightPx: 300,
      yAxisWidthPx: 48,
      formatYValue: (value) => `${Math.round(value)}%`,
    });

    expect(built.frame.labels.some((entry) => entry.text === "12%")).toBe(true);
  });
});
