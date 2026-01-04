import {
  Bounds,
  Viewport,
  ViewTransform,
  Color,
  buildViewTransform,
  containsBounds,
  screenToWorld,
  panRangesByPixels,
  zoomRange,
} from "./core";
import { Model } from "./model";
import { ItemKinds } from "./adapters";
import { Action } from "./actions";
import {
  AxisContext,
  buildAxisContext,
  formatWorld,
  getAxisSpec,
} from "./axis";

export type Hit =
  | { kind: "series-point"; seriesId: number; index: number }
  | { kind: "item-handle"; itemId: number; handleId: number }
  | { kind: "item"; itemId: number };

export type HitTest = { hit: Hit; dist2: number };

export type PickId = number; // 0 = none, otherwise index into scene.pickTable

export type HitInfo = Hit & {
  seriesName?: string;
  color?: Color;
  datum?: unknown;
};

export type CursorEvent = {
  inside: boolean;
  screen?: { x: number; y: number };
  world?: { x: number; y: number };
  hit?: HitInfo;
  formatted?: { x: string; y: string };
  plotRect?: Bounds<number>;
};

export type PlotEvents = {
  cursor: CursorEvent;
  hover: {
    screen: { x: number; y: number };
    world: { x: number; y: number };
    hit?: HitInfo;
  };
  click: {
    screen: { x: number; y: number };
    world: { x: number; y: number };
    button: "left" | "right";
    hit?: HitInfo;
  };
  view: { x: any; y: any };
};

export type Unsubscribe = () => void;

type Handler<T> = (ev: T) => void;

export class Emitter<TEvents extends Record<string, unknown>> {
  private map = new Map<keyof TEvents, Set<Handler<any>>>();

  subscribe<K extends keyof TEvents>(
    type: K,
    cb: Handler<TEvents[K]>,
  ): Unsubscribe {
    let bucket = this.map.get(type);
    if (!bucket) {
      bucket = new Set();
      this.map.set(type, bucket);
    }
    bucket.add(cb as Handler<any>);
    return () => {
      bucket?.delete(cb as Handler<any>);
    };
  }

  emit<K extends keyof TEvents>(type: K, ev: TEvents[K]): void {
    const bucket = this.map.get(type);
    if (!bucket) return;
    for (const fn of bucket) fn(ev);
  }
}

export enum Dirty {
  None = 0,
  View = 1 << 0,
  Layout = 1 << 1,
  Config = 1 << 2,
  Series = 1 << 3,
  Items = 1 << 4,
  Interaction = 1 << 5,
}

export type Modifiers = {
  shift: boolean;
  ctrl: boolean;
  alt: boolean;
  meta: boolean;
};

export type ToolResult = boolean | void;

export interface Tool {
  pointerMove?(
    ctx: ToolContext,
    sx: number,
    sy: number,
    mods: Modifiers,
  ): ToolResult;
  pointerDown?(
    ctx: ToolContext,
    button: "left" | "right",
    sx: number,
    sy: number,
    mods: Modifiers,
  ): ToolResult;
  pointerUp?(
    ctx: ToolContext,
    button: "left" | "right",
    sx: number,
    sy: number,
    mods: Modifiers,
  ): ToolResult;
  wheel?(
    ctx: ToolContext,
    deltaY: number,
    sx: number,
    sy: number,
    mods: Modifiers,
  ): ToolResult;
  doubleClick?(
    ctx: ToolContext,
    sx: number,
    sy: number,
    mods: Modifiers,
  ): ToolResult;
  leave?(ctx: ToolContext): ToolResult;
}

export type Picker = {
  pickIdAt(sx: number, sy: number): PickId;
  isPickPending?(): boolean;
};

export class ToolContext {
  constructor(
    readonly engine: Engine,
    readonly model: Model,
    readonly picker?: Picker,
  ) {}

  dispatch(action: Action): void {
    this.engine.dispatch(action);
  }

  screenToWorld(sx: number, sy: number) {
    return this.engine.screenToWorld(sx, sy);
  }

  pickIdAt(sx: number, sy: number): PickId {
    return this.picker?.pickIdAt(sx, sy) ?? 0;
  }

