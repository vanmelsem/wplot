import { Bounds, Layout, Range } from "../core/core";
import { PlotConfigUpdate, Model } from "../core/model";
import {
  SeriesId,
  SeriesInput,
  SeriesView,
  SeriesRegistry,
  ItemRegistry,
  ItemId,
  ItemInput,
  ItemRecord,
  LineSeries,
  StepSeries,
  ScatterSeries,
  BarsSeries,
  BandSeries,
  CandlesSeries,
  GuideHLine,
  GuideVLine,
  RectItem,
  XBandItem,
  YBandItem,
} from "../core/adapters";
import { SceneBuilder } from "../core/scene";
import {
  Engine,
  Dirty,
  Modifiers,
  PlotEvents,
  Tool,
  PanZoomTool,
  PickTool,
  ResetTool,
  SelectTool,
  DragHandleTool,
} from "../core/engine";
import { Action } from "../core/actions";
import { LinkGroup, LinkOptions } from "../core/link";
import {
  WebGpuRenderer,
  GpuContext,
  createGpuContext,
} from "./render/webgpu/renderer";
import { TextRenderer } from "./render/text/renderer";
import { DomRuntime } from "./runtime/runtime";

export type PlotInit = {
  canvas: HTMLCanvasElement;
  textCanvas: HTMLCanvasElement;
  initialWorld: { x: Range; y: Range };
  config?: PlotConfigUpdate;
  gpu?: GpuContext | null;
  tools?: Tool[];
  seriesRegistry?: SeriesRegistry;
  itemRegistry?: ItemRegistry;
  link?: { group: LinkGroup } & LinkOptions;
};

export class Plot {
  constructor(
    private impl: { engine: Engine; runtime: DomRuntime; model: Model },
  ) {}

  start() {
    this.impl.runtime.start();
  }

  stop() {
    this.impl.runtime.stop();
  }

  dispose() {
    this.impl.runtime.dispose();
  }

  view = {
    set: (ranges: { x: Range; y: Range }) =>
      this.impl.engine.dispatch({
        type: "VIEW/SET_RANGES",
        x: ranges.x,
        y: ranges.y,
        emit: true,
      }),
    reset: () => this.impl.engine.dispatch({ type: "VIEW/RESET", emit: true }),
  };

  style = {
    config: (patch: PlotConfigUpdate) =>
      this.impl.engine.dispatch({ type: "MODEL/SET_CONFIG", patch }),
  };

  series = {
    add: (name: string, input: SeriesInput, style?: any): SeriesId => {
      const id = this.impl.model.addSeries(name, input, style);
      this.impl.engine.invalidate(Dirty.Series);
      return id;
    },
    append: (id: SeriesId, payload: unknown): boolean => {
      const ok = this.impl.model.append(id, payload);
      if (ok) this.impl.engine.invalidate(Dirty.Series);
      return ok;
    },
    set: (id: SeriesId, input: SeriesInput): boolean => {
      const ok = this.impl.model.setSeriesData(id, input);
      if (ok) this.impl.engine.invalidate(Dirty.Series);
      return ok;
    },
    write: (id: SeriesId, input: SeriesInput): boolean => {
      const ok = this.impl.model.writeSeriesData(id, input);
      if (ok) this.impl.engine.invalidate(Dirty.Series);
      return ok;
    },
    visible: (id: SeriesId, on: boolean) =>
      this.impl.engine.dispatch({
        type: "MODEL/SET_SERIES_VISIBLE",
        id,
        on,
      }),
    list: (): readonly SeriesView[] => this.impl.model.listSeries(),
    datum: (id: SeriesId, index: number): unknown | null =>
      this.impl.model.getDatum(id, index),
  };

  items = {
    add: (input: ItemInput, style?: Record<string, unknown>): ItemId => {
      const id = this.impl.model.addItem(input, style);
      this.impl.engine.invalidate(Dirty.Items);
      return id;
    },
    update: (
      id: ItemId,
      patch: Partial<{
        data: unknown;
        style: Record<string, unknown>;
        visible: boolean;
      }>,
    ) => {
      const ok = this.impl.model.updateItem(id, patch);
      if (ok) this.impl.engine.invalidate(Dirty.Items);
      return ok;
    },
    remove: (id: ItemId) => {
      const ok = this.impl.model.removeItem(id);
      if (ok) this.impl.engine.invalidate(Dirty.Items);
      return ok;
    },
    list: (): readonly ItemRecord[] => this.impl.model.listItems(),
    get: (id: ItemId) => this.impl.model.getItem(id),
  };

  actions = {
    setEnabled: (on: boolean) => this.impl.engine.setActionsEnabled(on),
  };

  coords = {
    screenToWorld: (sx: number, sy: number) =>
      this.impl.engine.screenToWorld(sx, sy),
    plotRect: () => ({ ...this.impl.engine.view.plot }) as Bounds<number>,
  };

  subscribe<K extends keyof PlotEvents>(
    type: K,
    cb: (ev: PlotEvents[K]) => void,
  ) {
    return this.impl.engine.events.subscribe(type, cb);
  }
}

export function createPlot(init: PlotInit): Plot {
  const seriesRegistry = init.seriesRegistry ?? new SeriesRegistry();
  if (!init.seriesRegistry) {
    seriesRegistry.register(LineSeries);
    seriesRegistry.register(StepSeries);
    seriesRegistry.register(ScatterSeries);
    seriesRegistry.register(BarsSeries);
    seriesRegistry.register(BandSeries);
    seriesRegistry.register(CandlesSeries);
  }

  const itemRegistry = init.itemRegistry ?? new ItemRegistry();
  if (!init.itemRegistry) {
    itemRegistry.register(GuideHLine);
    itemRegistry.register(GuideVLine);
    itemRegistry.register(RectItem);
    itemRegistry.register(XBandItem);
    itemRegistry.register(YBandItem);
  }

  const model = new Model({
    registry: seriesRegistry,
    itemRegistry,
    initialWorld: init.initialWorld,
    config: init.config,
  });

  const defaultTools: Tool[] = [
    new DragHandleTool(),
    new PanZoomTool(),
    new PickTool(),
    new SelectTool(),
    new ResetTool(),
  ];
  const tools = init.tools ?? defaultTools;

  const initialViewport = {
    world: { x: { ...init.initialWorld.x }, y: { ...init.initialWorld.y } },
    dpr: 1,
    canvas: { width: 1, height: 1 },
    plot: { origin: { x: 0, y: 0 }, size: { width: 1, height: 1 } },
  };

  const engine = new Engine({ model, initialViewport, tools });
  const sceneBuilder = new SceneBuilder();

  const rendererGpu = new WebGpuRenderer(init.gpu ?? null);
  if (!init.gpu) {
    createGpuContext(init.canvas).then((ctx) => {
      if (!ctx) return;
      rendererGpu.setGpu(ctx);
      engine.invalidate(Dirty.View | Dirty.Layout);
    });
  }
  const rendererText = new TextRenderer(init.textCanvas);
  const runtime = new DomRuntime({
    primaryCanvas: init.canvas,
    textCanvas: init.textCanvas,
    engine,
    sceneBuilder,
    rendererGpu,
    rendererText,
  });

  if (init.link) {
    init.link.group.register(engine, init.link);
  }

  return new Plot({ engine, runtime, model });
}

export type { PlotEvents, Action, Modifiers, Layout };
