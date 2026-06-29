import { type PlotConfig, type PlotConfigUpdate } from "../domain/config";
import { PlotDomainModel } from "../domain/model";
import { ObjectModelRegistry, type ObjectRecord } from "../domain/objects";
import { SeriesModelRegistry, type SeriesStyle } from "../domain/series";
import type { ViewValue } from "../domain/view";
import { SceneFrameBuilder, type BuildSceneArgs, type BuiltScene } from "../scene/builder";
import { ObjectSceneRegistry, SeriesSceneRegistry } from "../scene/registry";
import type { ObjectExtension, SeriesExtension } from "./extension";
import type { PlotApi, PlotEventMap } from "./plot";
export type PlotControllerInit = {
    initialValue: ViewValue;
    config?: PlotConfigUpdate;
    seriesRegistry?: SeriesModelRegistry;
    objectRegistry?: ObjectModelRegistry;
    seriesSceneRegistry?: SeriesSceneRegistry;
    objectSceneRegistry?: ObjectSceneRegistry;
};
type EventListener<K extends keyof PlotEventMap> = (event: PlotEventMap[K]) => void;
export declare class PlotController implements PlotApi {
    readonly model: PlotDomainModel;
    readonly sceneBuilder: SceneFrameBuilder;
    private configValue;
    private readonly listeners;
    private batchDepth;
    private pendingView;
    private pendingConfig;
    constructor(init: PlotControllerInit);
    start(): void;
    stop(): void;
    dispose(): void;
    batch<T>(txn: () => T): T;
    readonly view: {
        get: () => ViewValue;
        set: (ranges: ViewValue) => boolean;
        reset: () => boolean;
        /**
         * Fit the view to the data bounds of all visible series. `padX`/`padY` add a
         * fraction of each span as margin (padY defaults to 5%). Returns false when
         * there is no finite data to fit (and the view is left unchanged).
         */
        fit: (opts?: {
            padX?: number;
            padY?: number;
        }) => boolean;
    };
    readonly config: {
        get: () => PlotConfig;
        update: (patch: PlotConfigUpdate) => PlotConfig;
    };
    readonly axes: {
        /** Current range of a secondary y-axis, or null if no such axis exists. */
        get: (id: string) => import("../..").NumericRange | null;
        /** Set a secondary y-axis range; rebuilds via the standard view path. */
        set: (id: string, range: {
            min: number;
            max: number;
        }) => boolean;
    };
    readonly series: {
        add: (name: string, input: {
            kind: string;
            [key: string]: unknown;
        }, style?: Partial<Pick<SeriesStyle, "color" | "visible" | "showInLegend">> & {
            yAxisId?: string;
        }) => number;
        append: (id: number, payload: unknown) => boolean;
        appendMany: (id: number, payloads: readonly unknown[]) => boolean;
        setData: (id: number, input: {
            kind: string;
            [key: string]: unknown;
        }) => boolean;
        setVisible: (id: number, visible: boolean) => boolean;
        remove: (id: number) => boolean;
        list: () => readonly import("../domain/model").SeriesListRow[];
        getDatum: (id: number, index: number) => unknown;
    };
    readonly objects: {
        add: (input: {
            kind: string;
            locked?: boolean;
        }, options?: {
            visible?: boolean;
            locked?: boolean;
        }) => number;
        updateState: (id: number, patch: {
            state?: unknown;
            visible?: boolean;
            locked?: boolean;
        }) => boolean;
        edit: (id: number, edit: {
            kind: "drag-handle";
            handleId: number;
            startX: number;
            startY: number;
            nowX: number;
            nowY: number;
        } | {
            kind: "drag-object";
            startX: number;
            startY: number;
            nowX: number;
            nowY: number;
        }) => boolean;
        setVisible: (id: number, visible: boolean) => boolean;
        setLocked: (id: number, locked: boolean) => boolean;
        remove: (id: number) => boolean;
        list: () => readonly ObjectRecord<unknown>[];
        get: (id: number) => ObjectRecord<unknown> | null;
    };
    registerSeries(extension: SeriesExtension): void;
    registerObject(extension: ObjectExtension): void;
    subscribe<K extends keyof PlotEventMap>(type: K, cb: EventListener<K>): () => void;
    buildScene(args: BuildSceneArgs): BuiltScene;
    peekConfig(): Readonly<PlotConfig>;
    peekView(): Readonly<ViewValue>;
    private queueView;
    private flush;
    private queueConfig;
    private emit;
}
export declare function createPlotController(init: PlotControllerInit): PlotController;
export {};