  pickHitAt(sx: number, sy: number): Hit | null {
    const id = this.pickIdAt(sx, sy);
    if (id) {
      const picked = this.engine.resolvePick(id);
      if (picked) return picked;
    }
    const w = this.screenToWorld(sx, sy);
    const hit = this.hitTestWorld(w.x, w.y, 6, { includeScatter: true });
    if (hit) return hit.hit;
    if (this.picker?.isPickPending?.()) return this.engine.hover;
    return null;
  }

  hitTestWorld(
    wx: number,
    wy: number,
    tolPx = 6,
    opts?: { includeScatter?: boolean },
  ): HitTest | null {
    const { tolx, toly } = this.engine.toleranceWorld(tolPx);
    return this.model.hitTest(wx, wy, tolx, toly, opts);
  }
}

export class Engine {
  readonly model: Model;
  readonly events = new Emitter<PlotEvents>();
  onInvalidate: (() => void) | null = null;

  view: Viewport;
  transform: ViewTransform;

  cursor = { active: false, x: 0, y: 0 };
  private lastPointer: { sx: number; sy: number } | null = null;
  hover: Hit | null = null;
  selection: null | {
    start: [number, number];
    current: [number, number];
    axis: "x" | "xy";
  } = null;
  crosshair = {
    enabled: false,
    sx: 0,
    sy: 0,
  };
  actionsEnabled = true;

  dirty: Dirty = Dirty.View | Dirty.Layout | Dirty.Config;

  private tools: Tool[];
  private pickTable: readonly (Hit | null)[] | null = null;
  private picker?: Picker;
  private axisCtx: AxisContext | null = null;

  constructor(args: {
    model: Model;
    initialViewport: Viewport;
    tools: Tool[];
  }) {
    this.model = args.model;
    this.view = args.initialViewport;
    this.tools = args.tools;
    this.transform = this.rebuildTransform();
  }

  setPickTable(table: readonly (Hit | null)[] | null): void {
    this.pickTable = table;
  }

  setPicker(picker: Picker | undefined): void {
    this.picker = picker;
  }

  resolvePick(id: PickId): Hit | null {
    if (!id) return null;
    if (!this.pickTable) return null;
    return this.pickTable[id] ?? null;
  }

  setActionsEnabled(enabled: boolean): void {
    if (this.actionsEnabled === enabled) return;
    this.actionsEnabled = enabled;
    if (!enabled) {
      this.hover = null;
      this.selection = null;
      this.invalidate(Dirty.Interaction);
    }
  }

  pointerMove(sx: number, sy: number, mods: Modifiers) {
    this.lastPointer = { sx, sy };
    this.updateCrosshair(sx, sy);
    if (this.actionsEnabled) {
      this.dispatchTools("pointerMove", sx, sy, mods);
    }
    this.emitCursorAndHover(sx, sy);
  }

  pointerDown(
    button: "left" | "right",
    sx: number,
    sy: number,
    mods: Modifiers,
  ) {
    this.lastPointer = { sx, sy };
    this.updateCrosshair(sx, sy);
    if (this.actionsEnabled) {
      this.dispatchTools("pointerDown", button, sx, sy, mods);
    }
    this.emitClick(button, sx, sy);
  }

  pointerUp(button: "left" | "right", sx: number, sy: number, mods: Modifiers) {
    this.updateCrosshair(sx, sy);
    if (this.actionsEnabled) {
      this.dispatchTools("pointerUp", button, sx, sy, mods);
    }
  }

  wheel(deltaY: number, sx: number, sy: number, mods: Modifiers) {
    this.lastPointer = { sx, sy };
    if (!this.actionsEnabled) return;
    this.dispatchTools("wheel", deltaY, sx, sy, mods);
  }

  doubleClick(sx: number, sy: number, mods: Modifiers) {
    if (!this.actionsEnabled) return;
    this.dispatchTools("doubleClick", sx, sy, mods);
  }

  pointerLeave() {
    if (this.actionsEnabled) {
      this.dispatchTools("leave");
    }
    this.lastPointer = null;
    if (this.crosshair.enabled) {
      this.crosshair.enabled = false;
      this.invalidate(Dirty.Interaction);
    }
    if (this.hover) {
      this.hover = null;
      this.invalidate(Dirty.Interaction);
    }
    this.events.emit("cursor", {
      inside: false,
      plotRect: {
        origin: {
          x: this.view.plot.origin.x,
          y: this.view.plot.origin.y,
        },
        size: {
          width: this.view.plot.size.width,
          height: this.view.plot.size.height,
        },
      },
    });
  }

