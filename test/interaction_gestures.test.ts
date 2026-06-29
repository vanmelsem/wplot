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
import { InteractionController } from "../src/core/interaction/controller";
import { DrawListBuilder } from "../src/core/render/draw_list";

const NO_MODS = { shift: false, ctrl: false, alt: false, meta: false } as const;

function setup(addObjects?: (plot: ReturnType<typeof createPlotController>) => void) {
  const plot = createPlotController({
    initialValue: { x: { min: 0, max: 100 }, y: { min: 0, max: 100 } },
  });
  addObjects?.(plot);
  const builder = new DrawListBuilder();
  const interaction = new InteractionController(plot);
  const refresh = () => {
    const built = builder.buildState({
      controller: plot,
      widthPx: 800,
      heightPx: 400,
      dpr: 1,
      selectedObjectId: interaction.getSelectedObjectId(),
      measureText: ({ text }: { text: string }) => ({
        width: text.length * 7,
        height: 12,
      }),
    });
    interaction.setRenderState({ layout: built.layout, scene: built.builtScene });
  };
  refresh();
  return { plot, interaction, refresh };
}

function dragSelect(
  interaction: InteractionController,
  from: { x: number; y: number },
  to: { x: number; y: number },
  mods: { shift?: boolean; alt?: boolean },
) {
  const m = { ...NO_MODS, ...mods };
  const a = interaction.valueToPx(from.x, from.y);
  const b = interaction.valueToPx(to.x, to.y);
  interaction.pointerDown("left", a.x, a.y, m);
  interaction.pointerMove(b.x, b.y, m);
  interaction.pointerUp("left", b.x, b.y, m);
}

describe("box-zoom axis modes", () => {
  it("shift+drag zooms a full XY rectangle", () => {
    const { plot, interaction } = setup();
    dragSelect(interaction, { x: 30, y: 30 }, { x: 70, y: 70 }, { shift: true });
    const v = plot.view.get();
    expect(v.x.min).toBeCloseTo(30, 0);
    expect(v.x.max).toBeCloseTo(70, 0);
    expect(v.y.min).toBeCloseTo(30, 0);
    expect(v.y.max).toBeCloseTo(70, 0);
  });

  it("alt+drag zooms the Y range only, leaving X untouched", () => {
    const { plot, interaction } = setup();
    dragSelect(interaction, { x: 50, y: 30 }, { x: 50, y: 70 }, { alt: true });
    const v = plot.view.get();
    expect(v.y.min).toBeCloseTo(30, 0);
    expect(v.y.max).toBeCloseTo(70, 0);
    expect(v.x.min).toBe(0);
    expect(v.x.max).toBe(100);
  });

  it("shift+alt+drag zooms a full XY box", () => {
    const { plot, interaction } = setup();
    dragSelect(interaction, { x: 30, y: 30 }, { x: 70, y: 70 }, {
      shift: true,
      alt: true,
    });
    const v = plot.view.get();
    expect(v.x.min).toBeCloseTo(30, 0);
    expect(v.x.max).toBeCloseTo(70, 0);
    expect(v.y.min).toBeCloseTo(30, 0);
    expect(v.y.max).toBeCloseTo(70, 0);
  });
});

describe("annotation drag: border moves, body pans", () => {
  const addRect = (plot: ReturnType<typeof createPlotController>) =>
    plot.objects.add({
      kind: BuiltInObjectKinds.rect,
      xMin: 30,
      xMax: 70,
      yMin: 30,
      yMax: 70,
    });

  it("dragging the rect body pans the plot and leaves the object put", () => {
    let rectId = 0;
    const { plot, interaction } = setup((p) => {
      rectId = p.objects.add({
        kind: BuiltInObjectKinds.rect,
        xMin: 30,
        xMax: 70,
        yMin: 30,
        yMax: 70,
      });
    });
    const before = plot.view.get();
    // (50,50) is deep in the interior -> object-area -> pan.
    const a = interaction.valueToPx(50, 50);
    const b = interaction.valueToPx(60, 60);
    interaction.pointerDown("left", a.x, a.y, NO_MODS);
    interaction.pointerMove(b.x, b.y, NO_MODS);
    interaction.pointerUp("left", b.x, b.y, NO_MODS);

    const rect = plot.objects.get(rectId);
    expect(rect?.state).toMatchObject({ xMin: 30, xMax: 70, yMin: 30, yMax: 70 });
    const after = plot.view.get();
    expect(after.x.min).not.toBeCloseTo(before.x.min, 3);
  });

  it("dragging the body of a focused rect moves it and leaves the view put", () => {
    let rectId = 0;
    const { plot, interaction } = setup((p) => {
      rectId = addRect(p);
    });
    const before = plot.view.get();
    // First click focuses the rect (no move). (30,50) sits on the left edge.
    const a = interaction.valueToPx(30, 50);
    interaction.pointerDown("left", a.x, a.y, NO_MODS);
    interaction.pointerUp("left", a.x, a.y, NO_MODS);
    // Now that it is focused, dragging the body moves it.
    const b = interaction.valueToPx(40, 50);
    interaction.pointerDown("left", a.x, a.y, NO_MODS);
    interaction.pointerMove(b.x, b.y, NO_MODS);
    interaction.pointerUp("left", b.x, b.y, NO_MODS);

    const rect = plot.objects.get(rectId);
    // The whole rect shifts +10 in x; y is unchanged.
    expect((rect?.state as { xMin: number }).xMin).toBeCloseTo(40, 0);
    expect((rect?.state as { xMax: number }).xMax).toBeCloseTo(80, 0);
    const after = plot.view.get();
    expect(after.x.min).toBeCloseTo(before.x.min, 3);
    expect(after.x.max).toBeCloseTo(before.x.max, 3);
  });
});
