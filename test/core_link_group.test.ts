import { describe, expect, it } from "vitest";

import { createPlotController } from "../src/core/api/controller";
import { InteractionController } from "../src/core/interaction/controller";
import { DrawListBuilder } from "../src/core/render/draw_list";
import { createLinkGroup } from "../src/lib/link";

const NO_MODS = {
  shift: false,
  ctrl: false,
  alt: false,
  meta: false,
} as const;

function attachRenderState(
  controller: ReturnType<typeof createPlotController>,
  interaction: InteractionController,
): void {
  const builder = new DrawListBuilder();
  const built = builder.buildState({
    controller,
    widthPx: 800,
    heightPx: 400,
    dpr: 1,
    measureText: ({ text }) => ({ width: text.length * 7, height: 12 }),
  });
  interaction.setRenderState({
    layout: built.layout,
    scene: built.builtScene,
  });
}

describe("link group", () => {
  it("syncs linked view axes without reaching through nested controller state", () => {
    const left = createPlotController({
      initialValue: {
        x: { min: 0, max: 10 },
        y: { min: 0, max: 20 },
      },
    });
    const right = createPlotController({
      initialValue: {
        x: { min: 100, max: 110 },
        y: { min: -5, max: 5 },
      },
    });

    const leftInteraction = new InteractionController(left);
    const rightInteraction = new InteractionController(right);
    attachRenderState(left, leftInteraction);
    attachRenderState(right, rightInteraction);

    const group = createLinkGroup();
    const unregisterLeft = group.register(leftInteraction, {
      axes: { x: true, y: false },
      cursor: { x: true, y: false },
    });
    const unregisterRight = group.register(rightInteraction, {
      axes: { x: true, y: false },
      cursor: { x: true, y: false },
    });

    left.view.set({
      x: { min: 2, max: 8 },
      y: { min: 3, max: 9 },
    });

    expect(right.view.get()).toEqual({
      x: { min: 2, max: 8 },
      y: { min: -5, max: 5 },
    });

    unregisterLeft();
    unregisterRight();
  });

  it("syncs and clears linked cursors across plots", () => {
    const left = createPlotController({
      initialValue: {
        x: { min: 0, max: 10 },
        y: { min: 0, max: 10 },
      },
    });
    const right = createPlotController({
      initialValue: {
        x: { min: 0, max: 10 },
        y: { min: 0, max: 10 },
      },
    });

    const leftInteraction = new InteractionController(left);
    const rightInteraction = new InteractionController(right);
    attachRenderState(left, leftInteraction);
    attachRenderState(right, rightInteraction);

    const group = createLinkGroup();
    const unregisterLeft = group.register(leftInteraction, {
      cursor: { x: true, y: true },
    });
    const unregisterRight = group.register(rightInteraction, {
      cursor: { x: true, y: true },
    });

    const point = leftInteraction.valueToPx(4, 6);
    leftInteraction.pointerMove(point.x, point.y, NO_MODS);

    expect(rightInteraction.getCrosshairState()).toMatchObject({
      enabled: true,
      axis: "xy",
    });
    expect(rightInteraction.getCursorState().value?.x).toBeCloseTo(4, 8);
    expect(rightInteraction.getCursorState().value?.y).toBeCloseTo(6, 8);

    leftInteraction.pointerLeave();

    expect(rightInteraction.getCrosshairState()).toEqual({ enabled: false });
    expect(rightInteraction.getCursorState().inside).toBe(false);

    unregisterLeft();
    unregisterRight();
  });

  it("clears the linked cursor when a pan drags past the plot edge", () => {
    const left = createPlotController({
      initialValue: { x: { min: 0, max: 100 }, y: { min: 0, max: 20 } },
    });
    const right = createPlotController({
      initialValue: { x: { min: 0, max: 100 }, y: { min: -5, max: 5 } },
    });
    const leftInteraction = new InteractionController(left);
    const rightInteraction = new InteractionController(right);
    attachRenderState(left, leftInteraction);
    attachRenderState(right, rightInteraction);

    const group = createLinkGroup();
    const unregisterLeft = group.register(leftInteraction, {
      axes: { x: true, y: false },
      cursor: { x: true, y: false },
    });
    const unregisterRight = group.register(rightInteraction, {
      axes: { x: true, y: false },
      cursor: { x: true, y: false },
    });

    const vp = leftInteraction.getViewport();
    const leftEdge = vp.plot.origin.x;

    // Start a pan well inside (follower crosshair shows), then drag the pointer
    // out past the left edge while the button stays down. The follower crosshair
    // must CLEAR — not freeze at the last in-bounds sample, and not pin visibly to
    // the edge.
    leftInteraction.pointerDown("left", 400, 200, NO_MODS);
    leftInteraction.pointerMove(leftEdge + 5, 200, NO_MODS);
    attachRenderState(left, leftInteraction);
    attachRenderState(right, rightInteraction);
    expect(rightInteraction.getCrosshairState().enabled).toBe(true);

    leftInteraction.pointerMove(leftEdge - 40, 200, NO_MODS);
    attachRenderState(left, leftInteraction);
    attachRenderState(right, rightInteraction);

    expect(rightInteraction.getCrosshairState()).toEqual({ enabled: false });

    leftInteraction.pointerUp("left", leftEdge - 40, 200, NO_MODS);
    unregisterLeft();
    unregisterRight();
  });
});
