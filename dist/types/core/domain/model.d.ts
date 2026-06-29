import { ObjectModelRegistry, type ObjectEdit, type ObjectHandle, type ObjectId, type ObjectRecord, type ObjectUpdate } from "./objects";
import { type RgbaColor, type SeriesId, type SeriesRecord, type SeriesStyle, SeriesModelRegistry } from "./series";
import { type NumericRange, type ViewState, type ViewValue } from "./view";
export type SeriesListRow = {
    id: SeriesId;
    name: string;
    kind: string;
    color: RgbaColor;
    visible: boolean;
    showInLegend: boolean;
};
export declare class PlotDomainModel {
    readonly seriesRegistry: SeriesModelRegistry;
    readonly objectRegistry: ObjectModelRegistry;
    readonly axisOffsetX: number;
    readonly axisOffsetY: number;
    private readonly series;
    private readonly objects;
    private readonly view;
    private paletteIndex;
    private objectSeq;
    constructor(args: {
        seriesRegistry: SeriesModelRegistry;
        objectRegistry?: ObjectModelRegistry;
        initialValue: {
            x: NumericRange;
            y: NumericRange;
        };
        /** Initial ranges for additional y-axes, keyed by axis id. */
        extraYAxes?: ReadonlyArray<{
            id: string;
            min: number;
            max: number;
        }>;
    });
    addSeries(name: string, input: {
        kind: string;
        [key: string]: unknown;
    }, style?: Partial<Pick<SeriesStyle, "color" | "visible" | "showInLegend">> & {
        yAxisId?: string;
    }): SeriesId;
    appendSeries(id: SeriesId, payload: unknown): boolean;
    appendSeriesMany(id: SeriesId, payloads: readonly unknown[]): boolean;
    replaceSeries(id: SeriesId, input: {
        kind: string;
        [key: string]: unknown;
    }): boolean;
    setSeriesVisible(id: SeriesId, visible: boolean): boolean;
    getView(): ViewValue;
    peekView(): Readonly<ViewState>;
    setView(next: ViewValue): boolean;
    resetView(): boolean;
    /**
     * Combined data bounds across all visible series, or null when nothing has a
     * finite extent (no data, or only infinite-line series). Drives `view.fit()`.
     */
    dataExtent(): {
        x: NumericRange;
        y: NumericRange;
    } | null;
    /** Current range of a secondary y-axis, or null if no such axis exists. */
    getExtraYRange(id: string): NumericRange | null;
    /** Set a secondary y-axis range; returns true when the range actually changed. */
    setExtraYRange(id: string, range: NumericRange): boolean;
    getSeriesDatum(id: SeriesId, index: number): unknown | null;
    listSeries(): readonly SeriesListRow[];
    getSeries(id: SeriesId): SeriesRecord<unknown> | null;
    removeSeries(id: SeriesId): boolean;
    forEachSeries(cb: (record: SeriesRecord<unknown>) => void): void;
    addObject(input: {
        kind: string;
        locked?: boolean;
    }, options?: {
        visible?: boolean;
        locked?: boolean;
    }): ObjectId;
    updateObject(id: ObjectId, update: ObjectUpdate): boolean;
    applyObjectEdit(id: ObjectId, edit: ObjectEdit): boolean;
    setObjectVisible(id: ObjectId, visible: boolean): boolean;
    setObjectLocked(id: ObjectId, locked: boolean): boolean;
    removeObject(id: ObjectId): boolean;
    getObject(id: ObjectId): ObjectRecord<unknown> | null;
    getObjectHandles(id: ObjectId): readonly ObjectHandle[];
    forEachObject(cb: (record: ObjectRecord<unknown>) => void): void;
    private normalizeContext;
    private nextPaletteColor;
}
