import type { PickingEntry, PickingHit, ScenePickingIndex } from "./contracts";

function originX(entry: { origin?: { x: number } }): number {
  return entry.origin?.x ?? 0;
}

function originY(entry: { origin?: { y: number } }): number {
  return entry.origin?.y ?? 0;
}

function pickedObjectId(hit: PickingHit): number | null {
  return hit.kind === "object" ||
    hit.kind === "object-area" ||
    hit.kind === "object-handle"
    ? hit.objectId
    : null;
}

function pickNearestPoint(
  current: { hit: PickingHit; dist2: number } | null,
  next: { hit: PickingHit; dist2: number } | null,
  focusedObjectId: number | null,
): { hit: PickingHit; dist2: number } | null {
  if (!next) return current;
  if (
    current &&
    next.hit.kind === "object-handle" &&
    current.hit.kind === "object"
  ) {
    return next;
  }
  if (
    current &&
    next.hit.kind === "object" &&
    current.hit.kind === "object-handle"
  ) {
    return current;
  }
  // Focus-sticky: once an object is focused it wins overlapping object hits, so
  // it stays grabbable even when another object is drawn on top of it. (Handles
  // already win above, and only the focused object has handles.) Series hits are
  // left to nearest-distance — this only biases among object-kind hits.
  if (current && focusedObjectId != null) {
    const nextFocused = pickedObjectId(next.hit) === focusedObjectId;
    const curFocused = pickedObjectId(current.hit) === focusedObjectId;
    if (nextFocused && !curFocused) return next;
    if (curFocused && !nextFocused) return current;
  }
  if (!current || next.dist2 < current.dist2) return next;
  if (
    next.dist2 === current.dist2 &&
    next.hit.kind === "object-handle" &&
    current.hit.kind !== "object-handle"
  ) {
    return next;
  }
  return current;
}



