import { PlotController } from "../api/controller";
import type { Modifiers, PointerButton } from "../interaction/contracts";
import { InteractionController } from "../interaction/controller";
import type { DrawList } from "../render/contracts";
import {
  DrawListBuilder,
  type DrawListBuildState,
} from "../render/draw_list";
import { runtimeFrameScheduler } from "./frame_scheduler";
import {
  enqueueQueuedInput,
  type QueuedInput,
} from "./input_queue";
import { CanvasRenderer } from "./render/canvas";
import { PLOT_TEXT_FONT, TextRenderer } from "./render/text";
import type { Bounds, Px } from "../shared/geometry";
import type { NumericRange } from "../domain/view";

type RenderPass = "full" | "overlay";

/**
 * The drawing surface handed to plugin overlay painters each frame. Coordinates
 * are CSS pixels (the context transform is pre-scaled by the device pixel ratio),
 * and `valueToPx`/`pxToValue` convert between data space and CSS pixels.
 */
export type OverlayFrame = {
  readonly ctx: CanvasRenderingContext2D;
  valueToPx(x: number, y: number): { x: Px; y: Px };
  pxToValue(px: Px, py: Px): { x: number; y: number } | null;
  readonly bounds: Bounds<Px>;
  readonly view: { x: NumericRange; y: NumericRange };
  readonly dpr: number;
};

/** A plugin-supplied painter invoked on the overlay canvas every frame. */
export type OverlayPainter = (frame: OverlayFrame) => void;

/**
 * The drawing surface handed to render-layer plugins each frame. It carries the
 * same per-frame projection fields as {@link OverlayFrame} (so a layer stays
 * pixel-aligned on pan/zoom) but instead of a 2D context it exposes the dedicated
 * `layer` canvas — the layer owns its own rendering context (WebGPU or 2D). The
 * layer canvas is stacked BEHIND the primary series canvas, so layers render as a
 * backdrop (e.g. a heatmap raster under the series).
 */
export type LayerFrame = Omit<OverlayFrame, "ctx"> & {
  readonly canvas: HTMLCanvasElement;
};

/** A plugin-supplied render layer invoked on the layer canvas every frame. */
export type Layer = {
  draw(frame: LayerFrame): void;
};

export class DomRuntime {
  private running = false;
  private frameRequested = false;
  private inFrame = false;
  private postFrameRequested = false;
  private absorbInvalidateIntoCurrentFrame = false;
  private ro: ResizeObserver | null = null;
  private resizeTarget: Element | null = null;
  private listeners: Array<[string, EventListener]> | null = null;
  private textCtx: CanvasRenderingContext2D | null = null;
  private readonly textMeasureCache = new Map<
    string,
    { width: number; height: number }
  >();
  private lastCursor = "";
  private pointerId: number | null = null;
  private queuedInputs: QueuedInput[] = [];
  private hostElement: HTMLElement | null = null;
  private widthPx = 1;
  private heightPx = 1;
  private pendingRenderPass: RenderPass | null = null;
  private baseState: DrawListBuildState | null = null;
  private lastFrameEndMs = 0;
  private avgFrameMs = 0;
  private avgCpuMs = 0;
  private overlayCtx: CanvasRenderingContext2D | null = null;
  private readonly overlayPainters = new Set<OverlayPainter>();
  private readonly layers = new Set<Layer>();

  readonly interaction: InteractionController;
  readonly drawListBuilder: DrawListBuilder;

