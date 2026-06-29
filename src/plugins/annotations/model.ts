import {
  type ObjectEdit,
  type ObjectHandle,
  type ObjectModelAdapter,
} from "../../core/domain/objects";
import type { RgbaColor } from "../../core/domain/series";
import { AnnotationObjectKinds as BuiltInObjectKinds } from "./kinds";

type LineLabelAnchor = "start" | "center" | "end";
type LineLabelAlign = "before" | "center" | "after";
type LockedObjectInput = {
  locked?: boolean;
};

type SharedGuideLabelInput = {
  label?: string;
  labelAnchor?: LineLabelAnchor;
  labelAlign?: LineLabelAlign;
  labelColor?: RgbaColor;
  labelBackground?: RgbaColor;
  labelBorder?: RgbaColor;
  labelBorderWidthPx?: number;
  showAxisValueLabel?: boolean;
  axisLabelColor?: RgbaColor;
  axisLabelBackground?: RgbaColor;
  axisLabelBorder?: RgbaColor;
  axisLabelBorderWidthPx?: number;
};

type SharedGuideLabelState = {
  label?: string;
  labelAnchor: LineLabelAnchor;
  labelAlign: LineLabelAlign;
  labelColor: RgbaColor;
  labelBackground: RgbaColor;
  labelBorder: RgbaColor;
  labelBorderWidthPx: number;
  showAxisValueLabel: boolean;
  axisLabelColor: RgbaColor;
  axisLabelBackground: RgbaColor;
  axisLabelBorder: RgbaColor;
  axisLabelBorderWidthPx: number;
};

export type GuideHObjectInput = LockedObjectInput & SharedGuideLabelInput & {
  kind: typeof BuiltInObjectKinds.guideH;
  y: number;
  color?: RgbaColor;
  widthPx?: number;
};

export type GuideVObjectInput = LockedObjectInput & SharedGuideLabelInput & {
  kind: typeof BuiltInObjectKinds.guideV;
  x: number;
  color?: RgbaColor;
  widthPx?: number;
};

export type GuideHObjectState = SharedGuideLabelState & {
  y: number;
  color: RgbaColor;
  widthPx: number;
};

export type GuideVObjectState = SharedGuideLabelState & {
  x: number;
  color: RgbaColor;
  widthPx: number;
};

export type RectObjectInput = LockedObjectInput & {
  kind: typeof BuiltInObjectKinds.rect;
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
  label?: string;
  fill?: RgbaColor;
  stroke?: RgbaColor;
  strokeWidthPx?: number;
  labelColor?: RgbaColor;
  labelBackground?: RgbaColor;
  labelBorder?: RgbaColor;
  labelBorderWidthPx?: number;
};

export type RectObjectState = {
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
  label?: string;
  fill: RgbaColor;
  stroke: RgbaColor;
  strokeWidthPx: number;
  labelColor: RgbaColor;
  labelBackground: RgbaColor;
  labelBorder: RgbaColor;
  labelBorderWidthPx: number;
};

type SharedBandInput = {
  label?: string;
  fill?: RgbaColor;
  stroke?: RgbaColor;
  strokeWidthPx?: number;
  labelColor?: RgbaColor;
  labelBackground?: RgbaColor;
  labelBorder?: RgbaColor;
  labelBorderWidthPx?: number;
  showAxisValueLabels?: boolean;
  axisLabelColor?: RgbaColor;
  axisLabelBackground?: RgbaColor;
  axisLabelBorder?: RgbaColor;
  axisLabelBorderWidthPx?: number;
};

type SharedBandState = {
  label?: string;
  fill: RgbaColor;
  stroke: RgbaColor;
  strokeWidthPx: number;
  labelColor: RgbaColor;
  labelBackground: RgbaColor;
  labelBorder: RgbaColor;
  labelBorderWidthPx: number;
  showAxisValueLabels: boolean;
  axisLabelColor: RgbaColor;
  axisLabelBackground: RgbaColor;
  axisLabelBorder: RgbaColor;
  axisLabelBorderWidthPx: number;
};

export type XBandObjectInput = LockedObjectInput & SharedBandInput & {
  kind: typeof BuiltInObjectKinds.xBand;
  xMin: number;
  xMax: number;
};