  dispatch(action: Action): void {
    switch (action.type) {
      case "VIEW/SET_RANGES":
        this.applyViewChange(Dirty.View, action.emit, () => {
          this.view.world.x = { ...action.x };
          this.view.world.y = { ...action.y };
        });
        break;

      case "VIEW/SET_LAYOUT":
        this.applyViewChange(Dirty.Layout | Dirty.View, action.emit, () => {
          this.view.dpr = action.layout.dpr;
          this.view.canvas = {
            width: action.layout.canvas.width,
            height: action.layout.canvas.height,
          };
          this.view.plot = {
            origin: {
              x: action.layout.plot.origin.x,
              y: action.layout.plot.origin.y,
            },
            size: {
              width: action.layout.plot.size.width,
              height: action.layout.plot.size.height,
            },
          };
        });
        break;

      case "VIEW/PAN_BY_PX": {
        this.applyViewChange(Dirty.View, action.emit, () => {
          const ranges = panRangesByPixels(
            this.transform,
            action.dx,
            action.dy,
          );
          this.view.world.x = ranges.x;
          this.view.world.y = ranges.y;
        });
        break;
      }

      case "VIEW/ZOOM_AT": {
        this.applyViewChange(Dirty.View, action.emit, () => {
          const pivot = this.screenToWorld(action.sx, action.sy);
          const factor = Math.exp(action.deltaY * 0.001);
          const specX = this.axisSpec("x");
          const specY = this.axisSpec("y");
          if (action.axis === "x" || action.axis === "xy") {
            this.view.world.x = zoomRange(
              this.view.world.x,
              pivot.x,
              factor,
              specX.scale,
            );
          }
          if (action.axis === "y" || action.axis === "xy") {
            this.view.world.y = zoomRange(
              this.view.world.y,
              pivot.y,
              factor,
              specY.scale,
            );
          }
        });
        break;
      }

      case "VIEW/RESET":
        this.applyViewChange(Dirty.View, action.emit, () => {
          this.view.world.x = { ...this.model.resetWorld.x };
          this.view.world.y = { ...this.model.resetWorld.y };
        });
        break;

      case "MODEL/SET_CONFIG":
        this.model.setConfig(action.patch);
        this.invalidate(Dirty.Config);
        break;

      case "MODEL/SET_SERIES_VISIBLE":
        this.model.setSeriesVisible(action.id, action.on);
        this.invalidate(Dirty.Series);
        break;

      case "MODEL/UPDATE_ITEM":
        if (this.model.updateItem(action.id, action.patch))
          this.invalidate(Dirty.Items);
        break;

      case "INTERACTION/SET_CURSOR":
        this.cursor.active = action.active;
        if (action.x != null) this.cursor.x = action.x;
        if (action.y != null) this.cursor.y = action.y;
        this.invalidate(Dirty.Interaction);
        break;

      case "INTERACTION/SET_HOVER":
        this.hover = action.hover;
        this.invalidate(Dirty.Interaction);
        break;

      case "INTERACTION/SET_SELECTION":
        this.selection = action.selection;
        this.invalidate(Dirty.Interaction);
        break;

      case "INTERACTION/SET_CROSSHAIR":
        this.crosshair.enabled = action.enabled;
        if (action.sx != null) this.crosshair.sx = action.sx;
        if (action.sy != null) this.crosshair.sy = action.sy;
        this.invalidate(Dirty.Interaction);
        break;
    }
  }

  private applyViewChange(
    dirty: Dirty,
    emit: boolean | undefined,
    fn: () => void,
  ): void {
    fn();
    this.invalidate(dirty);
    this.rebuildTransform();
    this.recomputeHoverFromPointer({ hitTest: false });
    if (emit) this.emitView();
  }

  invalidate(bits: Dirty): void {
    this.dirty |= bits;
    if (bits & (Dirty.View | Dirty.Layout | Dirty.Config)) {
      this.axisCtx = null;
    }
    this.onInvalidate?.();
  }

