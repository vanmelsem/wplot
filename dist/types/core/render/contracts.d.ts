import type { NumericRange } from "../domain/view";
import type { Color, Px } from "../shared/geometry";
import type { RenderLayout } from "./layout";
export type ClampRect = {
    minX: Px;
    maxX: Px;
    minY: Px;
    maxY: Px;
};
export type StrokeJoin = "miter" | "bevel" | "round";
export type StrokeCap = "butt" | "square" | "round";
export type Primitive = {
    kind: "path";
    segments?: boolean;
    points?: Float32Array | Float64Array;
    x?: Float32Array | Float64Array;
    y?: Float32Array | Float64Array;
    count: number;
    widthPx: Px;
    join: StrokeJoin;
    cap: StrokeCap;
    color: Color;
    opacity: number;
    origin?: {
        x: number;
        y: number;
    };
    dashed?: {
        onPx: Px;
        offPx: Px;
        phasePx?: Px;
    };
    yRange?: NumericRange;
} | {
    kind: "quad";
    mode: "rect";
    rects: Float32Array | Float64Array;
    count: number;
    fill: Color;
    stroke: Color;
    strokeWidthPx: Px;
    roundness: Px;
    opacity: number;
    origin?: {
        x: number;
        y: number;
    };
    yRange?: NumericRange;
} | {
    kind: "quad";
    mode: "marker";
    centers: Float32Array | Float64Array;
    count: number;
    sizePx: Px;
    fill: Color;
    stroke: Color;
    strokeWidthPx: Px;
    roundness: Px;
    opacity: number;
    origin?: {
        x: number;
        y: number;
    };
    colors?: readonly Color[];
    sizes?: Float32Array | readonly number[];
    yRange?: NumericRange;
} | {
    kind: "area";
    x: Float32Array | Float64Array;
    y0: Float32Array | Float64Array;
    y1: Float32Array | Float64Array;
    count: number;
    fill: Color;
    opacity: number;
    origin?: {
        x: number;
        y: number;
    };
    yRange?: NumericRange;
} | {
    kind: "mesh";
    positions: Float32Array | Float64Array;
    count: number;
    fill: Color;
    opacity: number;
    origin?: {
        x: number;
        y: number;
    };
    yRange?: NumericRange;
};
export declare enum TextAlign {
    TopLeft = "top-left",
    Center = "center"
}
export type TextEntry = {
    x: Px;
    y: Px;
    text: string;
    color: Color;
    align: TextAlign;
    fixedBox?: boolean;
    boxOrigin?: {
        x: Px;
        y: Px;
    };
    boxTextOffsetY?: Px;
    boxTextBaseline?: "top" | "middle";
    boxTextTrack?: "x-axis";
    clampRect?: ClampRect;
    box?: {
        width: Px;
        height: Px;
        exactWidth?: boolean;
        padX: Px;
        padY: Px;
        background: Color;
        border: Color;
        borderWidth: Px;
    };
};
export type DrawList = {
    viewport: {
        value: {
            x: NumericRange;
            y: NumericRange;
        };
        dpr: number;
        canvas: RenderLayout["canvas"];
        plot: RenderLayout["plot"];
        scales: RenderLayout["scales"];
    };
    background: Color;
    borderColor: Color;
    scaleStyle: {
        x: {
            show: boolean;
            side: "top" | "bottom";
            background: Color;
            textColor: Color;
            lineColor: Color;
            lineWidthPx: Px;
        };
        y: {
            show: boolean;
            side: "left" | "right";
            background: Color;
            textColor: Color;
            lineColor: Color;
            lineWidthPx: Px;
        };
    };
    grid: readonly Primitive[];
    series: readonly Primitive[];
    objects: readonly Primitive[];
    overlays: readonly Primitive[];
    topOverlays: readonly Primitive[];
    text: readonly TextEntry[];
    overlayText: readonly TextEntry[];
    compactLinePaths?: boolean;
    selectedHighlight?: readonly Primitive[];
    selectedAccent?: Color;
    /** Per-object highlight (keyed by id) for drawing a faint hover affordance. */
    objectHighlights?: ReadonlyMap<number, readonly Primitive[]>;
    cursorIndicator?: {
        px: Px;
        color: Color;
    };
    crosshair?: {
        px: Px;
        py: Px;
        axis: "x" | "y" | "xy";
        color: Color;
        dash?: {
            onPx: Px;
            offPx: Px;
        };
    };
    stats?: {
        fps: number;
        frameMs: number;
        cpuMs: number;
        gpuMs: number;
        buffers?: {
            name: string;
            count: number;
            budget: number;
            total: number;
            ratio: number;
            color: Color;
        }[];
    };
};
export declare class Scratch {
    private f32buf;
    private f32off;
    private f64buf;
    private f64off;
    reset(): void;
    f32(n: number): Float32Array;
    f64(n: number): Float64Array;
}
export type MeasureTextFn = (args: {
    text: string;
}) => {
    width: Px;
    height: Px;
};
