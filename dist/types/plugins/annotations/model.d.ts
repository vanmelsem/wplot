import { type ObjectModelAdapter } from "../../core/domain/objects";
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
type ObjectPatch<TState> = Partial<TState>;
export declare const GuideHObjectModelAdapter: ObjectModelAdapter<GuideHObjectInput, GuideHObjectState, ObjectPatch<GuideHObjectState>>;
export declare const GuideVObjectModelAdapter: ObjectModelAdapter<GuideVObjectInput, GuideVObjectState, ObjectPatch<GuideVObjectState>>;
export declare const RectObjectModelAdapter: ObjectModelAdapter<RectObjectInput, RectObjectState, ObjectPatch<RectObjectState>>;
export declare const XBandObjectModelAdapter: ObjectModelAdapter<XBandObjectInput, XBandObjectState, ObjectPatch<XBandObjectState>>;
export declare const YBandObjectModelAdapter: ObjectModelAdapter<YBandObjectInput, YBandObjectState, ObjectPatch<YBandObjectState>>;
export declare const SegmentObjectModelAdapter: ObjectModelAdapter<SegmentObjectInput, SegmentObjectState, ObjectPatch<SegmentObjectState>>;
export declare const TagObjectModelAdapter: ObjectModelAdapter<TagObjectInput, TagObjectState, ObjectPatch<TagObjectState>>;
export {};
