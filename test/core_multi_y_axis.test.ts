import { describe, expect, it } from "vitest";

import { createPlotController } from "../src/core/api/controller";
import {
  createBuiltInObjectModelRegistry,
  createBuiltInSeriesModelRegistry,
} from "../src/core/domain/built_ins";
import { PlotDomainModel } from "../src/core/domain/model";
import { BuiltInSeriesKinds } from "../src/core/domain/series";
import {
  createBuiltInObjectSceneRegistry,
  createBuiltInSeriesSceneRegistry,
} from "../src/core/scene/built_ins";
import { SceneFrameBuilder } from "../src/core/scene/builder";
import { DrawListBuilder } from "../src/core/render/draw_list";
import type { DrawList, Primitive } from "../src/core/render/contracts";
import { CanvasRenderer } from "../src/core/runtime/render/canvas";
import { InteractionController } from "../src/core/interaction/controller";

const NO_MODS = { shift: false, ctrl: false, alt: false, meta: false } as const;
const measureText = ({ text }: { text: string }) => ({
  width: text.length * 7,
  height: 12,
});

function sceneBuilder() {
  return new SceneFrameBuilder({
    seriesRegistry: createBuiltInSeriesSceneRegistry(),
    objectRegistry: createBuiltInObjectSceneRegistry(),
  });
}

describe("multiple y axes — model + view", () => {
  it("stores yAxisId, exposes per-axis ranges, and resets them", () => {
    const model = new PlotDomainModel({
      seriesRegistry: createBuiltInSeriesModelRegistry(),
      objectRegistry: createBuiltInObjectModelRegistry(),
      initialValue: { x: { min: 0, max: 10 }, y: { min: 0, max: 10 } },
      extraYAxes: [{ id: "y2", min: 0, max: 100 }],
    });

    const secondary = model.addSeries(
      "secondary",
      { kind: BuiltInSeriesKinds.line, x: [0, 10], y: [10, 90] },
      { yAxisId: "y2" },
    );
    const primary = model.addSeries("primary", {
      kind: BuiltInSeriesKinds.line,
      x: [0, 10],
      y: [1, 9],
    });

    // A primary-axis series keeps the byte-identical record shape (no yAxisId).
    expect(model.getSeries(secondary)?.yAxisId).toBe("y2");
    expect(model.getSeries(primary)?.yAxisId).toBeUndefined();

    expect(model.getExtraYRange("y2")).toEqual({ min: 0, max: 100 });
    expect(model.getExtraYRange("missing")).toBeNull();

    expect(model.setExtraYRange("y2", { min: 10, max: 50 })).toBe(true);
    expect(model.getExtraYRange("y2")).toEqual({ min: 10, max: 50 });
    // No-op set and unknown-axis set both return false.
    expect(model.setExtraYRange("y2", { min: 10, max: 50 })).toBe(false);
    expect(model.setExtraYRange("missing", { min: 0, max: 1 })).toBe(false);

    // Reset restores extra axes alongside the primary view.
    model.resetView();
    expect(model.getExtraYRange("y2")).toEqual({ min: 0, max: 100 });
  });
});

describe("multiple y axes — single-axis regression", () => {
  it("leaves the default single-axis draw list unchanged (no extraY, no yRange)", () => {
    const plot = createPlotController({
      initialValue: { x: { min: 0, max: 100 }, y: { min: 0, max: 100 } },
    });
    plot.series.add("line", {
      kind: BuiltInSeriesKinds.line,
      x: [0, 50, 100],
      y: [10, 40, 20],
    });

    const built = new DrawListBuilder().buildState({
      controller: plot,
      widthPx: 800,
      heightPx: 400,
      dpr: 1,
      measureText,
    });

    expect(built.layout.scales.extraY).toBeUndefined();
    expect(plot.view.get().extraY).toBeUndefined();
    for (const prim of built.drawList.series) {
      expect((prim as { yRange?: unknown }).yRange).toBeUndefined();
    }
  });
});

