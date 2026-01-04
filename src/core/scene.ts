import {
  Color,
  Viewport,
  ViewTransform,
  worldToScreen,
  lowerBound,
  upperBound,
} from "./core";
import {
  AxisContext,
  buildAxisContext,
  generateTicks,
  formatAxisValue,
} from "./axis";
import type { AxisLabelMetrics } from "./layout";
import { buildLineLod, appendLineLod, LineLod } from "./lod";
import type { Hit } from "./engine";
import { Engine } from "./engine";
import { Model, PlotConfig } from "./model";
import { SeriesKinds, clearChange, fillStepPoints } from "./adapters";
import type { SeriesRecord, ItemRecord, ChangeState } from "./adapters";

export type StrokeJoin = "miter" | "bevel" | "round";
export type StrokeCap = "butt" | "square" | "round";

// Geometry coordinates are in world space. All *Px sizes are CSS pixels; renderer applies DPR.
export type Primitive =
  | {
      kind: "path";
      resourceKey?: number;
      revision?: number;
      bufferBytes?: number;
      dynamic?: boolean;
      draw?: { start: number; count: number };
      points: Float32Array;
      count: number;
      widthPx: number;
      join: StrokeJoin;
      cap: StrokeCap;
      color: Color;
      opacity: number;
      dashed?: { onPx: number; offPx: number; phasePx?: number };
    }
  | {
      kind: "quad";
      mode: "rect";
      resourceKey?: number;
      revision?: number;
      draw?: { start: number; count: number };
      rects: Float32Array; // XYWH
      count: number;
      fill: Color;
      stroke: Color;
      strokeWidthPx: number;
      roundness: number;
      opacity: number;
      pick?: { idBase: number; perInstance?: true };
    }
  | {
      kind: "quad";
      mode: "marker";
      resourceKey?: number;
      revision?: number;
      draw?: { start: number; count: number };
      centers: Float32Array; // XY per instance
      count: number;
      sizePx: number;
      fill: Color;
      stroke: Color;
      strokeWidthPx: number;
      roundness: number;
      opacity: number;
      pick?: { idBase: number; perInstance?: true };
    }
  | {
      kind: "mesh";
      resourceKey?: number;
      revision?: number;
      positions: Float32Array; // XY per vertex
      count: number; // vertex count
      fill: Color;
      opacity: number;
    };

export enum TextAlign {
  TopLeft = "top-left",
  Center = "center",
}

export type TextEntry = {
  x: number;
  y: number;
  text: string;
  color: Color;
  align: TextAlign;
};

export type Scene = {
  viewport: Viewport;
  transform: ViewTransform;
  renderOrigin?: { x: number; y: number };

  background: Color;
  borderColor: Color;

  grid: readonly Primitive[];
  series: readonly Primitive[];
  items: readonly Primitive[];
  overlays: readonly Primitive[];
  text: readonly TextEntry[];

  pickTable?: readonly (Hit | null)[];
  crosshair?: { sx: number; sy: number; color: Color };
  axisMetrics?: { x: AxisLabelMetrics; y: AxisLabelMetrics };
  stats?: {
    fps: number;
    frameMs: number;
    cpuMs: number;
    gpuMs: number;
    cursorLabel?: string;
  };
};

const RESOURCE_STRIDE = 1024;
const SERIES_BASE = 1_000_000;
const ITEM_BASE = 2_000_000;
const LOD_BASE = 3_000_000;

function seriesKey(seriesId: number, part: number): number {
  return SERIES_BASE + seriesId * RESOURCE_STRIDE + part;
}

function itemKey(itemId: number, part: number): number {
  return ITEM_BASE + itemId * RESOURCE_STRIDE + part;
}

function lodKey(seriesId: number, level: number): number {
  return LOD_BASE + seriesId * RESOURCE_STRIDE + level;
}

export class Scratch {
  private f32buf = new Float32Array(1024);
  private f32off = 0;

  reset() {
    this.f32off = 0;
  }

  f32(n: number): Float32Array {
    if (this.f32off + n > this.f32buf.length) {
      this.f32buf = new Float32Array(
        Math.max(this.f32buf.length * 2, this.f32off + n, 1024),
      );
    }
    const slice = this.f32buf.subarray(this.f32off, this.f32off + n);
    this.f32off += n;
    return slice;
  }
}

export type MeasureTextFn = (args: { text: string }) => {
  width: number;
  height: number;
};

