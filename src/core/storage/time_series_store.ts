export type NumericVector = Float32Array | Float64Array | readonly number[];
export type StoredNumericArray = Float32Array | Float64Array;

export type NumericRange = {
  min: number;
  max: number;
};

export type AxisOffset = {
  x: number;
  y: number;
};

export type TimeSeriesWindow = {
  x: StoredNumericArray;
  channels: Record<string, StoredNumericArray>;
  baseIndex: number;
  start: number;
  end: number;
};

export interface TimeSeriesStore {
  readonly monotonicX: boolean;
  readonly count: number;
  queryWindow(
    xMin: number,
    xMax: number,
    padStart?: number,
    padEnd?: number,
  ): readonly TimeSeriesWindow[];
}

const DEFAULT_AXIS_OFFSET_THRESHOLD = 1_000_000;

function growLike(
  source: StoredNumericArray,
  count: number,
  nextCapacity: number,
): StoredNumericArray {
  const next =
    source instanceof Float32Array
      ? new Float32Array(nextCapacity)
      : new Float64Array(nextCapacity);
  next.set(source.subarray(0, count), 0);
  return next;
}

function lowerBound(
  values: StoredNumericArray,
  target: number,
  count: number,
): number {
  let left = 0;
  let right = count;
  while (left < right) {
    const mid = left + ((right - left) >> 1);
    if ((values[mid] ?? 0) < target) left = mid + 1;
    else right = mid;
  }
  return left;
}

function upperBound(
  values: StoredNumericArray,
  target: number,
  count: number,
): number {
  let left = 0;
  let right = count;
  while (left < right) {
    const mid = left + ((right - left) >> 1);
    if ((values[mid] ?? 0) <= target) left = mid + 1;
    else right = mid;
  }
  return left;
}

function inferArrayType(input: NumericVector): "f32" | "f64" {
  return input instanceof Float32Array ? "f32" : "f64";
}

function createStoredArray(
  length: number,
  type: "f32" | "f64",
): StoredNumericArray {
  return type === "f32"
    ? new Float32Array(length)
    : new Float64Array(length);
}

export function computeAxisOffset(
  range: NumericRange,
  threshold = DEFAULT_AXIS_OFFSET_THRESHOLD,
): number {
  if (!Number.isFinite(range.min) || !Number.isFinite(range.max)) return 0;
  const maxAbs = Math.max(Math.abs(range.min), Math.abs(range.max));
  if (maxAbs < threshold) return 0;
  const center = (range.min + range.max) * 0.5;
  return Number.isFinite(center) ? center : 0;
}

export function normalizeNumericVector(
  input: NumericVector,
  offset: number,
): StoredNumericArray {
  if (
    offset === 0 &&
    (input instanceof Float32Array || input instanceof Float64Array)
  ) {
    return input;
  }
  const type = inferArrayType(input);
  const out = createStoredArray(input.length, type);
  for (let i = 0; i < input.length; i += 1) {
    out[i] = (input[i] ?? 0) - offset;
  }
  return out;
}

export type MutableTimeSeriesStoreInit = {
  x: NumericVector;
  channels: Record<string, NumericVector>;
  count?: number;
  baseIndex?: number;
  monotonicX?: boolean;
};

export class MutableTimeSeriesStore implements TimeSeriesStore {
  readonly monotonicX: boolean;
  x: StoredNumericArray;
  channels: Record<string, StoredNumericArray>;
  count: number;
  capacity: number;
  baseIndex: number;

  private readonly channelKeys: string[];
  private readonly queryResult: [TimeSeriesWindow];
  private readonly queryState: TimeSeriesWindow;

  constructor(init: MutableTimeSeriesStoreInit) {
    const channelKeys = Object.keys(init.channels);
    const xType = inferArrayType(init.x);
    let count = init.count ?? init.x.length;
    let capacity = init.x.length;
    const channels: Record<string, StoredNumericArray> = {};

    for (let i = 0; i < channelKeys.length; i += 1) {
      const key = channelKeys[i]!;
      const channel = normalizeNumericVector(init.channels[key] ?? [], 0);
      channels[key] = channel;
      count = Math.min(count, channel.length);
      capacity = Math.min(capacity, channel.length);
    }

    this.monotonicX = init.monotonicX ?? true;
    this.x = normalizeNumericVector(init.x, 0);
    this.channels = channels;
    this.count = Math.min(count, this.x.length);
    this.capacity = Math.min(capacity, this.x.length);
    this.baseIndex = init.baseIndex ?? 0;
    this.channelKeys = channelKeys;
    this.queryState = {
      x: this.x,
      channels: this.channels,
      baseIndex: this.baseIndex,
      start: 0,
      end: 0,
    };
    this.queryResult = [this.queryState];

    if (this.x.length === 0 && this.capacity === 0) {
      this.x = createStoredArray(0, xType);
    }
  }

