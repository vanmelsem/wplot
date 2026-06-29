import { describe, expect, it } from "vitest";

import {
  DefaultPlotConfig,
  clonePlotConfig,
  resolvePlotConfig,
} from "../src/core/domain/config";

describe("core plot config", () => {
  it("defaults crosshair labels to hidden", () => {
    expect(DefaultPlotConfig.showCrosshair).toBe(true);
    expect(DefaultPlotConfig.showCrosshairLabels).toBe(false);
    expect(DefaultPlotConfig.showCursorSeriesMarker).toBe(false);
  });

  it("deep-merges layout and axis config without mutating the previous config", () => {
    const prev = clonePlotConfig(DefaultPlotConfig);
    const next = resolvePlotConfig(prev, {
      gridSpacing: [120, 64],
      axisMode: {
        x: { mode: "time", timezone: "utc" },
      },
      layout: {
        margin: { left: 12, top: 4 },
        xScale: { side: "top", min: 32 },
      },
    });

    expect(next.gridSpacing).toEqual([120, 64]);
    expect(next.axisMode?.x).toMatchObject({ mode: "time", timezone: "utc" });
    expect(next.layout.margin).toEqual({
      top: 4,
      right: 0,
      bottom: 0,
      left: 12,
    });
    expect(next.layout.xScale.side).toBe("top");
    expect(next.layout.xScale.min).toBe(32);
    expect(next.layout.yScale.side).toBe("left");
    expect(prev.gridSpacing).toEqual(DefaultPlotConfig.gridSpacing);
    expect(prev.layout.margin.left).toBe(0);
    expect(prev.layout.xScale.side).toBe("bottom");
  });
});
