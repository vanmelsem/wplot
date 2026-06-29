import { formatAxisValue, resolveAxisStep } from "../render/axis";
import {
  BuiltInSeriesKinds,
  type RgbaColor,
  type SeriesRecord,
} from "../domain/series";
import type { ViewValue } from "../domain/view";
import { pickScene } from "../scene/picking";
import type { PickingHit } from "../scene/contracts";
import { getConfiguredAxisSpec, type AxisDef } from "../domain/config";
import { PlotController } from "../api/controller";
import type { RenderLayout } from "../render/layout";
import type { Modifiers, PointerButton } from "./contracts";
import {
  containsBounds,
  panRangesByPixels,
  pxToValue,
  zoomRange,
  type Viewport,
} from "./viewport";
import {
  CursorEvent,
  Emitter,
  type ClickEvent,
  type HitInfo,
  type HoverEvent,
  type PlotEventMap,
  type SelectionState,
  type SeriesHit,
  type SeriesHitInfo,
} from "./events";
import { InteractionGeometry } from "./geometry";
import {
  isSamePickingHit,
  isSameSeriesHover,
  isStoreBackedState,
  nearestIndex,
  sameRange,
} from "./series_hits";
import {
  HIT_TEST_TOLERANCE_PX,
  SNAP_TOLERANCE_PX,
  SELECT_MIN_DRAG_PX,
  type AxisHit,
  type CrosshairAxis,
  type Gesture,
  type RenderState,
} from "./state";

export class InteractionController {
  readonly events = new Emitter<PlotEventMap>();
  onInvalidate: ((mode?: "full" | "overlay") => void) | null = null;

  private readonly geometry: InteractionGeometry;
  private lastPointer: { x: number; y: number } | null = null;
  private hover: PickingHit | null = null;
  private seriesHover: SeriesHit[] | null = null;
  private selection: SelectionState = null;
  private selectedObjectId: number | null = null;
  private gesture: Gesture | null = null;
  // Whether the last emitted cursor was inside the plot — drives a single
  // "left the plot" broadcast so linked followers clear instead of freezing.
  private cursorVisible = false;
  private actionsEnabled = true;
  private panX = true;
  private panY = true;
  private boxZoomAxis: "x" | "y" | "xy" = "xy";
  private crosshair = {
    enabled: false,
    px: 0,
    py: 0,
    axis: "xy" as CrosshairAxis,
    locked: false,
  };
  private cursorIndicator = {
    enabled: false,
    valueX: 0,
    color: [0.98, 0.76, 0.18, 1] as RgbaColor,
  };
  private readonly unsubscribers: Array<() => void> = [];

  constructor(readonly controller: PlotController) {
    this.geometry = new InteractionGeometry(controller);
    this.unsubscribers.push(
      controller.subscribe("view", (event) => {
        this.geometry.rebuildTransform();
        this.events.emit("view", event);
        this.invalidate("full");
        this.recomputeHoverFromPointer({ hitTest: false, snap: false });
      }),
    );
    this.unsubscribers.push(
      controller.subscribe("config", (event) => {
        this.geometry.rebuildTransform();
        this.events.emit("config", event);
        this.invalidate("full");
        this.recomputeHoverFromPointer({ hitTest: false, snap: false });
      }),
    );
  }

  dispose(): void {
    for (let i = 0; i < this.unsubscribers.length; i += 1) {
      this.unsubscribers[i]!();
    }
    this.unsubscribers.length = 0;
    this.events.clear();
  }

  setRenderState(state: RenderState): void {
    this.geometry.setRenderState(state);
    if (
      this.selectedObjectId !== null &&
      !this.controller.model.getObject(this.selectedObjectId)
    ) {
      this.selectedObjectId = null;
    }
    this.recomputeHoverFromPointer(
      this.gesture ? { hitTest: false, snap: false } : undefined,
    );
  }

