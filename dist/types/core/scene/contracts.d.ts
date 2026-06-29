import type { ObjectHandle, ObjectId, ObjectKind, ObjectRecord } from "../domain/objects";
import type { RgbaColor, SeriesId, SeriesKind, SeriesRecord, SeriesStyle } from "../domain/series";
import type { ViewState } from "../domain/view";
import type { SceneOrigin, ScenePrimitive, SceneText } from "./frame";
export type PickingHit = {
    kind: "series-point";
    seriesId: SeriesId;
    index: number;
} | {
    kind: "object";
    objectId: ObjectId;
} | {
    kind: "object-area";
    objectId: ObjectId;
} | {
    kind: "object-handle";
    objectId: ObjectId;
    handleId: number;
};
export type PickingEntry = {
    kind: "polyline-series";
    seriesId: SeriesId;
    x: Float32Array | Float64Array;
    y: Float32Array | Float64Array;
    count: number;
    baseIndex: number;
    origin?: SceneOrigin;
} | {
    kind: "marker-series";
    seriesId: SeriesId;
    x: Float32Array | Float64Array;
    y: Float32Array | Float64Array;
    count: number;
    baseIndex: number;
    origin?: SceneOrigin;
} | {
    kind: "bars-series";
    seriesId: SeriesId;
    x: Float32Array | Float64Array;
    y: Float32Array | Float64Array;
    y0: Float32Array | Float64Array;
    count: number;
    width: number;
    baseIndex: number;
    origin?: SceneOrigin;
} | {
    kind: "candles-series";
    seriesId: SeriesId;
    x: Float32Array | Float64Array;
    open: Float32Array | Float64Array;
    high: Float32Array | Float64Array;
    low: Float32Array | Float64Array;
    close: Float32Array | Float64Array;
    count: number;
    width: number;
    baseIndex: number;
    origin?: SceneOrigin;
} | {
    kind: "object-horizontal-line";
    objectId: ObjectId;
    y: number;
} | {
    kind: "object-vertical-line";
    objectId: ObjectId;
    x: number;
} | {
    kind: "object-rect";
    objectId: ObjectId;
    xMin: number;
    xMax: number;
    yMin: number;
    yMax: number;
} | {
    kind: "object-x-band";
    objectId: ObjectId;
    xMin: number;
    xMax: number;
} | {
    kind: "object-y-band";
    objectId: ObjectId;
    yMin: number;
    yMax: number;
} | {
    kind: "object-segment";
    objectId: ObjectId;
    x0: number;
    y0: number;
    x1: number;
    y1: number;
} | {
    kind: "object-point";
    objectId: ObjectId;
    x: number;
    y: number;
    scale?: number;
} | {
    kind: "object-handle";
    objectId: ObjectId;
    handleId: number;
    x: number;
    y: number;
    sizePx: number;
    offsetXPx?: number;
    offsetYPx?: number;
};
export type SceneBuildContext = {
    view: ViewState;
    axisOffsetX: number;
    axisOffsetY: number;
    dpr: number;
    plotWidthPx: number;
    plotHeightPx: number;
    xAxisHeightPx?: number;
    yAxisWidthPx?: number;
    xAxisSide?: "top" | "bottom";
    yAxisSide?: "left" | "right";
    /** Plot background color, used e.g. to ring scatter markers against the plot. */
    background?: RgbaColor;
    formatXValue?: (value: number) => string;
    formatYValue?: (value: number) => string;
};
export type SceneFragment = {
    primitives?: readonly ScenePrimitive[];
    overlays?: readonly ScenePrimitive[];
    labels?: readonly SceneText[];
    picking?: readonly PickingEntry[];
    legendValueText?: string;
};
export interface SeriesSceneAdapter<TState> {
    readonly kind: SeriesKind;
    build(record: SeriesRecord<TState>, ctx: SceneBuildContext): SceneFragment | null;
}
export interface ObjectSceneAdapter<TState> {
    readonly kind: ObjectKind;
    build(record: ObjectRecord<TState>, ctx: SceneBuildContext): SceneFragment | null;
    handles?(record: ObjectRecord<TState>, ctx: SceneBuildContext): readonly ObjectHandle[];
    /** The kind's selection accent color (used for the focus box + handle stroke). */
    accent?(state: TState): RgbaColor;
    /**
     * Focus-box decoration drawn when this object is selected, given the
     * already-alpha-applied accent color. Uses the same {@link SceneBuildContext}
     * as `build`/`handles`.
     */
    highlight?(record: ObjectRecord<TState>, ctx: SceneBuildContext, color: RgbaColor): readonly ScenePrimitive[];
}
export type ScenePickingIndex = {
    entries: readonly PickingEntry[];
};
export type SeriesLegendRow = {
    seriesId: SeriesId;
    name: string;
    style: SeriesStyle;
    valueText?: string;
};
export declare function objectHandlePickingEntry(objectId: ObjectId, handle: ObjectHandle): PickingEntry;
