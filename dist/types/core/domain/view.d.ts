export type NumericRange = {
    min: number;
    max: number;
};
export type ViewValue = {
    x: NumericRange;
    y: NumericRange;
    /**
     * Independent ranges for additional ("secondary") y-axes, keyed by axis id.
     * Absent when a plot declares no extra y-axes, so the default single-axis
     * shape stays byte-identical to `{ x, y }`.
     */
    extraY?: Record<string, NumericRange>;
};
export type ViewState = ViewValue & {
    resetX: NumericRange;
    resetY: NumericRange;
    resetExtraY?: Record<string, NumericRange>;
};
export type ViewCommand = {
    type: "view/set";
    x: NumericRange;
    y: NumericRange;
} | {
    type: "view/reset";
};
export declare function cloneRange(range: NumericRange): NumericRange;
export declare function cloneViewValue(value: ViewValue): ViewValue;
export declare function createViewState(value: ViewValue): ViewState;
export declare function setViewState(state: ViewState, next: ViewValue): boolean;
export declare function resetViewState(state: ViewState): boolean;
