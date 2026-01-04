import { Dirty, Engine, Picker } from "../../core/engine";
import { SceneBuilder } from "../../core/scene";
import type { AxisLabelMetrics, AxisGutters } from "../../core/layout";
import { computeAxisGutters } from "../../core/layout";
import { WebGpuRenderer } from "../render/webgpu/renderer";
import { TextRenderer } from "../render/text/renderer";
import { Layout } from "../../core/core";
import { PLOT_TEXT_FONT } from "../render/text/style";

class RuntimePicker implements Picker {
  private lastId = 0;

  constructor(
    private renderer: WebGpuRenderer,
    private engine: Engine,
  ) {}

  pickIdAt(sx: number, sy: number): number {
    this.renderer.requestPick(sx, sy, this.engine.view.dpr);
    this.engine.invalidate(Dirty.Interaction);
    this.lastId = this.renderer.getPickId();
    return this.lastId;
  }

  isPickPending(): boolean {
    return this.renderer.isPickPending();
  }
}

export class DomRuntime {
  private running = false;
  private raf = 0;
  private frameRequested = false;
  private ro: ResizeObserver | null = null;
  private picker: RuntimePicker;
  private lastFrame = 0;
  private resizeTarget: Element | null = null;
  private pendingLayout: Layout | null = null;
  private appliedLayout: Layout | null = null;
  private axisMetrics: { x: AxisLabelMetrics; y: AxisLabelMetrics } | null =
    null;
  private axisGutters: AxisGutters | null = null;
  private textCtx: CanvasRenderingContext2D | null = null;
  private _listeners: Array<[string, EventListener]> | null = null;

  constructor(
    private args: {
      primaryCanvas: HTMLCanvasElement;
      textCanvas: HTMLCanvasElement;
      engine: Engine;
      sceneBuilder: SceneBuilder;
      rendererGpu: WebGpuRenderer;
      rendererText: TextRenderer;
    },
  ) {
    this.picker = new RuntimePicker(this.args.rendererGpu, this.args.engine);
    this.args.engine.setPicker(this.picker);
    this.args.engine.onInvalidate = () => this.requestFrame();
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.attach();
    this.updateLayout();
    this.requestFrame();
  }

  stop() {
    this.running = false;
    cancelAnimationFrame(this.raf);
  }

  dispose() {
    this.stop();
    this.detach();
    this.args.engine.onInvalidate = null;
  }

  private loop = () => {
    if (!this.running) return;
    this.frameRequested = false;
    const frameStart = performance.now();
    const dt = this.lastFrame ? frameStart - this.lastFrame : 0;
    this.lastFrame = frameStart;

    if (this.pendingLayout) {
      this.applyLayout(this.pendingLayout);
      this.pendingLayout = null;
    }

    const buildStart = performance.now();
    const scene = this.args.sceneBuilder.build({
      model: this.args.engine.model,
      engine: this.args.engine,
      measureText: this.measureText,
    });
    const buildMs = performance.now() - buildStart;
    this.args.engine.setPickTable(scene.pickTable ?? null);
    if (scene.axisMetrics) {
      this.axisMetrics = scene.axisMetrics;
      this.maybeUpdateLayoutFromMetrics(scene.axisMetrics);
    }

    if (scene.pickTable && scene.pickTable.length > 1) {
      this.args.rendererGpu.renderPicking(scene);
    }
    this.args.rendererGpu.render(scene);
    const cpuMs = performance.now() - frameStart;
    const gpuMs = this.args.rendererGpu.getGpuMs();
    scene.stats = {
      fps: dt > 0 ? 1000 / dt : 0,
      frameMs: cpuMs,
      cpuMs: buildMs,
      gpuMs,
    };
    this.args.rendererText.render(scene);
    this.args.engine.resetDirty();
  };

  private requestFrame() {
    if (!this.running) return;
    if (this.frameRequested) return;
    this.frameRequested = true;
    this.raf = requestAnimationFrame(this.loop);
  }

  private attach() {
    const canvas = this.args.primaryCanvas;
    const onPointerMove: EventListener = (e) => {
      const ev = e as PointerEvent;
      this.args.engine.pointerMove(ev.offsetX, ev.offsetY, this.modsFrom(ev));
      this.requestFrame();
    };
    const onPointerDown: EventListener = (e) => {
      const ev = e as PointerEvent;
      const button = ev.button === 2 ? "right" : "left";
      this.args.engine.pointerDown(
        button,
        ev.offsetX,
        ev.offsetY,
        this.modsFrom(ev),
      );
      this.requestFrame();
    };
    const onPointerUp: EventListener = (e) => {
      const ev = e as PointerEvent;
      const button = ev.button === 2 ? "right" : "left";
      this.args.engine.pointerUp(
        button,
        ev.offsetX,
        ev.offsetY,
        this.modsFrom(ev),
      );
      this.requestFrame();
    };
    const onWheel: EventListener = (e) => {
      const ev = e as WheelEvent;
      this.args.engine.wheel(
        ev.deltaY,
        ev.offsetX,
        ev.offsetY,
        this.modsFrom(ev),
      );
      this.requestFrame();
    };
    const onDblClick: EventListener = (e) => {
      const ev = e as MouseEvent;
      this.args.engine.doubleClick(ev.offsetX, ev.offsetY, this.modsFrom(ev));
      this.requestFrame();
    };
    const onLeave: EventListener = () => this.args.engine.pointerLeave();

    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointerup", onPointerUp);
    canvas.addEventListener("wheel", onWheel, { passive: true });
    canvas.addEventListener("dblclick", onDblClick);
    canvas.addEventListener("pointerleave", onLeave);

    this.resizeTarget = canvas.parentElement ?? canvas;
    this.ro = new ResizeObserver(() => this.updateLayout());
    this.ro.observe(this.resizeTarget);

    this._listeners = [
      ["pointermove", onPointerMove],
      ["pointerdown", onPointerDown],
      ["pointerup", onPointerUp],
      ["wheel", onWheel],
      ["dblclick", onDblClick],
      ["pointerleave", onLeave],
    ];
  }