  getCursorState(): CursorEvent {
    const config = this.controller.peekConfig();
    const plotBounds = this.plotBounds();
    const pointPx = this.crosshair.locked
      ? { x: this.crosshair.px, y: this.crosshair.py }
      : this.lastPointer ?? undefined;
    const transform = this.geometry.getTransform();
    if (!this.geometry.getRenderState() || !transform || !pointPx) {
      return { inside: false, plotBounds };
    }

    const inside = containsBounds(this.viewport().plot, pointPx.x, pointPx.y);
    const value = inside ? pxToValue(transform, pointPx.x, pointPx.y) : undefined;
    const rawSeriesHits =
      inside && value && !this.gesture
        ? this.seriesHover ?? this.snapSeriesHits(value.x)
        : undefined;
    return {
      inside,
      px: pointPx,
      value,
      hit: inside ? this.hitInfo(this.hover) : undefined,
      seriesHits: rawSeriesHits ? this.enrichSeriesHits(rawSeriesHits) : undefined,
      formatted:
        config.showCrosshairLabels && value
          ? this.formatValue(value)
          : undefined,
      plotBounds,
    };
  }

  getHoverState(): HoverEvent | null {
    const cursor = this.getCursorState();
    if (!cursor.inside || !cursor.px || !cursor.value) return null;
    return {
      px: cursor.px,
      value: cursor.value,
      hit: cursor.hit,
      seriesHits: cursor.seriesHits,
    };
  }

  getSelectionState(): SelectionState {
    if (!this.selection) return null;
    return {
      start: [this.selection.start[0], this.selection.start[1]],
      current: [this.selection.current[0], this.selection.current[1]],
      axis: this.selection.axis,
    };
  }

  getSelectedObjectId(): number | null {
    return this.selectedObjectId;
  }

  selectObject(objectId: number): boolean {
    const record = this.controller.objects.get(objectId);
    if (!record || !record.visible) return false;
    this.setSelectedObjectId(objectId);
    return true;
  }

  clearSelectedObject(): boolean {
    if (this.selectedObjectId === null) return false;
    this.setSelectedObjectId(null);
    return true;
  }

  getSelectedObjectHandles(): ReadonlyArray<{
    objectId: number;
    handleId: number;
    x: number;
    y: number;
    sizePx: number;
    offsetXPx?: number;
    offsetYPx?: number;
  }> {
    if (this.selectedObjectId === null) return [];
    const renderState = this.geometry.getRenderState();
    if (!renderState) return [];
    const handles: Array<{
      objectId: number;
      handleId: number;
      x: number;
      y: number;
      sizePx: number;
      offsetXPx?: number;
      offsetYPx?: number;
    }> = [];
    const entries = renderState.scene.picking.entries;
    for (let i = 0; i < entries.length; i += 1) {
      const entry = entries[i]!;
      if (
        entry.kind === "object-handle" &&
        entry.objectId === this.selectedObjectId
      ) {
        handles.push(entry);
      }
    }
    return handles;
  }

  getCrosshairState():
    | { enabled: false }
    | { enabled: true; px: number; py: number; axis: "x" | "y" | "xy" } {
    if (!this.crosshair.enabled) return { enabled: false };
    return {
      enabled: true,
      px: this.crosshair.px,
      py: this.crosshair.py,
      axis: this.crosshair.axis,
    };
  }

  getViewport(): Viewport {
    return this.viewport();
  }

  setActionsEnabled(enabled: boolean): void {
    if (this.actionsEnabled === enabled) return;
    this.actionsEnabled = enabled;
    if (!enabled) {
      this.gesture = null;
      this.selection = null;
      this.hover = null;
      this.seriesHover = null;
      this.invalidate("full");
    }
  }

  /** Constrain drag-panning to specific axes (e.g. lock X on a live stream). */
  setPanAxes(x: boolean, y: boolean): void {
    this.panX = x;
    this.panY = y;
  }

  /** What a shift+drag box-zoom selects: a full rectangle, or an x/y range. */
  setZoomType(axis: "x" | "y" | "xy"): void {
    this.boxZoomAxis = axis;
  }

  isActionsEnabled(): boolean {
    return this.actionsEnabled;
  }

  setCursorIndicatorValueX(valueX: number, color?: RgbaColor): void {
    if (!Number.isFinite(valueX)) {
      this.clearCursorIndicator();
      return;
    }
    this.cursorIndicator.enabled = true;
    this.cursorIndicator.valueX = valueX;
    if (color) {
      this.cursorIndicator.color = [color[0], color[1], color[2], color[3]];
    }
    this.invalidate("overlay");
  }

