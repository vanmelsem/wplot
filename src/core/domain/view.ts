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

export type ViewCommand =
  | { type: "view/set"; x: NumericRange; y: NumericRange }
  | { type: "view/reset" };

export function cloneRange(range: NumericRange): NumericRange {
  return { min: range.min, max: range.max };
}

function cloneExtraY(
  extra: Record<string, NumericRange> | undefined,
): Record<string, NumericRange> | undefined {
  if (!extra) return undefined;
  const out: Record<string, NumericRange> = {};
  for (const id in extra) {
    const range = extra[id];
    if (range) out[id] = cloneRange(range);
  }
  return out;
}

export function cloneViewValue(value: ViewValue): ViewValue {
  const out: ViewValue = {
    x: cloneRange(value.x),
    y: cloneRange(value.y),
  };
  if (value.extraY) out.extraY = cloneExtraY(value.extraY);
  return out;
}

export function createViewState(value: ViewValue): ViewState {
  const state: ViewState = {
    x: cloneRange(value.x),
    y: cloneRange(value.y),
    resetX: cloneRange(value.x),
    resetY: cloneRange(value.y),
  };
  if (value.extraY) {
    state.extraY = cloneExtraY(value.extraY);
    state.resetExtraY = cloneExtraY(value.extraY);
  }
  return state;
}

function sameRange(left: NumericRange, right: NumericRange): boolean {
  return left.min === right.min && left.max === right.max;
}

export function setViewState(state: ViewState, next: ViewValue): boolean {
  const xChanged = !sameRange(state.x, next.x);
  const yChanged = !sameRange(state.y, next.y);
  let extraChanged = false;
  if (next.extraY && state.extraY) {
    for (const id in next.extraY) {
      const nextRange = next.extraY[id];
      const cur = state.extraY[id];
      if (nextRange && (!cur || !sameRange(cur, nextRange))) {
        state.extraY[id] = cloneRange(nextRange);
        extraChanged = true;
      }
    }
  }
  if (!xChanged && !yChanged && !extraChanged) return false;
  state.x = cloneRange(next.x);
  state.y = cloneRange(next.y);
  return true;
}

export function resetViewState(state: ViewState): boolean {
  return setViewState(state, {
    x: state.resetX,
    y: state.resetY,
    extraY: state.resetExtraY,
  });
}