  replace(args: {
    x: NumericVector;
    channels: Record<string, NumericVector>;
    count?: number;
    baseIndex?: number;
  }): void {
    const x = normalizeNumericVector(args.x, 0);
    const nextChannels: Record<string, StoredNumericArray> = {};
    let count = args.count ?? x.length;
    const keys = Object.keys(args.channels);
    for (let i = 0; i < keys.length; i += 1) {
      const key = keys[i]!;
      const channel = normalizeNumericVector(args.channels[key] ?? [], 0);
      nextChannels[key] = channel;
      count = Math.min(count, channel.length);
    }
    this.x = x;
    this.channels = nextChannels;
    this.count = Math.min(count, x.length);
    this.capacity = this.count;
    this.baseIndex = args.baseIndex ?? 0;
    this.queryState.x = this.x;
    this.queryState.channels = this.channels;
  }

  appendPoint(x: number, channels: Record<string, number>): void {
    const next = this.count + 1;
    if (next > this.capacity) this.grow(next);
    this.x[this.count] = x;
    for (let i = 0; i < this.channelKeys.length; i += 1) {
      const key = this.channelKeys[i]!;
      const target = this.channels[key];
      if (!target) continue;
      target[this.count] = channels[key] ?? 0;
    }
    this.count = next;
  }

  appendBatch(x: NumericVector, channels: Record<string, NumericVector>): boolean {
    const batchCount = x.length;
    for (let i = 0; i < this.channelKeys.length; i += 1) {
      const key = this.channelKeys[i]!;
      const channel = channels[key];
      if (!channel || channel.length !== batchCount) return false;
    }
    const next = this.count + batchCount;
    if (next > this.capacity) this.grow(next);
    const xBatch = normalizeNumericVector(x, 0);
    this.x.set(xBatch, this.count);
    for (let i = 0; i < this.channelKeys.length; i += 1) {
      const key = this.channelKeys[i]!;
      const target = this.channels[key];
      const channel = channels[key];
      if (!target || !channel) continue;
      target.set(normalizeNumericVector(channel, 0), this.count);
    }
    this.count = next;
    return true;
  }

  keepLast(maxCount: number): void {
    if (maxCount <= 0) {
      this.baseIndex += this.count;
      this.count = 0;
      return;
    }
    if (this.count <= maxCount) return;
    const drop = this.count - maxCount;
    this.x.copyWithin(0, drop, this.count);
    for (let i = 0; i < this.channelKeys.length; i += 1) {
      const key = this.channelKeys[i]!;
      const target = this.channels[key];
      if (!target) continue;
      target.copyWithin(0, drop, this.count);
    }
    this.baseIndex += drop;
    this.count = maxCount;
  }

  queryWindow(
    xMin: number,
    xMax: number,
    padStart = 0,
    padEnd = 0,
  ): readonly TimeSeriesWindow[] {
    if (this.count <= 0) return [];
    const start = Math.max(0, lowerBound(this.x, xMin, this.count) - padStart);
    const end = Math.min(this.count, upperBound(this.x, xMax, this.count) + padEnd);
    if (end <= start) return [];
    this.queryState.x = this.x;
    this.queryState.channels = this.channels;
    this.queryState.baseIndex = this.baseIndex + start;
    this.queryState.start = start;
    this.queryState.end = end;
    return this.queryResult;
  }

  private grow(nextCount: number): void {
    const nextCapacity = Math.max(this.capacity * 2, nextCount, 16);
    this.x = growLike(this.x, this.count, nextCapacity);
    for (let i = 0; i < this.channelKeys.length; i += 1) {
      const key = this.channelKeys[i]!;
      const target = this.channels[key];
      if (!target) continue;
      this.channels[key] = growLike(target, this.count, nextCapacity);
    }
    this.capacity = nextCapacity;
    this.queryState.x = this.x;
    this.queryState.channels = this.channels;
  }
}