  clearCursorIndicator(): void {
    if (!this.cursorIndicator.enabled) return;
    this.cursorIndicator.enabled = false;
    this.invalidate("overlay");
  }

  pointerMove(px: number, py: number, mods: Modifiers): void {
    this.lastPointer = { x: px, y: py };
    this.updateCrosshair(px, py);

    const gesture = this.gesture;
    if (this.actionsEnabled && gesture && this.geometry.getTransform()) {
      if (gesture.kind === "pan") {
        const dx = (this.panX ? px - gesture.lastX : 0);
        const dy = (this.panY ? py - gesture.lastY : 0);
        gesture.lastX = px;
        gesture.lastY = py;
        if (dx !== 0 || dy !== 0) {
          this.controller.view.set(
            panRangesByPixels(this.geometry.getTransform()!, dx, dy),
          );
        }
      } else if (gesture.kind === "axis-zoom") {
        const dx = px - gesture.lastX;
        const dy = py - gesture.lastY;
        gesture.lastX = px;
        gesture.lastY = py;
        const deltaY = (gesture.axis === "x" ? -dx : dy) * 2.2;
        if (deltaY !== 0) {
          this.zoomAt(
            deltaY,
            gesture.anchorX,
            gesture.anchorY,
            gesture.axis,
            gesture.yAxisId,
          );
        }
      } else if (gesture.kind === "select") {
        const now = this.safePxToValue(px, py);
        if (now) {
          gesture.currentPx = [px, py];
          this.selection = {
            start: gesture.start,
            current: [now.x, now.y],
            axis: gesture.axis,
          };
          this.invalidate("full");
        }
      } else if (gesture.kind === "drag-object" || gesture.kind === "drag-handle") {
        const now = this.safePxToValue(px, py);
        if (now) {
          const ok =
            gesture.kind === "drag-object"
              ? this.controller.objects.edit(gesture.objectId, {
                  kind: "drag-object",
                  startX: gesture.startX,
                  startY: gesture.startY,
                  nowX: now.x,
                  nowY: now.y,
                })
              : this.controller.objects.edit(gesture.objectId, {
                  kind: "drag-handle",
                  handleId: gesture.handleId,
                  startX: gesture.startX,
                  startY: gesture.startY,
                  nowX: now.x,
                  nowY: now.y,
                });
          if (ok) {
            gesture.startX = now.x;
            gesture.startY = now.y;
            this.invalidate("full");
          }
        }
      }
    }

    this.recomputeHoverFromPointer(
      gesture ? { hitTest: false, snap: false } : undefined,
    );
  }