  constructor(
    private readonly args: {
      primaryCanvas: HTMLCanvasElement;
      textCanvas: HTMLCanvasElement;
      overlayCanvas: HTMLCanvasElement;
      layerCanvas: HTMLCanvasElement;
      controller: PlotController;
      interaction?: InteractionController;
      drawListBuilder?: DrawListBuilder;
      renderer?: CanvasRenderer;
      rendererText?: TextRenderer;
      rendererOverlayText?: TextRenderer;
    },
  ) {
    this.interaction =
      args.interaction ?? new InteractionController(args.controller);
    this.drawListBuilder = args.drawListBuilder ?? new DrawListBuilder();
    this.renderer = args.renderer ?? new CanvasRenderer(args.primaryCanvas);
    this.rendererText =
      args.rendererText ?? new TextRenderer(args.textCanvas, "static");
    this.rendererOverlayText =
      args.rendererOverlayText ??
      new TextRenderer(args.overlayCanvas, "overlay");
    this.interaction.onInvalidate = (mode) => this.requestFrame(mode);
  }

  private readonly renderer: CanvasRenderer;
  private readonly rendererText: TextRenderer;
  private readonly rendererOverlayText: TextRenderer;

  start(): void {
    if (this.running) return;
    this.running = true;
    this.attach();
    this.requestFrame("full");
  }

  stop(): void {
    this.running = false;
    this.frameRequested = false;
    this.postFrameRequested = false;
    runtimeFrameScheduler.remove(this);
  }

  dispose(): void {
    this.stop();
    this.detach();
    this.interaction.dispose();
  }

  requestFrame(mode: RenderPass = "full"): void {
    if (!this.running) return;
    this.pendingRenderPass =
      this.pendingRenderPass === "full" || mode === "full"
        ? "full"
        : "overlay";
    this.scheduleFrame();
  }

  private scheduleFrame(): void {
    if (!this.running) return;
    if (this.inFrame) {
      if (this.absorbInvalidateIntoCurrentFrame) return;
      this.postFrameRequested = true;
      return;
    }
    if (this.frameRequested) return;
    this.frameRequested = true;
    runtimeFrameScheduler.enqueue(this);
  }

  flushScheduledFrame(): void {
    if (!this.running || !this.frameRequested) return;
    this.frameRequested = false;
    this.inFrame = true;
    this.renderFrame();
    this.inFrame = false;
    if (this.postFrameRequested) {
      this.postFrameRequested = false;
      this.requestFrame();
    }
  }

  /**
   * Render synchronously, right now, bypassing the rAF-coalescing scheduler.
   * For external animation loops (e.g. a live stream driving its own
   * requestAnimationFrame): the request-driven scheduler otherwise renders only
   * every other frame when poked from another rAF callback, capping a 120Hz
   * display at 60. Calling this each tick draws every frame, like a plain scope.
   */
  renderNow(): void {
    if (!this.running || this.inFrame) return;
    if (!this.pendingRenderPass) this.pendingRenderPass = "full";
    // Drop any pending scheduled frame so we don't also render asynchronously.
    this.frameRequested = false;
    runtimeFrameScheduler.remove(this);
    this.inFrame = true;
    this.renderFrame();
    this.inFrame = false;
    if (this.postFrameRequested) {
      this.postFrameRequested = false;
      this.requestFrame();
    }
  }