describe("multiple y axes — layout + drawn axis", () => {
  it("reserves a right gutter that shrinks the plot and draws the axis labels", () => {
    const builder = new DrawListBuilder();

    const baseline = createPlotController({
      initialValue: { x: { min: 0, max: 10 }, y: { min: 0, max: 100 } },
    });
    baseline.series.add("a", {
      kind: BuiltInSeriesKinds.line,
      x: [0, 10],
      y: [1, 9],
    });
    const baseBuilt = builder.buildState({
      controller: baseline,
      widthPx: 800,
      heightPx: 400,
      dpr: 1,
      measureText,
    });
    const baseWidth = baseBuilt.layout.plot.size.width;

    const plot = createPlotController({
      initialValue: { x: { min: 0, max: 10 }, y: { min: 0, max: 100 } },
      config: { yAxes: [{ id: "y2", side: "right", min: 0, max: 1000 }] },
    });
    plot.series.add(
      "b",
      { kind: BuiltInSeriesKinds.line, x: [0, 10], y: [100, 900] },
      { yAxisId: "y2" },
    );
    const built = builder.buildState({
      controller: plot,
      widthPx: 800,
      heightPx: 400,
      dpr: 1,
      measureText,
    });

    const extra = built.layout.scales.extraY;
    expect(extra).toHaveLength(1);
    expect(extra?.[0]).toMatchObject({ id: "y2", side: "right" });

    // Plot rect shrinks to accommodate the new right gutter.
    expect(built.layout.plot.size.width).toBeLessThan(baseWidth);

    // The gutter sits to the right of the plot rect.
    const slot = extra![0]!;
    const plotRight =
      built.layout.plot.origin.x + built.layout.plot.size.width;
    expect(slot.bounds.origin.x).toBeGreaterThanOrEqual(plotRight);

    // The secondary axis is "drawn": its tick labels (range 0..1000) land in the
    // gutter. "1000" cannot come from the primary 0..100 axis.
    const y2Labels = built.drawList.text.filter((t) => t.text === "1000");
    expect(y2Labels.length).toBeGreaterThan(0);
    expect(y2Labels[0]!.x).toBeGreaterThanOrEqual(slot.bounds.origin.x - 4);
  });
});

describe("multiple y axes — independent projection", () => {
  it("stamps the secondary axis range onto its series primitives only", () => {
    const model = new PlotDomainModel({
      seriesRegistry: createBuiltInSeriesModelRegistry(),
      objectRegistry: createBuiltInObjectModelRegistry(),
      initialValue: { x: { min: 0, max: 10 }, y: { min: 0, max: 10 } },
      extraYAxes: [{ id: "y2", min: 0, max: 1000 }],
    });
    model.addSeries("primary", {
      kind: BuiltInSeriesKinds.line,
      x: [0, 10],
      y: [2, 8],
    });
    model.addSeries(
      "secondary",
      { kind: BuiltInSeriesKinds.line, x: [0, 10], y: [100, 900] },
      { yAxisId: "y2" },
    );

    const built = sceneBuilder().build(model, {
      dpr: 1,
      plotWidthPx: 600,
      plotHeightPx: 300,
    });

    const paths = built.frame.series.filter((p) => p.kind === "path");
    expect(paths).toHaveLength(2);
    // Series order is preserved: primary first (untagged), secondary second.
    expect((paths[0] as { yRange?: unknown }).yRange).toBeUndefined();
    expect((paths[1] as { yRange?: unknown }).yRange).toEqual({
      min: 0,
      max: 1000,
    });
  });

  it("renders a value differently when projected through a secondary range", () => {
    // Two identical paths (y = 5) at different y ranges land at different pixels.
    const captured: Array<{ op: string; y: number }> = [];
    const ctx = {
      fillStyle: "",
      strokeStyle: "",
      lineWidth: 1,
      lineJoin: "miter" as CanvasLineJoin,
      lineCap: "butt" as CanvasLineCap,
      lineDashOffset: 0,
      setTransform() {},
      clearRect() {},
      fillRect() {},
      save() {},
      beginPath() {},
      rect() {},
      clip() {},
      restore() {},
      stroke() {},
      fill() {},
      setLineDash() {},
      moveTo(_x: number, y: number) {
        captured.push({ op: "moveTo", y });
      },
      lineTo() {},
    };
    const canvas = {
      width: 0,
      height: 0,
      getContext: () => ctx,
    } as unknown as HTMLCanvasElement;

    const path = (yRange?: { min: number; max: number }): Primitive => ({
      kind: "path",
      x: new Float64Array([0, 10]),
      y: new Float64Array([5, 5]),
      count: 2,
      widthPx: 1,
      join: "round",
      cap: "round",
      color: [1, 1, 1, 1],
      opacity: 1,
      yRange,
    });

    const drawList: DrawList = {
      viewport: {
        value: { x: { min: 0, max: 10 }, y: { min: 0, max: 10 } },
        dpr: 1,
        canvas: { width: 10, height: 10 },
        plot: { origin: { x: 0, y: 0 }, size: { width: 10, height: 10 } },
        scales: {
          xSide: "bottom",
          ySide: "left",
          top: null,
          right: null,
          bottom: null,
          left: null,
        },
      },
      background: [0, 0, 0, 1],
      borderColor: [0, 0, 0, 1],
      scaleStyle: {
        x: { show: false, side: "bottom", background: [0, 0, 0, 0], textColor: [1, 1, 1, 1], lineColor: [1, 1, 1, 1], lineWidthPx: 1 },
        y: { show: false, side: "left", background: [0, 0, 0, 0], textColor: [1, 1, 1, 1], lineColor: [1, 1, 1, 1], lineWidthPx: 1 },
      },
      grid: [],
      series: [path(undefined), path({ min: 0, max: 100 })],
      objects: [],
      overlays: [],
      topOverlays: [],
      text: [],
      overlayText: [],
    };

    new CanvasRenderer(canvas).render(drawList);

    const moveTos = captured.filter((c) => c.op === "moveTo");
    expect(moveTos).toHaveLength(2);
    // Primary range [0,10]: value 5 maps to the vertical middle (5px from top).
    expect(moveTos[0]!.y).toBeCloseTo(5, 6);
    // Secondary range [0,100]: value 5 sits near the bottom (9.5px from top).
    expect(moveTos[1]!.y).toBeCloseTo(9.5, 6);
  });
});

