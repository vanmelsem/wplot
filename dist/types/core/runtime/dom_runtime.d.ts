import { PlotController } from "../api/controller";
import { InteractionController } from "../interaction/controller";
import { DrawListBuilder } from "../render/draw_list";
import { CanvasRenderer } from "./render/canvas";
import { TextRenderer } from "./render/text";
import type { Bounds, Px } from "../shared/geometry";
import type { NumericRange } from "../domain/view";
type RenderPass = "full" | "overlay";
/**
 * The drawing surface handed to plugin overlay painters each frame. Coordinates
 * are CSS pixels (the context transform is pre-scaled by the device pixel ratio),
 * and `valueToPx`/`pxToValue` convert between data space and CSS pixels.
 */
export type OverlayFrame = {
    readonly ctx: CanvasRenderingContext2D;
    valueToPx(x: number, y: number): {
        x: Px;
        y: Px;
    };
    pxToValue(px: Px, py: Px): {
        x: number;
        y: number;
    } | null;
    readonly bounds: Bounds<Px>;
    readonly view: {
        x: NumericRange;
        y: NumericRange;
    };
    readonly dpr: number;
};
/** A plugin-supplied painter invoked on the overlay canvas every frame. */
export type OverlayPainter = (frame: OverlayFrame) => void;
/**
 * The drawing surface handed to render-layer plugins each frame. It carries the
 * same per-frame projection fields as {@link OverlayFrame} (so a layer stays
 * pixel-aligned on pan/zoom) but instead of a 2D context it exposes the dedicated
 * `layer` canvas — the layer owns its own rendering context (WebGPU or 2D). The
 * layer canvas is stacked BEHIND the primary series canvas, so layers render as a
 * backdrop (e.g. a heatmap raster under the series).
 */
export type LayerFrame = Omit<OverlayFrame, "ctx"> & {
    readonly canvas: HTMLCanvasElement;
};
/** A plugin-supplied render layer invoked on the layer canvas every frame. */
export type Layer = {
    draw(frame: LayerFrame): void;
};
export declare class DomRuntime {
    private readonly args;
    private running;
    private frameRequested;
    private inFrame;
    private postFrameRequested;
    private absorbInvalidateIntoCurrentFrame;
    private ro;
    private resizeTarget;
    private listeners;
    private textCtx;
    private readonly textMeasureCache;
    private lastCursor;
    private pointerId;
    private queuedInputs;
    private hostElement;
    private widthPx;
    private heightPx;
    private pendingRenderPass;
    private baseState;
    private lastFrameEndMs;
    private avgFrameMs;
    private avgCpuMs;
    private overlayCtx;
    private readonly overlayPainters;
    private readonly layers;
    readonly interaction: InteractionController;
    readonly drawListBuilder: DrawListBuilder;
    constructor(args: {
        primaryCanvas: HTMLCanvasElement;
        textCanvas: HTMLCanvasElement;
        overlayCanvas: HTMLCanvasElement;
        layerCanvas: HTMLCanvasElement;
        controller: PlotController;
        interaction?: InteractionController;
        drawListBuilder?: DrawListBuilder;
        renderer?: CanvasRenderer;
        rendererText?: TextRenderer;
        rendererOverlayText?: TextRenderer;
    });
    private readonly renderer;
    private readonly rendererText;
    private readonly rendererOverlayText;
    start(): void;
    stop(): void;
    dispose(): void;
    requestFrame(mode?: RenderPass): void;
    private scheduleFrame;
    flushScheduledFrame(): void;
    /**
     * Render synchronously, right now, bypassing the rAF-coalescing scheduler.
     * For external animation loops (e.g. a live stream driving its own
     * requestAnimationFrame): the request-driven scheduler otherwise renders only
     * every other frame when poked from another rAF callback, capping a 120Hz
     * display at 60. Calling this each tick draws every frame, like a plain scope.
     */
    renderNow(): void;
    private renderFrame;
    /** Register a plugin overlay painter. Returns a disposer. */
    addOverlayPainter(painter: OverlayPainter): () => void;
    /**
     * Register a render layer painted on the dedicated layer canvas (behind the
     * series) every frame. Returns a disposer.
     */
    addLayer(layer: Layer): () => void;
    private paintLayers;
    private paintOverlay;
    private attach;
    private detach;
    private enqueueInput;
    private flushQueuedInputs;
    private cloneDrawList;
    private updateCursor;
    private resetCursor;
    private modsFrom;
    private readonly measureText;
    private localPointFromEvent;
    private syncViewportSize;
}
export {};