  private renderFrame(): void {
    if (!this.running) return;
    const frameStartMs = performance.now();
    this.absorbInvalidateIntoCurrentFrame = true;
    this.flushQueuedInputs();
    this.absorbInvalidateIntoCurrentFrame = false;

    const pass = this.pendingRenderPass;
    if (!pass) return;
    this.pendingRenderPass = null;

    const dpr = window.devicePixelRatio || 1;
    const widthPx = this.widthPx;
    const heightPx = this.heightPx;

    const cssW = `${widthPx}px`;
    const cssH = `${heightPx}px`;
    if (this.args.primaryCanvas.style.width !== cssW) {
      this.args.primaryCanvas.style.width = cssW;
    }
    if (this.args.primaryCanvas.style.height !== cssH) {
      this.args.primaryCanvas.style.height = cssH;
    }
    if (this.args.textCanvas.style.width !== cssW) {
      this.args.textCanvas.style.width = cssW;
    }
    if (this.args.textCanvas.style.height !== cssH) {
      this.args.textCanvas.style.height = cssH;
    }
    if (this.args.overlayCanvas.style.width !== cssW) {
      this.args.overlayCanvas.style.width = cssW;
    }
    if (this.args.overlayCanvas.style.height !== cssH) {
      this.args.overlayCanvas.style.height = cssH;
    }
    if (this.args.layerCanvas.style.width !== cssW) {
      this.args.layerCanvas.style.width = cssW;
    }
    if (this.args.layerCanvas.style.height !== cssH) {
      this.args.layerCanvas.style.height = cssH;
    }

    const needsFullRender = pass === "full" || this.baseState === null;
    if (needsFullRender) {
      const built = this.drawListBuilder.buildState({
        controller: this.args.controller,
        widthPx,
        heightPx,
        dpr,
        selectedObjectId: this.interaction.getSelectedObjectId(),
        measureText: this.measureText,
      });
      this.baseState = built;
      this.interaction.setRenderState({
        layout: built.layout,
        scene: built.builtScene,
      });
    }

    const drawList = this.drawListBuilder.decorateWithInteraction(
      this.cloneDrawList(this.baseState!.drawList),
      {
        controller: this.args.controller,
        interaction: this.interaction,
        measureText: this.measureText,
      },
    );
    const config = this.args.controller.peekConfig();
    if (config.showStats) {
      const dtMs =
        this.lastFrameEndMs > 0
          ? Math.max(0, frameStartMs - this.lastFrameEndMs)
          : 0;
      if (dtMs > 0) {
        this.avgFrameMs =
          this.avgFrameMs === 0
            ? dtMs
            : this.avgFrameMs + (dtMs - this.avgFrameMs) * 0.18;
      }
      const cpuMs = Math.max(0, performance.now() - frameStartMs);
      this.avgCpuMs =
        this.avgCpuMs === 0
          ? cpuMs
          : this.avgCpuMs + (cpuMs - this.avgCpuMs) * 0.18;
      const shownFrameMs = this.avgFrameMs > 0 ? this.avgFrameMs : cpuMs;
      drawList.stats = {
        fps: shownFrameMs > 0 ? 1000 / shownFrameMs : 0,
        frameMs: shownFrameMs,
        cpuMs: this.avgCpuMs,
        gpuMs: -1,
      };
    } else {
      drawList.stats = undefined;
    }
    // Render layers paint behind the series (their canvas is stacked below the
    // primary), so invoke them every frame (full and overlay passes) before the
    // primary render.
    this.paintLayers(dpr);
    if (needsFullRender) {
      this.renderer.render(drawList);
      this.rendererText.render(drawList);
    }
    this.rendererOverlayText.render(drawList);
    this.paintOverlay(dpr);
    this.lastFrameEndMs = performance.now();
  }

  /** Register a plugin overlay painter. Returns a disposer. */
  addOverlayPainter(painter: OverlayPainter): () => void {
    this.overlayPainters.add(painter);
    this.requestFrame("overlay");
    return () => {
      this.overlayPainters.delete(painter);
      this.requestFrame("overlay");
    };
  }

  /**
   * Register a render layer painted on the dedicated layer canvas (behind the
   * series) every frame. Returns a disposer.
   */
  addLayer(layer: Layer): () => void {
    this.layers.add(layer);
    this.requestFrame("overlay");
    return () => {
      this.layers.delete(layer);
      this.requestFrame("overlay");
    };
  }

  private paintLayers(dpr: number): void {
    if (this.layers.size === 0) return;
    const viewport = this.interaction.getViewport();
    const frame: LayerFrame = {
      canvas: this.args.layerCanvas,
      valueToPx: (x, y) => this.interaction.valueToPx(x, y),
      pxToValue: (px, py) => this.interaction.pxToValue(px, py),
      bounds: {
        origin: { x: viewport.plot.origin.x, y: viewport.plot.origin.y },
        size: {
          width: viewport.plot.size.width,
          height: viewport.plot.size.height,
        },
      },
      view: this.args.controller.peekView(),
      dpr,
    };
    for (const layer of this.layers) {
      try {
        layer.draw(frame);
      } catch {
        // A misbehaving layer must never break the frame loop.
      }
    }
  }

