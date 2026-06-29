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
import { InteractionController } from "../src/core/interaction/controller";
import { DrawListBuilder } from "../src/core/render/draw_list";

describe("core draw list builder", () => {
  it("builds a renderer draw list from core scene and config state", () => {
    const plot = createPlotController({
      initialValue: {
        x: { min: 1_500_000, max: 1_500_100 },
        y: { min: 2_000_000, max: 2_000_100 },
      },
      config: {
        layout: {
          xScale: { side: "top" },
          yScale: { side: "right" },
        },
      },
    });

    plot.series.add("line", {
      kind: BuiltInSeriesKinds.line,
      x: [1_500_000, 1_500_050, 1_500_100],
      y: [2_000_010, 2_000_040, 2_000_030],
    });
    plot.objects.add({
      kind: BuiltInObjectKinds.tag,
      x: 1_500_040,
      y: 2_000_060,
      text: "mark",
    });

    const builder = new DrawListBuilder();
    const drawList = builder.build({
      controller: plot,
      widthPx: 900,
      heightPx: 500,
      dpr: 2,
      measureText: ({ text }) => ({ width: text.length * 7, height: 12 }),
    });

    expect(drawList.viewport.canvas).toEqual({ width: 900, height: 500 });
    expect(drawList.viewport.plot.size.width).toBeGreaterThan(0);
    expect(drawList.viewport.plot.size.height).toBeGreaterThan(0);
    expect(drawList.viewport.scales.xSide).toBe("top");
    expect(drawList.viewport.scales.ySide).toBe("right");
    expect(drawList.grid.length).toBeGreaterThan(0);
    expect(drawList.series.length).toBeGreaterThan(0);
    expect(drawList.objects.length).toBeGreaterThan(0);
    expect(drawList.text.some((entry) => entry.text === "mark")).toBe(true);
    expect(drawList.viewport.scales.top?.size.height).toBeGreaterThan(0);
    expect(drawList.viewport.scales.right?.size.width).toBeGreaterThan(0);
  });

  it("decorates the draw list with crosshair labels and selection preview", () => {
    const plot = createPlotController({
      initialValue: {
        x: { min: 0, max: 100 },
        y: { min: 0, max: 10 },
      },
      config: {
        showCrosshair: true,
        showCrosshairLabels: true,
        showCursorSeriesMarker: true,
        crosshairColor: [0.3, 0.5, 0.8, 1],
      },
    });

    plot.series.add("line", {
      kind: BuiltInSeriesKinds.line,
      x: [0, 50, 100],
      y: [2, 6, 4],
    });
    plot.series.add("line-2", {
      kind: BuiltInSeriesKinds.line,
      x: [0, 50, 100],
      y: [4, 3, 8],
    });

    const builder = new DrawListBuilder();
    const built = builder.buildState({
      controller: plot,
      widthPx: 640,
      heightPx: 320,
      dpr: 1,
      measureText: ({ text }) => ({ width: text.length * 7, height: 12 }),
    });

    const interaction = new InteractionController(plot);
    interaction.setRenderState({
      layout: built.layout,
      scene: built.builtScene,
    });
    const initialTextCount = built.drawList.text.length;
    const initialOverlayTextCount = built.drawList.overlayText.length;
    const initialOverlayCount = built.drawList.overlays.length;

    const px = built.layout.plot.origin.x + built.layout.plot.size.width * 0.5;
    const py = built.layout.plot.origin.y + built.layout.plot.size.height * 0.4;
    interaction.pointerMove(px, py, {
      shift: false,
      ctrl: false,
      alt: false,
      meta: false,
    });
    interaction.pointerDown("left", px, py, {
      shift: true,
      ctrl: false,
      alt: false,
      meta: false,
    });
    interaction.pointerMove(px + 60, py + 30, {
      shift: true,
      ctrl: false,
      alt: false,
      meta: false,
    });

    const drawList = builder.decorateWithInteraction(built.drawList, {
      controller: plot,
      interaction,
      measureText: ({ text }) => ({ width: text.length * 7, height: 12 }),
    });

    expect(drawList.crosshair).toBeDefined();
    expect(drawList.overlays.length).toBeGreaterThan(initialOverlayCount);
    expect(drawList.text.length).toBe(initialTextCount);
    expect(drawList.overlayText.length).toBeGreaterThan(
      initialOverlayTextCount,
    );
    expect(drawList.topOverlays.length).toBeGreaterThan(0);
  });

  it("renders cursor markers for each snapped series at the active x position", () => {
    const plot = createPlotController({
      initialValue: {
        x: { min: 0, max: 100 },
        y: { min: 0, max: 10 },
      },
      config: {
        showCrosshair: true,
        showCursorSeriesMarker: true,
      },
    });

    plot.series.add("line-a", {
      kind: BuiltInSeriesKinds.line,
      x: [0, 50, 100],
      y: [2, 6, 4],
    });
    plot.series.add("line-b", {
      kind: BuiltInSeriesKinds.line,
      x: [0, 50, 100],
      y: [4, 3, 8],
    });

    const builder = new DrawListBuilder();
    const built = builder.buildState({
      controller: plot,
      widthPx: 640,
      heightPx: 320,
      dpr: 1,
      measureText: ({ text }) => ({ width: text.length * 7, height: 12 }),
    });

    const interaction = new InteractionController(plot);
    interaction.setRenderState({
      layout: built.layout,
      scene: built.builtScene,
    });

    const px = built.layout.plot.origin.x + built.layout.plot.size.width * 0.5;
    const py = built.layout.plot.origin.y + built.layout.plot.size.height * 0.4;
    interaction.pointerMove(px, py, {
      shift: false,
      ctrl: false,
      alt: false,
      meta: false,
    });

    const drawList = builder.decorateWithInteraction(built.drawList, {
      controller: plot,
      interaction,
      measureText: ({ text }) => ({ width: text.length * 7, height: 12 }),
    });

    expect(drawList.topOverlays.length).toBeGreaterThan(1);
  });

  it("renders visible edit handles for the selected object only", () => {
    const plot = createPlotController({
      initialValue: {
        x: { min: 0, max: 10 },
        y: { min: 0, max: 10 },
      },
      config: {
        showCrosshair: false,
        showCursorSeriesMarker: false,
      },
    });

    const rectId = plot.objects.add({
      kind: BuiltInObjectKinds.rect,
      xMin: 2,
      xMax: 6,
      yMin: 2,
      yMax: 7,
    });

    const builder = new DrawListBuilder();
    const interaction = new InteractionController(plot);

    const initial = builder.buildState({
      controller: plot,
      widthPx: 640,
      heightPx: 320,
      dpr: 1,
      measureText: ({ text }) => ({ width: text.length * 7, height: 12 }),
    });
    interaction.setRenderState({
      layout: initial.layout,
      scene: initial.builtScene,
    });

    // A rect body click pans (object-area); selection is via border/handle or
    // the API, so select directly here to exercise selected-object rendering.
    interaction.selectObject(rectId);

    const selected = builder.buildState({
      controller: plot,
      widthPx: 640,
      heightPx: 320,
      dpr: 1,
      selectedObjectId: interaction.getSelectedObjectId(),
      measureText: ({ text }) => ({ width: text.length * 7, height: 12 }),
    });
    interaction.setRenderState({
      layout: selected.layout,
      scene: selected.builtScene,
    });

    const drawList = builder.decorateWithInteraction(selected.drawList, {
      controller: plot,
      interaction,
      measureText: ({ text }) => ({ width: text.length * 7, height: 12 }),
    });

    const handleMarkers = drawList.topOverlays.filter(
      (primitive) =>
        primitive.kind === "quad" &&
        primitive.mode === "marker" &&
        primitive.strokeWidthPx === 1,
    );
    const selectedRectHighlight = drawList.topOverlays.find(
      (primitive) =>
        primitive.kind === "quad" &&
        primitive.mode === "rect" &&
        primitive.strokeWidthPx === 2,
    );

    expect(handleMarkers).toHaveLength(8);
    expect(selectedRectHighlight).toBeTruthy();
  });

  it("emits config events from the core controller", () => {
    const plot = createPlotController({
      initialValue: {
        x: { min: 0, max: 10 },
        y: { min: 0, max: 10 },
      },
    });

    const events: string[] = [];
    const unsubscribe = plot.subscribe("config", (config) => {
      events.push(`${config.layout.xScale.side}/${config.layout.yScale.side}`);
    });

    plot.batch(() => {
      plot.config.update({
        layout: {
          xScale: { side: "top" },
          yScale: { side: "right" },
        },
      });
      plot.config.update({
        showLegend: true,
      });
    });

    expect(events).toEqual(["top/right"]);
    unsubscribe();
  });

  it("keeps grid primitives aligned when large axis offsets are active", () => {
    const plot = createPlotController({
      initialValue: {
        x: { min: 1_715_000_000_000, max: 1_715_000_060_000 },
        y: { min: 2_450_000, max: 2_450_080 },
      },
      config: {
        axisMode: {
          x: { mode: "time", timezone: "local" },
        },
      },
    });

    plot.series.add("line", {
      kind: BuiltInSeriesKinds.line,
      x: [1_715_000_000_000, 1_715_000_030_000, 1_715_000_060_000],
      y: [2_450_010, 2_450_050, 2_450_030],
    });

    const builder = new DrawListBuilder();
    const drawList = builder.build({
      controller: plot,
      widthPx: 1280,
      heightPx: 640,
      dpr: 1,
      measureText: ({ text }) => ({ width: text.length * 7, height: 12 }),
    });

    const gridPaths = drawList.grid.filter(
      (primitive) => primitive.kind === "path" && primitive.segments === true,
    );

    expect(gridPaths.length).toBeGreaterThan(0);
    for (const primitive of gridPaths) {
      expect(primitive.origin).toEqual({
        x: plot.model.axisOffsetX,
        y: plot.model.axisOffsetY,
      });
    }
  });
});
