import { AxisSpec, Color, Edges, Range } from "./core";
import {
  SeriesId,
  SeriesRecord,
  SeriesInput,
  SeriesView,
  SeriesRegistry,
  SeriesKinds,
  initChange,
  markChange,
  ItemId,
  ItemInput,
  ItemRecord,
  ItemRegistry,
} from "./adapters";
import type { HitTest } from "./engine";

export interface LayoutConfig {
  legend: {
    enabled: boolean;
    position: "tl" | "tr" | "bl" | "br";
    interactive: boolean;
  };
  margin: Edges<number>;
  yAxis: { min: number; size: "auto" | number };
  xAxis: { min: number; size: "auto" | number };
}

export interface PlotConfig {
  gridSpacing: [number, number];
  gridColor: Color;
  crosshairColor: Color;
  borderColor: Color;
  background: Color;

  axisMode?: { x?: Partial<AxisSpec>; y?: Partial<AxisSpec> };
  tickFormatter?: (value: number, step: number, axis: "x" | "y") => string;

  layout: LayoutConfig;
}

export const DefaultConfig: PlotConfig = {
  gridSpacing: [80, 50],
  gridColor: [0.2, 0.2, 0.2, 0.6],
  crosshairColor: [0.7, 0.7, 0.7, 1],
  borderColor: [0.22, 0.24, 0.26, 1],
  background: [0.078, 0.082, 0.086, 1],
  axisMode: {},
  layout: {
    legend: { enabled: false, position: "tr", interactive: false },
    margin: { top: 16, right: 16, bottom: 28, left: 42 },
    yAxis: { min: 26, size: "auto" },
    xAxis: { min: 20, size: "auto" },
  },
};

export type PlotConfigUpdate = Partial<PlotConfig> & {
  layout?: Partial<LayoutConfig>;
};

export function resolveConfig(
  prev: PlotConfig,
  patch?: PlotConfigUpdate,
): PlotConfig {
  if (!patch) return prev;
  const layoutPatch = patch.layout;
  const layout = layoutPatch
    ? {
        ...prev.layout,
        ...layoutPatch,
        margin: { ...prev.layout.margin, ...layoutPatch.margin },
        legend: { ...prev.layout.legend, ...layoutPatch.legend },
        xAxis: { ...prev.layout.xAxis, ...layoutPatch.xAxis },
        yAxis: { ...prev.layout.yAxis, ...layoutPatch.yAxis },
      }
    : prev.layout;
  return {
    ...prev,
    ...patch,
    axisMode: { ...prev.axisMode, ...patch.axisMode },
    layout,
  };
}

export class Model {
  readonly registry: SeriesRegistry;
  readonly itemRegistry: ItemRegistry;
  config: PlotConfig;
  resetWorld: { x: Range; y: Range };
  axisOffset: { x: number; y: number };

  private series: Array<SeriesRecord | null> = [];
  private items: Array<ItemRecord | null> = [];
  private itemSeq = 0;

  private paletteIndex = 0;

  constructor(args: {
    registry: SeriesRegistry;
    itemRegistry: ItemRegistry;
    initialWorld: { x: Range; y: Range };
    config?: PlotConfigUpdate;
  }) {
    this.registry = args.registry;
    this.itemRegistry = args.itemRegistry;
    this.config = resolveConfig(DefaultConfig, args.config);
    this.resetWorld = {
      x: { ...args.initialWorld.x },
      y: { ...args.initialWorld.y },
    };
    const initX = args.initialWorld.x;
    const initY = args.initialWorld.y;
    const centerX = (initX.min + initX.max) * 0.5;
    const centerY = (initY.min + initY.max) * 0.5;
    this.axisOffset = {
      x: Number.isFinite(centerX) ? centerX : 0,
      y: Number.isFinite(centerY) ? centerY : 0,
    };
  }

  setConfig(patch: PlotConfigUpdate): void {
    this.config = resolveConfig(this.config, patch);
  }

  addSeries(
    name: string,
    input: SeriesInput,
    style?: Partial<{ color: Color }>,
  ): SeriesId {
    const adapter = this.registry.get(input.kind);
    const id = this.series.length as SeriesId;
    const data = adapter.normalize(input, { axisOffset: this.axisOffset });
    const color = style?.color ?? this.nextPaletteColor();

    this.series.push({
      id,
      name,
      kind: input.kind,
      data,
      style: { color, visible: true, showInLegend: true },
      change: initChange(),
      cache: {},
    });

    return id;
  }

  append(id: SeriesId, payload: unknown): boolean {
    const s = this.series[id];
    if (!s) return false;
    const adapter = this.registry.get(s.kind);
    if (!adapter.append) return false;
    const ok = adapter.append(s.data, payload, { axisOffset: this.axisOffset });
    if (ok) {
      markChange(s.change);
    }
    return ok;
  }

