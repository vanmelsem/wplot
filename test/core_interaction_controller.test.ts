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

const NO_MODS = {
  shift: false,
  ctrl: false,
  alt: false,
  meta: false,
} as const;

describe("core interaction controller", () => {
  it("emits cursor hover and click events from the core scene picking state", () => {
    const plot = createPlotController({
      initialValue: {
        x: { min: 0, max: 10 },
        y: { min: 0, max: 10 },
      },
    });
    plot.series.add("scatter", {
      kind: BuiltInSeriesKinds.scatter,
      x: [2, 8],
      y: [3, 7],
    });

    const builder = new DrawListBuilder();
    const built = builder.buildState({
      controller: plot,
      widthPx: 800,
      heightPx: 400,
      dpr: 1,
      measureText: ({ text }) => ({ width: text.length * 7, height: 12 }),
    });

    const interaction = new InteractionController(plot);
    interaction.setRenderState({
      layout: built.layout,
      scene: built.builtScene,
    });

    const cursorEvents: string[] = [];
    const clickEvents: string[] = [];
    interaction.events.subscribe("cursor", (event) => {
      if (event.hit?.kind === "series-point") {
        cursorEvents.push(`${event.hit.seriesId}:${event.hit.index}`);
      }
    });
    interaction.events.subscribe("click", (event) => {
      if (event.hit?.kind === "series-point") {
        clickEvents.push(`${event.hit.seriesId}:${event.hit.index}`);
      }
    });

    const point = interaction.valueToPx(8, 7);
    interaction.pointerMove(point.x, point.y, NO_MODS);
    interaction.pointerDown("left", point.x, point.y, NO_MODS);
    interaction.pointerUp("left", point.x, point.y, NO_MODS);

    expect(interaction.getHoverState()?.hit).toEqual({
      kind: "series-point",
      seriesId: 0,
      index: 1,
      seriesName: "scatter",
      color: plot.series.list()[0]?.color,
      datum: { x: 8, y: 7 },
    });
    expect(cursorEvents).toContain("0:1");
    expect(clickEvents).toContain("0:1");
  });

  it("supports wheel zoom and object handle drag edits", () => {
    const plot = createPlotController({
      initialValue: {
        x: { min: 0, max: 10 },
        y: { min: 0, max: 10 },
      },
    });
    const rectId = plot.objects.add({
      kind: BuiltInObjectKinds.rect,
      xMin: 2,
      xMax: 4,
      yMin: 2,
      yMax: 4,
    });

    const builder = new DrawListBuilder();
    const interaction = new InteractionController(plot);

    const first = builder.buildState({
      controller: plot,
      widthPx: 800,
      heightPx: 400,
      dpr: 1,
      measureText: ({ text }) => ({ width: text.length * 7, height: 12 }),
    });
    interaction.setRenderState({
      layout: first.layout,
      scene: first.builtScene,
    });

    const before = plot.view.get();
    const center = interaction.valueToPx(5, 5);
    interaction.wheel(-120, center.x, center.y, NO_MODS);
    const after = plot.view.get();

    expect(after.x.max - after.x.min).toBeLessThan(before.x.max - before.x.min);
    expect(after.y.max - after.y.min).toBeLessThan(before.y.max - before.y.min);

    const second = builder.buildState({
      controller: plot,
      widthPx: 800,
      heightPx: 400,
      dpr: 1,
      measureText: ({ text }) => ({ width: text.length * 7, height: 12 }),
    });
    interaction.setRenderState({
      layout: second.layout,
      scene: second.builtScene,
    });

    // A rect body click pans (object-area), so it no longer selects; selection
    // is via border/handle or the API. Select directly to drive the handle drag.
    expect(interaction.selectObject(rectId)).toBe(true);
    expect(interaction.getSelectedObjectId()).toBe(rectId);

    const selected = builder.buildState({
      controller: plot,
      widthPx: 800,
      heightPx: 400,
      dpr: 1,
      selectedObjectId: interaction.getSelectedObjectId(),
      measureText: ({ text }) => ({ width: text.length * 7, height: 12 }),
    });
    interaction.setRenderState({
      layout: selected.layout,
      scene: selected.builtScene,
    });

    const handle = interaction.valueToPx(2, 2);
    const moved = interaction.valueToPx(1, 1);
    interaction.pointerDown("left", handle.x, handle.y, NO_MODS);
    interaction.pointerMove(moved.x, moved.y, NO_MODS);
    interaction.pointerUp("left", moved.x, moved.y, NO_MODS);

    const object = plot.objects.list().find((entry) => entry.id === rectId);
    expect(object).toBeTruthy();
    const state = plot.model.getObject(rectId)?.state as {
      xMin: number;
      yMin: number;
      xMax: number;
      yMax: number;
    };
    expect(state.xMin).toBeCloseTo(1, 8);
    expect(state.yMin).toBeCloseTo(1, 8);
    expect(state.xMax).toBeCloseTo(4, 8);
    expect(state.yMax).toBeCloseTo(4, 8);

    const empty = interaction.valueToPx(9, 9);
    interaction.pointerDown("left", empty.x, empty.y, NO_MODS);
    interaction.pointerUp("left", empty.x, empty.y, NO_MODS);
    expect(interaction.getSelectedObjectId()).toBeNull();

    expect(interaction.selectObject(rectId)).toBe(true);
    expect(interaction.getSelectedObjectId()).toBe(rectId);
    expect(interaction.clearSelectedObject()).toBe(true);
    expect(interaction.getSelectedObjectId()).toBeNull();
  });

  it("does not accumulate guide drag deltas across pointer moves", () => {
    const plot = createPlotController({
      initialValue: {
        x: { min: 0, max: 10 },
        y: { min: 0, max: 10 },
      },
    });
    const guideId = plot.objects.add({
      kind: BuiltInObjectKinds.guideH,
      y: 5,
      color: [0.8, 0.6, 0.2, 1],
    });

    const builder = new DrawListBuilder();
    const interaction = new InteractionController(plot);

    expect(interaction.selectObject(guideId)).toBe(true);
    const built = builder.buildState({
      controller: plot,
      widthPx: 800,
      heightPx: 400,
      dpr: 1,
      selectedObjectId: interaction.getSelectedObjectId(),
      measureText: ({ text }) => ({ width: text.length * 7, height: 12 }),
    });
    interaction.setRenderState({
      layout: built.layout,
      scene: built.builtScene,
    });

    const start = interaction.valueToPx(5, 5);
    const mid = interaction.valueToPx(5, 5.5);
    const end = interaction.valueToPx(5, 6);
    interaction.pointerDown("left", start.x, start.y, NO_MODS);
    interaction.pointerMove(mid.x, mid.y, NO_MODS);
    interaction.pointerMove(end.x, end.y, NO_MODS);
    interaction.pointerUp("left", end.x, end.y, NO_MODS);

    const state = plot.model.getObject(guideId)?.state as { y: number };
    expect(state.y).toBeCloseTo(6, 8);
  });
});
