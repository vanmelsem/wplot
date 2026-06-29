import { PlotController } from "../api/controller";
import type { RenderLayout } from "../render/layout";
import { type ViewTransform, type Viewport } from "./viewport";
import type { AxisHit, RenderState } from "./state";
export declare class InteractionGeometry {
    private readonly controller;
    private renderState;
    private transform;
    constructor(controller: PlotController);
    setRenderState(state: RenderState | null): void;
    getRenderState(): RenderState | null;
    getTransform(): ViewTransform | null;
    getViewport(): Viewport;
    getPlotBounds(): RenderLayout["plot"];
    insidePlot(px: number, py: number): boolean;
    safePxToValue(px: number, py: number): {
        x: number;
        y: number;
    } | null;
    pxToValue(px: number, py: number): {
        x: number;
        y: number;
    };
    valueToPx(x: number, y: number): {
        x: number;
        y: number;
    };
    toleranceValue(px: number): {
        tolx: number;
        toly: number;
    };
    axisFromPointer(px: number, py: number): AxisHit | null;
    clampZoomRanges(args: {
        nextX: {
            min: number;
            max: number;
        };
        nextY: {
            min: number;
            max: number;
        };
        currentX: {
            min: number;
            max: number;
        };
        currentY: {
            min: number;
            max: number;
        };
        pivotX: number;
        pivotY: number;
    }): {
        x: {
            min: number;
            max: number;
        };
        y: {
            min: number;
            max: number;
        };
    };
    rebuildTransform(): void;
}