  setSeriesData(id: SeriesId, input: SeriesInput): boolean {
    const s = this.series[id];
    if (!s) return false;
    if (input.kind !== s.kind) return false;
    const adapter = this.registry.get(s.kind);
    s.data = adapter.normalize(input, { axisOffset: this.axisOffset });
    markChange(s.change);
    return true;
  }

  writeSeriesData(id: SeriesId, input: SeriesInput): boolean {
    const s = this.series[id];
    if (!s) return false;
    if (input.kind !== s.kind) return false;
    const adapter = this.registry.get(s.kind);
    if (!adapter.write) return false;
    const ok = adapter.write(s.data, input, { axisOffset: this.axisOffset });
    if (ok) {
      markChange(s.change);
    }
    return ok;
  }

  setSeriesVisible(id: SeriesId, on: boolean): void {
    const s = this.series[id];
    if (!s) return;
    s.style.visible = on;
    markChange(s.change);
  }

  listSeries(): readonly SeriesView[] {
    const out: SeriesView[] = [];
    for (const s of this.series) {
      if (!s) continue;
      out.push({
        id: s.id,
        name: s.name,
        kind: s.kind,
        color: s.style.color,
        visible: s.style.visible,
        showInLegend: s.style.showInLegend,
      });
    }
    return out;
  }

  getSeries(id: SeriesId): SeriesRecord | null {
    return this.series[id] ?? null;
  }

  getDatum(id: SeriesId, index: number): unknown | null {
    const s = this.series[id];
    if (!s) return null;
    return this.registry.get(s.kind).getDatum?.(s.data, index) ?? null;
  }

  addItem(input: ItemInput, style: Record<string, unknown> = {}): ItemId {
    const adapter = this.itemRegistry.get(input.kind);
    const id = this.itemSeq++ as ItemId;
    const data = adapter.normalize(input);
    this.items[id] = {
      id,
      kind: input.kind,
      data,
      style,
      visible: true,
      change: initChange(),
      cache: {},
    };
    return id;
  }

  updateItem(
    id: ItemId,
    patch: Partial<{
      data: unknown;
      style: Record<string, unknown>;
      visible: boolean;
    }>,
  ): boolean {
    const it = this.items[id];
    if (!it) return false;
    if (patch.data !== undefined) it.data = patch.data;
    if (patch.style !== undefined) it.style = patch.style;
    if (patch.visible !== undefined) it.visible = patch.visible;
    markChange(it.change);
    return true;
  }

  removeItem(id: ItemId): boolean {
    if (!this.items[id]) return false;
    this.items[id] = null;
    return true;
  }

  listItems(): readonly ItemRecord[] {
    const out: ItemRecord[] = [];
    for (const it of this.items) if (it) out.push(it);
    return out;
  }

  getItem(id: ItemId): ItemRecord | null {
    return this.items[id] ?? null;
  }

  hitTest(
    wx: number,
    wy: number,
    tolx: number,
    toly: number,
    opts?: { includeScatter?: boolean },
  ): HitTest | null {
    const includeScatter = opts?.includeScatter !== false;
    let best: HitTest | null = null;
    const relX = wx - this.axisOffset.x;
    const relY = wy - this.axisOffset.y;
    for (const it of this.items) {
      if (!it || !it.visible) continue;
      const adapter = this.itemRegistry.get(it.kind);
      if (!adapter.hitTest) continue;
      const hit = adapter.hitTest({
        itemId: it.id,
        data: it.data,
        wx,
        wy,
        tolx,
        toly,
      });
      if (!hit) continue;
      if (!best || hit.dist2 < best.dist2) best = hit;
    }
    for (const s of this.series) {
      if (!s || !s.style.visible) continue;
      if (!includeScatter && s.kind === SeriesKinds.scatter) continue;
      const adapter = this.registry.get(s.kind);
      if (!adapter.hitTest) continue;
      const hit = adapter.hitTest({
        seriesId: s.id,
        data: s.data,
        wx: relX,
        wy: relY,
        tolx,
        toly,
      });
      if (!hit) continue;
      if (!best || hit.dist2 < best.dist2) best = hit;
    }
    return best;
  }

  private nextPaletteColor(): Color {
    const palette: Color[] = [
      [0.16, 0.63, 0.98, 1],
      [0.97, 0.38, 0.33, 1],
      [0.12, 0.78, 0.42, 1],
      [0.98, 0.76, 0.18, 1],
      [0.58, 0.38, 0.98, 1],
      [0.16, 0.82, 0.82, 1],
      [0.98, 0.55, 0.18, 1],
      [0.8, 0.08, 0.64, 1],
    ];
    const c =
      palette[this.paletteIndex++ % palette.length] ??
      palette[0] ??
      ([0.2, 0.6, 1, 1] as const);
    return [c[0], c[1], c[2], c[3]];
  }
}