  resetDirty(): void {
    this.dirty = Dirty.None;
  }

  screenToWorld(sx: number, sy: number) {
    return screenToWorld(this.transform, sx, sy);
  }

  toleranceWorld(px: number) {
    const ax = this.transform.x as any;
    const ay = this.transform.y as any;
    const tolx = px * Math.abs(ax?.invScale ?? 1);
    const toly = px * Math.abs(ay?.invScale ?? 1);
    return { tolx, toly };
  }

  private getAxisCtx(): AxisContext {
    if (!this.axisCtx) {
      this.axisCtx = buildAxisContext(this.model, this.view);
    }
    return this.axisCtx;
  }

  axisSpec(axis: "x" | "y") {
    return getAxisSpec(this.model, axis);
  }

  formatCrosshairLabel(x: number, y: number): string {
    const axis = this.getAxisCtx();
    const formatted = formatWorld(axis, { x, y });
    return `${formatted.x}, ${formatted.y}`;
  }

  private emitView() {
    this.events.emit("view", {
      x: { ...this.view.world.x },
      y: { ...this.view.world.y },
    });
  }

  private updateCrosshair(sx: number, sy: number): void {
    const inside = containsBounds(this.view.plot, sx, sy);
    if (!inside) {
      if (this.crosshair.enabled) {
        this.crosshair.enabled = false;
        this.invalidate(Dirty.Interaction);
      }
      return;
    }
    if (
      !this.crosshair.enabled ||
      this.crosshair.sx !== sx ||
      this.crosshair.sy !== sy
    ) {
      this.crosshair.enabled = true;
      this.crosshair.sx = sx;
      this.crosshair.sy = sy;
      this.invalidate(Dirty.Interaction);
    }
  }

  private emitCursorAndHover(sx: number, sy: number) {
    const plot = this.view.plot;
    const inside = containsBounds(this.view.plot, sx, sy);
    const screen = { x: sx, y: sy };
    const world = inside ? this.screenToWorld(sx, sy) : undefined;
    const hit = inside ? this.hitInfo(this.hover) : undefined;
    const formatted = world ? formatWorld(this.getAxisCtx(), world) : undefined;

    this.events.emit("cursor", {
      inside,
      screen,
      world,
      hit,
      formatted,
      plotRect: {
        origin: { x: plot.origin.x, y: plot.origin.y },
        size: { width: plot.size.width, height: plot.size.height },
      },
    });
    if (inside) this.events.emit("hover", { screen, world: world!, hit });
  }

  private recomputeHoverFromPointer(opts?: { hitTest?: boolean }): void {
    if (!this.lastPointer) return;
    const { sx, sy } = this.lastPointer;
    const inside = containsBounds(this.view.plot, sx, sy);
    if (!inside) {
      if (this.hover) {
        this.hover = null;
        this.invalidate(Dirty.Interaction);
      }
      return;
    }
    const world = this.screenToWorld(sx, sy);
    if (opts?.hitTest === false) {
      this.emitCursorAndHover(sx, sy);
      return;
    }
    const tol = this.toleranceWorld(6);
    const hit = this.model.hitTest(world.x, world.y, tol.tolx, tol.toly, {
      includeScatter: true,
    });
    const next = hit?.hit ?? null;
    if (next !== this.hover) {
      this.hover = next;
      this.invalidate(Dirty.Interaction);
    }
    this.emitCursorAndHover(sx, sy);
  }

  private emitClick(button: "left" | "right", sx: number, sy: number) {
    const inside = containsBounds(this.view.plot, sx, sy);
    if (!inside) return;
    const screen = { x: sx, y: sy };
    const world = this.screenToWorld(sx, sy);
    const hit = this.hitInfo(this.hover);
    this.events.emit("click", { screen, world, button, hit });
  }

  private hitInfo(hit: Hit | null): HitInfo | undefined {
    if (!hit) return undefined;
    if (hit.kind === "series-point") {
      const s = this.model.getSeries(hit.seriesId);
      if (!s) return hit;
      return {
        ...hit,
        seriesName: s.name,
        color: s.style.color,
        datum: this.model.getDatum(hit.seriesId, hit.index) ?? undefined,
      };
    }
    if (hit.kind === "item" || hit.kind === "item-handle") {
      return hit;
    }
    return hit;
  }

