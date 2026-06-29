import type { NumericRange as Range } from "../core/domain/view";
import type { RenderLayout as Layout } from "../core/render/layout";
import type { Bounds, Color, Px } from "../core/shared/geometry";
import type { CustomObjectInput, CustomSeriesInput, ObjectId, ObjectInput, ObjectRecord, ObjectStatePatch, SeriesId, SeriesInput, SeriesView } from "./contracts";
import { type PlotController } from "../core/api/controller";
import type { AxisDef, PlotConfigUpdate } from "../core/domain/config";
import { InteractionController } from "../core/interaction/controller";
import type { Modifiers } from "../core/interaction/contracts";
import type { CursorEvent, HitInfo, PlotEventMap as PlotEvents } from "../core/interaction/events";
import { DomRuntime, type Layer, type LayerFrame, type OverlayPainter } from "../core/runtime/dom_runtime";
import type { ObjectExtension, SeriesExtension } from "../core/api/extension";
import type { Plugin } from "./plugin";
import { LinkGroup, LinkOptions } from "./link";
import { type PlotTheme } from "./theme";
export type PlotInit = {
    host: HTMLElement;
    /**
     * Initial view ranges. Optional — omit it to start at a unit range and call
     * `plot.view.fit()` after adding series to auto-fit to the data.
     */
    initialValue?: {
        x: Range;
        y: Range;
    };
    config?: PlotConfigUpdate;
    link?: {
        group: LinkGroup;
    } & LinkOptions;
    plugins?: readonly Plugin[];
};
type PlotImpl = {
    host: HTMLElement;
    layerCanvas: HTMLCanvasElement;
    primaryCanvas: HTMLCanvasElement;
    textCanvas: HTMLCanvasElement;
    overlayCanvas: HTMLCanvasElement;
    controller: PlotController;
    interaction: InteractionController;
    runtime: DomRuntime;
    unlink?: () => void;
};
export declare class Plot {
    private readonly impl;
    private readonly pluginTeardowns;
    constructor(impl: PlotImpl);
    /** Install a plugin. Its teardown (if returned) runs on {@link dispose}. */
    use(plugin: Plugin): this;
    /**
     * Register an overlay painter, invoked on the overlay canvas every frame in
     * CSS-pixel space. Returns a disposer. This is the sanctioned surface for
     * tooltips, custom markers, and other plugin-drawn decoration.
     */
    onDraw(painter: OverlayPainter): () => void;
    /**
     * Register a render layer, drawn every frame on a dedicated canvas stacked
     * BEHIND the series (a backdrop). The layer owns its own rendering context
     * (WebGPU or 2D) on `frame.canvas` and is handed the per-frame transform so it
     * can stay pixel-aligned on pan/zoom. Returns a disposer. This is the seam used
     * by big-data raster extensions such as the WebGPU heatmap.
     */
    addLayer(layer: Layer): () => void;
    /**
     * Request a re-render on the next animation frame. Plugins call this after
     * asynchronous state becomes ready (e.g. a WebGPU device finishing init) so
     * their layer/overlay paints without waiting for the next pointer event.
     */
    redraw(): void;
    /**
     * Render synchronously this instant, bypassing the rAF scheduler. Use from an
     * external animation loop (live streaming) that drives its own
     * requestAnimationFrame and wants to draw every frame — the request-coalescing
     * scheduler otherwise renders every other frame when poked from another rAF.
     */
    renderNow(): void;
    /** Register a custom series kind (model + scene adapters). */
    registerSeries(extension: SeriesExtension): void;
    /** Register a custom annotation object kind (model + scene adapters). */
    registerObject(extension: ObjectExtension): void;
    start(): void;
    stop(): void;
    dispose(): void;
    batch<T>(txn: () => T): T;
    view: {
        get: () => {
            x: Range;
            y: Range;
        };
        set: (ranges: {
            x: Range;
            y: Range;
        }) => boolean;
        reset: () => boolean;
        /**
         * Auto-fit the view to the data bounds of all visible series (so you don't
         * have to know the ranges up front). `padY` defaults to 5%, `padX` to 0.
         * Call after adding/replacing series. Returns false if there's no data.
         */
        fit: (opts?: {
            padX?: number;
            padY?: number;
        }) => boolean;
    };
    cursor: {
        get: () => CursorEvent;
    };
    config: {
        get: () => import("../core/domain/config").PlotConfig;
        update: (patch: PlotConfigUpdate) => import("../core/domain/config").PlotConfig;
    };
    /**
     * Apply a semantic {@link PlotTheme} in one call — it expands to the
     * underlying color config (grid, crosshair, axis text/lines, backgrounds,
     * border). Omitted theme fields leave the current config untouched.
     */
    theme: {
        set: (theme: PlotTheme) => import("../core/domain/config").PlotConfig;
    };
    /**
     * Secondary y-axes declared via `config.yAxes`. `get` reads an axis range,
     * `set` overrides it (shares the primary x-axis; vertical only).
     */
    axes: {
        get: (id: string) => Range | null;
        set: (id: string, range: Range) => boolean;
    };
    series: {
        add: (name: string, input: SeriesInput | CustomSeriesInput, style?: Partial<{
            color: Color;
            yAxisId: string;
        }>) => SeriesId;
        append: (id: SeriesId, payload: unknown) => boolean;
        appendMany: (id: SeriesId, payloads: readonly unknown[]) => boolean;
        setData: (id: SeriesId, input: SeriesInput | CustomSeriesInput) => boolean;
        setVisible: (id: SeriesId, on: boolean) => boolean;
        remove: (id: SeriesId) => boolean;
        list: () => readonly SeriesView[];
        getDatum: (id: SeriesId, index: number) => unknown | null;
    };
    objects: {
        add: (input: ObjectInput | CustomObjectInput) => ObjectId;
        updateState: (id: ObjectId, patch: ObjectStatePatch) => boolean;
        setVisible: (id: ObjectId, on: boolean) => boolean;
        setLocked: (id: ObjectId, on: boolean) => boolean;
        remove: (id: ObjectId) => boolean;
        list: () => readonly ObjectRecord[];
        get: (id: ObjectId) => ObjectRecord | null;
        select: (id: ObjectId) => boolean;
        clearSelection: () => boolean;
        getSelected: () => ObjectId | null;
    };
    interaction: {
        isEnabled: () => boolean;
        setEnabled: (on: boolean) => void;
        /** Constrain drag-panning to specific axes (e.g. lock X on a live stream). */
        setPanAxes: (x: boolean, y: boolean) => void;
        /** What shift+drag box-zoom selects: a full rectangle (default), or x/y range. */
        setZoomType: (axis: "x" | "y" | "xy") => void;
        getHover: () => PlotEvents["hover"] | null;
        getSelection: () => import("../core/api").SelectionState;
    };
    coords: {
        pxToValue: (px: Px, py: Px) => {
            x: number;
            y: number;
        };
        valueToPx: (x: number, y: number) => {
            x: number;
            y: number;
        };
        canvasSize: () => {
            width: Px;
            height: Px;
        };
        plotSize: () => {
            width: Px;
            height: Px;
        };
        bounds: () => Bounds<Px>;
        dpr: () => number;
    };
    subscribe<K extends keyof PlotEvents>(type: K, cb: (ev: PlotEvents[K]) => void): () => void;
}
export declare function createPlot(init: PlotInit): Plot;
export type { PlotEvents, CursorEvent, HitInfo, Modifiers, Layout, AxisDef };
export type { Layer, LayerFrame };
