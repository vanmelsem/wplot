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

describe("core plot controller", () => {
  it("batches view events and builds scenes from the composed model", () => {
    const plot = createPlotController({
      initialValue: {
        x: { min: 0, max: 10 },
        y: { min: 0, max: 10 },
      },
    });

    const views: Array<{ x: { min: number; max: number }; y: { min: number; max: number } }> = [];
    const unsubscribe = plot.subscribe("view", (event) => {
      views.push(event);
    });

    const seriesId = plot.series.add("line", {
      kind: BuiltInSeriesKinds.line,
      x: [0, 5, 10],
      y: [1, 3, 2],
    });
    plot.objects.add({
      kind: BuiltInObjectKinds.tag,
      x: 4,
      y: 6,
      text: "hello",
    });

    plot.batch(() => {
      expect(
        plot.view.set({
          x: { min: 1, max: 9 },
          y: { min: 2, max: 8 },
        }),
      ).toBe(true);
      expect(plot.view.reset()).toBe(true);
    });

    const built = plot.buildScene({
      dpr: 1,
      plotWidthPx: 500,
      plotHeightPx: 250,
    });

    expect(views).toEqual([
      {
        x: { min: 0, max: 10 },
        y: { min: 0, max: 10 },
      },
    ]);
    expect(plot.series.getDatum(seriesId, 1)).toEqual({ x: 5, y: 3 });
    expect(built.frame.series.length).toBeGreaterThan(0);
    expect(built.frame.objects.length).toBeGreaterThan(0);
    expect(built.legend).toHaveLength(1);
    expect(plot.config.get().showLegend).toBe(false);
    expect(plot.objects.list()).toHaveLength(1);
    expect(plot.objects.get(0)?.state).toMatchObject({
      x: 4,
      y: 6,
      text: "hello",
    });

    unsubscribe();
    plot.dispose();
  });
});