function resolveXRange(
  x: Float32Array,
  count: number,
  view: Viewport,
  pad: number,
  offsetX: number,
): { start: number; count: number } | null {
  if (count <= 0) return null;
  const minX = view.world.x.min - offsetX;
  const maxX = view.world.x.max - offsetX;
  let start = lowerBound(x, minX, count) - pad;
  let end = upperBound(x, maxX, count) + pad;
  if (start < 0) start = 0;
  if (end > count - 1) end = count - 1;
  if (end < start) return null;
  return { start, count: end - start + 1 };
}

function buildGrid(
  cfg: PlotConfig,
  view: Viewport,
  transform: ViewTransform,
  out: Primitive[],
  text: TextEntry[],
  scratch: Scratch,
  measureText?: MeasureTextFn,
  axisMetrics?: { x: AxisLabelMetrics; y: AxisLabelMetrics },
  axisOffset?: { x: number; y: number },
  axis?: AxisContext,
): void {
  const plot = view.plot;
  if (plot.size.width <= 0 || plot.size.height <= 0) return;
  const offsetX = axisOffset?.x ?? 0;
  const offsetY = axisOffset?.y ?? 0;
  const axisX = axis?.xSpec;
  const axisY = axis?.ySpec;
  if (!axisX || !axisY) return;

  const xTicks = generateTicks({
    axis: "x",
    range: view.world.x,
    pixelSpan: plot.size.width,
    spacingPx: cfg.gridSpacing[0],
    spec: axisX,
    labels: true,
  });

  const yTicks = generateTicks({
    axis: "y",
    range: view.world.y,
    pixelSpan: plot.size.height,
    spacingPx: cfg.gridSpacing[1],
    spec: axisY,
    labels: true,
  });

  const labelColor = [0.82, 0.84, 0.88, 1] as const;
  const labelPad = 6;
  const metricsX = axisMetrics?.x;
  const metricsY = axisMetrics?.y;
  const measureLabel = (text: string) =>
    measureText
      ? measureText({ text })
      : { width: text.length * 6, height: 12 };
  const maxXLabel = (() => {
    let maxWidth = 0;
    let maxHeight = 0;
    for (const t of xTicks.ticks) {
      if (!t.label) continue;
      const measured = measureLabel(t.label);
      maxWidth = Math.max(maxWidth, measured.width);
      maxHeight = Math.max(maxHeight, measured.height);
    }
    return { maxWidth, maxHeight };
  })();
  const maxYLabel = (() => {
    let maxWidth = 0;
    let maxHeight = 0;
    for (const t of yTicks.ticks) {
      if (!t.label) continue;
      const measured = measureLabel(t.label);
      maxWidth = Math.max(maxWidth, measured.width);
      maxHeight = Math.max(maxHeight, measured.height);
    }
    return { maxWidth, maxHeight };
  })();
  if (metricsX) {
    metricsX.maxWidth = Math.max(metricsX.maxWidth, maxXLabel.maxWidth);
    metricsX.maxHeight = Math.max(metricsX.maxHeight, maxXLabel.maxHeight);
  }
  if (metricsY) {
    metricsY.maxWidth = Math.max(metricsY.maxWidth, maxYLabel.maxWidth);
    metricsY.maxHeight = Math.max(metricsY.maxHeight, maxYLabel.maxHeight);
  }
  const spanX = view.world.x.max - view.world.x.min;
  const spanY = view.world.y.max - view.world.y.min;
  const stepPxX =
    spanX > 0
      ? (plot.size.width / spanX) * xTicks.step
      : Number.POSITIVE_INFINITY;
  const stepPxY =
    spanY > 0
      ? (plot.size.height / spanY) * yTicks.step
      : Number.POSITIVE_INFINITY;
  const targetX = Math.max(cfg.gridSpacing[0], maxXLabel.maxWidth + labelPad);
  const targetY = Math.max(cfg.gridSpacing[1], maxYLabel.maxHeight + labelPad);
  const labelStrideX = Math.max(1, Math.ceil(targetX / Math.max(stepPxX, 1)));
  const labelStrideY = Math.max(1, Math.ceil(targetY / Math.max(stepPxY, 1)));
  const mod = (value: number, stride: number) =>
    ((value % stride) + stride) % stride;
  for (const t of xTicks.ticks) {
    const xRel = t.value - offsetX;
    const yMinRel = view.world.y.min - offsetY;
    const yMaxRel = view.world.y.max - offsetY;
    const pts = scratch.f32(4);
    pts[0] = xRel;
    pts[1] = yMinRel;
    pts[2] = xRel;
    pts[3] = yMaxRel;
    out.push({
      kind: "path",
      points: pts,
      count: 2,
      widthPx: 0.5,
      join: "miter",
      cap: "butt",
      color: cfg.gridColor,
      opacity: 1,
    });

    if (t.label) {
      if (labelStrideX > 1 && mod(t.index ?? 0, labelStrideX) !== 0) {
        continue;
      }
      const measured = measureLabel(t.label);
      const s = worldToScreen(transform, t.value, view.world.y.min);
      if (s.x < plot.origin.x || s.x > plot.origin.x + plot.size.width)
        continue;
      const x = s.x - measured.width * 0.5;
      text.push({
        x,
        y: plot.origin.y + plot.size.height + 6,
        text: t.label,
        color: labelColor,
        align: TextAlign.TopLeft,
      });
    }
  }

  for (const t of yTicks.ticks) {
    const yRel = t.value - offsetY;
    const xMinRel = view.world.x.min - offsetX;
    const xMaxRel = view.world.x.max - offsetX;
    const pts = scratch.f32(4);
    pts[0] = xMinRel;
    pts[1] = yRel;
    pts[2] = xMaxRel;
    pts[3] = yRel;
    out.push({
      kind: "path",
      points: pts,
      count: 2,
      widthPx: 0.5,
      join: "miter",
      cap: "butt",
      color: cfg.gridColor,
      opacity: 1,
    });

    if (t.label) {
      if (labelStrideY > 1 && mod(t.index ?? 0, labelStrideY) !== 0) {
        continue;
      }
      const measured = measureLabel(t.label);
      const s = worldToScreen(transform, view.world.x.min, t.value);
      if (s.y < plot.origin.y || s.y > plot.origin.y + plot.size.height)
        continue;
      const y = s.y - measured.height * 0.5;
      text.push({
        x: plot.origin.x - 8 - measured.width,
        y,
        text: t.label,
        color: labelColor,
        align: TextAlign.TopLeft,
      });
    }
  }
}