  private detach() {
    const canvas = this.args.primaryCanvas;
    if (this._listeners) {
      for (const [type, fn] of this._listeners)
        canvas.removeEventListener(type, fn as any);
      this._listeners = null;
    }
    this.ro?.disconnect();
    this.ro = null;
    this.resizeTarget = null;
  }

  private updateLayout() {
    const canvas = this.args.primaryCanvas;
    const host = canvas.parentElement ?? canvas;
    const rect = host.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    const layout = this.computeLayout(
      rect.width,
      rect.height,
      dpr,
      this.axisMetrics ?? undefined,
    );
    const base = this.pendingLayout ?? this.appliedLayout;
    if (base && this.sameLayout(base, layout)) return;
    this.pendingLayout = layout;
    this.requestFrame();
  }

  private computeLayout(
    w: number,
    h: number,
    dpr: number,
    axisMetrics?: { x: AxisLabelMetrics; y: AxisLabelMetrics },
  ): Layout {
    const cfg = this.args.engine.model.config;
    const margin = cfg.layout.margin;
    const gutters = axisMetrics
      ? computeAxisGutters({
          layout: cfg.layout,
          metricsX: axisMetrics.x,
          metricsY: axisMetrics.y,
          prev: this.axisGutters ?? undefined,
        })
      : {
          left: margin.left,
          right: margin.right,
          top: margin.top,
          bottom: margin.bottom,
        };
    if (axisMetrics) this.axisGutters = gutters;
    const plotW = Math.max(1, w - gutters.left - gutters.right);
    const plotH = Math.max(1, h - gutters.top - gutters.bottom);
    return {
      dpr,
      canvas: { width: w, height: h },
      plot: {
        origin: { x: gutters.left, y: gutters.top },
        size: { width: plotW, height: plotH },
      },
    };
  }

  private sameLayout(a: Layout, b: Layout): boolean {
    return (
      a.dpr === b.dpr &&
      a.canvas.width === b.canvas.width &&
      a.canvas.height === b.canvas.height &&
      a.plot.origin.x === b.plot.origin.x &&
      a.plot.origin.y === b.plot.origin.y &&
      a.plot.size.width === b.plot.size.width &&
      a.plot.size.height === b.plot.size.height
    );
  }

  private applyLayout(layout: Layout) {
    const dpr = layout.dpr;
    const canvas = this.args.primaryCanvas;
    const textCanvas = this.args.textCanvas;

    const cssW = `${layout.canvas.width}px`;
    const cssH = `${layout.canvas.height}px`;
    if (canvas.style.width !== cssW) canvas.style.width = cssW;
    if (canvas.style.height !== cssH) canvas.style.height = cssH;
    if (textCanvas.style.width !== cssW) textCanvas.style.width = cssW;
    if (textCanvas.style.height !== cssH) textCanvas.style.height = cssH;

    const devW = Math.max(1, Math.round(layout.canvas.width * dpr));
    const devH = Math.max(1, Math.round(layout.canvas.height * dpr));
    if (canvas.width !== devW) canvas.width = devW;
    if (canvas.height !== devH) canvas.height = devH;
    if (textCanvas.width !== devW) textCanvas.width = devW;
    if (textCanvas.height !== devH) textCanvas.height = devH;

    this.appliedLayout = layout;
    this.args.engine.dispatch({ type: "VIEW/SET_LAYOUT", layout, emit: true });
  }

  private modsFrom(e: MouseEvent | PointerEvent | WheelEvent) {
    return {
      shift: e.shiftKey,
      ctrl: e.ctrlKey,
      alt: e.altKey,
      meta: e.metaKey,
    };
  }

  private maybeUpdateLayoutFromMetrics(metrics: {
    x: AxisLabelMetrics;
    y: AxisLabelMetrics;
  }) {
    const base = this.pendingLayout ?? this.appliedLayout;
    if (!base) return;
    const layout = this.computeLayout(
      base.canvas.width,
      base.canvas.height,
      base.dpr,
      metrics,
    );
    if (this.sameLayout(base, layout)) return;
    this.pendingLayout = layout;
    this.requestFrame();
  }

  private measureText = (args: { text: string }) => {
    const ctx =
      this.textCtx ?? (this.textCtx = this.args.textCanvas.getContext("2d"));
    if (!ctx) return { width: args.text.length * 6, height: 12 };
    ctx.font = PLOT_TEXT_FONT;
    const metrics = ctx.measureText(args.text);
    const height =
      (metrics.actualBoundingBoxAscent ?? 9) +
      (metrics.actualBoundingBoxDescent ?? 3);
    return { width: metrics.width, height: height || 12 };
  };
}
