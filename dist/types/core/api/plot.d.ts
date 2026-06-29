import type { PlotConfig, PlotConfigUpdate } from "../domain/config";
import type { ObjectEdit, ObjectId, ObjectRecord, ObjectUpdate } from "../domain/objects";
import type { SeriesListRow } from "../domain/model";
import type { SeriesId, SeriesStyle } from "../domain/series";
import type { ViewValue } from "../domain/view";
import type { PlotEventMap } from "../interaction/events";
export type { PlotEventMap, CursorEvent, HoverEvent, ClickEvent } from "../interaction/events";
export type PlotSeriesInput = {
    kind: string;
    [key: string]: unknown;
};
export type ObjectInput = {
    kind: string;
    locked?: boolean;
};
export interface PlotApi {
    start(): void;
    stop(): void;
    dispose(): void;
    batch<T>(txn: () => T): T;
    view: {
        get(): ViewValue;
        set(ranges: ViewValue): boolean;
        reset(): boolean;
    };
    config: {
        get(): PlotConfig;
        update(patch: PlotConfigUpdate): PlotConfig;
    };
    axes: {
        get(id: string): {
            min: number;
            max: number;
        } | null;
        set(id: string, range: {
            min: number;
            max: number;
        }): boolean;
    };
    series: {
        add(name: string, input: PlotSeriesInput, style?: Partial<Pick<SeriesStyle, "color" | "visible" | "showInLegend">> & {
            yAxisId?: string;
        }): SeriesId;
        append(id: SeriesId, payload: unknown): boolean;
        appendMany(id: SeriesId, payloads: readonly unknown[]): boolean;
        setData(id: SeriesId, input: PlotSeriesInput): boolean;
        setVisible(id: SeriesId, visible: boolean): boolean;
        list(): readonly SeriesListRow[];
        getDatum(id: SeriesId, index: number): unknown | null;
    };
    objects: {
        add(input: ObjectInput, options?: {
            visible?: boolean;
            locked?: boolean;
        }): ObjectId;
        updateState(id: ObjectId, patch: ObjectUpdate): boolean;
        edit(id: ObjectId, edit: ObjectEdit): boolean;
        setVisible(id: ObjectId, visible: boolean): boolean;
        setLocked(id: ObjectId, locked: boolean): boolean;
        remove(id: ObjectId): boolean;
        list(): readonly ObjectRecord<unknown>[];
        get(id: ObjectId): ObjectRecord<unknown> | null;
    };
    subscribe<K extends keyof PlotEventMap>(type: K, cb: (event: PlotEventMap[K]) => void): () => void;
}