  pointerDown(
    button: PointerButton,
    px: number,
    py: number,
    mods: Modifiers,
  ): void {
    this.lastPointer = { x: px, y: py };
    this.updateCrosshair(px, py);

    const hit = this.pickAtPx(px, py);
    // Whether the object under the pointer was already focused *before* this
    // press. A shape only drags from its body once focused, so the first click
    // selects without moving — this is what makes the resize handles reliably
    // grabbable (no accidental body-drag stealing the gesture).
    let wasSelected = false;
    if (button === "left") {
      if (hit?.kind === "object" || hit?.kind === "object-handle") {
        wasSelected = this.selectedObjectId === hit.objectId;
        this.setSelectedObjectId(hit.objectId);
      } else if (hit?.kind !== "object-area") {
        // A grab on a thin object or area border selects it; the interior of a
        // filled area (object-area) leaves the selection untouched so a
        // drag-to-pan over a band doesn't deselect; only empty space deselects.
        this.setSelectedObjectId(null);
      }
    }
    if (this.actionsEnabled && button === "left") {
      if ((mods.shift || mods.alt) && this.insidePlot(px, py)) {
        const start = this.safePxToValue(px, py);
        if (start) {
          // Box-zoom: shift drags the configured box (a full XY rectangle by
          // default); alt-only constrains to a Y-range band.
          const axis = mods.shift ? this.boxZoomAxis : "y";
          this.gesture = {
            kind: "select",
            axis,
            start: [start.x, start.y],
            startPx: [px, py],
            currentPx: [px, py],
          };
          this.selection = {
            start: [start.x, start.y],
            current: [start.x, start.y],
            axis,
          };
          this.invalidate("full");
        }
      } else if (hit?.kind === "object-handle" && !this.objectLocked(hit.objectId)) {
        // A handle only exists for the focused object — grabbing it resizes.
        const start = this.safePxToValue(px, py);
        if (start) {
          this.gesture = {
            kind: "drag-handle",
            objectId: hit.objectId,
            handleId: hit.handleId,
            startX: start.x,
            startY: start.y,
          };
        }
      } else if (
        hit?.kind === "object" &&
        wasSelected &&
        !this.objectLocked(hit.objectId)
      ) {
        // Dragging the body of an already-focused shape moves it. (A fresh
        // click only focuses — handled above — so it never moves by accident.)
        const start = this.safePxToValue(px, py);
        if (start) {
          this.gesture = {
            kind: "drag-object",
            objectId: hit.objectId,
            startX: start.x,
            startY: start.y,
          };
        }
      } else if (hit?.kind === "object" || hit?.kind === "object-handle") {
        // Pressed on an object that just got focused (or a locked one): consume
        // the press so it neither pans nor moves the shape.
      } else if (!mods.shift && !mods.ctrl && !mods.alt && !mods.meta) {
        const axisHit = this.axisFromPointer(px, py);
        if (axisHit) {
          const axis = axisHit.kind;
          const plot = this.viewport().plot;
          this.gesture = {
            kind: "axis-zoom",
            axis,
            yAxisId: axisHit.kind === "y" ? axisHit.id : "y",
            anchorX:
              axis === "x"
                ? Math.min(Math.max(px, plot.origin.x), plot.origin.x + plot.size.width)
                : plot.origin.x + plot.size.width * 0.5,
            anchorY:
              axis === "y"
                ? Math.min(Math.max(py, plot.origin.y), plot.origin.y + plot.size.height)
                : plot.origin.y + plot.size.height * 0.5,
            lastX: px,
            lastY: py,
          };
        } else if (this.insidePlot(px, py)) {
          this.gesture = {
            kind: "pan",
            lastX: px,
            lastY: py,
          };
        }
      }
    }

    this.emitClick(button, px, py);
    this.recomputeHoverFromPointer(
      this.gesture ? { hitTest: false, snap: false } : undefined,
    );
  }

  pointerUp(
    button: PointerButton,
    px: number,
    py: number,
    _mods: Modifiers,
  ): void {
    this.lastPointer = { x: px, y: py };
    if (button === "left" && this.gesture?.kind === "select" && this.selection) {
      const axis = this.gesture.axis;
      const okX = Math.abs(this.gesture.startPx[0] - this.gesture.currentPx[0]) > SELECT_MIN_DRAG_PX;
      const okY = Math.abs(this.gesture.startPx[1] - this.gesture.currentPx[1]) > SELECT_MIN_DRAG_PX;
      const commit = axis === "xy" ? okX && okY : axis === "x" ? okX : okY;
      if (commit) {
        const current = this.controller.view.get();
        const zoomX = (axis === "x" || axis === "xy") && this.panX;
        const zoomY = (axis === "y" || axis === "xy") && this.panY;
        this.controller.view.set({
          x: zoomX
            ? {
                min: Math.min(this.selection.start[0], this.selection.current[0]),
                max: Math.max(this.selection.start[0], this.selection.current[0]),
              }
            : current.x,
          y: zoomY
            ? {
                min: Math.min(this.selection.start[1], this.selection.current[1]),
                max: Math.max(this.selection.start[1], this.selection.current[1]),
              }
            : current.y,
        });
      }
      this.selection = null;
      this.invalidate("full");
    }
    this.gesture = null;
    this.updateCrosshair(px, py);
    this.recomputeHoverFromPointer();
  }

  wheel(deltaY: number, px: number, py: number, mods: Modifiers): void {
    this.lastPointer = { x: px, y: py };
    this.updateCrosshair(px, py);
    if (!this.actionsEnabled) return;
    // Wheeling over a secondary y-axis gutter zooms only that axis.
    const axisHit = this.axisFromPointer(px, py);
    if (axisHit?.kind === "y" && axisHit.id !== "y") {
      this.zoomExtraY(axisHit.id, deltaY, py);
      this.recomputeHoverFromPointer({ hitTest: false });
      return;
    }
    const axis = mods.shift ? "x" : mods.alt ? "y" : "xy";
    this.zoomAt(deltaY, px, py, axis);
    this.recomputeHoverFromPointer({ hitTest: false });
  }