  private rebuildTransform(): ViewTransform {
    const sx = this.axisSpec("x");
    const sy = this.axisSpec("y");
    this.transform = buildViewTransform({
      worldX: this.view.world.x,
      worldY: this.view.world.y,
      originX: this.view.plot.origin.x,
      originY: this.view.plot.origin.y,
      screenW: this.view.plot.size.width,
      screenH: this.view.plot.size.height,
      dpr: this.view.dpr,
      scaleX: sx.scale,
      scaleY: sy.scale,
    });
    return this.transform;
  }

  private dispatchTools(method: keyof Tool, ...args: any[]) {
    const ctx = this.buildToolContext();
    for (const t of this.tools) {
      const fn = t[method] as any;
      if (!fn) continue;
      const handled = fn.call(t, ctx, ...args);
      if (handled) break;
    }
  }

  private buildToolContext() {
    return new ToolContext(this, this.model, this.picker);
  }
}

export class PanZoomTool implements Tool {
  private dragging = false;
  private lastX = 0;
  private lastY = 0;

  pointerDown(
    ctx: ToolContext,
    button: "left" | "right",
    sx: number,
    sy: number,
    _mods: Modifiers,
  ) {
    if (button !== "left") return;
    if (_mods.shift) return;
    this.dragging = true;
    this.lastX = sx;
    this.lastY = sy;
    return true;
  }

  pointerMove(ctx: ToolContext, sx: number, sy: number, _mods: Modifiers) {
    if (!this.dragging) return;
    const dx = sx - this.lastX;
    const dy = sy - this.lastY;
    this.lastX = sx;
    this.lastY = sy;
    ctx.dispatch({ type: "VIEW/PAN_BY_PX", dx, dy, emit: true });
    return;
  }

  pointerUp(_ctx: ToolContext, _button: "left" | "right") {
    if (!this.dragging) return;
    this.dragging = false;
    return true;
  }

  wheel(
    ctx: ToolContext,
    deltaY: number,
    sx: number,
    sy: number,
    mods: Modifiers,
  ) {
    const axis = mods.shift ? "x" : mods.alt ? "y" : "xy";
    ctx.dispatch({ type: "VIEW/ZOOM_AT", deltaY, sx, sy, axis, emit: true });
    return true;
  }
}

export class SelectTool implements Tool {
  private active = false;
  private start: [number, number] = [0, 0];
  private startScreen: [number, number] = [0, 0];
  private currentScreen: [number, number] = [0, 0];

  pointerDown(
    ctx: ToolContext,
    button: "left" | "right",
    sx: number,
    sy: number,
    mods: Modifiers,
  ) {
    if (button !== "left") return;
    if (!mods.shift) return;
    if (!containsBounds(ctx.engine.view.plot, sx, sy)) {
      return;
    }
    const w = ctx.screenToWorld(sx, sy);
    this.active = true;
    this.start = [w.x, w.y];
    this.startScreen = [sx, sy];
    this.currentScreen = [sx, sy];
    ctx.dispatch({
      type: "INTERACTION/SET_SELECTION",
      selection: { start: this.start, current: this.start, axis: "xy" },
    });
    return true;
  }

  pointerMove(ctx: ToolContext, sx: number, sy: number, _mods: Modifiers) {
    if (!this.active) return;
    const w = ctx.screenToWorld(sx, sy);
    this.currentScreen = [sx, sy];
    ctx.dispatch({
      type: "INTERACTION/SET_SELECTION",
      selection: { start: this.start, current: [w.x, w.y], axis: "xy" },
    });
    return true;
  }

  pointerUp(ctx: ToolContext, _button: "left" | "right") {
    if (!this.active) return;
    const sel = ctx.engine.selection;
    const dx = Math.abs(this.startScreen[0] - this.currentScreen[0]);
    const dy = Math.abs(this.startScreen[1] - this.currentScreen[1]);
    const minPx = 6;
    if (sel && dx > minPx && dy > minPx) {
      const xMin = Math.min(sel.start[0], sel.current[0]);
      const xMax = Math.max(sel.start[0], sel.current[0]);
      const yMin = Math.min(sel.start[1], sel.current[1]);
      const yMax = Math.max(sel.start[1], sel.current[1]);
      ctx.dispatch({
        type: "VIEW/SET_RANGES",
        x: { min: xMin, max: xMax },
        y: { min: yMin, max: yMax },
        emit: true,
      });
    }
    this.active = false;
    ctx.dispatch({ type: "INTERACTION/SET_SELECTION", selection: null });
    return true;
  }
}

