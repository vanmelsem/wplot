import type { NumericRange as Range } from "../core/domain/view";
import type { RenderLayout as Layout } from "../core/render/layout";
import type { Bounds, Color, Px } from "../core/shared/geometry";
import type {
  CustomObjectInput,
  CustomSeriesInput,
  ObjectId,
  ObjectInput,
  ObjectKind,
  ObjectRecord,
  ObjectStatePatch,
  SeriesId,
  SeriesInput,
  SeriesView,
} from "./contracts";
import {
  createPlotController,
  type PlotController,
} from "../core/api/controller";
import type { AxisDef, PlotConfigUpdate } from "../core/domain/config";
import type { ObjectRecord as CoreObjectRecord } from "../core/domain/objects";
import { InteractionController } from "../core/interaction/controller";
import type { Modifiers } from "../core/interaction/contracts";
import type {
  CursorEvent,
  HitInfo,
  PlotEventMap as PlotEvents,
} from "../core/interaction/events";
import {
  DomRuntime,
  type Layer,
  type LayerFrame,
  type OverlayPainter,
} from "../core/runtime/dom_runtime";
import type { ObjectExtension, SeriesExtension } from "../core/api/extension";
import type { Plugin } from "./plugin";
import { LinkGroup, LinkOptions } from "./link";
import { type PlotTheme, themeToConfig } from "./theme";

export type PlotInit = {
  host: HTMLElement;
  /**
   * Initial view ranges. Optional — omit it to start at a unit range and call
   * `plot.view.fit()` after adding series to auto-fit to the data.
   */
  initialValue?: { x: Range; y: Range };
  config?: PlotConfigUpdate;
  link?: { group: LinkGroup } & LinkOptions;
  plugins?: readonly Plugin[];
};

