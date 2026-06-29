import type { AxisId, AxisSpec } from "../domain/config";
import type { NumericRange } from "../domain/view";
export type Tick = {
    value: number;
    major: boolean;
    index?: number;
    label?: string;
};
export type TickSet = {
    step: number;
    ticks: readonly Tick[];
};
export declare function resolveAxisStep(args: {
    range: NumericRange;
    spanPx: number;
    spacingPx: number;
    spec: AxisSpec;
}): number;
export declare function generateTicks(args: {
    axis: AxisId;
    range: NumericRange;
    spanPx: number;
    spacingPx: number;
    spec: AxisSpec;
    labels?: boolean;
}): TickSet;
export declare function clampRangeByTickStep(args: {
    range: NumericRange;
    prevRange?: NumericRange;
    pivot: number;
    spanPx: number;
    spacingPx: number;
    spec: AxisSpec;
}): NumericRange;
export declare function formatAxisValue(args: {
    axis: AxisId;
    value: number;
    step: number;
    spec: AxisSpec;
}): string;
