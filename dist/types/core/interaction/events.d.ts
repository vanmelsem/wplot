import type { PlotConfig } from "../domain/config";
import type { RgbaColor, SeriesId } from "../domain/series";
import type { ViewValue } from "../domain/view";
import type { PickingHit } from "../scene/contracts";
import type { RenderBounds } from "../render/layout";
export type HitInfo = PickingHit & {
    seriesName?: string;
    color?: RgbaColor;
    datum?: unknown;
};
export type SeriesHit = {
    kind: "series-point";
    seriesId: SeriesId;
    index: number;
};
export type SeriesHitInfo = HitInfo & SeriesHit;
export type CursorEvent = {
    inside: boolean;
    px?: {
        x: number;
        y: number;
    };
    value?: {
        x: number;
        y: number;
    };
    hit?: HitInfo;
    seriesHits?: SeriesHitInfo[];
    formatted?: {
        x: string;
        y: string;
    };
    plotBounds?: RenderBounds;
};
export type HoverEvent = {
    px: {
        x: number;
        y: number;
    };
    value: {
        x: number;
        y: number;
    };
    hit?: HitInfo;
    seriesHits?: SeriesHitInfo[];
};
export type ClickEvent = {
    px: {
        x: number;
        y: number;
    };
    value: {
        x: number;
        y: number;
    };
    button: "left" | "right";
    hit?: HitInfo;
};
export type SelectionState = null | {
    start: [number, number];
    current: [number, number];
    axis: "x" | "y" | "xy";
};
export type PlotEventMap = {
    cursor: CursorEvent;
    hover: HoverEvent;
    click: ClickEvent;
    view: ViewValue;
    config: PlotConfig;
};
type Handler<T> = (event: T) => void;
export declare class Emitter<TEvents extends Record<string, unknown>> {
    private readonly map;
    subscribe<K extends keyof TEvents>(type: K, cb: Handler<TEvents[K]>): () => void;
    emit<K extends keyof TEvents>(type: K, event: TEvents[K]): void;
    hasSubscribers<K extends keyof TEvents>(type: K): boolean;
    clear(): void;
}
export {};
