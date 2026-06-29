import type {
  GuideHObjectInput,
  GuideVObjectInput,
  RectObjectInput,
  SegmentObjectInput,
  TagObjectInput,
  XBandObjectInput,
  YBandObjectInput,
} from "./model";
import type { Color, Px } from "../../core/shared/geometry";
import { AnnotationObjectKinds as ObjectKinds } from "./kinds";

type LockedOption = {
  locked?: boolean;
};

export type TagOptions = LockedOption & {
  color?: Color;
  markerSizePx?: Px;
  markerRoundness?: number;
  offsetXPx?: Px;
  offsetYPx?: Px;
  background?: Color;
  border?: Color;
  borderWidthPx?: Px;
};

type LabelOptions = LockedOption & {
  label?: string;
  labelColor?: Color;
  labelBackground?: Color;
  labelBorder?: Color;
  labelBorderWidthPx?: Px;
};

type LineLabelOptions = LabelOptions & {
  labelAnchor?: "start" | "center" | "end";
  labelAlign?: "before" | "center" | "after";
};

type ValueChipOptions = {
  showAxisValueLabel?: boolean;
  axisLabelColor?: Color;
  axisLabelBackground?: Color;
  axisLabelBorder?: Color;
  axisLabelBorderWidthPx?: Px;
};

type BandValueChipOptions = {
  showAxisValueLabels?: boolean;
  axisLabelColor?: Color;
  axisLabelBackground?: Color;
  axisLabelBorder?: Color;
  axisLabelBorderWidthPx?: Px;
};

export type GuideOptions = {
  color?: Color;
  widthPx?: Px;
} & LineLabelOptions &
  ValueChipOptions;

export type BandOptions = {
  fill?: Color;
  stroke?: Color;
  strokeWidthPx?: Px;
} & LabelOptions &
  BandValueChipOptions;

export type RectOptions = {
  fill?: Color;
  stroke?: Color;
  strokeWidthPx?: Px;
} & LabelOptions;

export type SegmentOptions = {
  color?: Color;
  widthPx?: Px;
} & LabelOptions;

function labelPatch(
  opts?: LabelOptions,
){
  return {
    locked: opts?.locked,
    label: opts?.label,
    labelColor: opts?.labelColor,
    labelBackground: opts?.labelBackground,
    labelBorder: opts?.labelBorder,
    labelBorderWidthPx: opts?.labelBorderWidthPx,
  };
}

function lineLabelPatch(
  opts?: LineLabelOptions,
){
  return {
    ...labelPatch(opts),
    labelAnchor: opts?.labelAnchor,
    labelAlign: opts?.labelAlign,
  };
}

function axisValueChipPatch(
  opts?: ValueChipOptions,
){
  return {
    showAxisValueLabel: opts?.showAxisValueLabel,
    axisLabelColor: opts?.axisLabelColor,
    axisLabelBackground: opts?.axisLabelBackground,
    axisLabelBorder: opts?.axisLabelBorder,
    axisLabelBorderWidthPx: opts?.axisLabelBorderWidthPx,
  };
}

function bandAxisValueChipPatch(
  opts?: BandValueChipOptions,
){
  return {
    showAxisValueLabels: opts?.showAxisValueLabels,
    axisLabelColor: opts?.axisLabelColor,
    axisLabelBackground: opts?.axisLabelBackground,
    axisLabelBorder: opts?.axisLabelBorder,
    axisLabelBorderWidthPx: opts?.axisLabelBorderWidthPx,
  };
}

export function buildGuideAnnotation(
  axis: "x" | "y",
  value: number,
  opts?: GuideOptions,
): GuideHObjectInput | GuideVObjectInput {
  if (axis === "x") {
    const input: GuideVObjectInput = {
      kind: ObjectKinds.guideV,
      x: value,
      color: opts?.color,
      widthPx: opts?.widthPx,
      ...lineLabelPatch(opts),
      ...axisValueChipPatch(opts),
    };
    return input;
  }
  const input: GuideHObjectInput = {
    kind: ObjectKinds.guideH,
    y: value,
    color: opts?.color,
    widthPx: opts?.widthPx,
    ...lineLabelPatch(opts),
    ...axisValueChipPatch(opts),
  };
  return input;
}

