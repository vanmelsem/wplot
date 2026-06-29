import { describe, expect, it } from "vitest";

import {
  formatAxisValue,
  generateTicks,
  resolveAxisStep,
} from "../src/core/render/axis";
import type { AxisSpec } from "../src/core/domain/config";

const logSpec: AxisSpec = {
  mode: "numeric",
  scale: "log",
  notation: "auto",
  timeDisplay: "absolute",
  timezone: "local",
};

describe("core axis formatting", () => {
  it("formats numeric values with explicit notation modes", () => {
    const numericSpec: AxisSpec = {
      mode: "numeric",
      scale: "linear",
      notation: "scientific",
      precision: 3,
      timeDisplay: "absolute",
      timezone: "local",
    };

    expect(
      formatAxisValue({
        axis: "y",
        value: 1_250_000,
        step: 10_000,
        spec: numericSpec,
      }),
    ).toBe("1.250e+6");

    expect(
      formatAxisValue({
        axis: "y",
        value: 0.0001234,
        step: 0.00001,
        spec: { ...numericSpec, notation: "engineering", precision: 2 },
      }),
    ).toBe("123.4e-6");
  });

  it("formats time values as relative or duration labels", () => {
    const timeSpec: AxisSpec = {
      mode: "time",
      scale: "linear",
      notation: "auto",
      timeDisplay: "relative",
      timezone: "utc",
    };

    expect(
      formatAxisValue({
        axis: "x",
        value: 1_500,
        step: 100,
        spec: timeSpec,
      }),
    ).toBe("+00:01.500");

    expect(
      formatAxisValue({
        axis: "x",
        value: -0.25,
        step: 0.01,
        spec: { ...timeSpec, timeDisplay: "duration" },
      }),
    ).toBe("-250us");
  });

  it("derives cursor formatting steps from the visible range", () => {
    expect(
      resolveAxisStep({
        range: { min: 0, max: 1 },
        spanPx: 800,
        spacingPx: 80,
        spec: {
          mode: "numeric",
          scale: "linear",
          notation: "auto",
          timeDisplay: "absolute",
          timezone: "local",
        },
      }),
    ).toBe(0.1);

    expect(
      resolveAxisStep({
        range: { min: 0, max: 2_500 },
        spanPx: 800,
        spacingPx: 80,
        spec: {
          mode: "time",
          scale: "linear",
          notation: "auto",
          timeDisplay: "absolute",
          timezone: "utc",
        },
      }),
    ).toBe(500);
  });

  it("places log-axis ticks on decades with 1/2/5 mantissas", () => {
    const { ticks } = generateTicks({
      axis: "y",
      range: { min: 1, max: 1000 },
      spanPx: 400,
      spacingPx: 50,
      spec: logSpec,
      labels: true,
    });
    const values = ticks.map((t) => t.value);
    // Decades present and marked major.
    for (const decade of [1, 10, 100, 1000]) {
      const tick = ticks.find((t) => t.value === decade);
      expect(tick, `decade ${decade}`).toBeDefined();
      expect(tick!.major).toBe(true);
    }
    // Intermediate 1/2/5 mantissas present and minor.
    expect(values).toContain(2);
    expect(values).toContain(50);
    expect(ticks.find((t) => t.value === 20)!.major).toBe(false);
    // Strictly within the visible range.
    expect(Math.min(...values)).toBeGreaterThanOrEqual(1);
    expect(Math.max(...values)).toBeLessThanOrEqual(1000);
    // Labels are the plain decade/mantissa values.
    expect(ticks.find((t) => t.value === 100)!.label).toBe("100");
  });

  it("backs off to bare decades over a wide log range", () => {
    const { ticks } = generateTicks({
      axis: "y",
      range: { min: 1, max: 1e8 },
      spanPx: 300,
      spacingPx: 50,
      spec: logSpec,
      labels: false,
    });
    // Only powers of ten (every value is 10^k), all major.
    for (const t of ticks) {
      const exp = Math.log10(t.value);
      expect(Math.abs(exp - Math.round(exp))).toBeLessThan(1e-9);
      expect(t.major).toBe(true);
    }
  });

  it("clamps a log range that dips to zero without producing junk ticks", () => {
    const { ticks } = generateTicks({
      axis: "y",
      range: { min: 0, max: 100 },
      spanPx: 400,
      spacingPx: 50,
      spec: logSpec,
      labels: false,
    });
    expect(ticks.length).toBeGreaterThan(0);
    for (const t of ticks) {
      expect(t.value).toBeGreaterThan(0);
      expect(t.value).toBeLessThanOrEqual(100);
    }
  });
});
