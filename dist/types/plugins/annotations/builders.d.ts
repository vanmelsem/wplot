import type { GuideHObjectInput, GuideVObjectInput, RectObjectInput, SegmentObjectInput, TagObjectInput, XBandObjectInput, YBandObjectInput } from "./model";
import type { Color, Px } from "../../core/shared/geometry";
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
} & LineLabelOptions & ValueChipOptions;
export type BandOptions = {
    fill?: Color;
    stroke?: Color;
    strokeWidthPx?: Px;
} & LabelOptions & BandValueChipOptions;
export type RectOptions = {
    fill?: Color;
    stroke?: Color;
    strokeWidthPx?: Px;
} & LabelOptions;
export type SegmentOptions = {
    color?: Color;
    widthPx?: Px;
} & LabelOptions;
export declare function buildGuideAnnotation(axis: "x" | "y", value: number, opts?: GuideOptions): GuideHObjectInput | GuideVObjectInput;
export declare function buildBandAnnotation(axis: "x" | "y", min: number, max: number, opts?: BandOptions): XBandObjectInput | YBandObjectInput;
export declare function buildRectAnnotation(xMin: number, xMax: number, yMin: number, yMax: number, opts?: RectOptions): RectObjectInput;
export declare function buildSegmentAnnotation(x0: number, y0: number, x1: number, y1: number, opts?: SegmentOptions): SegmentObjectInput;
export declare function buildTagAnnotation(x: number, y: number, text: string, opts?: TagOptions): TagObjectInput;
/** Horizontal guide line at value `y`. */
export declare function hLine(y: number, opts?: GuideOptions): GuideHObjectInput;
/** Vertical guide line at value `x`. */
export declare function vLine(x: number, opts?: GuideOptions): GuideVObjectInput;
/** Vertical band spanning the x-range `[min, max]`. */
export declare function xBand(min: number, max: number, opts?: BandOptions): XBandObjectInput;
/** Horizontal band spanning the y-range `[min, max]`. */
export declare function yBand(min: number, max: number, opts?: BandOptions): YBandObjectInput;
/** Rectangle annotation. */
export declare function rect(xMin: number, xMax: number, yMin: number, yMax: number, opts?: RectOptions): RectObjectInput;
/** Line segment annotation between two points. */
export declare function segment(x0: number, y0: number, x1: number, y1: number, opts?: SegmentOptions): SegmentObjectInput;
/** Text tag anchored at `(x, y)`. */
export declare function tag(x: number, y: number, text: string, opts?: TagOptions): TagObjectInput;
export {};
