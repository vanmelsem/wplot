import type { RgbaColor } from "../domain/series";
import type { SceneBuildContext } from "./contracts";
import type { SceneClampRect, ScenePrimitive, SceneText } from "./frame";
export declare const BOX_LABEL_TEXT_HEIGHT = 12;
export declare const BOX_LABEL_PAD_X = 5;
export declare const BOX_LABEL_PAD_Y = 3;
export declare const BOX_LABEL_RECT_HEIGHT: number;
export declare function measureBoxLabel(label: string): {
    textWidth: number;
    textHeight: number;
    rectWidth: number;
    rectHeight: number;
};
export declare function valueToPlotPx(ctx: SceneBuildContext, x: number, y: number): {
    x: number;
    y: number;
};
export declare function plotClampRect(ctx: SceneBuildContext): SceneClampRect;
export declare function xAxisClampRect(ctx: SceneBuildContext): SceneClampRect | null;
export declare function yAxisClampRect(ctx: SceneBuildContext): SceneClampRect | null;
export declare function pushPath(out: ScenePrimitive[], points: Float32Array | Float64Array, count: number, widthPx: number, color: RgbaColor, origin?: {
    x: number;
    y: number;
}, segments?: boolean): void;
export declare function pushBoxLabel(args: {
    out: SceneText[];
    x: number;
    y: number;
    label: string;
    color: RgbaColor;
    background: RgbaColor;
    border: RgbaColor;
    borderWidthPx: number;
    align?: "top-left" | "center";
    fixedBox?: boolean;
    boxOrigin?: {
        x: number;
        y: number;
    };
    clampRect?: SceneClampRect;
    boxHeight?: number;
    boxTextOffsetY?: number;
    boxTextBaseline?: "top" | "middle";
    boxTextTrack?: "x-axis";
}): void;