export function buildBandAnnotation(
  axis: "x" | "y",
  min: number,
  max: number,
  opts?: BandOptions,
): XBandObjectInput | YBandObjectInput {
  if (axis === "x") {
    const input: XBandObjectInput = {
      kind: ObjectKinds.xBand,
      xMin: min,
      xMax: max,
      fill: opts?.fill,
      stroke: opts?.stroke,
      strokeWidthPx: opts?.strokeWidthPx,
      ...labelPatch(opts),
      ...bandAxisValueChipPatch(opts),
    };
    return input;
  }
  const input: YBandObjectInput = {
    kind: ObjectKinds.yBand,
    yMin: min,
    yMax: max,
    fill: opts?.fill,
    stroke: opts?.stroke,
    strokeWidthPx: opts?.strokeWidthPx,
    ...labelPatch(opts),
    ...bandAxisValueChipPatch(opts),
  };
  return input;
}

export function buildRectAnnotation(
  xMin: number,
  xMax: number,
  yMin: number,
  yMax: number,
  opts?: RectOptions,
): RectObjectInput {
  return {
    kind: ObjectKinds.rect,
    xMin,
    xMax,
    yMin,
    yMax,
    fill: opts?.fill,
    stroke: opts?.stroke,
    strokeWidthPx: opts?.strokeWidthPx,
    ...labelPatch(opts),
  };
}

export function buildSegmentAnnotation(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  opts?: SegmentOptions,
): SegmentObjectInput {
  return {
    kind: ObjectKinds.segment,
    x0,
    y0,
    x1,
    y1,
    color: opts?.color,
    widthPx: opts?.widthPx,
    ...labelPatch(opts),
  };
}

export function buildTagAnnotation(
  x: number,
  y: number,
  text: string,
  opts?: TagOptions,
): TagObjectInput {
  return {
    kind: ObjectKinds.tag,
    locked: opts?.locked,
    x,
    y,
    text,
    color: opts?.color,
    markerSizePx: opts?.markerSizePx,
    markerRoundness: opts?.markerRoundness,
    offsetXPx: opts?.offsetXPx,
    offsetYPx: opts?.offsetYPx,
    background: opts?.background,
    border: opts?.border,
    borderWidthPx: opts?.borderWidthPx,
  };
}

// Public, terse builders returning an ObjectInput for `plot.objects.add(...)`.
// These are the sanctioned annotation entry points once `annotations()` is
// installed.

/** Horizontal guide line at value `y`. */
export function hLine(y: number, opts?: GuideOptions): GuideHObjectInput {
  return buildGuideAnnotation("y", y, opts) as GuideHObjectInput;
}

/** Vertical guide line at value `x`. */
export function vLine(x: number, opts?: GuideOptions): GuideVObjectInput {
  return buildGuideAnnotation("x", x, opts) as GuideVObjectInput;
}

/** Vertical band spanning the x-range `[min, max]`. */
export function xBand(
  min: number,
  max: number,
  opts?: BandOptions,
): XBandObjectInput {
  return buildBandAnnotation("x", min, max, opts) as XBandObjectInput;
}

/** Horizontal band spanning the y-range `[min, max]`. */
export function yBand(
  min: number,
  max: number,
  opts?: BandOptions,
): YBandObjectInput {
  return buildBandAnnotation("y", min, max, opts) as YBandObjectInput;
}

/** Rectangle annotation. */
export function rect(
  xMin: number,
  xMax: number,
  yMin: number,
  yMax: number,
  opts?: RectOptions,
): RectObjectInput {
  return buildRectAnnotation(xMin, xMax, yMin, yMax, opts);
}

/** Line segment annotation between two points. */
export function segment(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  opts?: SegmentOptions,
): SegmentObjectInput {
  return buildSegmentAnnotation(x0, y0, x1, y1, opts);
}

/** Text tag anchored at `(x, y)`. */
export function tag(
  x: number,
  y: number,
  text: string,
  opts?: TagOptions,
): TagObjectInput {
  return buildTagAnnotation(x, y, text, opts);
}
