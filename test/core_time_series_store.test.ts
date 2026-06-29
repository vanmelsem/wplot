import { describe, expect, it } from "vitest";

import {
  MutableTimeSeriesStore,
  computeAxisOffset,
  normalizeNumericVector,
} from "../src/core/storage/time_series_store";

describe("core storage", () => {
  it("computes axis offsets only for large ranges", () => {
    expect(computeAxisOffset({ min: 0, max: 10 })).toBe(0);
    expect(computeAxisOffset({ min: 1_500_000, max: 1_500_100 })).toBe(
      1_500_050,
    );
  });

  it("normalizes numeric vectors by offset and preserves float32 shape", () => {
    const source = new Float32Array([10, 12, 15]);
    const normalized = normalizeNumericVector(source, 10);

    expect(normalized).toBeInstanceOf(Float32Array);
    expect(Array.from(normalized)).toEqual([0, 2, 5]);
  });

  it("queries windows with padding and keeps base indices stable", () => {
    const store = new MutableTimeSeriesStore({
      x: [0, 1, 2, 3, 4, 5],
      channels: {
        y: [10, 11, 12, 13, 14, 15],
      },
    });

    const windows = store.queryWindow(2, 3, 1, 1);
    expect(windows).toHaveLength(1);
    expect(windows[0]).toMatchObject({
      baseIndex: 1,
      start: 1,
      end: 5,
    });
  });

  it("keeps only the last N points and advances baseIndex", () => {
    const store = new MutableTimeSeriesStore({
      x: [0, 1, 2, 3, 4],
      channels: {
        y: [10, 11, 12, 13, 14],
      },
    });

    store.keepLast(2);

    expect(store.count).toBe(2);
    expect(store.baseIndex).toBe(3);
    expect(Array.from(store.x.subarray(0, store.count))).toEqual([3, 4]);
    expect(Array.from(store.channels.y.subarray(0, store.count))).toEqual([
      13, 14,
    ]);
  });

  it("replaces store contents and resets bookkeeping", () => {
    const store = new MutableTimeSeriesStore({
      x: [0, 1],
      channels: {
        y: [2, 3],
      },
      baseIndex: 9,
    });

    store.replace({
      x: [10, 11, 12],
      channels: {
        y: [20, 21, 22],
      },
    });

    expect(store.baseIndex).toBe(0);
    expect(store.count).toBe(3);
    expect(Array.from(store.x.subarray(0, store.count))).toEqual([10, 11, 12]);
    expect(Array.from(store.channels.y.subarray(0, store.count))).toEqual([
      20, 21, 22,
    ]);
  });
});
