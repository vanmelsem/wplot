import {
  createBuiltInObjectModelRegistry,
  createBuiltInSeriesModelRegistry,
} from "../domain/built_ins";
import {
  DefaultPlotConfig,
  clonePlotConfig,
  resolvePlotConfig,
  type PlotConfig,
  type PlotConfigUpdate,
} from "../domain/config";
import { PlotDomainModel } from "../domain/model";
import { ObjectModelRegistry, type ObjectRecord } from "../domain/objects";
import { SeriesModelRegistry, type SeriesStyle } from "../domain/series";
import type { ViewValue } from "../domain/view";
import {
  createBuiltInObjectSceneRegistry,
  createBuiltInSeriesSceneRegistry,
} from "../scene/built_ins";
import { SceneFrameBuilder, type BuildSceneArgs, type BuiltScene } from "../scene/builder";
import { ObjectSceneRegistry, SeriesSceneRegistry } from "../scene/registry";
import type { ObjectExtension, SeriesExtension } from "./extension";
import type { PlotApi, PlotEventMap } from "./plot";

export type PlotControllerInit = {
  initialValue: ViewValue;
  config?: PlotConfigUpdate;
  seriesRegistry?: SeriesModelRegistry;
  objectRegistry?: ObjectModelRegistry;
  seriesSceneRegistry?: SeriesSceneRegistry;
  objectSceneRegistry?: ObjectSceneRegistry;
};

type EventListener<K extends keyof PlotEventMap> = (event: PlotEventMap[K]) => void;

export class PlotController implements PlotApi {
  readonly model: PlotDomainModel;
  readonly sceneBuilder: SceneFrameBuilder;

  private configValue: PlotConfig;
  private readonly listeners = new Map<
    keyof PlotEventMap,
    Set<(event: unknown) => void>
  >();
  private batchDepth = 0;
  private pendingView = false;
  private pendingConfig = false;

  constructor(init: PlotControllerInit) {
    // Resolve config first so declared secondary y-axes seed the model's initial
    // ranges (each defaults to the primary y range when min/max are omitted).
    this.configValue = resolvePlotConfig(DefaultPlotConfig, init.config);
    const extraYAxes = this.configValue.yAxes?.map((axis) => ({
      id: axis.id,
      min: axis.min ?? init.initialValue.y.min,
      max: axis.max ?? init.initialValue.y.max,
    }));
    this.model = new PlotDomainModel({
      seriesRegistry: init.seriesRegistry ?? createBuiltInSeriesModelRegistry(),
      objectRegistry: init.objectRegistry ?? createBuiltInObjectModelRegistry(),
      initialValue: init.initialValue,
      extraYAxes,
    });
    this.sceneBuilder = new SceneFrameBuilder({
      seriesRegistry:
        init.seriesSceneRegistry ?? createBuiltInSeriesSceneRegistry(),
      objectRegistry:
        init.objectSceneRegistry ?? createBuiltInObjectSceneRegistry(),
    });
  }

  start(): void {}

  stop(): void {}

  dispose(): void {
    this.listeners.clear();
  }

  batch<T>(txn: () => T): T {
    this.batchDepth += 1;
    try {
      return txn();
    } finally {
      this.batchDepth -= 1;
      if (this.batchDepth === 0) this.flush();
    }
  }

  readonly view = {
    get: (): ViewValue => this.model.getView(),
    set: (ranges: ViewValue): boolean => {
      const changed = this.model.setView(ranges);
      this.queueView(changed);
      return changed;
    },
    reset: (): boolean => {
      const changed = this.model.resetView();
      this.queueView(changed);
      return changed;
    },
    /**
     * Fit the view to the data bounds of all visible series. `padX`/`padY` add a
     * fraction of each span as margin (padY defaults to 5%). Returns false when
     * there is no finite data to fit (and the view is left unchanged).
     */
    fit: (opts?: { padX?: number; padY?: number }): boolean => {
      const extent = this.model.dataExtent();
      if (!extent) return false;
      const padX = opts?.padX ?? 0;
      const padY = opts?.padY ?? 0.05;
      const xSpan = extent.x.max - extent.x.min || 1;
      const ySpan = extent.y.max - extent.y.min || 1;
      const next = {
        x: {
          min: extent.x.min - xSpan * padX,
          max: extent.x.max + xSpan * padX,
        },
        y: {
          min: extent.y.min - ySpan * padY,
          max: extent.y.max + ySpan * padY,
        },
      };
      const changed = this.model.setView(next);
      this.queueView(changed);
      return changed;
    },
  };

  readonly config = {
    get: (): PlotConfig => clonePlotConfig(this.configValue),
    update: (patch: PlotConfigUpdate): PlotConfig => {
      this.configValue = resolvePlotConfig(this.configValue, patch);
      this.queueConfig(true);
      return clonePlotConfig(this.configValue);
    },
  };