function lowerBound(
  values: Float32Array | Float64Array,
  count: number,
  target: number,
): number {
  let lo = 0;
  let hi = count;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if ((values[mid] ?? 0) < target) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

function upperBound(
  values: Float32Array | Float64Array,
  count: number,
  target: number,
): number {
  let lo = 0;
  let hi = count;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if ((values[mid] ?? 0) <= target) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

function hitPolyline(
  entry: Extract<PickingEntry, { kind: "polyline-series" }>,
  wx: number,
  wy: number,
  tolx: number,
  toly: number,
): { hit: PickingHit; dist2: number } | null {
  if (entry.count < 2) return null;
  const ox = originX(entry);
  const oy = originY(entry);
  const localX = wx - ox;
  const localY = wy - oy;
  let bestIndex = -1;
  let bestDist2 = Infinity;
  const minX = localX - tolx;
  const maxX = localX + tolx;
  let start = lowerBound(entry.x, entry.count, minX);
  if (start > 0) start -= 1;
  let end = upperBound(entry.x, entry.count, maxX);
  if (end < entry.count) end += 1;
  const lastSegment = Math.min(entry.count - 2, end - 1);
  for (let i = start; i <= lastSegment; i += 1) {
    const ax = entry.x[i] ?? 0;
    const ay = entry.y[i] ?? 0;
    const bx = entry.x[i + 1] ?? 0;
    const by = entry.y[i + 1] ?? 0;
    const segMinX = Math.min(ax, bx);
    const segMaxX = Math.max(ax, bx);
    if (segMaxX < minX || segMinX > maxX) continue;
    const vx = bx - ax;
    const vy = by - ay;
    const c1 = (localX - ax) * vx + (localY - ay) * vy;
    let t = 0;
    if (c1 > 0) {
      const c2 = vx * vx + vy * vy;
      if (c2 > 0) t = Math.min(1, c1 / c2);
    }
    const px = ax + t * vx;
    const py = ay + t * vy;
    const dx = localX - px;
    const dy = localY - py;
    const ndx = tolx > 0 ? dx / tolx : dx;
    const ndy = toly > 0 ? dy / toly : dy;
    if (ndx * ndx + ndy * ndy > 1) continue;
    const dist2 = dx * dx + dy * dy;
    if (dist2 < bestDist2) {
      const dax = localX - ax;
      const day = localY - ay;
      const dbx = localX - bx;
      const dby = localY - by;
      bestIndex =
        dax * dax + day * day <= dbx * dbx + dby * dby ? i : i + 1;
      bestDist2 = dist2;
    }
  }
  if (bestIndex < 0) return null;
  return {
    hit: {
      kind: "series-point",
      seriesId: entry.seriesId,
      index: entry.baseIndex + bestIndex,
    },
    dist2: bestDist2,
  };
}

function hitMarkers(
  entry: Extract<PickingEntry, { kind: "marker-series" }>,
  wx: number,
  wy: number,
  tolx: number,
  toly: number,
): { hit: PickingHit; dist2: number } | null {
  const ox = originX(entry);
  const oy = originY(entry);
  const localX = wx - ox;
  const localY = wy - oy;
  let bestIndex = -1;
  let bestDist2 = Infinity;
  for (let i = 0; i < entry.count; i += 1) {
    const dx = localX - (entry.x[i] ?? 0);
    const dy = localY - (entry.y[i] ?? 0);
    if (Math.abs(dx) > tolx || Math.abs(dy) > toly) continue;
    const dist2 = dx * dx + dy * dy;
    if (dist2 < bestDist2) {
      bestIndex = i;
      bestDist2 = dist2;
    }
  }
  if (bestIndex < 0) return null;
  return {
    hit: {
      kind: "series-point",
      seriesId: entry.seriesId,
      index: entry.baseIndex + bestIndex,
    },
    dist2: bestDist2,
  };
}

function hitBars(
  entry: Extract<PickingEntry, { kind: "bars-series" }>,
  wx: number,
  wy: number,
  tolx: number,
  toly: number,
): { hit: PickingHit; dist2: number } | null {
  const ox = originX(entry);
  const oy = originY(entry);
  const localX = wx - ox;
  const localY = wy - oy;
  const half = entry.width * 0.5;
  let bestIndex = -1;
  let bestDist2 = Infinity;
  for (let i = 0; i < entry.count; i += 1) {
    const x = entry.x[i] ?? 0;
    const y = entry.y[i] ?? 0;
    const y0 = entry.y0[i] ?? 0;
    const xMin = x - half;
    const xMax = x + half;
    const yMin = Math.min(y, y0);
    const yMax = Math.max(y, y0);
    if (localX < xMin - tolx || localX > xMax + tolx) continue;
    if (localY < yMin - toly || localY > yMax + toly) continue;
    const dist2 = (localX - x) * (localX - x);
    if (dist2 < bestDist2) {
      bestIndex = i;
      bestDist2 = dist2;
    }
  }
  if (bestIndex < 0) return null;
  return {
    hit: {
      kind: "series-point",
      seriesId: entry.seriesId,
      index: entry.baseIndex + bestIndex,
    },
    dist2: bestDist2,
  };
}

function hitCandles(
  entry: Extract<PickingEntry, { kind: "candles-series" }>,
  wx: number,
  wy: number,
  tolx: number,
  toly: number,
): { hit: PickingHit; dist2: number } | null {
  const ox = originX(entry);
  const oy = originY(entry);
  const localX = wx - ox;
  const localY = wy - oy;
  const half = entry.width * 0.5;
  let bestIndex = -1;
  let bestDist2 = Infinity;
  for (let i = 0; i < entry.count; i += 1) {
    const x = entry.x[i] ?? 0;
    const open = entry.open[i] ?? 0;
    const high = entry.high[i] ?? 0;
    const low = entry.low[i] ?? 0;
    const close = entry.close[i] ?? 0;
    const xMin = x - half;
    const xMax = x + half;
    const yMin = Math.min(low, high, open, close);
    const yMax = Math.max(low, high, open, close);
    if (localX < xMin - tolx || localX > xMax + tolx) continue;
    if (localY < yMin - toly || localY > yMax + toly) continue;
    const dist2 = (localX - x) * (localX - x);
    if (dist2 < bestDist2) {
      bestIndex = i;
      bestDist2 = dist2;
    }
  }
  if (bestIndex < 0) return null;
  return {
    hit: {
      kind: "series-point",
      seriesId: entry.seriesId,
      index: entry.baseIndex + bestIndex,
    },
    dist2: bestDist2,
  };
}

function hitSegment(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  wx: number,
  wy: number,
  tolx: number,
  toly: number,
): number | null {
  const vx = x1 - x0;
  const vy = y1 - y0;
  const c2 = vx * vx + vy * vy;
  const t =
    c2 > 0
      ? Math.max(0, Math.min(1, ((wx - x0) * vx + (wy - y0) * vy) / c2))
      : 0;
  const px = x0 + vx * t;
  const py = y0 + vy * t;
  const ndx = tolx > 0 ? (wx - px) / tolx : wx - px;
  const ndy = toly > 0 ? (wy - py) / toly : wy - py;
  const score = ndx * ndx + ndy * ndy;
  if (score > 1) return null;
  const dx = wx - px;
  const dy = wy - py;
  return dx * dx + dy * dy;
}

export function pickScene(
  index: ScenePickingIndex,
  wx: number,
  wy: number,
  tolx: number,
  toly: number,
  focusedObjectId: number | null = null,
): PickingHit | null {
  let best: { hit: PickingHit; dist2: number } | null = null;
  const merge = (
    a: { hit: PickingHit; dist2: number } | null,
    b: { hit: PickingHit; dist2: number } | null,
  ) => pickNearestPoint(a, b, focusedObjectId);
  for (let i = 0; i < index.entries.length; i += 1) {
    const entry = index.entries[i]!;
    switch (entry.kind) {
      case "polyline-series":
        best = merge(best, hitPolyline(entry, wx, wy, tolx, toly));
        break;
      case "marker-series":
        best = merge(best, hitMarkers(entry, wx, wy, tolx, toly));
        break;
      case "bars-series":
        best = merge(best, hitBars(entry, wx, wy, tolx, toly));
        break;
      case "candles-series":
        best = merge(best, hitCandles(entry, wx, wy, tolx, toly));
        break;
      case "object-horizontal-line": {
        const dy = wy - entry.y;
        if (Math.abs(dy) <= toly) {
          best = merge(best, {
            hit: { kind: "object", objectId: entry.objectId },
            dist2: dy * dy,
          });
        }
        break;
      }
      case "object-vertical-line": {
        const dx = wx - entry.x;
        if (Math.abs(dx) <= tolx) {
          best = merge(best, {
            hit: { kind: "object", objectId: entry.objectId },
            dist2: dx * dx,
          });
        }
        break;
      }
      case "object-rect": {
        // The grab band straddles each edge by ±tolerance (equal pixels inside
        // AND outside the border), so all four edges — including the bottom
        // (yMin) — select symmetrically. Interior away from every edge is the
        // pan-through area body.
        const withinX = wx >= entry.xMin - tolx && wx <= entry.xMax + tolx;
        const withinY = wy >= entry.yMin - toly && wy <= entry.yMax + toly;
        if (withinX && withinY) {
          const onBorder =
            Math.abs(wx - entry.xMin) <= tolx ||
            Math.abs(wx - entry.xMax) <= tolx ||
            Math.abs(wy - entry.yMin) <= toly ||
            Math.abs(wy - entry.yMax) <= toly;
          best = merge(best, {
            hit: {
              kind: onBorder ? "object" : "object-area",
              objectId: entry.objectId,
            },
            dist2: 0,
          });
        }
        break;
      }
      case "object-x-band":
        // Edge band straddles xMin/xMax by ±tolx (inside and outside).
        if (wx >= entry.xMin - tolx && wx <= entry.xMax + tolx) {
          const onBorder =
            Math.abs(wx - entry.xMin) <= tolx ||
            Math.abs(wx - entry.xMax) <= tolx;
          best = merge(best, {
            hit: {
              kind: onBorder ? "object" : "object-area",
              objectId: entry.objectId,
            },
            dist2: 0,
          });
        }
        break;
      case "object-y-band":
        // Edge band straddles yMin/yMax by ±toly (inside and outside).
        if (wy >= entry.yMin - toly && wy <= entry.yMax + toly) {
          const onBorder =
            Math.abs(wy - entry.yMin) <= toly ||
            Math.abs(wy - entry.yMax) <= toly;
          best = merge(best, {
            hit: {
              kind: onBorder ? "object" : "object-area",
              objectId: entry.objectId,
            },
            dist2: 0,
          });
        }
        break;
      case "object-segment": {
        const dist2 = hitSegment(
          entry.x0,
          entry.y0,
          entry.x1,
          entry.y1,
          wx,
          wy,
          tolx,
          toly,
        );
        if (dist2 != null) {
          best = merge(best, {
            hit: { kind: "object", objectId: entry.objectId },
            dist2,
          });
        }
        break;
      }
      case "object-point": {
        const scale = entry.scale ?? 1;
        const dx = wx - entry.x;
        const dy = wy - entry.y;
        if (Math.abs(dx) <= tolx * scale && Math.abs(dy) <= toly * scale) {
          best = merge(best, {
            hit: { kind: "object", objectId: entry.objectId },
            dist2: dx * dx + dy * dy,
          });
        }
        break;
      }
      case "object-handle": {
        const scale = Math.max(1, ((entry.sizePx ?? 8) * 0.5 + 6) / 6);
        const dx = wx - entry.x;
        const dy = wy - entry.y;
        if (Math.abs(dx) <= tolx * scale && Math.abs(dy) <= toly * scale) {
          best = merge(best, {
            hit: {
              kind: "object-handle",
              objectId: entry.objectId,
              handleId: entry.handleId,
            },
            dist2: dx * dx + dy * dy,
          });
        }
        break;
      }
    }
  }
  return best?.hit ?? null;
}
