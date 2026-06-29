import type { ScaleMode } from "../domain/config";
import type { ViewValue } from "../domain/view";
import type { RenderLayout } from "../render/layout";
export type Viewport = {
    value: ViewValue;
    dpr: number;
    canvas: RenderLayout["canvas"];
    plot: RenderLayout["plot"];
    scales: RenderLayout["scales"];
};
type AxisTransform = {
    mode: ScaleMode;
    valueMin: number;
    valueMax: number;
    pxMin: number;
    pxMax: number;
    scale: number;
    invScale: number;
    logMin?: number;
    logMax?: number;
};
export type ViewTransform = {
    x: AxisTransform;
    y: AxisTransform;
    originX: number;
    originY: number;
    widthPx: number;
    heightPx: number;
    dpr: number;
};
export declare function createViewport(layout: RenderLayout, view: ViewValue): Viewport;
export declare function buildViewTransform(args: {
    viewport: Viewport;
    scaleX: ScaleMode;
    scaleY: ScaleMode;
}): ViewTransform;
export declare function valueToPx(transform: ViewTransform, x: number, y: number): {
    x: number;
    y: number;
};
export declare function pxToValue(transform: ViewTransform, x: number, y: number): {
    x: number;
    y: number;
};
export declare function containsBounds(bounds: Viewport["plot"], x: number, y: number): boolean;
export declare function panRangesByPixels(transform: ViewTransform, dxPx: number, dyPx: number): ViewValue;
export declare function zoomRange(range: {
    min: number;
    max: number;
}, pivotValue: number, factor: number, scale: ScaleMode): {
    min: number;
    max: number;
};
export {};
