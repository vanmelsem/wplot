import { describe, expect, it } from "vitest";

import { heatmap } from "../src/plugins/heatmap";
import {
  buildRgbaGrid,
  inferValueRange,
  projectDataRect,
} from "../src/plugins/heatmap/math";
import {
  buildColormapLut,
  grayscale,
  viridis,
} from "../src/plugins/heatmap/colormap";
import type { HeatmapData } from "../src/plugins/heatmap/types";

function sampleData(overrides: Partial<HeatmapData> = {}): HeatmapData {
  return {
    x0: 0,
    x1: 10,
    y0: 0,
    y1: 5,
    rows: 2,
    cols: 3,
    values: new Float32Array([0, 1, 2, 3, 4, 5]),
    ...overrides,
  };
}

describe("heatmap projection math", () => {
  it("projects the data-rect corners through a transform, orientation-agnostic", () => {
    // A typical screen transform: x scales up, y is flipped (data up = pixels up).
    const valueToPx = (x: number, y: number) => ({
      x: 100 + x * 4, // x0=0 -> 100, x1=10 -> 140
      y: 300 - y * 6, // y0=0 -> 300 (bottom), y1=5 -> 270 (top)
    });
    const rect = projectDataRect(
      { x0: 0, x1: 10, y0: 0, y1: 5 },
      valueToPx,
    );
    expect(rect.left).toBe(100);
    expect(rect.right).toBe(140);
    expect(rect.top).toBe(270); // smaller pixel y = top
    expect(rect.bottom).toBe(300);
    expect(rect.width).toBe(40);
    expect(rect.height).toBe(30);
  });

  it("stays pixel-perfect: the projected rect tracks the live transform", () => {
    const rect = { x0: -1, x1: 1, y0: -1, y1: 1 };
    const a = projectDataRect(rect, (x, y) => ({ x: x * 10, y: -y * 10 }));
    // Pan/zoom -> a different transform -> a different (but consistent) rect.
    const b = projectDataRect(rect, (x, y) => ({ x: x * 20 + 5, y: -y * 20 + 5 }));
    expect(a).toMatchObject({ left: -10, right: 10, top: -10, bottom: 10 });
    expect(b).toMatchObject({ left: -15, right: 25, top: -15, bottom: 25 });
  });
});

describe("heatmap value-range inference", () => {
  it("infers min and max from the grid when not provided", () => {
    const values = new Float32Array([3, -2, 7, 0, 4]);
    expect(inferValueRange(values)).toEqual({ min: -2, max: 7 });
  });

  it("honors explicit bounds and only infers the missing end", () => {
    const values = new Float32Array([3, -2, 7, 0, 4]);
    expect(inferValueRange(values, 0)).toEqual({ min: 0, max: 7 });
    expect(inferValueRange(values, undefined, 10)).toEqual({ min: -2, max: 10 });
    expect(inferValueRange(values, -5, 20)).toEqual({ min: -5, max: 20 });
  });

  it("ignores non-finite entries and guards against a degenerate range", () => {
    const values = new Float32Array([NaN, 5, Infinity, 5]);
    expect(inferValueRange(values)).toEqual({ min: 5, max: 6 });
    expect(inferValueRange(new Float32Array([]))).toEqual({ min: 0, max: 1 });
  });
});

describe("heatmap colormap LUT", () => {
  it("stays in range and clamps t outside [0, 1]", () => {
    for (let i = 0; i <= 32; i += 1) {
      const [r, g, b, a] = viridis(i / 32);
      for (const ch of [r, g, b]) {
        expect(ch).toBeGreaterThanOrEqual(0);
        expect(ch).toBeLessThanOrEqual(255);
      }
      expect(a).toBe(255);
    }
    expect(viridis(-1)).toEqual(viridis(0));
    expect(viridis(2)).toEqual(viridis(1));
  });

  it("is perceptually monotonic (luminance non-decreasing across the ramp)", () => {
    const lum = (t: number) => {
      const [r, g, b] = viridis(t);
      return 0.299 * r + 0.587 * g + 0.114 * b;
    };
    let prev = -1;
    for (let i = 0; i <= 16; i += 1) {
      const l = lum(i / 16);
      expect(l).toBeGreaterThanOrEqual(prev);
      prev = l;
    }
    // Endpoints are clearly distinct (dark -> bright).
    expect(lum(1)).toBeGreaterThan(lum(0) + 100);
  });

  it("bakes a flat rgba8 LUT spanning the colormap endpoints", () => {
    const lut = buildColormapLut(viridis, 256);
    expect(lut.length).toBe(256 * 4);
    expect([lut[0], lut[1], lut[2], lut[3]]).toEqual([...viridis(0)]);
    expect([lut[1020], lut[1021], lut[1022], lut[1023]]).toEqual([
      ...viridis(1),
    ]);
  });

  it("grayscale is a monotonic ramp from black to white", () => {
    expect(grayscale(0)).toEqual([0, 0, 0, 255]);
    expect(grayscale(1)).toEqual([255, 255, 255, 255]);
    expect(grayscale(0.5)[0]).toBeGreaterThan(grayscale(0.25)[0]);
  });
});

describe("buildRgbaGrid", () => {
  it("maps each grid value to a colormap color, row-major rgba", () => {
    const values = new Float32Array([0, 1]);
    const grid = buildRgbaGrid(values, 1, 2, { min: 0, max: 1 }, grayscale);
    expect(grid.length).toBe(2 * 4);
    expect([grid[0], grid[1], grid[2], grid[3]]).toEqual([0, 0, 0, 255]); // t=0
    expect([grid[4], grid[5], grid[6], grid[7]]).toEqual([255, 255, 255, 255]); // t=1
  });
});

describe("heatmap() plugin", () => {
  it("is a named plugin", () => {
    expect(heatmap(sampleData()).name).toBe("heatmap");
  });

  it("setup() registers a layer via plot.addLayer and returns its disposer", () => {
    const added: Array<{ draw: (frame: unknown) => void }> = [];
    let disposed = 0;
    const fakePlot = {
      addLayer: (layer: { draw: (frame: unknown) => void }) => {
        added.push(layer);
        return () => {
          disposed += 1;
        };
      },
    };

    // No navigator.gpu in the test runner -> the Canvas-2D path is selected,
    // which must construct without touching the DOM (deferred to draw-time).
    const teardown = heatmap(sampleData()).setup(fakePlot as never);

    expect(added).toHaveLength(1);
    expect(typeof added[0]!.draw).toBe("function");
    expect(typeof teardown).toBe("function");

    teardown!();
    expect(disposed).toBe(1);
  });

  it("honors forceCanvas2d (still registers a working layer)", () => {
    let registered = 0;
    const fakePlot = {
      addLayer: () => {
        registered += 1;
        return () => {};
      },
    };
    heatmap(sampleData(), { forceCanvas2d: true }).setup(fakePlot as never);
    expect(registered).toBe(1);
  });
});