describe("multiple y axes — interaction targeting", () => {
  function setup() {
    const plot = createPlotController({
      initialValue: { x: { min: 0, max: 10 }, y: { min: 0, max: 10 } },
      config: { yAxes: [{ id: "y2", side: "right", min: 0, max: 100 }] },
    });
    plot.series.add("a", {
      kind: BuiltInSeriesKinds.line,
      x: [0, 10],
      y: [1, 9],
    });
    plot.series.add(
      "b",
      { kind: BuiltInSeriesKinds.line, x: [0, 10], y: [10, 90] },
      { yAxisId: "y2" },
    );

    const builder = new DrawListBuilder();
    const interaction = new InteractionController(plot);
    const built = builder.buildState({
      controller: plot,
      widthPx: 800,
      heightPx: 400,
      dpr: 1,
      measureText,
    });
    interaction.setRenderState({ layout: built.layout, scene: built.builtScene });
    const slot = built.layout.scales.extraY![0]!;
    const gx = slot.bounds.origin.x + slot.bounds.size.width / 2;
    const gy = slot.bounds.origin.y + slot.bounds.size.height / 2;
    return { plot, interaction, gx, gy };
  }

  it("wheel over the secondary gutter zooms only that axis", () => {
    const { plot, interaction, gx, gy } = setup();
    const beforePrimary = plot.view.get().y;
    const beforeY2 = plot.axes.get("y2")!;

    interaction.wheel(-120, gx, gy, NO_MODS);

    expect(plot.view.get().y).toEqual(beforePrimary);
    const afterY2 = plot.axes.get("y2")!;
    expect(afterY2.max - afterY2.min).toBeLessThan(beforeY2.max - beforeY2.min);
  });

  it("axis-zoom drag over the secondary gutter targets that axis", () => {
    const { plot, interaction, gx, gy } = setup();
    const beforePrimary = plot.view.get().y;
    const beforeY2 = plot.axes.get("y2")!;

    interaction.pointerDown("left", gx, gy, NO_MODS);
    interaction.pointerMove(gx, gy + 60, NO_MODS);
    interaction.pointerUp("left", gx, gy + 60, NO_MODS);

    expect(plot.view.get().y).toEqual(beforePrimary);
    const afterY2 = plot.axes.get("y2")!;
    expect(afterY2.max - afterY2.min).not.toBe(beforeY2.max - beforeY2.min);
  });
});