  private paintOverlay(dpr: number): void {
    if (this.overlayPainters.size === 0) return;
    const ctx =
      this.overlayCtx ??
      (this.overlayCtx = this.args.overlayCanvas.getContext("2d"));
    if (!ctx) return;
    const viewport = this.interaction.getViewport();
    const frame: OverlayFrame = {
      ctx,
      valueToPx: (x, y) => this.interaction.valueToPx(x, y),
      pxToValue: (px, py) => this.interaction.pxToValue(px, py),
      bounds: {
        origin: { x: viewport.plot.origin.x, y: viewport.plot.origin.y },
        size: {
          width: viewport.plot.size.width,
          height: viewport.plot.size.height,
        },
      },
      view: this.args.controller.peekView(),
      dpr,
    };
    for (const paint of this.overlayPainters) {
      ctx.save();
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      try {
        paint(frame);
      } catch {
        // A misbehaving plugin painter must never break the frame loop.
      }
      ctx.restore();
    }
  }

  private attach(): void {
    const canvas = this.args.primaryCanvas;
    this.hostElement = canvas.parentElement;
    this.syncViewportSize();
    if (!canvas.hasAttribute("tabindex")) {
      canvas.tabIndex = 0;
    }
    canvas.style.outline = "none";
    canvas.style.touchAction = "none";

    const onPointerMove: EventListener = (event) => {
      const ev = event as PointerEvent;
      this.enqueueInput({
        kind: "pointermove",
        ...this.localPointFromEvent(ev),
        mods: this.modsFrom(ev),
      });
    };

    const onPointerDown: EventListener = (event) => {
      const ev = event as PointerEvent;
      const button: PointerButton = ev.button === 2 ? "right" : "left";
      const point = this.localPointFromEvent(ev);
      canvas.focus({ preventScroll: true });
      if (this.pointerId == null) {
        this.pointerId = ev.pointerId;
        try {
          canvas.setPointerCapture(ev.pointerId);
        } catch {}
      }
      this.enqueueInput({
        kind: "pointerdown",
        button,
        x: point.x,
        y: point.y,
        inside: point.inside,
        mods: this.modsFrom(ev),
      });
    };

    const onPointerUp: EventListener = (event) => {
      const ev = event as PointerEvent;
      const button: PointerButton = ev.button === 2 ? "right" : "left";
      const point = this.localPointFromEvent(ev);
      if (this.pointerId === ev.pointerId) {
        try {
          canvas.releasePointerCapture(ev.pointerId);
        } catch {}
        this.pointerId = null;
      }
      this.enqueueInput({
        kind: "pointerup",
        button,
        x: point.x,
        y: point.y,
        inside: point.inside,
        mods: this.modsFrom(ev),
      });
    };

    const onWheel: EventListener = (event) => {
      const ev = event as WheelEvent;
      const point = this.localPointFromEvent(ev);
      this.enqueueInput({
        kind: "wheel",
        deltaY: ev.deltaY,
        x: point.x,
        y: point.y,
        inside: point.inside,
        mods: this.modsFrom(ev),
      });
    };

    const onDblClick: EventListener = (event) => {
      const ev = event as MouseEvent;
      const point = this.localPointFromEvent(ev);
      this.enqueueInput({
        kind: "doubleclick",
        x: point.x,
        y: point.y,
        mods: this.modsFrom(ev),
      });
    };

    const onLeave: EventListener = (event) => {
      if (this.pointerId != null) return;
      const ev = event as PointerEvent;
      const rect = canvas.getBoundingClientRect();
      const inside =
        ev.clientX >= rect.left &&
        ev.clientX <= rect.right &&
        ev.clientY >= rect.top &&
        ev.clientY <= rect.bottom;
      if (inside) return;
      this.enqueueInput({ kind: "leave" });
    };

    const onPointerCancel: EventListener = (event) => {
      const ev = event as PointerEvent;
      if (this.pointerId === ev.pointerId) {
        try {
          canvas.releasePointerCapture(ev.pointerId);
        } catch {}
        this.pointerId = null;
      }
      this.enqueueInput({ kind: "cancel" });
    };

    const onLostPointerCapture: EventListener = (event) => {
      const ev = event as PointerEvent;
      if (this.pointerId === ev.pointerId) {
        this.pointerId = null;
      }
    };

    const onKeyDown: EventListener = (event) => {
      const ev = event as KeyboardEvent;
      if (
        ev.key !== "Delete" &&
        ev.key !== "Backspace" &&
        ev.key !== "Escape"
      ) {
        return;
      }
      ev.preventDefault();
      this.enqueueInput({ kind: "keydown", key: ev.key });
    };

    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointerup", onPointerUp);
    canvas.addEventListener("wheel", onWheel, { passive: true });
    canvas.addEventListener("dblclick", onDblClick);
    canvas.addEventListener("pointerleave", onLeave);
    canvas.addEventListener("pointercancel", onPointerCancel);
    canvas.addEventListener("lostpointercapture", onLostPointerCapture);
    canvas.addEventListener("keydown", onKeyDown);

    this.resizeTarget = this.hostElement ?? canvas;
    this.ro = new ResizeObserver(() => {
      this.syncViewportSize();
      this.requestFrame("full");
    });
    this.ro.observe(this.resizeTarget);

    this.listeners = [
      ["pointermove", onPointerMove],
      ["pointerdown", onPointerDown],
      ["pointerup", onPointerUp],
      ["wheel", onWheel],
      ["dblclick", onDblClick],
      ["pointerleave", onLeave],
      ["pointercancel", onPointerCancel],
      ["lostpointercapture", onLostPointerCapture],
      ["keydown", onKeyDown],
    ];
  }