  doubleClick(px: number, py: number, _mods: Modifiers): void {
    this.lastPointer = { x: px, y: py };
    this.updateCrosshair(px, py);
    if (!this.actionsEnabled) return;
    this.controller.view.reset();
    this.recomputeHoverFromPointer({ hitTest: false });
  }

  pointerLeave(): void {
    this.gesture = null;
    this.lastPointer = null;
    this.crosshair.enabled = false;
    this.hover = null;
    this.seriesHover = null;
    this.selection = null;
    this.invalidate("full");
    this.events.emit("cursor", {
      inside: false,
      plotBounds: this.plotBounds(),
    });
  }

  pxToValue(px: number, py: number): { x: number; y: number } {
    return this.geometry.pxToValue(px, py);
  }

  valueToPx(x: number, y: number): { x: number; y: number } {
    return this.geometry.valueToPx(x, y);
  }

  lockCrosshair(axis: "x" | "y", px: number, py: number): void {
    const viewport = this.viewport();
    const x0 = viewport.plot.origin.x;
    const x1 = viewport.plot.origin.x + viewport.plot.size.width;
    const y0 = viewport.plot.origin.y;
    const y1 = viewport.plot.origin.y + viewport.plot.size.height;
    this.crosshair.axis = axis;
    this.crosshair.locked = true;
    this.crosshair.enabled = true;
    this.crosshair.px = Math.min(Math.max(px, x0), x1);
    this.crosshair.py = Math.min(Math.max(py, y0), y1);
    this.invalidate("overlay");
  }

  unlockCrosshair(): void {
    if (!this.crosshair.locked) return;
    this.crosshair.locked = false;
    this.crosshair.axis = "xy";
    if (this.lastPointer) {
      this.updateCrosshair(this.lastPointer.x, this.lastPointer.y);
      this.recomputeHoverFromPointer({ hitTest: false });
      return;
    }
    this.invalidate("overlay");
  }

  syncLinkedCursor(
    value: { x: number; y: number } | null,
    cursor: { x?: boolean; y?: boolean },
    opts?: { hitTest?: boolean; snap?: boolean },
  ): void {
    const transform = this.geometry.getTransform();
    if (!value || !transform) {
      this.lastPointer = null;
      this.crosshair.enabled = false;
      this.crosshair.locked = false;
      this.hover = null;
      this.seriesHover = null;
      this.invalidate("overlay");
      this.events.emit("cursor", {
        inside: false,
        plotBounds: this.plotBounds(),
      });
      return;
    }

    const point = this.geometry.valueToPx(value.x, value.y);
    const syncX = cursor.x !== false;
    const syncY = cursor.y !== false;
    // Only the SHARED axes need to be in view. A shared-x cursor must still draw
    // its vertical line when the source plot's y is outside this plot's range
    // (the common case for stacked plots with different y scales).
    const vp = this.viewport();
    const inX =
      point.x >= vp.plot.origin.x &&
      point.x <= vp.plot.origin.x + vp.plot.size.width;
    const inY =
      point.y >= vp.plot.origin.y &&
      point.y <= vp.plot.origin.y + vp.plot.size.height;
    if ((syncX && !inX) || (syncY && !inY)) {
      this.syncLinkedCursor(null, cursor);
      return;
    }
    if (syncX && syncY) {
      this.unlockCrosshair();
      this.lastPointer = { x: point.x, y: point.y };
      this.crosshair.enabled = true;
      this.crosshair.px = point.x;
      this.crosshair.py = point.y;
      this.crosshair.axis = "xy";
      this.recomputeHoverFromPointer(opts);
      return;
    }

    if (syncX) {
      const py = this.crosshair.enabled ? this.crosshair.py : point.y;
      this.lockCrosshair("x", point.x, py);
      this.recomputeHoverFromPointer(opts);
      return;
    }

    if (syncY) {
      const px = this.crosshair.enabled ? this.crosshair.px : point.x;
      this.lockCrosshair("y", px, point.y);
      this.recomputeHoverFromPointer(opts);
    }
  }

