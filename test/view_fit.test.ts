import { describe, expect, it } from "vitest";
import { createPlotController } from "../src/core/api/controller";

describe("view.fit auto-ranges to data", () => {
  it("fits x and y to the visible series data (with default padY)", () => {
    const c = createPlotController({ initialValue: { x: { min: 0, max: 1 }, y: { min: 0, max: 1 } } });
    c.series.add("a", { kind: "series/line", x: new Float64Array([10, 20, 30]), y: new Float64Array([-5, 15, 5]) });
    expect(c.view.fit()).toBe(true);
    const v = c.view.get();
    expect(v.x.min).toBeCloseTo(10, 6);
    expect(v.x.max).toBeCloseTo(30, 6);
    // y span 20, padY 5% => 1 each side
    expect(v.y.min).toBeCloseTo(-6, 6);
    expect(v.y.max).toBeCloseTo(16, 6);
  });

  it("returns false with no data", () => {
    const c = createPlotController({ initialValue: { x: { min: 0, max: 1 }, y: { min: 0, max: 1 } } });
    expect(c.view.fit()).toBe(false);
  });
});