const LOD_MIN_SAMPLES = 4096;
const LOD_MAX_SAMPLES_PER_PIXEL = 2;

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

function buildLodLinePrimitive(args: {
  x: Float32Array;
  y: Float32Array;
  total: number;
  drawRange: { start: number; count: number };
  level: {
    stride: number;
    minIdx: Uint32Array;
    maxIdx: Uint32Array;
    count: number;
  };
  resourceKey?: number;
  revision?: number;
  bufferBytes?: number;
  widthPx: number;
  color: Color;
  opacity: number;
  join: StrokeJoin;
  cap: StrokeCap;
  scratch: { f32(n: number): Float32Array };
}): Primitive | null {
  const {
    x,
    y,
    total,
    drawRange,
    level,
    resourceKey,
    revision,
    bufferBytes,
    widthPx,
    color,
    opacity,
    join,
    cap,
    scratch,
  } = args;
  const stride = level.stride;
  const startBin = Math.max(0, Math.floor(drawRange.start / stride));
  const endBin = Math.min(
    level.count - 1,
    Math.floor((drawRange.start + drawRange.count - 1) / stride),
  );
  if (endBin < startBin) return null;
  const binCount = endBin - startBin + 1;
  const pts = scratch.f32(binCount * 8);
  let o = 0;
  let lastIdx = -1;

  const pushIdx = (idx: number) => {
    if (idx < 0 || idx >= total) return;
    if (idx === lastIdx) return;
    pts[o++] = x[idx] ?? 0;
    pts[o++] = y[idx] ?? 0;
    lastIdx = idx;
  };

  for (let b = startBin; b <= endBin; b++) {
    const start = b * stride;
    const end = Math.min(start + stride - 1, total - 1);
    let minIdx = level.minIdx[b] ?? start;
    let maxIdx = level.maxIdx[b] ?? start;
    if (minIdx < start || minIdx > end) minIdx = start;
    if (maxIdx < start || maxIdx > end) maxIdx = end;
    if (minIdx > maxIdx) {
      const tmp = minIdx;
      minIdx = maxIdx;
      maxIdx = tmp;
    }
    pushIdx(start);
    pushIdx(minIdx);
    pushIdx(maxIdx);
    pushIdx(end);
  }

  if (o < 4) return null;
  return {
    kind: "path",
    points: pts.subarray(0, o),
    count: o / 2,
    resourceKey,
    revision,
    bufferBytes,
    dynamic: true,
    widthPx,
    join,
    cap,
    color,
    opacity,
  };
}

function brighten(
  color: readonly [number, number, number, number],
  amt: number,
) {
  return [
    Math.min(1, color[0] + amt),
    Math.min(1, color[1] + amt),
    Math.min(1, color[2] + amt),
    color[3],
  ] as const;
}