export type YBandObjectInput = LockedObjectInput & SharedBandInput & {
  kind: typeof BuiltInObjectKinds.yBand;
  yMin: number;
  yMax: number;
};

export type XBandObjectState = SharedBandState & {
  xMin: number;
  xMax: number;
};

export type YBandObjectState = SharedBandState & {
  yMin: number;
  yMax: number;
};

export type SegmentObjectInput = LockedObjectInput & {
  kind: typeof BuiltInObjectKinds.segment;
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  label?: string;
  color?: RgbaColor;
  widthPx?: number;
  labelColor?: RgbaColor;
  labelBackground?: RgbaColor;
  labelBorder?: RgbaColor;
  labelBorderWidthPx?: number;
};

export type SegmentObjectState = {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  label?: string;
  color: RgbaColor;
  widthPx: number;
  labelColor: RgbaColor;
  labelBackground: RgbaColor;
  labelBorder: RgbaColor;
  labelBorderWidthPx: number;
};

export type TagObjectInput = LockedObjectInput & {
  kind: typeof BuiltInObjectKinds.tag;
  x: number;
  y: number;
  text: string;
  color?: RgbaColor;
  markerSizePx?: number;
  markerRoundness?: number;
  offsetXPx?: number;
  offsetYPx?: number;
  background?: RgbaColor;
  border?: RgbaColor;
  borderWidthPx?: number;
};

export type TagObjectState = {
  x: number;
  y: number;
  text: string;
  color: RgbaColor;
  markerSizePx: number;
  markerRoundness: number;
  offsetXPx: number;
  offsetYPx: number;
  background: RgbaColor;
  border: RgbaColor;
  borderWidthPx: number;
};

const DEFAULT_GUIDE_COLOR: RgbaColor = [0.7, 0.7, 0.7, 1];
const DEFAULT_TEXT_COLOR: RgbaColor = [1, 1, 1, 1];
const DEFAULT_RECT_FILL: RgbaColor = [0.2, 0.6, 1, 0.15];
const DEFAULT_RECT_STROKE: RgbaColor = [0.2, 0.6, 1, 1];
const DEFAULT_BAND_FILL: RgbaColor = [0.2, 0.6, 1, 0.12];
const DEFAULT_BAND_STROKE: RgbaColor = [0.2, 0.6, 1, 0.6];
const DEFAULT_BAND_CHIP: RgbaColor = [0.2, 0.6, 1, 0.9];
const DEFAULT_SEGMENT_COLOR: RgbaColor = [0.95, 0.76, 0.18, 1];
const DEFAULT_TAG_COLOR: RgbaColor = [0.82, 0.86, 0.92, 1];
const DEFAULT_TAG_BACKGROUND: RgbaColor = [0.09, 0.1, 0.11, 0.9];
const DEFAULT_TAG_BORDER: RgbaColor = [0.32, 0.35, 0.4, 0.8];

type ObjectPatch<TState> = Partial<TState>;

function mergeDefinedFields<TState extends Record<string, unknown>>(
  current: TState,
  patch: unknown,
): TState {
  if (!patch || typeof patch !== "object") return current;
  const source = patch as Record<string, unknown>;
  let next: TState | null = null;
  const keys = Object.keys(source);
  for (let i = 0; i < keys.length; i += 1) {
    const key = keys[i]!;
    const value = source[key];
    if (value === undefined) continue;
    if (!next) next = { ...current };
    next[key as keyof TState] = value as TState[keyof TState];
  }
  return next ?? current;
}

function normalizeGuideLabels(
  input: SharedGuideLabelInput & { color?: RgbaColor },
): SharedGuideLabelState {
  const stroke = input.color ?? DEFAULT_GUIDE_COLOR;
  return {
    label: input.label,
    labelAnchor: input.labelAnchor ?? "start",
    labelAlign: input.labelAlign ?? "center",
    labelColor: input.labelColor ?? DEFAULT_TEXT_COLOR,
    labelBackground: input.labelBackground ?? stroke,
    labelBorder: input.labelBorder ?? stroke,
    labelBorderWidthPx: input.labelBorderWidthPx ?? 1,
    showAxisValueLabel: input.showAxisValueLabel ?? false,
    axisLabelColor: input.axisLabelColor ?? DEFAULT_TEXT_COLOR,
    axisLabelBackground: input.axisLabelBackground ?? stroke,
    axisLabelBorder: input.axisLabelBorder ?? stroke,
    axisLabelBorderWidthPx: input.axisLabelBorderWidthPx ?? 1,
  };
}

