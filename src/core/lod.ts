export type LineLodLevel = {
  stride: number;
  minIdx: Uint32Array;
  maxIdx: Uint32Array;
  count: number;
};

export type LineLod = {
  levels: LineLodLevel[];
  sourceCount: number;
  revision: number;
  x0: number;
};

export function appendLineLod(
  lod: LineLod,
  args: { x: Float32Array; y: Float32Array; start: number; count: number },
): LineLod {
  const { x, y, start, count } = args;
  if (count <= 0) return lod;
  const total = start + count;
  const base = lod.levels[0];
  if (!base) return lod;
  if (start < base.count) return lod;

  const baseCapacity = Math.min(x.length, y.length);
  if (total > baseCapacity) return lod;

  if (total > base.minIdx.length) {
    const nextCap = Math.max(base.minIdx.length * 2, total, baseCapacity);
    const nextMin = new Uint32Array(nextCap);
    const nextMax = new Uint32Array(nextCap);
    if (base.count > 0) {
      nextMin.set(base.minIdx.subarray(0, base.count), 0);
      nextMax.set(base.maxIdx.subarray(0, base.count), 0);
    }
    base.minIdx = nextMin;
    base.maxIdx = nextMax;
  }
  for (let i = 0; i < count; i++) {
    const idx = start + i;
    base.minIdx[idx] = idx;
    base.maxIdx[idx] = idx;
  }
  const oldBaseCount = base.count;
  base.count = total;

  let prev = base;
  let prevOldCount = oldBaseCount;
  let levelIndex = 1;
  while (prev.count > 1) {
    const stride = prev.stride * 2;
    const newCount = Math.ceil(prev.count / 2);
    let level = lod.levels[levelIndex];
    const oldCount = level?.count ?? Math.ceil(prevOldCount / 2);
    const startBin = Math.max(0, Math.floor((prevOldCount - 1) / 2));
    const capacity = Math.ceil(baseCapacity / stride);

    if (!level) {
      level = {
        stride,
        minIdx: new Uint32Array(Math.max(16, capacity)),
        maxIdx: new Uint32Array(Math.max(16, capacity)),
        count: 0,
      };
      lod.levels[levelIndex] = level;
    } else if (level.minIdx.length < capacity) {
      const nextCap = Math.max(level.minIdx.length * 2, capacity);
      const nextMin = new Uint32Array(nextCap);
      const nextMax = new Uint32Array(nextCap);
      if (level.count > 0) {
        nextMin.set(level.minIdx.subarray(0, level.count), 0);
        nextMax.set(level.maxIdx.subarray(0, level.count), 0);
      }
      level.minIdx = nextMin;
      level.maxIdx = nextMax;
    }

    for (let i = startBin; i < newCount; i++) {
      const left = i * 2;
      const right = left + 1;
      const leftMin = prev.minIdx[left] ?? 0;
      const leftMax = prev.maxIdx[left] ?? 0;
      const rightMin =
        right < prev.count ? (prev.minIdx[right] ?? leftMin) : leftMin;
      const rightMax =
        right < prev.count ? (prev.maxIdx[right] ?? leftMax) : leftMax;
      const minPick =
        (y[leftMin] ?? 0) <= (y[rightMin] ?? 0) ? leftMin : rightMin;
      const maxPick =
        (y[leftMax] ?? 0) >= (y[rightMax] ?? 0) ? leftMax : rightMax;
      level.minIdx[i] = minPick;
      level.maxIdx[i] = maxPick;
    }

    level.stride = stride;
    level.count = newCount;
    prevOldCount = oldCount;
    prev = level;
    levelIndex += 1;
  }
  lod.sourceCount = total;
  return lod;
}

export function buildLineLod(args: {
  x: Float32Array;
  y: Float32Array;
  count: number;
  revision: number;
}): LineLod {
  const { x, y, count, revision } = args;
  const total = Math.min(count, x.length, y.length);
  const capacity = Math.min(x.length, y.length);
  const levels: LineLodLevel[] = [];

  const baseMin = new Uint32Array(capacity);
  const baseMax = new Uint32Array(capacity);
  for (let i = 0; i < total; i++) {
    baseMin[i] = i;
    baseMax[i] = i;
  }
  levels.push({ stride: 1, minIdx: baseMin, maxIdx: baseMax, count: total });

  let prev = levels[0]!;
  while (prev.count > 1) {
    const nextCount = Math.ceil(prev.count / 2);
    const nextCapacity = Math.ceil(capacity / (prev.stride * 2));
    const minIdx = new Uint32Array(nextCapacity);
    const maxIdx = new Uint32Array(nextCapacity);
    for (let i = 0; i < nextCount; i++) {
      const left = i * 2;
      const right = left + 1;
      const leftMin = prev.minIdx[left] ?? 0;
      const leftMax = prev.maxIdx[left] ?? 0;
      const rightMin =
        right < prev.count ? (prev.minIdx[right] ?? leftMin) : leftMin;
      const rightMax =
        right < prev.count ? (prev.maxIdx[right] ?? leftMax) : leftMax;
      const minPick =
        (y[leftMin] ?? 0) <= (y[rightMin] ?? 0) ? leftMin : rightMin;
      const maxPick =
        (y[leftMax] ?? 0) >= (y[rightMax] ?? 0) ? leftMax : rightMax;
      minIdx[i] = minPick;
      maxIdx[i] = maxPick;
    }
    const level = {
      stride: prev.stride * 2,
      minIdx,
      maxIdx,
      count: nextCount,
    };
    levels.push(level);
    prev = level;
  }

  return { levels, sourceCount: total, revision, x0: x[0] ?? 0 };
}