function seriesPoint(
  rec: SeriesRecord,
  index: number,
): {
  x: number;
  y: number;
  sizePx: number;
} | null {
  if (index < 0) return null;
  if (rec.kind === SeriesKinds.line || rec.kind === SeriesKinds.step) {
    const data = rec.data as {
      x: Float32Array;
      y: Float32Array;
      count: number;
    };
    if (index >= data.count) return null;
    return { x: data.x[index] ?? 0, y: data.y[index] ?? 0, sizePx: 6 };
  }
  if (rec.kind === SeriesKinds.scatter) {
    const data = rec.data as {
      x: Float32Array;
      y: Float32Array;
      count: number;
      sizePx: number;
    };
    if (index >= data.count) return null;
    return {
      x: data.x[index] ?? 0,
      y: data.y[index] ?? 0,
      sizePx: Math.max(6, data.sizePx * 1.4),
    };
  }
  return null;
}

function pushHandleMarkers(args: {
  item: ItemRecord;
  handles: readonly {
    handleId: number;
    x: number;
    y: number;
    sizePx: number;
  }[];
  out: Primitive[];
  scratch: Scratch;
  pickTable: (Hit | null)[];
  axisOffset?: { x: number; y: number };
}) {
  const { item, handles, out, scratch, pickTable } = args;
  if (!handles.length) return;
  const offsetX = args.axisOffset?.x ?? 0;
  const offsetY = args.axisOffset?.y ?? 0;
  const centers = scratch.f32(handles.length * 2);
  const idBase = pickTable.length;
  for (let i = 0; i < handles.length; i++) {
    const h = handles[i]!;
    centers[i * 2] = h.x - offsetX;
    centers[i * 2 + 1] = h.y - offsetY;
    pickTable.push({
      kind: "item-handle",
      itemId: item.id,
      handleId: h.handleId,
    });
  }
  out.push({
    kind: "quad",
    mode: "marker",
    centers,
    count: handles.length,
    sizePx: handles[0]?.sizePx ?? 8,
    fill: [0.6, 1, 0.6, 1],
    stroke: [0.6, 1, 0.6, 1],
    strokeWidthPx: 0,
    roundness: 0,
    opacity: 1,
    pick: { idBase, perInstance: true },
  });
}