  private detach(): void {
    const canvas = this.args.primaryCanvas;
    if (this.listeners) {
      for (let i = 0; i < this.listeners.length; i += 1) {
        const [type, listener] = this.listeners[i]!;
        canvas.removeEventListener(type, listener as EventListener);
      }
      this.listeners = null;
    }
    this.ro?.disconnect();
    this.ro = null;
    this.resizeTarget = null;
    this.hostElement = null;
    this.baseState = null;
  }

  private enqueueInput(input: QueuedInput): void {
    enqueueQueuedInput(this.queuedInputs, input);
    this.scheduleFrame();
  }

  private flushQueuedInputs(): void {
    if (this.queuedInputs.length === 0) return;
    for (let i = 0; i < this.queuedInputs.length; i += 1) {
      const input = this.queuedInputs[i]!;
      switch (input.kind) {
        case "pointermove":
          this.interaction.pointerMove(input.x, input.y, input.mods);
          if (input.inside) this.updateCursor(input.x, input.y);
          else this.resetCursor();
          break;
        case "pointerdown":
          this.interaction.pointerDown(
            input.button,
            input.x,
            input.y,
            input.mods,
          );
          if (input.inside) this.updateCursor(input.x, input.y);
          else this.resetCursor();
          break;
        case "pointerup":
          this.interaction.pointerUp(
            input.button,
            input.x,
            input.y,
            input.mods,
          );
          if (input.inside) this.updateCursor(input.x, input.y);
          else {
            this.resetCursor();
            this.interaction.pointerLeave();
          }
          break;
        case "wheel":
          this.interaction.wheel(
            input.deltaY,
            input.x,
            input.y,
            input.mods,
          );
          if (input.inside) this.updateCursor(input.x, input.y);
          else this.resetCursor();
          break;
        case "doubleclick":
          this.interaction.doubleClick(input.x, input.y, input.mods);
          break;
        case "leave":
        case "cancel":
          this.resetCursor();
          this.interaction.pointerLeave();
          break;
        case "keydown": {
          if (input.key === "Escape") {
            this.interaction.clearSelectedObject();
            break;
          }
          if (input.key !== "Delete" && input.key !== "Backspace") break;
          const selectedObjectId = this.interaction.getSelectedObjectId();
          if (selectedObjectId === null) break;
          if (!this.args.controller.objects.remove(selectedObjectId)) break;
          this.interaction.clearSelectedObject();
          break;
        }
      }
    }
    this.queuedInputs.length = 0;
  }