  cursorForPointer(px: number, py: number): string {
    const hover = this.hover;
    if (hover && (hover.kind === "object" || hover.kind === "object-handle")) {
      const record = this.controller.model.getObject(hover.objectId);
      if (record) {
        const isHandle = hover.kind === "object-handle";
        const adapter = this.controller.model.objectRegistry.get(record.kind);
        return (
          adapter.cursor?.(
            isHandle,
            isHandle ? hover.handleId : null,
          ) ?? "default"
        );
      }
    }
    const axis = this.axisFromPointer(px, py);
    if (axis?.kind === "x") return "ew-resize";
    if (axis?.kind === "y") return "ns-resize";
    return "default";
  }

  getCursorIndicator():
    | { enabled: false }
    | { enabled: true; valueX: number; color: RgbaColor } {
    if (!this.cursorIndicator.enabled) return { enabled: false };
    return {
      enabled: true,
      valueX: this.cursorIndicator.valueX,
      color: this.cursorIndicator.color,
    };
  }

  hasActiveGesture(): boolean {
    return this.gesture !== null;
  }

  peekView(): Readonly<ViewValue> {
    return this.controller.peekView();
  }

  setView(ranges: ViewValue): boolean {
    return this.controller.view.set(ranges);
  }

  private invalidate(mode: "full" | "overlay" = "full"): void {
    this.onInvalidate?.(mode);
  }

  private setSelectedObjectId(objectId: number | null): void {
    if (this.selectedObjectId === objectId) return;
    this.selectedObjectId = objectId;
    this.invalidate("full");
  }

  private viewport(): Viewport {
    return this.geometry.getViewport();
  }

  private toleranceValue(px: number): { tolx: number; toly: number } {
    return this.geometry.toleranceValue(px);
  }

  private insidePlot(px: number, py: number): boolean {
    return this.geometry.insidePlot(px, py);
  }

  private safePxToValue(px: number, py: number): { x: number; y: number } | null {
    return this.geometry.safePxToValue(px, py);
  }

  private objectLocked(objectId: number): boolean {
    return this.controller.model.getObject(objectId)?.locked === true;
  }

  private axisFromPointer(px: number, py: number): AxisHit | null {
    return this.geometry.axisFromPointer(px, py);
  }

  private extraAxisDef(id: string): AxisDef | undefined {
    return this.controller.peekConfig().yAxes?.find((axis) => axis.id === id);
  }

  // Vertical zoom for a secondary y-axis. The pivot is the value under the
  // pointer in that axis's own range; the result is written back through the
  // controller so the standard view-change path rebuilds the scene.
  private zoomExtraY(id: string, deltaY: number, py: number): void {
    const range = this.controller.model.getExtraYRange(id);
    if (!range) return;
    const plot = this.geometry.getViewport().plot;
    const height = plot.size.height;
    const scale = this.extraAxisDef(id)?.scale ?? "linear";
    const t = height > 0 ? (py - plot.origin.y) / height : 0.5;
    let pivot: number;
    if (scale === "log" && range.min > 0 && range.max > 0) {
      const logMin = Math.log10(range.min);
      const logMax = Math.log10(range.max);
      pivot = Math.pow(10, logMax - t * (logMax - logMin));
    } else {
      pivot = range.max - t * (range.max - range.min);
    }
    const factor = Math.exp(deltaY * 0.001);
    this.controller.axes.set(id, zoomRange(range, pivot, factor, scale));
  }

  private zoomAt(
    deltaY: number,
    px: number,
    py: number,
    axis: "x" | "y" | "xy",
    yAxisId = "y",
  ): void {
    // A vertical zoom targeted at a secondary y-axis adjusts only that axis.
    if (axis === "y" && yAxisId !== "y") {
      this.zoomExtraY(yAxisId, deltaY, py);
      return;
    }
    const transform = this.geometry.getTransform();
    if (!transform) return;
    const pivot = pxToValue(transform, px, py);
    const factor = Math.exp(deltaY * 0.001);
    const currentView = this.controller.peekView();
    const specX = getConfiguredAxisSpec(this.controller.peekConfig(), "x");
    const specY = getConfiguredAxisSpec(this.controller.peekConfig(), "y");
    let nextX = currentView.x;
    let nextY = currentView.y;
    // panX/panY also gate zoom, so a locked axis can't be moved by wheel/box-zoom.
    if ((axis === "x" || axis === "xy") && this.panX) {
      nextX = zoomRange(nextX, pivot.x, factor, specX.scale);
    }
    if ((axis === "y" || axis === "xy") && this.panY) {
      nextY = zoomRange(nextY, pivot.y, factor, specY.scale);
    }
    const clamped = this.geometry.clampZoomRanges({
      nextX,
      nextY,
      currentX: currentView.x,
      currentY: currentView.y,
      pivotX: pivot.x,
      pivotY: pivot.y,
    });
    if (
      !sameRange(clamped.x, currentView.x) ||
      !sameRange(clamped.y, currentView.y)
    ) {
      this.controller.view.set(clamped);
    }
  }