function normalizeBandVisuals(input: SharedBandInput): SharedBandState {
  const stroke = input.stroke ?? DEFAULT_BAND_STROKE;
  const chip = input.stroke ?? DEFAULT_BAND_CHIP;
  return {
    label: input.label,
    fill: input.fill ?? DEFAULT_BAND_FILL,
    stroke,
    strokeWidthPx: input.strokeWidthPx ?? 1,
    labelColor: input.labelColor ?? DEFAULT_TEXT_COLOR,
    labelBackground: input.labelBackground ?? chip,
    labelBorder: input.labelBorder ?? chip,
    labelBorderWidthPx: input.labelBorderWidthPx ?? 1,
    showAxisValueLabels: input.showAxisValueLabels ?? false,
    axisLabelColor: input.axisLabelColor ?? DEFAULT_TEXT_COLOR,
    axisLabelBackground: input.axisLabelBackground ?? chip,
    axisLabelBorder: input.axisLabelBorder ?? chip,
    axisLabelBorderWidthPx: input.axisLabelBorderWidthPx ?? 1,
  };
}

function normalizeRange(min: number, max: number): [number, number] {
  return min <= max ? [min, max] : [max, min];
}

function dragDelta(edit: ObjectEdit): { dx: number; dy: number } {
  return {
    dx: edit.nowX - edit.startX,
    dy: edit.nowY - edit.startY,
  };
}

function normalizeRectState(state: RectObjectState): RectObjectState {
  const [xMin, xMax] = normalizeRange(state.xMin, state.xMax);
  const [yMin, yMax] = normalizeRange(state.yMin, state.yMax);
  return { ...state, xMin, xMax, yMin, yMax };
}

function normalizeXBandState(state: XBandObjectState): XBandObjectState {
  const [xMin, xMax] = normalizeRange(state.xMin, state.xMax);
  return { ...state, xMin, xMax };
}

function normalizeYBandState(state: YBandObjectState): YBandObjectState {
  const [yMin, yMax] = normalizeRange(state.yMin, state.yMax);
  return { ...state, yMin, yMax };
}

function rectHandles(state: RectObjectState): readonly ObjectHandle[] {
  const xMid = (state.xMin + state.xMax) * 0.5;
  const yMid = (state.yMin + state.yMax) * 0.5;
  return [
    { id: 0, x: state.xMin, y: state.yMin, sizePx: 8 },
    { id: 1, x: state.xMax, y: state.yMin, sizePx: 8 },
    { id: 2, x: state.xMax, y: state.yMax, sizePx: 8 },
    { id: 3, x: state.xMin, y: state.yMax, sizePx: 8 },
    { id: 4, x: xMid, y: state.yMin, sizePx: 8 },
    { id: 5, x: state.xMax, y: yMid, sizePx: 8 },
    { id: 6, x: xMid, y: state.yMax, sizePx: 8 },
    { id: 7, x: state.xMin, y: yMid, sizePx: 8 },
  ];
}

function segmentHandles(state: SegmentObjectState): readonly ObjectHandle[] {
  return [
    { id: 0, x: state.x0, y: state.y0, sizePx: 8 },
    { id: 1, x: state.x1, y: state.y1, sizePx: 8 },
  ];
}

export const GuideHObjectModelAdapter: ObjectModelAdapter<
  GuideHObjectInput,
  GuideHObjectState,
  ObjectPatch<GuideHObjectState>
> = {
  kind: BuiltInObjectKinds.guideH,

  cursor() {
    return "ns-resize";
  },

  normalize(input) {
    return {
      y: input.y,
      color: input.color ?? DEFAULT_GUIDE_COLOR,
      widthPx: input.widthPx ?? 1,
      ...normalizeGuideLabels(input),
    };
  },

  patch(state, patch) {
    return mergeDefinedFields(state, patch);
  },

  applyEdit(state, edit) {
    const { dy } = dragDelta(edit);
    return { ...state, y: state.y + dy };
  },
};