export class PickTool implements Tool {
  pointerMove(ctx: ToolContext, sx: number, sy: number, _mods: Modifiers) {
    const hit = ctx.pickHitAt(sx, sy);
    ctx.dispatch({ type: "INTERACTION/SET_HOVER", hover: hit });
  }

  pointerDown(
    ctx: ToolContext,
    _button: "left" | "right",
    sx: number,
    sy: number,
    _mods: Modifiers,
  ) {
    const hit = ctx.pickHitAt(sx, sy);
    ctx.dispatch({ type: "INTERACTION/SET_HOVER", hover: hit });
  }
}

export class CrosshairTool implements Tool {
  pointerMove(ctx: ToolContext, sx: number, sy: number, _mods: Modifiers) {
    const inside = containsBounds(ctx.engine.view.plot, sx, sy);
    if (!inside) {
      ctx.dispatch({ type: "INTERACTION/SET_CROSSHAIR", enabled: false });
      return;
    }
    ctx.dispatch({ type: "INTERACTION/SET_CROSSHAIR", enabled: true, sx, sy });
  }

  leave(ctx: ToolContext) {
    ctx.dispatch({ type: "INTERACTION/SET_CROSSHAIR", enabled: false });
  }
}

export class ResetTool implements Tool {
  doubleClick(ctx: ToolContext, _sx: number, _sy: number, _mods: Modifiers) {
    ctx.dispatch({ type: "VIEW/RESET", emit: true });
    return true;
  }
}

export class DragHandleTool implements Tool {
  private active: {
    itemId: number;
    handleId: number;
    start: { x: number; y: number };
  } | null = null;

  pointerDown(
    ctx: ToolContext,
    button: "left" | "right",
    sx: number,
    sy: number,
    _mods: Modifiers,
  ) {
    if (button !== "left") return;
    const hit = ctx.pickHitAt(sx, sy);
    if (!hit || hit.kind !== "item-handle") return;
    const start = ctx.screenToWorld(sx, sy);
    this.active = { itemId: hit.itemId, handleId: hit.handleId, start };
    return true;
  }

  pointerMove(ctx: ToolContext, sx: number, sy: number, _mods: Modifiers) {
    if (!this.active) return;
    const now = ctx.screenToWorld(sx, sy);
    const item = ctx.model.getItem(this.active.itemId);
    if (!item) return true;
    const adapter = ctx.model.itemRegistry.get(item.kind);
    if (!adapter.applyEdit) return true;
    const next = adapter.applyEdit({
      data: item.data,
      edit: {
        kind: "drag-handle",
        handleId: this.active.handleId,
        start: this.active.start,
        now,
        minSize: (() => {
          const tol = ctx.engine.toleranceWorld(2);
          return { x: tol.tolx, y: tol.toly };
        })(),
      },
    });
    if (item.kind === ItemKinds.rect) {
      const rect = next as {
        xMin: number;
        xMax: number;
        yMin: number;
        yMax: number;
      };
      const corners = [
        { id: 0, x: rect.xMin, y: rect.yMin },
        { id: 1, x: rect.xMax, y: rect.yMin },
        { id: 2, x: rect.xMax, y: rect.yMax },
        { id: 3, x: rect.xMin, y: rect.yMax },
      ];
      let bestId = this.active.handleId;
      let bestD = Infinity;
      for (const c of corners) {
        const dx = now.x - c.x;
        const dy = now.y - c.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < bestD) {
          bestD = d2;
          bestId = c.id;
        }
      }
      this.active.handleId = bestId;
    }
    ctx.dispatch({
      type: "MODEL/UPDATE_ITEM",
      id: item.id,
      patch: { data: next },
    });
    return;
  }

  pointerUp(_ctx: ToolContext, _button: "left" | "right") {
    if (!this.active) return;
    this.active = null;
    return true;
  }
}
