import { computeAxisOffset } from "../storage/time_series_store";
import {
  ObjectModelRegistry,
  type ObjectEdit,
  type ObjectHandle,
  type ObjectId,
  type ObjectRecord,
  type ObjectUpdate,
} from "./objects";
import {
  type RgbaColor,
  type SeriesId,
  type SeriesRecord,
  type SeriesStyle,
  SeriesModelRegistry,
} from "./series";
import {
  cloneRange,
  cloneViewValue,
  createViewState,
  resetViewState,
  setViewState,
  type NumericRange,
  type ViewState,
  type ViewValue,
} from "./view";

const DEFAULT_PALETTE: readonly RgbaColor[] = [
  [0.16, 0.63, 0.98, 1],
  [0.97, 0.38, 0.33, 1],
  [0.12, 0.78, 0.42, 1],
  [0.98, 0.76, 0.18, 1],
  [0.58, 0.38, 0.98, 1],
  [0.16, 0.82, 0.82, 1],
  [0.98, 0.55, 0.18, 1],
  [0.8, 0.08, 0.64, 1],
] as const;

export type SeriesListRow = {
  id: SeriesId;
  name: string;
  kind: string;
  color: RgbaColor;
  visible: boolean;
  showInLegend: boolean;
};

export class PlotDomainModel {
  readonly seriesRegistry: SeriesModelRegistry;
  readonly objectRegistry: ObjectModelRegistry;
  readonly axisOffsetX: number;
  readonly axisOffsetY: number;

  private readonly series: Array<SeriesRecord<unknown> | null> = [];
  private readonly objects: Array<ObjectRecord<unknown> | null> = [];
  private readonly view: ViewState;
  private paletteIndex = 0;
  private objectSeq = 0;

  constructor(args: {
    seriesRegistry: SeriesModelRegistry;
    objectRegistry?: ObjectModelRegistry;
    initialValue: { x: NumericRange; y: NumericRange };
    /** Initial ranges for additional y-axes, keyed by axis id. */
    extraYAxes?: ReadonlyArray<{ id: string; min: number; max: number }>;
  }) {
    this.seriesRegistry = args.seriesRegistry;
    this.objectRegistry = args.objectRegistry ?? new ObjectModelRegistry();
    this.axisOffsetX = computeAxisOffset(args.initialValue.x);
    this.axisOffsetY = computeAxisOffset(args.initialValue.y);
    const initial: ViewValue = {
      x: args.initialValue.x,
      y: args.initialValue.y,
    };
    if (args.extraYAxes && args.extraYAxes.length > 0) {
      const extra: Record<string, NumericRange> = {};
      for (const axis of args.extraYAxes) {
        extra[axis.id] = { min: axis.min, max: axis.max };
      }
      initial.extraY = extra;
    }
    this.view = createViewState(initial);
  }

  addSeries(
    name: string,
    input: { kind: string; [key: string]: unknown },
    style?: Partial<Pick<SeriesStyle, "color" | "visible" | "showInLegend">> & {
      yAxisId?: string;
    },
  ): SeriesId {
    const adapter = this.seriesRegistry.get(input.kind);
    const id = this.series.length as SeriesId;
    const record: SeriesRecord<unknown> = {
      id,
      name,
      kind: input.kind,
      style: {
        color: style?.color ?? this.nextPaletteColor(),
        visible: style?.visible ?? true,
        showInLegend: style?.showInLegend ?? true,
      },
      state: adapter.normalize(input, this.normalizeContext()),
    };
    // Only attach yAxisId for a non-default target so primary-axis records stay
    // byte-identical to the pre-multi-axis shape.
    if (style?.yAxisId && style.yAxisId !== "y") {
      record.yAxisId = style.yAxisId;
    }
    this.series.push(record);
    return id;
  }

  appendSeries(id: SeriesId, payload: unknown): boolean {
    const record = this.getSeries(id);
    if (!record) return false;
    const adapter = this.seriesRegistry.get(record.kind);
    if (!adapter.append) return false;
    return adapter.append(record.state, payload, this.normalizeContext());
  }

  appendSeriesMany(id: SeriesId, payloads: readonly unknown[]): boolean {
    const record = this.getSeries(id);
    if (!record) return false;
    if (payloads.length === 0) return true;
    const adapter = this.seriesRegistry.get(record.kind);
    if (adapter.appendMany) {
      return adapter.appendMany(
        record.state,
        payloads,
        this.normalizeContext(),
      );
    }
    if (!adapter.append) return false;
    for (let i = 0; i < payloads.length; i += 1) {
      if (!adapter.append(record.state, payloads[i], this.normalizeContext())) {
        return false;
      }
    }
    return true;
  }

  replaceSeries(
    id: SeriesId,
    input: { kind: string; [key: string]: unknown },
  ): boolean {
    const record = this.getSeries(id);
    if (!record || record.kind !== input.kind) return false;
    const adapter = this.seriesRegistry.get(record.kind);
    if (!adapter.replace) return false;
    return adapter.replace(record.state, input, this.normalizeContext());
  }

  setSeriesVisible(id: SeriesId, visible: boolean): boolean {
    const record = this.getSeries(id);
    if (!record || record.style.visible === visible) return false;
    record.style.visible = visible;
    return true;
  }

  getView(): ViewValue {
    return cloneViewValue(this.view);
  }

  peekView(): Readonly<ViewState> {
    return this.view;
  }

  setView(next: ViewValue): boolean {
    return setViewState(this.view, next);
  }

  resetView(): boolean {
    return resetViewState(this.view);
  }

