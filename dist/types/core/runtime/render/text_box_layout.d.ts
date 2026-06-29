import type { Bounds, Px } from "../../shared/geometry";
import type { TextEntry } from "../../render/contracts";
export type MeasuredTextBlock = {
    width: number;
    ascent: number;
    descent: number;
    height: number;
};
export type BoxPlacement = {
    x: number;
    y: number;
    textWidth: number;
    textHeight: number;
    rectX: number;
    rectY: number;
    rectW: number;
    rectH: number;
};
export declare function clamp(value: number, min: number, max: number): number;
export declare function measureTextBlock(ctx: CanvasRenderingContext2D, text: string, fallbackHeight?: number): MeasuredTextBlock;
export declare function layoutFloatingBoxes(ctx: CanvasRenderingContext2D, text: readonly TextEntry[], plot: Bounds<Px>): Map<number, BoxPlacement>;