  private cloneDrawList(drawList: DrawList): DrawList {
    return {
      ...drawList,
      grid: drawList.grid,
      series: drawList.series,
      objects: drawList.objects,
      overlays: [...drawList.overlays],
      topOverlays: [...drawList.topOverlays],
      text: [...drawList.text],
      overlayText: [...drawList.overlayText],
      viewport: drawList.viewport,
      scaleStyle: drawList.scaleStyle,
    };
  }

  private updateCursor(px: number, py: number): void {
    const next = this.interaction.cursorForPointer(px, py);
    if (next === this.lastCursor) return;
    this.args.primaryCanvas.style.cursor = next;
    this.lastCursor = next;
  }

  private resetCursor(): void {
    if (!this.lastCursor) return;
    this.args.primaryCanvas.style.cursor = "";
    this.lastCursor = "";
  }

  private modsFrom(event: MouseEvent | PointerEvent | WheelEvent) {
    return {
      shift: event.shiftKey,
      ctrl: event.ctrlKey,
      alt: event.altKey,
      meta: event.metaKey,
    };
  }

  private readonly measureText = (args: { text: string }) => {
    const cached = this.textMeasureCache.get(args.text);
    if (cached) return cached;
    const ctx =
      this.textCtx ?? (this.textCtx = this.args.textCanvas.getContext("2d"));
    if (!ctx) {
      return { width: args.text.length * 6, height: 12 };
    }
    ctx.font = PLOT_TEXT_FONT;
    ctx.textBaseline = "top";
    ctx.textAlign = "left";
    const metrics = ctx.measureText(args.text);
    const ascent =
      metrics.fontBoundingBoxAscent ??
      metrics.actualBoundingBoxAscent ??
      9;
    const descent =
      metrics.fontBoundingBoxDescent ??
      metrics.actualBoundingBoxDescent ??
      3;
    const measured = {
      width: metrics.width,
      height: ascent + descent || 12,
    };
    if (this.textMeasureCache.size >= 512) this.textMeasureCache.clear();
    this.textMeasureCache.set(args.text, measured);
    return measured;
  };

  private localPointFromEvent(
    event: MouseEvent | PointerEvent | WheelEvent,
  ): { x: number; y: number; inside: boolean } {
    const rect = this.args.primaryCanvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    return {
      x,
      y,
      inside:
        event.clientX >= rect.left &&
        event.clientX <= rect.right &&
        event.clientY >= rect.top &&
        event.clientY <= rect.bottom,
    };
  }

  private syncViewportSize(): void {
    const host = this.hostElement;
    if (host) {
      this.widthPx = Math.max(1, host.clientWidth || host.getBoundingClientRect().width || 1);
      this.heightPx = Math.max(1, host.clientHeight || host.getBoundingClientRect().height || 1);
      return;
    }
    const canvas = this.args.primaryCanvas;
    this.widthPx = Math.max(1, canvas.clientWidth || canvas.getBoundingClientRect().width || 1);
    this.heightPx = Math.max(1, canvas.clientHeight || canvas.getBoundingClientRect().height || 1);
  }
}