export const GuideVObjectModelAdapter: ObjectModelAdapter<
  GuideVObjectInput,
  GuideVObjectState,
  ObjectPatch<GuideVObjectState>
> = {
  kind: BuiltInObjectKinds.guideV,

  cursor() {
    return "ew-resize";
  },

  normalize(input) {
    return {
      x: input.x,
      color: input.color ?? DEFAULT_GUIDE_COLOR,
      widthPx: input.widthPx ?? 1,
      ...normalizeGuideLabels(input),
    };
  },

  patch(state, patch) {
    return mergeDefinedFields(state, patch);
  },

  applyEdit(state, edit) {
    const { dx } = dragDelta(edit);
    return { ...state, x: state.x + dx };
  },
};

export const RectObjectModelAdapter: ObjectModelAdapter<
  RectObjectInput,
  RectObjectState,
  ObjectPatch<RectObjectState>
> = {
  kind: BuiltInObjectKinds.rect,

  cursor(isHandle, handleId) {
    if (!isHandle) return "move";
    if (handleId === 4 || handleId === 6) return "ns-resize";
    if (handleId === 5 || handleId === 7) return "ew-resize";
    return handleId === 0 || handleId === 2 ? "nesw-resize" : "nwse-resize";
  },

  normalize(input) {
    return normalizeRectState({
      xMin: input.xMin,
      xMax: input.xMax,
      yMin: input.yMin,
      yMax: input.yMax,
      label: input.label,
      fill: input.fill ?? DEFAULT_RECT_FILL,
      stroke: input.stroke ?? DEFAULT_RECT_STROKE,
      strokeWidthPx: input.strokeWidthPx ?? 2,
      labelColor: input.labelColor ?? DEFAULT_TEXT_COLOR,
      labelBackground: input.labelBackground ?? input.stroke ?? DEFAULT_RECT_STROKE,
      labelBorder: input.labelBorder ?? input.stroke ?? DEFAULT_RECT_STROKE,
      labelBorderWidthPx: input.labelBorderWidthPx ?? 1,
    });
  },

  patch(state, patch) {
    return normalizeRectState(mergeDefinedFields(state, patch));
  },

  handles(state) {
    return rectHandles(state);
  },

  applyEdit(state, edit) {
    if (edit.kind === "drag-object") {
      const { dx, dy } = dragDelta(edit);
      return {
        ...state,
        xMin: state.xMin + dx,
        xMax: state.xMax + dx,
        yMin: state.yMin + dy,
        yMax: state.yMax + dy,
      };
    }

    let xMin = state.xMin;
    let xMax = state.xMax;
    let yMin = state.yMin;
    let yMax = state.yMax;
    if (edit.handleId === 0) {
      xMin = edit.nowX;
      yMin = edit.nowY;
    } else if (edit.handleId === 1) {
      xMax = edit.nowX;
      yMin = edit.nowY;
    } else if (edit.handleId === 2) {
      xMax = edit.nowX;
      yMax = edit.nowY;
    } else if (edit.handleId === 3) {
      xMin = edit.nowX;
      yMax = edit.nowY;
    } else if (edit.handleId === 4) {
      yMin = edit.nowY;
    } else if (edit.handleId === 5) {
      xMax = edit.nowX;
    } else if (edit.handleId === 6) {
      yMax = edit.nowY;
    } else if (edit.handleId === 7) {
      xMin = edit.nowX;
    }
    return normalizeRectState({
      ...state,
      xMin,
      xMax,
      yMin,
      yMax,
    });
  },
};

export const XBandObjectModelAdapter: ObjectModelAdapter<
  XBandObjectInput,
  XBandObjectState,
  ObjectPatch<XBandObjectState>
> = {
  kind: BuiltInObjectKinds.xBand,

  cursor(isHandle) {
    return isHandle ? "ew-resize" : "move";
  },

  normalize(input) {
    return normalizeXBandState({
      xMin: input.xMin,
      xMax: input.xMax,
      ...normalizeBandVisuals(input),
    });
  },

  patch(state, patch) {
    return normalizeXBandState(mergeDefinedFields(state, patch));
  },

  applyEdit(state, edit) {
    if (edit.kind === "drag-object") {
      const { dx } = dragDelta(edit);
      return {
        ...state,
        xMin: state.xMin + dx,
        xMax: state.xMax + dx,
      };
    }

    return normalizeXBandState({
      ...state,
      xMin: edit.handleId === 0 ? edit.nowX : state.xMin,
      xMax: edit.handleId === 1 ? edit.nowX : state.xMax,
    });
  },
};

