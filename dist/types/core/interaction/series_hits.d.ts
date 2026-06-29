import type { NumericRange } from "../domain/view";
import type { StoreBackedSeriesState } from "../domain/store_backed_series";
import type { PickingHit } from "../scene/contracts";
import type { SeriesHit } from "./events";
export declare function sameRange(left: NumericRange, right: NumericRange): boolean;
export declare function nearestIndex(values: Float32Array | Float64Array, value: number, count: number): number;
export declare function isStoreBackedState(state: unknown): state is StoreBackedSeriesState;
export declare function isSameSeriesHover(left: readonly SeriesHit[] | null, right: readonly SeriesHit[] | null): boolean;
export declare function isSamePickingHit(left: PickingHit | null, right: PickingHit | null): boolean;