function buildOverlays(
  engine: Engine,
  out: Primitive[],
  text: TextEntry[],
  scratch: Scratch,
  pickTable: (Hit | null)[],
  axisOffset?: { x: number; y: number },
  axis?: AxisContext,
): void {
  const cfg = engine.model.config;
  const offsetX = axisOffset?.x ?? 0;
  const offsetY = axisOffset?.y ?? 0;

  if (engine.crosshair.enabled) {
    const plot = engine.view.plot;
    const world = engine.screenToWorld(
      engine.crosshair.sx,
      engine.crosshair.sy,
    );
    const axisX = axis?.xSpec;
    const axisY = axis?.ySpec;
    if (axisX && axisY) {
      const xStep = axis?.xStep ?? 1;
      const yStep = axis?.yStep ?? 1;
      const xLabel = formatAxisValue({
        axis: "x",
        value: world.x,
        step: xStep,
        spec: axisX,
      });
      const yLabel = formatAxisValue({
        axis: "y",
        value: world.y,
        step: yStep,
        spec: axisY,
      });
      const labelColor = [0.86, 0.88, 0.92, 1] as const;
      const approxW = xLabel.length * 6;
      let xPos = engine.crosshair.sx + 6;
      if (xPos + approxW > plot.origin.x + plot.size.width - 2) {
        xPos = plot.origin.x + plot.size.width - approxW - 2;
      }
      if (xPos < plot.origin.x + 2) xPos = plot.origin.x + 2;
      const xPosY = plot.origin.y + plot.size.height - 16;
      text.push({
        x: xPos,
        y: xPosY,
        text: xLabel,
        color: labelColor,
        align: TextAlign.TopLeft,
      });
      let yPos = engine.crosshair.sy - 6;
      const yTop = engine.crosshair.sy - 14;
      const yBottom = engine.crosshair.sy + 10;
      if (yTop >= plot.origin.y + 2) {
        yPos = yTop;
      } else {
        yPos = yBottom;
      }
      if (yPos < plot.origin.y + 2) yPos = plot.origin.y + 2;
      if (yPos > plot.origin.y + plot.size.height - 12)
        yPos = plot.origin.y + plot.size.height - 12;
      text.push({
        x: plot.origin.x + 4,
        y: yPos,
        text: yLabel,
        color: labelColor,
        align: TextAlign.TopLeft,
      });
    }
  }

  if (engine.selection) {
    const { start, current } = engine.selection;
    const xMin = Math.min(start[0], current[0]);
    const xMax = Math.max(start[0], current[0]);
    const yMin = Math.min(start[1], current[1]);
    const yMax = Math.max(start[1], current[1]);
    const rects = scratch.f32(4);
    rects[0] = xMin - offsetX;
    rects[1] = yMin - offsetY;
    rects[2] = xMax - xMin;
    rects[3] = yMax - yMin;
    out.push({
      kind: "quad",
      mode: "rect",
      rects,
      count: 1,
      fill: [
        cfg.crosshairColor[0],
        cfg.crosshairColor[1],
        cfg.crosshairColor[2],
        cfg.crosshairColor[3] * 0.15,
      ],
      stroke: cfg.crosshairColor,
      strokeWidthPx: 0.6,
      roundness: 0,
      opacity: 1,
    });
  }

  const hover = engine.hover;
  if (hover && (hover.kind === "item" || hover.kind === "item-handle")) {
    const item = engine.model.getItem(hover.itemId);
    if (!item) return;
    const adapter = engine.model.itemRegistry.get(item.kind);
    if (!adapter.handles) return;
    const handles = adapter.handles({ itemId: item.id, data: item.data });
    pushHandleMarkers({
      item,
      handles,
      out,
      scratch,
      pickTable,
      axisOffset: { x: offsetX, y: offsetY },
    });
  }

  if (hover && hover.kind === "series-point") {
    const rec = engine.model.getSeries(hover.seriesId);
    if (!rec) return;
    if (rec.kind === SeriesKinds.bars) {
      const data = rec.data as {
        x: Float32Array;
        y: Float32Array;
        width: number;
        offsetY: number;
      };
      const i = hover.index;
      if (i >= 0 && i < data.x.length && i < data.y.length) {
        const rects = scratch.f32(4);
        const x = data.x[i] ?? 0;
        const y = data.y[i] ?? 0;
        const baseY = -data.offsetY;
        rects[0] = x - data.width * 0.5;
        rects[1] = baseY;
        rects[2] = data.width;
        rects[3] = y - baseY;
        const color = brighten(rec.style.color, 0.18);
        out.push({
          kind: "quad",
          mode: "rect",
          rects,
          count: 1,
          fill: color,
          stroke: color,
          strokeWidthPx: 1,
          roundness: 0,
          opacity: 0.9,
        });
      }
    }
    const point = seriesPoint(rec, hover.index);
    if (point) {
      const centers = scratch.f32(2);
      centers[0] = point.x;
      centers[1] = point.y;
      const color = brighten(rec.style.color, 0.25);
      out.push({
        kind: "quad",
        mode: "marker",
        centers,
        count: 1,
        sizePx: point.sizePx,
        fill: color,
        stroke: color,
        strokeWidthPx: 0,
        roundness: 0,
        opacity: 1,
      });
    }
  }
}

function buildLegend(_cfg: PlotConfig, _text: TextEntry[]): void {
  return;
}

export class SceneBuilder {
  private scratch = new Scratch();
  private persistentScratch = {
    f32: (n: number) => new Float32Array(n),
  };

  private grid: Primitive[] = [];
  private series: Primitive[] = [];
  private items: Primitive[] = [];
  private overlays: Primitive[] = [];
  private text: TextEntry[] = [];
  private pickTable: Array<Hit | null> = [];