  private pickAtPx(px: number, py: number): PickingHit | null {
    const renderState = this.geometry.getRenderState();
    const transform = this.geometry.getTransform();
    if (!renderState || !transform || !this.insidePlot(px, py)) return null;
    const value = pxToValue(transform, px, py);
    const tol = this.toleranceValue(HIT_TEST_TOLERANCE_PX);
    return pickScene(
      renderState.scene.picking,
      value.x,
      value.y,
      tol.tolx,
      tol.toly,
      this.selectedObjectId,
    );
  }

  private recomputeHoverFromPointer(opts?: { hitTest?: boolean; snap?: boolean }): void {
    if (!this.lastPointer) return;
    if (!this.geometry.getTransform() || !this.geometry.getRenderState()) {
      this.hover = null;
      this.seriesHover = null;
      return;
    }
    const px = this.crosshair.locked ? this.crosshair.px : this.lastPointer.x;
    const py = this.crosshair.locked ? this.crosshair.py : this.lastPointer.y;
    if (!this.insidePlot(px, py)) {
      if (this.hover || this.seriesHover) {
        this.hover = null;
        this.seriesHover = null;
        this.invalidate("overlay");
      }
      // Broadcast a "left the plot" cursor once so linked followers clear their
      // crosshair too — even mid-gesture, when no pointerleave fires. Without
      // this the follower would freeze at the last in-bounds position while a pan
      // keeps scrolling. We only emit on the inside→outside transition.
      if (this.cursorVisible) this.emitCursorAndHover(px, py, false);
      return;
    }
    if (opts?.hitTest !== false) {
      const next = this.pickAtPx(px, py);
      if (!isSamePickingHit(next, this.hover)) {
        this.hover = next;
        this.invalidate("overlay");
      }
    }
    this.emitCursorAndHover(px, py, opts?.snap !== false);
  }

  private emitCursorAndHover(px: number, py: number, snap: boolean): void {
    const config = this.controller.peekConfig();
    const transform = this.geometry.getTransform();
    if (!transform || !this.geometry.getRenderState()) return;
    const pointPx = this.crosshair.locked
      ? { x: this.crosshair.px, y: this.crosshair.py }
      : { x: px, y: py };
    const inside = this.insidePlot(pointPx.x, pointPx.y);
    const value = inside ? pxToValue(transform, pointPx.x, pointPx.y) : undefined;
    const rawSeriesHits = inside && value && snap ? this.snapSeriesHits(value.x) : undefined;
    if (!isSameSeriesHover(this.seriesHover, rawSeriesHits ?? null)) {
      this.seriesHover = rawSeriesHits ?? null;
      this.invalidate("overlay");
    }

    const hit = inside ? this.hitInfo(this.hover) : undefined;
    const seriesHitsInfo =
      rawSeriesHits && rawSeriesHits.length ? this.enrichSeriesHits(rawSeriesHits) : undefined;
    const formatted =
      config.showCrosshairLabels && value
        ? this.formatValue(value)
        : undefined;
    this.cursorVisible = inside;
    this.events.emit("cursor", {
      inside,
      px: pointPx,
      value,
      hit,
      seriesHits: seriesHitsInfo,
      formatted,
      plotBounds: this.plotBounds(),
    });
    if (inside && value) {
      this.events.emit("hover", {
        px: pointPx,
        value,
        hit,
        seriesHits: seriesHitsInfo,
      });
    }
  }