const DEFAULT_INITIAL_VALUE: { x: Range; y: Range } = {
  x: { min: 0, max: 1 },
  y: { min: 0, max: 1 },
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

function cloneBounds(bounds?: Bounds<Px>): Bounds<Px> {
  if (bounds) {
    return {
      origin: { x: bounds.origin.x, y: bounds.origin.y },
      size: { width: bounds.size.width, height: bounds.size.height },
    };
  }
  return {
    origin: { x: 0, y: 0 },
    size: { width: 1, height: 1 },
  };
}

function toPublicObjectRecord(record: CoreObjectRecord<unknown>): ObjectRecord {
  return {
    id: record.id as ObjectId,
    kind: record.kind as ObjectKind,
    state: record.state as ObjectRecord["state"],
    visible: record.visible,
    locked: record.locked,
  };
}

function createCanvasStack(host: HTMLElement): {
  layerCanvas: HTMLCanvasElement;
  primaryCanvas: HTMLCanvasElement;
  textCanvas: HTMLCanvasElement;
  overlayCanvas: HTMLCanvasElement;
} {
  const layerCanvas = document.createElement("canvas");
  const primaryCanvas = document.createElement("canvas");
  const textCanvas = document.createElement("canvas");
  const overlayCanvas = document.createElement("canvas");
  layerCanvas.className = "layer-canvas";
  primaryCanvas.className = "plot-canvas";
  textCanvas.className = "text-canvas";
  overlayCanvas.className = "overlay-canvas";
  layerCanvas.setAttribute("aria-hidden", "true");
  textCanvas.setAttribute("aria-hidden", "true");
  overlayCanvas.setAttribute("aria-hidden", "true");

  // The plot is a stack of absolutely-positioned canvases inside the host. The
  // library owns this stacking (no consumer CSS required): backdrop layer (e.g.
  // a heatmap) at the bottom, then the primary series/grid canvas, then axis
  // text, then the interaction overlay (crosshair, selection, handles) on top.
  // Only the primary canvas takes pointer input — the others are pass-through —
  // so the runtime's listeners on it receive events through the layers above.
  const stack: Array<[HTMLCanvasElement, number, boolean]> = [
    [layerCanvas, 0, false],
    [primaryCanvas, 1, true],
    [textCanvas, 2, false],
    [overlayCanvas, 3, false],
  ];
  for (const [canvas, z, interactive] of stack) {
    canvas.style.position = "absolute";
    canvas.style.left = "0";
    canvas.style.top = "0";
    canvas.style.zIndex = String(z);
    if (!interactive) canvas.style.pointerEvents = "none";
  }
  if (host.style.position === "") {
    host.style.position = "relative";
  }
  host.append(layerCanvas, primaryCanvas, textCanvas, overlayCanvas);
  return { layerCanvas, primaryCanvas, textCanvas, overlayCanvas };
}

export class Plot {
  private readonly pluginTeardowns: Array<() => void> = [];

  constructor(private readonly impl: PlotImpl) {}

  /** Install a plugin. Its teardown (if returned) runs on {@link dispose}. */
  use(plugin: Plugin): this {
    const teardown = plugin.setup(this);
    if (teardown) this.pluginTeardowns.push(teardown);
    return this;
  }

  /**
   * Register an overlay painter, invoked on the overlay canvas every frame in
   * CSS-pixel space. Returns a disposer. This is the sanctioned surface for
   * tooltips, custom markers, and other plugin-drawn decoration.
   */
  onDraw(painter: OverlayPainter): () => void {
    return this.impl.runtime.addOverlayPainter(painter);
  }

  /**
   * Register a render layer, drawn every frame on a dedicated canvas stacked
   * BEHIND the series (a backdrop). The layer owns its own rendering context
   * (WebGPU or 2D) on `frame.canvas` and is handed the per-frame transform so it
   * can stay pixel-aligned on pan/zoom. Returns a disposer. This is the seam used
   * by big-data raster extensions such as the WebGPU heatmap.
   */
  addLayer(layer: Layer): () => void {
    return this.impl.runtime.addLayer(layer);
  }

  /**
   * Request a re-render on the next animation frame. Plugins call this after
   * asynchronous state becomes ready (e.g. a WebGPU device finishing init) so
   * their layer/overlay paints without waiting for the next pointer event.
   */
  redraw(): void {
    this.impl.runtime.requestFrame("full");
  }

  /**
   * Render synchronously this instant, bypassing the rAF scheduler. Use from an
   * external animation loop (live streaming) that drives its own
   * requestAnimationFrame and wants to draw every frame — the request-coalescing
   * scheduler otherwise renders every other frame when poked from another rAF.
   */
  renderNow(): void {
    this.impl.runtime.renderNow();
  }

  /** Register a custom series kind (model + scene adapters). */
  registerSeries(extension: SeriesExtension): void {
    this.impl.controller.registerSeries(extension);
  }

  /** Register a custom annotation object kind (model + scene adapters). */
  registerObject(extension: ObjectExtension): void {
    this.impl.controller.registerObject(extension);
  }

  start(): void {
    this.impl.runtime.start();
  }

  stop(): void {
    this.impl.runtime.stop();
  }

  dispose(): void {
    for (let i = this.pluginTeardowns.length - 1; i >= 0; i -= 1) {
      try {
        this.pluginTeardowns[i]!();
      } catch {
        // Plugin teardown must not block disposal of the plot.
      }
    }
    this.pluginTeardowns.length = 0;
    this.impl.unlink?.();
    this.impl.runtime.dispose();
    this.impl.controller.dispose();
    if (this.impl.layerCanvas.parentElement === this.impl.host) {
      this.impl.host.removeChild(this.impl.layerCanvas);
    }
    if (this.impl.primaryCanvas.parentElement === this.impl.host) {
      this.impl.host.removeChild(this.impl.primaryCanvas);
    }
    if (this.impl.textCanvas.parentElement === this.impl.host) {
      this.impl.host.removeChild(this.impl.textCanvas);
    }
    if (this.impl.overlayCanvas.parentElement === this.impl.host) {
      this.impl.host.removeChild(this.impl.overlayCanvas);
    }
  }

  batch<T>(txn: () => T): T {
    return this.impl.controller.batch(txn);
  }

  view = {
    get: (): { x: Range; y: Range } => this.impl.controller.view.get(),
    set: (ranges: { x: Range; y: Range }) => this.impl.controller.view.set(ranges),
    reset: () => this.impl.controller.view.reset(),
    /**
     * Auto-fit the view to the data bounds of all visible series (so you don't
     * have to know the ranges up front). `padY` defaults to 5%, `padX` to 0.
     * Call after adding/replacing series. Returns false if there's no data.
     */
    fit: (opts?: { padX?: number; padY?: number }): boolean => {
      const changed = this.impl.controller.view.fit(opts);
      if (changed) this.impl.runtime.requestFrame();
      return changed;
    },
  };

  cursor = {
    get: (): CursorEvent => this.impl.interaction.getCursorState(),
  };

  config = {
    get: () => this.impl.controller.config.get(),
    update: (patch: PlotConfigUpdate) => {
      const next = this.impl.controller.config.update(patch);
      this.impl.runtime.requestFrame();
      return next;
    },
  };

  /**
   * Apply a semantic {@link PlotTheme} in one call — it expands to the
   * underlying color config (grid, crosshair, axis text/lines, backgrounds,
   * border). Omitted theme fields leave the current config untouched.
   */
  theme = {
    set: (theme: PlotTheme) => this.config.update(themeToConfig(theme)),
  };

  /**
   * Secondary y-axes declared via `config.yAxes`. `get` reads an axis range,
   * `set` overrides it (shares the primary x-axis; vertical only).
   */
  axes = {
    get: (id: string): Range | null => this.impl.controller.axes.get(id),
    set: (id: string, range: Range): boolean => {
      const ok = this.impl.controller.axes.set(id, range);
      if (ok) this.impl.runtime.requestFrame();
      return ok;
    },
  };

  series = {
    add: (
      name: string,
      input: SeriesInput | CustomSeriesInput,
      style?: Partial<{ color: Color; yAxisId: string }>,
    ): SeriesId => {
      const id = this.impl.controller.series.add(
        name,
        input as { kind: string },
        style,
      );
      this.impl.runtime.requestFrame();
      return id as SeriesId;
    },
    append: (id: SeriesId, payload: unknown): boolean => {
      const ok = this.impl.controller.series.append(id, payload);
      if (ok) this.impl.runtime.requestFrame();
      return ok;
    },
    appendMany: (id: SeriesId, payloads: readonly unknown[]): boolean => {
      const ok = this.impl.controller.series.appendMany(id, payloads);
      if (ok) this.impl.runtime.requestFrame();
      return ok;
    },
    setData: (id: SeriesId, input: SeriesInput | CustomSeriesInput): boolean => {
      const ok = this.impl.controller.series.setData(id, input as { kind: string });
      if (ok) this.impl.runtime.requestFrame();
      return ok;
    },
    setVisible: (id: SeriesId, on: boolean): boolean => {
      const ok = this.impl.controller.series.setVisible(id, on);
      if (ok) this.impl.runtime.requestFrame();
      return ok;
    },
    remove: (id: SeriesId): boolean => {
      const ok = this.impl.controller.series.remove(id);
      if (ok) this.impl.runtime.requestFrame();
      return ok;
    },
    list: (): readonly SeriesView[] =>
      this.impl.controller.series.list() as readonly SeriesView[],
    getDatum: (id: SeriesId, index: number): unknown | null =>
      this.impl.controller.series.getDatum(id, index),
  };

  objects = {
    add: (input: ObjectInput | CustomObjectInput): ObjectId => {
      const id = this.impl.controller.objects.add(input);
      this.impl.runtime.requestFrame();
      return id as ObjectId;
    },
    updateState: (id: ObjectId, patch: ObjectStatePatch): boolean => {
      const ok = this.impl.controller.objects.updateState(id, {
        state: patch,
      });
      if (ok) this.impl.runtime.requestFrame();
      return ok;
    },
    setVisible: (id: ObjectId, on: boolean): boolean => {
      const ok = this.impl.controller.objects.setVisible(id, on);
      if (ok) this.impl.runtime.requestFrame();
      return ok;
    },
    setLocked: (id: ObjectId, on: boolean): boolean => {
      const ok = this.impl.controller.objects.setLocked(id, on);
      if (ok) this.impl.runtime.requestFrame();
      return ok;
    },
    remove: (id: ObjectId): boolean => {
      const ok = this.impl.controller.objects.remove(id);
      if (ok) this.impl.runtime.requestFrame();
      return ok;
    },
    list: (): readonly ObjectRecord[] =>
      this.impl.controller.objects.list().map(toPublicObjectRecord),
    get: (id: ObjectId): ObjectRecord | null => {
      const record = this.impl.controller.objects.get(id);
      return record ? toPublicObjectRecord(record) : null;
    },
    select: (id: ObjectId): boolean => {
      const ok = this.impl.interaction.selectObject(id);
      if (ok) this.impl.runtime.requestFrame();
      return ok;
    },
    clearSelection: (): boolean => {
      const ok = this.impl.interaction.clearSelectedObject();
      if (ok) this.impl.runtime.requestFrame();
      return ok;
    },
    getSelected: (): ObjectId | null =>
      this.impl.interaction.getSelectedObjectId() as ObjectId | null,
  };

  interaction = {
    isEnabled: (): boolean => this.impl.interaction.isActionsEnabled(),
    setEnabled: (on: boolean): void => {
      this.impl.interaction.setActionsEnabled(on);
      this.impl.runtime.requestFrame();
    },
    /** Constrain drag-panning to specific axes (e.g. lock X on a live stream). */
    setPanAxes: (x: boolean, y: boolean): void =>
      this.impl.interaction.setPanAxes(x, y),
    /** What shift+drag box-zoom selects: a full rectangle (default), or x/y range. */
    setZoomType: (axis: "x" | "y" | "xy"): void =>
      this.impl.interaction.setZoomType(axis),
    getHover: (): PlotEvents["hover"] | null => this.impl.interaction.getHoverState(),
    getSelection: () => this.impl.interaction.getSelectionState(),
  };

  coords = {
    pxToValue: (px: Px, py: Px) => this.impl.interaction.pxToValue(px, py),
    valueToPx: (x: number, y: number) => this.impl.interaction.valueToPx(x, y),
    canvasSize: (): { width: Px; height: Px } => {
      const viewport = this.impl.interaction.getViewport();
      return {
        width: viewport.canvas.width,
        height: viewport.canvas.height,
      };
    },
    plotSize: (): { width: Px; height: Px } => {
      const viewport = this.impl.interaction.getViewport();
      return {
        width: viewport.plot.size.width,
        height: viewport.plot.size.height,
      };
    },
    bounds: (): Bounds<Px> => {
      const viewport = this.impl.interaction.getViewport();
      return cloneBounds({
        origin: viewport.plot.origin,
        size: viewport.plot.size,
      });
    },
    dpr: (): number => this.impl.interaction.getViewport().dpr,
  };

  subscribe<K extends keyof PlotEvents>(
    type: K,
    cb: (ev: PlotEvents[K]) => void,
  ): () => void {
    return this.impl.interaction.events.subscribe(type, cb);
  }
}

export function createPlot(init: PlotInit): Plot {
  const { layerCanvas, primaryCanvas, textCanvas, overlayCanvas } =
    createCanvasStack(init.host);
  const controller = createPlotController({
    initialValue: init.initialValue ?? DEFAULT_INITIAL_VALUE,
    config: init.config,
  });
  const interaction = new InteractionController(controller);
  const runtime = new DomRuntime({
    primaryCanvas,
    textCanvas,
    overlayCanvas,
    layerCanvas,
    controller,
    interaction,
  });

  const unlink = init.link?.group.register(interaction, init.link);
  const plot = new Plot({
    host: init.host,
    layerCanvas,
    primaryCanvas,
    textCanvas,
    overlayCanvas,
    controller,
    interaction,
    runtime,
    unlink,
  });
  if (init.plugins) {
    for (const plugin of init.plugins) plot.use(plugin);
  }
  return plot;
}

export type { PlotEvents, CursorEvent, HitInfo, Modifiers, Layout, AxisDef };
export type { Layer, LayerFrame };
