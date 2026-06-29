import type { NumericRange } from "../domain/view";
import type { StoreBackedSeriesState } from "../domain/store_backed_series";
import type { PickingHit } from "../scene/contracts";
import type { SeriesHit } from "./events";

export function sameRange(left: NumericRange, right: NumericRange): boolean {
  return left.min === right.min && left.max === right.max;
}

export function nearestIndex(
  values: Float32Array | Float64Array,
  value: number,
  count: number,
): number {
  let lo = 0;
  let hi = count;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if ((values[mid] ?? 0) < value) lo = mid + 1;
    else hi = mid;
  }
  if (lo <= 0) return 0;
  if (lo >= count) return count - 1;
  const prev = values[lo - 1] ?? 0;
  const next = values[lo] ?? 0;
  return Math.abs(value - prev) <= Math.abs(next - value) ? lo - 1 : lo;
}

export function isStoreBackedState(state: unknown): state is StoreBackedSeriesState {
  if (!state || typeof state !== "object") return false;
  return "store" in state && "offsetX" in state && "offsetY" in state;
}

export function isSameSeriesHover(
  left: readonly SeriesHit[] | null,
  right: readonly SeriesHit[] | null,
): boolean {
  if (left === right) return true;
  if (!left || !right) return false;
  if (left.length !== right.length) return false;
  for (let i = 0; i < left.length; i += 1) {
    if (
      left[i]?.seriesId !== right[i]?.seriesId ||
      left[i]?.index !== right[i]?.index
    ) {
      return false;
    }
  }
  return true;
}

export function isSamePickingHit(
  left: PickingHit | null,
  right: PickingHit | null,
): boolean {
  if (left === right) return true;
  if (!left || !right || left.kind !== right.kind) return false;
  switch (left.kind) {
    case "series-point":
      return right.kind === "series-point" &&
        left.seriesId === right.seriesId &&
        left.index === right.index;
    case "object":
      return right.kind === "object" && left.objectId === right.objectId;
    case "object-area":
      return right.kind === "object-area" && left.objectId === right.objectId;
    case "object-handle":
      return right.kind === "object-handle" &&
        left.objectId === right.objectId &&
        left.handleId === right.handleId;
  }
}