  private hitInfo(hit: PickingHit | null): HitInfo | undefined {
    if (!hit) return undefined;
    if (hit.kind === "series-point") {
      const record = this.controller.model.getSeries(hit.seriesId);
      return {
        ...hit,
        seriesName: record?.name,
        color: record?.style.color,
        datum: this.controller.series.getDatum(hit.seriesId, hit.index) ?? undefined,
      };
    }
    return hit;
  }

  private enrichSeriesHits(hits: readonly SeriesHit[]): SeriesHitInfo[] {
    const out: SeriesHitInfo[] = [];
    for (let i = 0; i < hits.length; i += 1) {
      const info = this.hitInfo(hits[i] ?? null);
      if (info && info.kind === "series-point") out.push(info);
    }
    return out;
  }

  private snapSeriesHits(absX: number): SeriesHit[] | undefined {
    const tolx = this.toleranceValue(SNAP_TOLERANCE_PX).tolx;
    const hits: SeriesHit[] = [];
    this.controller.model.forEachSeries((record) => {
      if (!record.style.visible) return;
      if (record.kind === BuiltInSeriesKinds.scatter || record.kind === BuiltInSeriesKinds.band) {
        return;
      }
      const index = this.snapSeriesIndex(record, absX, tolx);
      if (index < 0) return;
      hits.push({
        kind: "series-point",
        seriesId: record.id,
        index,
      });
    });
    return hits.length ? hits : undefined;
  }

  private snapSeriesIndex(
    record: SeriesRecord<unknown>,
    absX: number,
    tolx: number,
  ): number {
    if (!isStoreBackedState(record.state)) return -1;
    const relX = absX - record.state.offsetX;
    const store = record.state.store;
    const count = store.count;
    if (count <= 0) return -1;
    const minX = store.x[0] ?? 0;
    const maxX = store.x[count - 1] ?? 0;
    if (relX < minX - tolx || relX > maxX + tolx) return -1;
    return nearestIndex(store.x, relX, count);
  }

  private formatValue(value: { x: number; y: number }): { x: string; y: string } {
    const config = this.controller.peekConfig();
    const viewport = this.geometry.getViewport();
    const xSpec = getConfiguredAxisSpec(config, "x");
    const ySpec = getConfiguredAxisSpec(config, "y");
    return {
      x: formatAxisValue({
        axis: "x",
        value: value.x,
        step: resolveAxisStep({
          range: this.controller.peekView().x,
          spanPx: viewport.plot.size.width,
          spacingPx: config.gridSpacing[0],
          spec: xSpec,
        }),
        spec: xSpec,
      }),
      y: formatAxisValue({
        axis: "y",
        value: value.y,
        step: resolveAxisStep({
          range: this.controller.peekView().y,
          spanPx: viewport.plot.size.height,
          spacingPx: config.gridSpacing[1],
          spec: ySpec,
        }),
        spec: ySpec,
      }),
    };
  }

  private emitClick(button: PointerButton, px: number, py: number): void {
    const transform = this.geometry.getTransform();
    if (!transform || !this.insidePlot(px, py)) return;
    const value = pxToValue(transform, px, py);
    const event: ClickEvent = {
      px: { x: px, y: py },
      value,
      button,
      hit: this.hitInfo(this.pickAtPx(px, py) ?? this.hover),
    };
    this.events.emit("click", event);
  }

  private updateCrosshair(px: number, py: number): void {
    if (!this.geometry.getRenderState()) return;
    if (this.crosshair.locked) {
      if (!this.crosshair.enabled) {
        this.crosshair.enabled = true;
        this.invalidate("overlay");
      }
      return;
    }
    const inside = this.insidePlot(px, py);
    if (!inside) {
      if (this.crosshair.enabled) {
        this.crosshair.enabled = false;
        this.invalidate("overlay");
      }
      return;
    }
    if (
      !this.crosshair.enabled ||
      this.crosshair.px !== px ||
      this.crosshair.py !== py ||
      this.crosshair.axis !== "xy"
    ) {
      this.crosshair.enabled = true;
      this.crosshair.px = px;
      this.crosshair.py = py;
      this.crosshair.axis = "xy";
      this.invalidate("overlay");
    }
  }

  private plotBounds(): RenderLayout["plot"] {
    return this.geometry.getPlotBounds();
  }
}
