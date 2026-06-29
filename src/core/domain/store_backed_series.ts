import {
  MutableTimeSeriesStore,
  normalizeNumericVector,
  type NumericVector,
} from "../storage/time_series_store";
import type { SeriesNormalizeContext } from "./series";

export type StoreBackedSeriesState = {
  store: MutableTimeSeriesStore;
  offsetX: number;
  offsetY: number;
};

export type ChannelInputMap = Record<string, NumericVector>;
export type ChannelScalarMap = Record<string, number>;

function normalizeChannels(
  channels: ChannelInputMap,
  offsetY: number,
): ChannelInputMap {
  const out: ChannelInputMap = {};
  const keys = Object.keys(channels);
  for (let i = 0; i < keys.length; i += 1) {
    const key = keys[i]!;
    out[key] = normalizeNumericVector(channels[key] ?? [], offsetY);
  }
  return out;
}

export function createStoreBackedSeriesState(
  x: NumericVector,
  channels: ChannelInputMap,
  ctx: SeriesNormalizeContext,
): StoreBackedSeriesState {
  const offsetX = ctx.axisOffsetX;
  const offsetY = ctx.axisOffsetY;
  return {
    store: new MutableTimeSeriesStore({
      x: normalizeNumericVector(x, offsetX),
      channels: normalizeChannels(channels, offsetY),
    }),
    offsetX,
    offsetY,
  };
}

export function replaceStoreBackedSeriesState(
  state: StoreBackedSeriesState,
  x: NumericVector,
  channels: ChannelInputMap,
  ctx: SeriesNormalizeContext,
): void {
  const offsetX = ctx.axisOffsetX;
  const offsetY = ctx.axisOffsetY;
  state.offsetX = offsetX;
  state.offsetY = offsetY;
  state.store.replace({
    x: normalizeNumericVector(x, offsetX),
    channels: normalizeChannels(channels, offsetY),
  });
}

export function setStoreBackedOffsets(
  state: StoreBackedSeriesState,
  ctx: SeriesNormalizeContext,
): void {
  state.offsetX = ctx.axisOffsetX;
  state.offsetY = ctx.axisOffsetY;
}

export function appendStoreBackedPoint(
  state: StoreBackedSeriesState,
  x: number,
  channels: ChannelScalarMap,
  maxCount?: number,
): void {
  state.store.appendPoint(x, channels);
  if (typeof maxCount === "number" && maxCount > 0) {
    state.store.keepLast(maxCount);
  }
}

export function appendStoreBackedBatch(
  state: StoreBackedSeriesState,
  x: NumericVector,
  channels: ChannelInputMap,
  maxCount?: number,
): boolean {
  const ok = state.store.appendBatch(x, channels);
  if (!ok) return false;
  if (typeof maxCount === "number" && maxCount > 0) {
    state.store.keepLast(maxCount);
  }
  return true;
}

/**
 * Data bounds of a store-backed series: x from the (sorted) x column endpoints,
 * y by scanning the given y-channels for min/max. Returns null when empty.
 */
export function storeBackedExtent(
  state: StoreBackedSeriesState,
  yChannelKeys: readonly string[],
): { x: { min: number; max: number }; y: { min: number; max: number } } | null {
  const count = state.store.count;
  if (count <= 0) return null;
  const x = state.store.x;
  // x is kept monotonically ascending, so the endpoints are the extent.
  const xMin = (x[0] ?? 0) + state.offsetX;
  const xMax = (x[count - 1] ?? 0) + state.offsetX;
  let yMin = Infinity;
  let yMax = -Infinity;
  for (let c = 0; c < yChannelKeys.length; c += 1) {
    const channel = state.store.channels[yChannelKeys[c]!];
    if (!channel) continue;
    const n = Math.min(count, channel.length);
    for (let i = 0; i < n; i += 1) {
      const v = channel[i] ?? 0;
      if (v < yMin) yMin = v;
      if (v > yMax) yMax = v;
    }
  }
  if (yMin > yMax) return null;
  return {
    x: { min: xMin, max: xMax },
    y: { min: yMin + state.offsetY, max: yMax + state.offsetY },
  };
}

export function readStoreBackedDatum<TKey extends string>(
  state: StoreBackedSeriesState,
  index: number,
  channelKeys: readonly TKey[],
): ({ x: number } & { [K in TKey]: number }) | null {
  if (index < 0 || index >= state.store.count || index >= state.store.x.length) {
    return null;
  }
  const out = {
    x: (state.store.x[index] ?? 0) + state.offsetX,
  } as { x: number } & { [K in TKey]: number };
  const outChannels = out as Record<string, number> & { x: number };
  for (let i = 0; i < channelKeys.length; i += 1) {
    const key = channelKeys[i]!;
    const channel = state.store.channels[key];
    if (!channel || index >= channel.length) return null;
    outChannels[key] = (channel[index] ?? 0) + state.offsetY;
  }
  return out;
}