export const YBandObjectModelAdapter: ObjectModelAdapter<
  YBandObjectInput,
  YBandObjectState,
  ObjectPatch<YBandObjectState>
> = {
  kind: BuiltInObjectKinds.yBand,

  cursor(isHandle) {
    return isHandle ? "ns-resize" : "move";
  },

  normalize(input) {
    return normalizeYBandState({
      yMin: input.yMin,
      yMax: input.yMax,
      ...normalizeBandVisuals(input),
    });
  },

  patch(state, patch) {
    return normalizeYBandState(mergeDefinedFields(state, patch));
  },

  applyEdit(state, edit) {
    if (edit.kind === "drag-object") {
      const { dy } = dragDelta(edit);
      return {
        ...state,
        yMin: state.yMin + dy,
        yMax: state.yMax + dy,
      };
    }

    return normalizeYBandState({
      ...state,
      yMin: edit.handleId === 0 ? edit.nowY : state.yMin,
      yMax: edit.handleId === 1 ? edit.nowY : state.yMax,
    });
  },
};

export const SegmentObjectModelAdapter: ObjectModelAdapter<
  SegmentObjectInput,
  SegmentObjectState,
  ObjectPatch<SegmentObjectState>
> = {
  kind: BuiltInObjectKinds.segment,

  cursor() {
    return "move";
  },

  normalize(input) {
    return {
      x0: input.x0,
      y0: input.y0,
      x1: input.x1,
      y1: input.y1,
      label: input.label,
      color: input.color ?? DEFAULT_SEGMENT_COLOR,
      widthPx: input.widthPx ?? 2,
      labelColor: input.labelColor ?? DEFAULT_TEXT_COLOR,
      labelBackground: input.labelBackground ?? DEFAULT_SEGMENT_COLOR,
      labelBorder: input.labelBorder ?? DEFAULT_SEGMENT_COLOR,
      labelBorderWidthPx: input.labelBorderWidthPx ?? 1,
    };
  },

  patch(state, patch) {
    return mergeDefinedFields(state, patch);
  },

  handles(state) {
    return segmentHandles(state);
  },

  applyEdit(state, edit) {
    if (edit.kind === "drag-object") {
      const { dx, dy } = dragDelta(edit);
      return {
        ...state,
        x0: state.x0 + dx,
        y0: state.y0 + dy,
        x1: state.x1 + dx,
        y1: state.y1 + dy,
      };
    }

    if (edit.handleId === 0) {
      return { ...state, x0: edit.nowX, y0: edit.nowY };
    }
    if (edit.handleId === 1) {
      return { ...state, x1: edit.nowX, y1: edit.nowY };
    }
    return state;
  },
};

export const TagObjectModelAdapter: ObjectModelAdapter<
  TagObjectInput,
  TagObjectState,
  ObjectPatch<TagObjectState>
> = {
  kind: BuiltInObjectKinds.tag,

  normalize(input) {
    return {
      x: input.x,
      y: input.y,
      text: input.text,
      color: input.color ?? DEFAULT_TAG_COLOR,
      markerSizePx: input.markerSizePx ?? 4,
      markerRoundness: input.markerRoundness ?? 0,
      offsetXPx: input.offsetXPx ?? 8,
      offsetYPx: input.offsetYPx ?? -8,
      background: input.background ?? DEFAULT_TAG_BACKGROUND,
      border: input.border ?? DEFAULT_TAG_BORDER,
      borderWidthPx: input.borderWidthPx ?? 1,
    };
  },

  patch(state, patch) {
    return mergeDefinedFields(state, patch);
  },

  applyEdit(state, edit) {
    if (edit.kind !== "drag-object") return state;
    const { dx, dy } = dragDelta(edit);
    return {
      ...state,
      x: state.x + dx,
      y: state.y + dy,
    };
  },
};

