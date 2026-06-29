import { describe, expect, it } from "vitest";

import { createPlotController } from "../src/core/api/controller";
import { DrawListBuilder } from "../src/core/render/draw_list";
import { dotsSeries, DOTS_SERIES_KIND } from "../src/plugins/dots_series";

const measureText = ({ text }: { text: string }) => ({
  width: text.length * 7,
  height: 12,
});

function buildController() {
  return createPlotController({
    initialValue: { x: { min: 0, max: 100 }, y: { min: 0, max: 100 } },
  });
}

describe("custom series extension via registerSeries", () => {
  it("registers a custom kind, adds data, and renders its primitive", () => {
    const plot = buildController();
    plot.registerSeries(dotsSeries());

    const id = plot.series.add("dots", {
      kind: DOTS_SERIES_KIND,
      x: [10, 50, 90],
      y: [20, 60, 40],
      sizePx: 7,
    });
    expect(typeof id).toBe("number");

    const dl = new DrawListBuilder().build({
      controller: plot,
      widthPx: 800,
      heightPx: 400,
      dpr: 1,
      measureText,
    });

    // The scene "marker" primitive maps to a render quad/marker in the series slot.
    const markers = dl.series.filter(
      (p) => p.kind === "quad" && p.mode === "marker",
    );
    expect(markers).toHaveLength(1);
    expect(markers[0]!.kind === "quad" && markers[0]!.count).toBe(3);
  });

  it("reads datums back through the model adapter", () => {
    const plot = buildController();
    plot.registerSeries(dotsSeries());
    const id = plot.series.add("dots", {
      kind: DOTS_SERIES_KIND,
      x: [10, 50, 90],
      y: [20, 60, 40],
    });
    expect(plot.series.getDatum(id, 1)).toEqual({ x: 50, y: 60 });
    expect(plot.series.getDatum(id, 99)).toBeNull();
  });

  it("rejects a model/scene kind mismatch", () => {
    const plot = buildController();
    const ext = dotsSeries();
    expect(() =>
      plot.registerSeries({
        model: ext.model,
        scene: { ...ext.scene, kind: "series/mismatch" },
      }),
    ).toThrow(/kind mismatch/i);
  });
});
