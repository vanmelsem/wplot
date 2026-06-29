import { type RgbaColor } from "../domain/series";
import type { ViewValue } from "../domain/view";
import { PlotController } from "../api/controller";
import type { Modifiers, PointerButton } from "./contracts";
import { type Viewport } from "./viewport";
import { CursorEvent, Emitter, type HoverEvent, type PlotEventMap, type SelectionState } from "./events";
import { type RenderState } from "./state";
export declare class InteractionController {
    readonly controller: PlotController;
    readonly events: Emitter<PlotEventMap>;
    onInvalidate: ((mode?: "full" | "overlay") => void) | null;
    private readonly geometry;
    private lastPointer;
    private hover;
    private seriesHover;
    private selection;
    private selectedObjectId;
    private gesture;
    private cursorVisible;
    private actionsEnabled;
    private panX;
    private panY;
    private boxZoomAxis;
    private crosshair;
    private cursorIndicator;
    private readonly unsubscribers;
    constructor(controller: PlotController);
    dispose(): void;
    setRenderState(state: RenderState): void;
    getCursorState(): CursorEvent;
    getHoverState(): HoverEvent | null;
    getSelectionState(): SelectionState;
    getSelectedObjectId(): number | null;
    selectObject(objectId: number): boolean;
    clearSelectedObject(): boolean;
    getSelectedObjectHandles(): ReadonlyArray<{
        objectId: number;
        handleId: number;
        x: number;
        y: number;
        sizePx: number;
        offsetXPx?: number;
        offsetYPx?: number;
    }>;
    getCrosshairState(): {
        enabled: false;
    } | {
        enabled: true;
        px: number;
        py: number;
        axis: "x" | "y" | "xy";
    };
    getViewport(): Viewport;
    setActionsEnabled(enabled: boolean): void;
    /** Constrain drag-panning to specific axes (e.g. lock X on a live stream). */
    setPanAxes(x: boolean, y: boolean): void;
    /** What a shift+drag box-zoom selects: a full rectangle, or an x/y range. */
    setZoomType(axis: "x" | "y" | "xy"): void;
    isActionsEnabled(): boolean;
    setCursorIndicatorValueX(valueX: number, color?: RgbaColor): void;
    clearCursorIndicator(): void;
    pointerMove(px: number, py: number, mods: Modifiers): void;
    pointerDown(button: PointerButton, px: number, py: number, mods: Modifiers): void;
    pointerUp(button: PointerButton, px: number, py: number, _mods: Modifiers): void;
    wheel(deltaY: number, px: number, py: number, mods: Modifiers): void;
    doubleClick(px: number, py: number, _mods: Modifiers): void;
    pointerLeave(): void;
    pxToValue(px: number, py: number): {
        x: number;
        y: number;
    };
    valueToPx(x: number, y: number): {
        x: number;
        y: number;
    };
    lockCrosshair(axis: "x" | "y", px: number, py: number): void;
    unlockCrosshair(): void;
    syncLinkedCursor(value: {
        x: number;
        y: number;
    } | null, cursor: {
        x?: boolean;
        y?: boolean;
    }, opts?: {
        hitTest?: boolean;
        snap?: boolean;
    }): void;
    cursorForPointer(px: number, py: number): string;
    getCursorIndicator(): {
        enabled: false;
    } | {
        enabled: true;
        valueX: number;
        color: RgbaColor;
    };
    hasActiveGesture(): boolean;
    peekView(): Readonly<ViewValue>;
    setView(ranges: ViewValue): boolean;
    private invalidate;
    private setSelectedObjectId;
    private viewport;
    private toleranceValue;
    private insidePlot;
    private safePxToValue;
    private objectLocked;
    private axisFromPointer;
    private extraAxisDef;
    private zoomExtraY;
    private zoomAt;
    private pickAtPx;
    private recomputeHoverFromPointer;
    private emitCursorAndHover;
    private hitInfo;
    private enrichSeriesHits;
    private snapSeriesHits;
    private snapSeriesIndex;
    private formatValue;
    private emitClick;
    private updateCrosshair;
    private plotBounds;
}
