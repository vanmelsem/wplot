import type { BoxEdges, LayoutConfig } from "../domain/config";
export type RenderPoint = {
    x: number;
    y: number;
};
export type RenderSize = {
    width: number;
    height: number;
};
export type RenderBounds = {
    origin: RenderPoint;
    size: RenderSize;
};
export type ExtraAxisSlot = {
    id: string;
    side: "left" | "right";
    bounds: RenderBounds;
};
/** Resolved geometry for an additional y-axis gutter (id, side, px width). */
export type ExtraAxisLayout = {
    id: string;
    side: "left" | "right";
    widthPx: number;
};
export type RenderLayout = {
    dpr: number;
    canvas: RenderSize;
    plot: RenderBounds;
    scales: {
        top: RenderBounds | null;
        right: RenderBounds | null;
        bottom: RenderBounds | null;
        left: RenderBounds | null;
        xSide: "top" | "bottom" | null;
        ySide: "left" | "right" | null;
        /** Gutters for additional y-axes, stacked outward. Absent when none. */
        extraY?: readonly ExtraAxisSlot[];
    };
};
export type AxisLabelMetrics = {
    maxWidth: number;
    maxHeight: number;
};
export type AxisGutters = BoxEdges<number>;
export declare const AXIS_LABEL_PADDING = 8;
export declare function createAxisLabelMetrics(): {
    x: AxisLabelMetrics;
    y: AxisLabelMetrics;
};
export declare function computeAxisGutters(args: {
    layout: LayoutConfig;
    metricsX: AxisLabelMetrics;
    metricsY: AxisLabelMetrics;
    extraY?: readonly ExtraAxisLayout[];
}): AxisGutters;
export declare function buildRenderLayout(args: {
    width: number;
    height: number;
    dpr: number;
    layout: LayoutConfig;
    gutters: AxisGutters;
    extraY?: readonly ExtraAxisLayout[];
}): RenderLayout;