  /**
   * Combined data bounds across all visible series, or null when nothing has a
   * finite extent (no data, or only infinite-line series). Drives `view.fit()`.
   */
  dataExtent(): { x: NumericRange; y: NumericRange } | null {
    let xMin = Infinity;
    let xMax = -Infinity;
    let yMin = Infinity;
    let yMax = -Infinity;
    let found = false;
    for (let i = 0; i < this.series.length; i += 1) {
      const record = this.series[i];
      if (!record || !record.style.visible) continue;
      const adapter = this.seriesRegistry.get(record.kind);
      const extent = adapter.extent?.(record.state);
      if (!extent) continue;
      found = true;
      if (extent.x.min < xMin) xMin = extent.x.min;
      if (extent.x.max > xMax) xMax = extent.x.max;
      if (extent.y.min < yMin) yMin = extent.y.min;
      if (extent.y.max > yMax) yMax = extent.y.max;
    }
    if (!found || xMin > xMax || yMin > yMax) return null;
    return { x: { min: xMin, max: xMax }, y: { min: yMin, max: yMax } };
  }

  /** Current range of a secondary y-axis, or null if no such axis exists. */
  getExtraYRange(id: string): NumericRange | null {
    const range = this.view.extraY?.[id];
    return range ? cloneRange(range) : null;
  }

  /** Set a secondary y-axis range; returns true when the range actually changed. */
  setExtraYRange(id: string, range: NumericRange): boolean {
    const extra = this.view.extraY;
    const cur = extra?.[id];
    if (!extra || !cur) return false;
    if (cur.min === range.min && cur.max === range.max) return false;
    extra[id] = cloneRange(range);
    return true;
  }

  getSeriesDatum(id: SeriesId, index: number): unknown | null {
    const record = this.getSeries(id);
    if (!record) return null;
    const adapter = this.seriesRegistry.get(record.kind);
    return adapter.readDatum?.(record.state, index) ?? null;
  }

  listSeries(): readonly SeriesListRow[] {
    const out: SeriesListRow[] = [];
    for (let i = 0; i < this.series.length; i += 1) {
      const record = this.series[i];
      if (!record) continue;
      out.push({
        id: record.id,
        name: record.name,
        kind: record.kind,
        color: record.style.color,
        visible: record.style.visible,
        showInLegend: record.style.showInLegend,
      });
    }
    return out;
  }

  getSeries(id: SeriesId): SeriesRecord<unknown> | null {
    return this.series[id] ?? null;
  }

  removeSeries(id: SeriesId): boolean {
    if (!this.series[id]) return false;
    // Null the slot rather than splicing so existing SeriesIds stay stable.
    this.series[id] = null;
    return true;
  }

  forEachSeries(cb: (record: SeriesRecord<unknown>) => void): void {
    for (let i = 0; i < this.series.length; i += 1) {
      const record = this.series[i];
      if (record) cb(record);
    }
  }

  addObject(
    input: { kind: string; locked?: boolean },
    options?: { visible?: boolean; locked?: boolean },
  ): ObjectId {
    const adapter = this.objectRegistry.get(input.kind);
    const id = this.objectSeq as ObjectId;
    this.objectSeq += 1;
    this.objects[id] = {
      id,
      kind: input.kind,
      visible: options?.visible ?? true,
      locked: options?.locked ?? input.locked === true,
      state: adapter.normalize(input),
    };
    return id;
  }

  updateObject(id: ObjectId, update: ObjectUpdate): boolean {
    const record = this.getObject(id);
    if (!record) return false;
    if (update.state !== undefined) {
      const adapter = this.objectRegistry.get(record.kind);
      record.state = adapter.patch
        ? adapter.patch(record.state, update.state)
        : update.state;
    }
    if (update.visible !== undefined) record.visible = update.visible;
    if (update.locked !== undefined) record.locked = update.locked;
    return true;
  }

  applyObjectEdit(id: ObjectId, edit: ObjectEdit): boolean {
    const record = this.getObject(id);
    if (!record || record.locked) return false;
    const adapter = this.objectRegistry.get(record.kind);
    if (!adapter.applyEdit) return false;
    record.state = adapter.applyEdit(record.state, edit);
    return true;
  }

  setObjectVisible(id: ObjectId, visible: boolean): boolean {
    const record = this.getObject(id);
    if (!record || record.visible === visible) return false;
    record.visible = visible;
    return true;
  }

  setObjectLocked(id: ObjectId, locked: boolean): boolean {
    const record = this.getObject(id);
    if (!record || record.locked === locked) return false;
    record.locked = locked;
    return true;
  }

  removeObject(id: ObjectId): boolean {
    if (!this.objects[id]) return false;
    this.objects[id] = null;
    return true;
  }

  getObject(id: ObjectId): ObjectRecord<unknown> | null {
    return this.objects[id] ?? null;
  }

  getObjectHandles(id: ObjectId): readonly ObjectHandle[] {
    const record = this.getObject(id);
    if (!record) return [];
    const adapter = this.objectRegistry.get(record.kind);
    return adapter.handles?.(record.state) ?? [];
  }

  forEachObject(cb: (record: ObjectRecord<unknown>) => void): void {
    for (let i = 0; i < this.objects.length; i += 1) {
      const record = this.objects[i];
      if (record) cb(record);
    }
  }

  private normalizeContext() {
    return {
      axisOffsetX: this.axisOffsetX,
      axisOffsetY: this.axisOffsetY,
    };
  }

  private nextPaletteColor(): RgbaColor {
    const color =
      DEFAULT_PALETTE[this.paletteIndex++ % DEFAULT_PALETTE.length] ??
      DEFAULT_PALETTE[0]!;
    return [color[0], color[1], color[2], color[3]];
  }
}