  readonly axes = {
    /** Current range of a secondary y-axis, or null if no such axis exists. */
    get: (id: string) => this.model.getExtraYRange(id),
    /** Set a secondary y-axis range; rebuilds via the standard view path. */
    set: (id: string, range: { min: number; max: number }): boolean => {
      const changed = this.model.setExtraYRange(id, range);
      this.queueView(changed);
      return changed;
    },
  };

  readonly series = {
    add: (
      name: string,
      input: { kind: string; [key: string]: unknown },
      style?: Partial<Pick<SeriesStyle, "color" | "visible" | "showInLegend">> & {
        yAxisId?: string;
      },
    ) => this.model.addSeries(name, input, style),
    append: (id: number, payload: unknown) => this.model.appendSeries(id, payload),
    appendMany: (id: number, payloads: readonly unknown[]) =>
      this.model.appendSeriesMany(id, payloads),
    setData: (id: number, input: { kind: string; [key: string]: unknown }) =>
      this.model.replaceSeries(id, input),
    setVisible: (id: number, visible: boolean) =>
      this.model.setSeriesVisible(id, visible),
    remove: (id: number) => this.model.removeSeries(id),
    list: () => this.model.listSeries(),
    getDatum: (id: number, index: number) => this.model.getSeriesDatum(id, index),
  };

  readonly objects = {
    add: (
      input: { kind: string; locked?: boolean },
      options?: { visible?: boolean; locked?: boolean },
    ) => this.model.addObject(input, options),
    updateState: (id: number, patch: { state?: unknown; visible?: boolean; locked?: boolean }) =>
      this.model.updateObject(id, patch),
    edit: (
      id: number,
      edit: {
        kind: "drag-handle";
        handleId: number;
        startX: number;
        startY: number;
        nowX: number;
        nowY: number;
      } | {
        kind: "drag-object";
        startX: number;
        startY: number;
        nowX: number;
        nowY: number;
      },
    ) => this.model.applyObjectEdit(id, edit),
    setVisible: (id: number, visible: boolean) =>
      this.model.setObjectVisible(id, visible),
    setLocked: (id: number, locked: boolean) =>
      this.model.setObjectLocked(id, locked),
    remove: (id: number) => this.model.removeObject(id),
    list: (): readonly ObjectRecord<unknown>[] => {
      const out: ObjectRecord<unknown>[] = [];
      this.model.forEachObject((record) => {
        out.push(record);
      });
      return out;
    },
    get: (id: number) => this.model.getObject(id),
  };

  registerSeries(extension: SeriesExtension): void {
    if (extension.model.kind !== extension.scene.kind) {
      throw new Error(
        `Series extension kind mismatch: model "${extension.model.kind}" vs scene "${extension.scene.kind}"`,
      );
    }
    this.model.seriesRegistry.register(extension.model);
    this.sceneBuilder.seriesRegistry.register(extension.scene);
  }

  registerObject(extension: ObjectExtension): void {
    if (extension.model.kind !== extension.scene.kind) {
      throw new Error(
        `Object extension kind mismatch: model "${extension.model.kind}" vs scene "${extension.scene.kind}"`,
      );
    }
    this.model.objectRegistry.register(extension.model);
    this.sceneBuilder.objectRegistry.register(extension.scene);
  }

  subscribe<K extends keyof PlotEventMap>(
    type: K,
    cb: EventListener<K>,
  ): () => void {
    let set = this.listeners.get(type);
    if (!set) {
      set = new Set();
      this.listeners.set(type, set);
    }
    set.add(cb as (event: unknown) => void);
    return () => {
      set?.delete(cb as (event: unknown) => void);
      if (set && set.size === 0) this.listeners.delete(type);
    };
  }

  buildScene(args: BuildSceneArgs): BuiltScene {
    return this.sceneBuilder.build(this.model, args);
  }

  peekConfig(): Readonly<PlotConfig> {
    return this.configValue;
  }

  peekView(): Readonly<ViewValue> {
    return this.model.peekView();
  }

  private queueView(changed: boolean): void {
    if (!changed) return;
    if (this.batchDepth > 0) {
      this.pendingView = true;
      return;
    }
    this.emit("view", this.model.getView());
  }

  private flush(): void {
    if (this.pendingConfig) {
      this.pendingConfig = false;
      this.emit("config", clonePlotConfig(this.configValue));
    }
    if (this.pendingView) {
      this.pendingView = false;
      this.emit("view", this.model.getView());
    }
  }

  private queueConfig(changed: boolean): void {
    if (!changed) return;
    if (this.batchDepth > 0) {
      this.pendingConfig = true;
      return;
    }
    this.emit("config", clonePlotConfig(this.configValue));
  }

  private emit<K extends keyof PlotEventMap>(type: K, event: PlotEventMap[K]): void {
    const set = this.listeners.get(type);
    if (!set) return;
    for (const listener of set) {
      listener(event);
    }
  }
}

export function createPlotController(init: PlotControllerInit): PlotController {
  return new PlotController(init);
}