  build(args: {
    model: Model;
    engine: Engine;
    measureText?: MeasureTextFn;
  }): Scene {
    const { model, engine } = args;

    this.scratch.reset();
    this.grid.length = 0;
    this.series.length = 0;
    this.items.length = 0;
    this.overlays.length = 0;
    this.text.length = 0;
    this.pickTable.length = 1;
    this.pickTable[0] = null;

    const axisMetrics = {
      x: { maxWidth: 0, maxHeight: 0 },
      y: { maxWidth: 0, maxHeight: 0 },
    };
    const axis = buildAxisContext(model, engine.view);

    const ensurePrimitives = (
      record: { cache: Record<string, unknown>; change: ChangeState },
      build: () => Primitive[],
    ): Primitive[] => {
      const cached = record.cache.primitives as Primitive[] | undefined;
      if (!cached || record.change.dirty) {
        const built = build();
        record.cache.primitives = built;
        clearChange(record.change);
        return built;
      }
      return cached;
    };

    buildGrid(
      model.config,
      engine.view,
      engine.transform,
      this.grid,
      this.text,
      this.scratch,
      args.measureText,
      axisMetrics,
      model.axisOffset,
      axis,
    );

    for (const s of model.listSeries()) {
      if (!s.visible) continue;
      const rec = model.getSeries(s.id);
      if (!rec) continue;
      let drawRange: { start: number; count: number } | null = null;
      let dynamicPath = false;
      if (rec.kind === SeriesKinds.line || rec.kind === SeriesKinds.step) {
        const data = rec.data as {
          x: Float32Array;
          y: Float32Array;
          count: number;
          widthPx: number;
        };
        const count = Math.min(data.count ?? 0, data.x.length, data.y.length);
        if (count >= LOD_MIN_SAMPLES) {
          const cache = rec.cache as { lod?: LineLod };
          const x0 = data.x[0] ?? 0;
          if (
            !cache.lod ||
            cache.lod.revision > rec.change.revision ||
            cache.lod.sourceCount > count ||
            cache.lod.x0 !== x0
          ) {
            cache.lod = buildLineLod({
              x: data.x,
              y: data.y,
              count,
              revision: rec.change.revision,
            });
          } else if (cache.lod.revision === rec.change.revision - 1) {
            const addCount = count - cache.lod.sourceCount;
            if (addCount > 0) {
              cache.lod = appendLineLod(cache.lod, {
                x: data.x,
                y: data.y,
                start: cache.lod.sourceCount,
                count: addCount,
              });
              if (cache.lod.sourceCount === count) {
                cache.lod.revision = rec.change.revision;
                cache.lod.x0 = x0;
              } else {
                cache.lod = buildLineLod({
                  x: data.x,
                  y: data.y,
                  count,
                  revision: rec.change.revision,
                });
              }
            } else if (addCount === 0) {
              cache.lod.revision = rec.change.revision;
            } else {
              cache.lod = buildLineLod({
                x: data.x,
                y: data.y,
                count,
                revision: rec.change.revision,
              });
            }
          } else if (cache.lod.revision !== rec.change.revision) {
            cache.lod = buildLineLod({
              x: data.x,
              y: data.y,
              count,
              revision: rec.change.revision,
            });
          }
        }
        drawRange = resolveXRange(
          data.x,
          count,
          engine.view,
          2,
          model.axisOffset.x,
        );
        if (drawRange && count >= LOD_MIN_SAMPLES) {
          dynamicPath = true;
        }
        if (
          (rec.kind === SeriesKinds.line || rec.kind === SeriesKinds.step) &&
          drawRange
        ) {
          const visible = drawRange.count;
          const plotPx = engine.view.plot.size.width * engine.view.dpr;
          if (visible >= LOD_MIN_SAMPLES && plotPx > 0) {
            const spp = visible / plotPx;
            if (spp > LOD_MAX_SAMPLES_PER_PIXEL) {
              const cache = rec.cache as { lod?: LineLod };
              const lod = cache.lod;
              if (!lod) {
                // Fall back to raw rendering if LOD cache is unavailable.
              } else {
                const target = spp / LOD_MAX_SAMPLES_PER_PIXEL;
                const levelFloat = Math.log2(Math.max(1, target));
                const maxLevel = lod.levels.length - 1;
                const baseLevel = Math.max(
                  0,
                  Math.min(maxLevel, Math.floor(levelFloat)),
                );
                const frac = levelFloat - baseLevel;
                const nextLevel = Math.min(maxLevel, baseLevel + 1);
                const blend =
                  baseLevel === maxLevel ? 0 : smoothstep(0.2, 0.8, frac);

                const join: StrokeJoin =
                  rec.kind === SeriesKinds.step ? "miter" : "round";
                const cap: StrokeCap =
                  rec.kind === SeriesKinds.step ? "butt" : "round";

                const lo = lod.levels[baseLevel]!;
                const hi = lod.levels[nextLevel]!;
                const lodKeyBase = lodKey(rec.id, 0);
                const bufferBytesFor = (level: LineLod["levels"][number]) => {
                  const points = Math.max(2, level.count * 4);
                  const segments = Math.max(1, points - 1);
                  return segments * 4 * 4;
                };

                if (blend <= 0.01 || baseLevel === nextLevel) {
                  const prim = buildLodLinePrimitive({
                    x: data.x,
                    y: data.y,
                    total: count,
                    drawRange,
                    level: lo,
                    resourceKey: lodKeyBase + baseLevel,
                    revision: rec.change.revision,
                    bufferBytes: bufferBytesFor(lo),
                    widthPx: data.widthPx,
                    color: rec.style.color,
                    opacity: 1,
                    join,
                    cap,
                    scratch: this.scratch,
                  });
                  if (prim) {
                    this.series.push(prim);
                    continue;
                  }
                } else if (blend >= 0.99) {
                  const prim = buildLodLinePrimitive({
                    x: data.x,
                    y: data.y,
                    total: count,
                    drawRange,
                    level: hi,
                    resourceKey: lodKeyBase + nextLevel,
                    revision: rec.change.revision,
                    bufferBytes: bufferBytesFor(hi),
                    widthPx: data.widthPx,
                    color: rec.style.color,
                    opacity: 1,
                    join,
                    cap,
                    scratch: this.scratch,
                  });
                  if (prim) {
                    this.series.push(prim);
                    continue;
                  }
                } else {
                  const primLo = buildLodLinePrimitive({
                    x: data.x,
                    y: data.y,
                    total: count,
                    drawRange,
                    level: lo,
                    resourceKey: lodKeyBase + baseLevel,
                    revision: rec.change.revision,
                    bufferBytes: bufferBytesFor(lo),
                    widthPx: data.widthPx,
                    color: rec.style.color,
                    opacity: 1 - blend,
                    join,
                    cap,
                    scratch: this.scratch,
                  });
                  const primHi = buildLodLinePrimitive({
                    x: data.x,
                    y: data.y,
                    total: count,
                    drawRange,
                    level: hi,
                    resourceKey: lodKeyBase + nextLevel,
                    revision: rec.change.revision,
                    bufferBytes: bufferBytesFor(hi),
                    widthPx: data.widthPx,
                    color: rec.style.color,
                    opacity: blend,
                    join,
                    cap,
                    scratch: this.scratch,
                  });
                  if (primLo || primHi) {
                    if (primLo) this.series.push(primLo);
                    if (primHi) this.series.push(primHi);
                    continue;
                  }
                }
                dynamicPath = false;
              }
            }
          }
        }
      } else if (rec.kind === SeriesKinds.bars) {
        const data = rec.data as {
          x: Float32Array;
          y: Float32Array;
          width: number;
        };
        const count = Math.min(data.x.length, data.y.length);
        if (count > 0) {
          const half = (data.width ?? 1) * 0.5;
          const offsetX = model.axisOffset.x;
          const minX = engine.view.world.x.min - offsetX - half;
          const maxX = engine.view.world.x.max - offsetX + half;
          let start = lowerBound(data.x, minX, count) - 1;
          let end = upperBound(data.x, maxX, count) + 1;
          if (start < 0) start = 0;
          if (end > count - 1) end = count - 1;
          if (end >= start) drawRange = { start, count: end - start + 1 };
        }
      }
      const cached = rec.cache.primitives as Primitive[] | undefined;
      if (
        rec.change.dirty &&
        cached &&
        (rec.kind === SeriesKinds.line || rec.kind === SeriesKinds.step)
      ) {
        const prim = cached.find((p) => p.kind === "path") as
          | Extract<Primitive, { kind: "path" }>
          | undefined;
        const data = rec.data as {
          x: Float32Array;
          y: Float32Array;
          count: number;
          align?: "start" | "center" | "end";
        };
        const count = Math.min(data.count ?? 0, data.x.length, data.y.length);
        if (prim && count > 0) {
          if (rec.kind === SeriesKinds.line) {
            const needed = count * 2;
            if (prim.points.length >= needed) {
              for (let i = 0; i < count; i++) {
                prim.points[i * 2] = data.x[i] ?? 0;
                prim.points[i * 2 + 1] = data.y[i] ?? 0;
              }
              prim.count = count;
              prim.revision = rec.change.revision;
              clearChange(rec.change);
            }
          } else {
            const neededPoints = count * 2 - 1;
            const needed = neededPoints * 2;
            if (prim.points.length >= needed) {
              const o = fillStepPoints(
                data.x,
                data.y,
                count,
                data.align ?? "end",
                prim.points,
              );
              prim.count = o / 2;
              prim.revision = rec.change.revision;
              clearChange(rec.change);
            }
          }
        }
      }
      const prims = ensurePrimitives(rec, () => {
        const built: Primitive[] = [];
        model.registry.get(rec.kind).buildPrimitives({
          seriesId: rec.id,
          data: rec.data,
          style: { color: rec.style.color },
          out: built,
          scratch: this.persistentScratch,
        });
        for (let i = 0; i < built.length; i++) {
          const p = built[i]!;
          p.resourceKey = seriesKey(rec.id, i);
          p.revision = rec.change.revision;
        }
        return built;
      });
      if (!prims) continue;
      for (let i = 0; i < prims.length; i++) {
        const p = prims[i]!;
        if (p.resourceKey == null) p.resourceKey = seriesKey(rec.id, i);
        if (p.revision == null) p.revision = rec.change.revision;
        if (drawRange) {
          if (p.kind === "path") {
            if (rec.kind === SeriesKinds.step) {
              const data = rec.data as {
                x: Float32Array;
                y: Float32Array;
                count: number;
              };
              const total = Math.min(
                data.count ?? 0,
                data.x.length,
                data.y.length,
              );
              const maxPoints = Math.max(0, total * 2 - 1);
              const start = Math.min(
                maxPoints,
                Math.max(0, drawRange.start * 2),
              );
              let count = drawRange.count * 2 - 1;
              if (start + count > maxPoints) count = maxPoints - start;
              if (count <= 0) {
                p.draw = undefined;
              } else {
                p.draw = { start, count };
              }
            } else {
              p.draw = drawRange;
            }
            if (dynamicPath && p.draw) {
              const count = p.draw.count;
              p.dynamic = true;
              p.bufferBytes = Math.max(1, count - 1) * 4 * 4;
            } else if (p.dynamic || p.bufferBytes) {
              p.dynamic = false;
              p.bufferBytes = undefined;
            }
          }
          if (p.kind === "quad" && p.mode === "rect") p.draw = drawRange;
        } else if ("draw" in p && p.draw) {
          p.draw = undefined;
        }
        this.series.push(p);
      }
    }

    for (const it of model.listItems()) {
      if (!it.visible) continue;
      const start = this.items.length;
      const prims = ensurePrimitives(it, () => {
        const built: Primitive[] = [];
        model.itemRegistry.get(it.kind).buildPrimitives({
          itemId: it.id,
          data: it.data,
          style: it.style,
          view: engine.view,
          out: built,
          text: this.text,
          scratch: this.persistentScratch,
          axisOffset: model.axisOffset,
        });
        for (let i = 0; i < built.length; i++) {
          const p = built[i]!;
          p.resourceKey = itemKey(it.id, i);
          p.revision = it.change.revision;
        }
        return built;
      });
      if (prims) {
        for (let i = 0; i < prims.length; i++) {
          const p = prims[i]!;
          if (p.resourceKey == null) p.resourceKey = itemKey(it.id, i);
          if (p.revision == null) p.revision = it.change.revision;
          this.items.push(p);
        }
      }
      if (this.items.length > start) {
        const itemPickId = this.pickTable.length;
        this.pickTable.push({ kind: "item", itemId: it.id });
        for (let i = start; i < this.items.length; i++) {
          const p = this.items[i];
          if (!p) continue;
          if (p.kind === "quad" && p.mode === "rect") {
            p.pick = { idBase: itemPickId };
          }
        }
      }
    }

    buildOverlays(
      engine,
      this.overlays,
      this.text,
      this.scratch,
      this.pickTable,
      model.axisOffset,
      axis,
    );
    buildLegend(model.config, this.text);

    const offsetX = model.axisOffset.x ?? 0;
    const offsetY = model.axisOffset.y ?? 0;
    const viewport = {
      world: {
        x: {
          min: engine.view.world.x.min - offsetX,
          max: engine.view.world.x.max - offsetX,
        },
        y: {
          min: engine.view.world.y.min - offsetY,
          max: engine.view.world.y.max - offsetY,
        },
      },
      dpr: engine.view.dpr,
      canvas: {
        width: engine.view.canvas.width,
        height: engine.view.canvas.height,
      },
      plot: {
        origin: {
          x: engine.view.plot.origin.x,
          y: engine.view.plot.origin.y,
        },
        size: {
          width: engine.view.plot.size.width,
          height: engine.view.plot.size.height,
        },
      },
    };
    const transform = { ...engine.transform };
    const renderOrigin = {
      x: transform.renderOriginWorldX - offsetX,
      y: transform.renderOriginWorldY - offsetY,
    };

    const crosshair = engine.crosshair.enabled
      ? {
          sx: engine.crosshair.sx,
          sy: engine.crosshair.sy,
          color: model.config.crosshairColor,
        }
      : undefined;

    return {
      viewport,
      transform,
      background: model.config.background,
      borderColor: model.config.borderColor,
      grid: this.grid,
      series: this.series,
      items: this.items,
      overlays: this.overlays,
      text: this.text,
      pickTable: this.pickTable,
      crosshair,
      axisMetrics,
      renderOrigin,
    };
  }
}
