import type {
  DrawList,
  MeasureTextFn,
  Primitive,
  TextEntry,
} from "./contracts";
import { Scratch, TextAlign } from "./contracts";
import type { InteractionController } from "../interaction/controller";
import type { ScenePrimitive, SceneText } from "../scene/frame";
import { PlotController } from "../api/controller";
import { buildGrid, measureGridAxisMetrics } from "./grid";
import { formatAxisValue, generateTicks, resolveAxisStep } from "./axis";
import {
  buildRenderLayout,
  computeAxisGutters,
  createAxisLabelMetrics,
  type ExtraAxisLayout,
  type RenderLayout,
} from "./layout";
import {
  getConfiguredAxisSpec,
  resolveAxisDefSpec,
  type AxisDef,
  type PlotConfig,
} from "../domain/config";
import type { BuiltScene } from "../scene/builder";
import type { SeriesHitInfo, CursorEvent } from "../interaction/events";

export type BuildDrawListArgs = {
  controller: PlotController;
  widthPx: number;
  heightPx: number;
  dpr: number;
  selectedObjectId?: number | null;
  measureText?: MeasureTextFn;
};

function resolveExtraAxisLayout(
  axes: readonly AxisDef[] | undefined,
  defaultWidthPx: number,
): readonly ExtraAxisLayout[] | undefined {
  if (!axes || axes.length === 0) return undefined;
  return axes.map((def) => ({
    id: def.id,
    side: def.side,
    widthPx: typeof def.size === "number" ? def.size : defaultWidthPx,
  }));
}

// Tick labels for each declared secondary y-axis, placed inside its gutter and
// projected through that axis's own range. Reuses the primary y label styling.
function pushExtraAxisLabels(args: {
  out: TextEntry[];
  layout: RenderLayout;
  view: { extraY?: Record<string, { min: number; max: number }> };
  axes: readonly AxisDef[] | undefined;
  config: PlotConfig;
  measureText?: MeasureTextFn;
}): void {
  const slots = args.layout.scales.extraY;
  if (!slots || !args.axes) return;
  const spacingPx = args.config.gridSpacing[1];
  const fallbackTextColor = args.config.layout.yScale.textColor;
  for (let s = 0; s < slots.length; s += 1) {
    const slot = slots[s]!;
    const range = args.view.extraY?.[slot.id];
    const def = args.axes.find((a) => a.id === slot.id);
    if (!range || !def) continue;
    // Each secondary axis may set its own label color (a common dual-axis
    // convention is to tint it to match its series); fall back to the primary.
    const textColor = def.textColor ?? fallbackTextColor;
    const spec = resolveAxisDefSpec(def);
    const ticks = generateTicks({
      axis: "y",
      range,
      spanPx: slot.bounds.size.height,
      spacingPx,
      spec,
      labels: true,
    });
    const span = range.max - range.min;
    const yScale = span > 0 ? slot.bounds.size.height / span : 0;
    const bottom = slot.bounds.origin.y + slot.bounds.size.height;
    for (let i = 0; i < ticks.ticks.length; i += 1) {
      const tick = ticks.ticks[i]!;
      if (!tick.label) continue;
      const py = bottom - (tick.value - range.min) * yScale;
      if (py < slot.bounds.origin.y || py > bottom) continue;
      const measured = measureTextFallback(args.measureText, tick.label);
      args.out.push({
        x:
          slot.side === "right"
            ? slot.bounds.origin.x + 8
            : slot.bounds.origin.x + slot.bounds.size.width - 8 - measured.width,
        y: py - measured.height * 0.5,
        text: tick.label,
        color: textColor,
        align: TextAlign.TopLeft,
      });
    }
  }
}

function shiftClampRect(
  clampRect: SceneText["clampRect"],
  originX: number,
  originY: number,
): SceneText["clampRect"] {
  if (!clampRect) return undefined;
  return {
    minX: clampRect.minX + originX,
    maxX: clampRect.maxX + originX,
    minY: clampRect.minY + originY,
    maxY: clampRect.maxY + originY,
  };
}

function mapScenePrimitive(primitive: ScenePrimitive): Primitive {
  switch (primitive.kind) {
    case "path":
      return primitive;
    case "rect":
      return {
        kind: "quad",
        mode: "rect",
        rects: primitive.rects,
        count: primitive.count,
        fill: primitive.fill,
        stroke: primitive.stroke,
        strokeWidthPx: primitive.strokeWidthPx,
        roundness: primitive.roundness,
        opacity: primitive.opacity,
        origin: primitive.origin,
        yRange: primitive.yRange,
      };
    case "marker":
      return {
        kind: "quad",
        mode: "marker",
        centers: primitive.centers,
        count: primitive.count,
        sizePx: primitive.sizePx,
        fill: primitive.fill,
        stroke: primitive.stroke,
        strokeWidthPx: primitive.strokeWidthPx,
        roundness: primitive.roundness,
        opacity: primitive.opacity,
        origin: primitive.origin,
        colors: primitive.colors,
        sizes: primitive.sizes,
        yRange: primitive.yRange,
      };
    case "area":
      return primitive;
  }
}

function mapObjectHighlights(
  highlights: ReadonlyMap<number, readonly ScenePrimitive[]> | undefined,
): ReadonlyMap<number, readonly Primitive[]> | undefined {
  if (!highlights || highlights.size === 0) return undefined;
  const out = new Map<number, readonly Primitive[]>();
  for (const [id, prims] of highlights) out.set(id, prims.map(mapScenePrimitive));
  return out;
}

/** The hover affordance is the focus box drawn at this fraction of its opacity. */
const HOVER_HIGHLIGHT_OPACITY = 0.4;

function mapSceneText(entry: SceneText, layout: RenderLayout): TextEntry {
  const originX = layout.plot.origin.x;
  const originY = layout.plot.origin.y;
  return {
    x: entry.x + originX,
    y: entry.y + originY,
    text: entry.text,
    color: entry.color,
    align: entry.align === "center" ? TextAlign.Center : TextAlign.TopLeft,
    fixedBox: entry.fixedBox,
    boxOrigin: entry.boxOrigin
      ? {
          x: entry.boxOrigin.x + originX,
          y: entry.boxOrigin.y + originY,
        }
      : undefined,
    boxTextOffsetY: entry.boxTextOffsetY,
    boxTextBaseline: entry.boxTextBaseline,
    boxTextTrack: entry.boxTextTrack,
    clampRect: shiftClampRect(entry.clampRect, originX, originY),
    box: entry.box
      ? {
          width: entry.box.width,
          height: entry.box.height,
          exactWidth: entry.box.exactWidth,
          padX: entry.box.padX,
          padY: entry.box.padY,
          background: entry.box.background,
          border: entry.box.border,
          borderWidth: entry.box.borderWidth,
        }
      : undefined,
  };
}

function axisSlotHeight(layout: RenderLayout): number | undefined {
  const slot =
    layout.scales.xSide === "top" ? layout.scales.top : layout.scales.bottom;
  return slot?.size.height;
}

function axisSlotWidth(layout: RenderLayout): number | undefined {
  const slot =
    layout.scales.ySide === "right" ? layout.scales.right : layout.scales.left;
  return slot?.size.width;
}

function withAlpha(
  color: readonly [number, number, number, number],
  alpha: number,
): readonly [number, number, number, number] {
  return [color[0], color[1], color[2], alpha];
}

function measureTextFallback(
  measureText: MeasureTextFn | undefined,
  text: string,
): { width: number; height: number } {
  return measureText ? measureText({ text }) : { width: text.length * 7, height: 12 };
}

type CursorSeriesPoint = {
  key: string;
  seriesId: number;
  x: number;
  y: number;
  color: readonly [number, number, number, number];
};

function datumPoint(hit: SeriesHitInfo | undefined): CursorSeriesPoint | null {
  const datum = hit?.datum;
  if (!datum || typeof datum !== "object") return null;
  const x = "x" in datum ? (datum.x as unknown) : undefined;
  const y = "y" in datum ? (datum.y as unknown) : undefined;
  if (typeof x !== "number" || typeof y !== "number") return null;
  return {
    key: `${hit?.seriesId ?? -1}:${hit?.index ?? -1}`,
    seriesId: hit?.seriesId ?? -1,
    x,
    y,
    color: hit?.color ?? [1, 1, 1, 1],
  };
}

function cursorSeriesPoints(cursor: CursorEvent): CursorSeriesPoint[] {
  const points: CursorSeriesPoint[] = [];
  const seen = new Set<string>();

  const pushPoint = (point: CursorSeriesPoint | null) => {
    if (!point || seen.has(point.key)) return;
    seen.add(point.key);
    points.push(point);
  };

  if (cursor.seriesHits?.length) {
    for (let i = 0; i < cursor.seriesHits.length; i += 1) {
      pushPoint(datumPoint(cursor.seriesHits[i]));
    }
    return points;
  }

  if (cursor.hit?.kind === "series-point") {
    pushPoint(datumPoint(cursor.hit));
  }

  return points;
}

type DecorateDrawListArgs = {
  controller: PlotController;
  interaction?: InteractionController;
  measureText?: MeasureTextFn;
};

export type DrawListBuildState = {
  drawList: DrawList;
  layout: RenderLayout;
  builtScene: BuiltScene;
};

export class DrawListBuilder {
  private readonly scratch = new Scratch();

  build(args: BuildDrawListArgs): DrawList {
    return this.buildState(args).drawList;
  }

  buildState(args: BuildDrawListArgs): DrawListBuildState {
    const config = args.controller.peekConfig();
    const view = args.controller.peekView();
    const extraAxisLayout = resolveExtraAxisLayout(config.yAxes, config.layout.yScale.min);
    const probeMetrics = createAxisLabelMetrics();
    const probeLayout = buildRenderLayout({
      width: args.widthPx,
      height: args.heightPx,
      dpr: args.dpr,
      layout: config.layout,
      extraY: extraAxisLayout,
      gutters: computeAxisGutters({
        layout: config.layout,
        metricsX: probeMetrics.x,
        metricsY: probeMetrics.y,
        extraY: extraAxisLayout,
      }),
    });

    measureGridAxisMetrics({
      config,
      layout: probeLayout,
      view,
      measureText: args.measureText,
      axisMetrics: probeMetrics,
    });

    const layout = buildRenderLayout({
      width: args.widthPx,
      height: args.heightPx,
      dpr: args.dpr,
      layout: config.layout,
      extraY: extraAxisLayout,
      gutters: computeAxisGutters({
        layout: config.layout,
        metricsX: probeMetrics.x,
        metricsY: probeMetrics.y,
        extraY: extraAxisLayout,
      }),
    });

    const xSpec = getConfiguredAxisSpec(config, "x");
    const ySpec = getConfiguredAxisSpec(config, "y");
    const xStep = resolveAxisStep({
      range: view.x,
      spanPx: layout.plot.size.width,
      spacingPx: config.gridSpacing[0],
      spec: xSpec,
    });
    const yStep = resolveAxisStep({
      range: view.y,
      spanPx: layout.plot.size.height,
      spacingPx: config.gridSpacing[1],
      spec: ySpec,
    });

    const builtScene = args.controller.buildScene({
      dpr: args.dpr,
      plotWidthPx: layout.plot.size.width,
      plotHeightPx: layout.plot.size.height,
      selectedObjectId: args.selectedObjectId,
      xAxisHeightPx: axisSlotHeight(layout),
      yAxisWidthPx: axisSlotWidth(layout),
      xAxisSide: layout.scales.xSide ?? undefined,
      yAxisSide: layout.scales.ySide ?? undefined,
      background: config.background,
      formatXValue: (value: number) =>
        formatAxisValue({ axis: "x", value, step: xStep, spec: xSpec }),
      formatYValue: (value: number) =>
        formatAxisValue({ axis: "y", value, step: yStep, spec: ySpec }),
    });

    this.scratch.reset();
    const grid: Primitive[] = builtScene.frame.grid.map(mapScenePrimitive);
    const gridText: TextEntry[] = [];
    buildGrid({
      config,
      layout,
      view: builtScene.frame.view,
      out: grid,
      text: gridText,
      scratch: this.scratch,
      measureText: args.measureText,
      axisOffset: {
        x: args.controller.model.axisOffsetX,
        y: args.controller.model.axisOffsetY,
      },
    });

    if (layout.scales.extraY) {
      pushExtraAxisLabels({
        out: gridText,
        layout,
        view,
        axes: config.yAxes,
        config,
        measureText: args.measureText,
      });
    }

    const drawList: DrawList = {
      viewport: {
        value: {
          x: { min: builtScene.frame.view.x.min, max: builtScene.frame.view.x.max },
          y: { min: builtScene.frame.view.y.min, max: builtScene.frame.view.y.max },
        },
        dpr: layout.dpr,
        canvas: {
          width: layout.canvas.width,
          height: layout.canvas.height,
        },
        plot: {
          origin: {
            x: layout.plot.origin.x,
            y: layout.plot.origin.y,
          },
          size: {
            width: layout.plot.size.width,
            height: layout.plot.size.height,
          },
        },
        scales: layout.scales,
      },
      background: config.background,
      borderColor: config.borderColor,
      scaleStyle: {
        x: {
          show: config.layout.xScale.show,
          side: config.layout.xScale.side,
          background: config.layout.xScale.background,
          textColor: config.layout.xScale.textColor,
          lineColor: config.layout.xScale.lineColor,
          lineWidthPx: config.layout.xScale.lineWidthPx,
        },
        y: {
          show: config.layout.yScale.show,
          side: config.layout.yScale.side,
          background: config.layout.yScale.background,
          textColor: config.layout.yScale.textColor,
          lineColor: config.layout.yScale.lineColor,
          lineWidthPx: config.layout.yScale.lineWidthPx,
        },
      },
      grid,
      series: builtScene.frame.series.map(mapScenePrimitive),
      objects: builtScene.frame.objects.map(mapScenePrimitive),
      overlays: builtScene.frame.overlays.map(mapScenePrimitive),
      topOverlays: [],
      text: [...gridText, ...builtScene.frame.labels.map((entry: SceneText) => mapSceneText(entry, layout))],
      overlayText: [],
      compactLinePaths: config.internalLod,
      selectedHighlight: builtScene.frame.selectedHighlight?.map(mapScenePrimitive),
      selectedAccent: builtScene.frame.selectedAccent,
      objectHighlights: mapObjectHighlights(builtScene.frame.objectHighlights),
    };
    return {
      drawList,
      layout,
      builtScene,
    };
  }

  decorateWithInteraction(
    drawList: DrawList,
    args: DecorateDrawListArgs,
  ): DrawList {
    const { interaction } = args;
    if (!interaction) return drawList;
    const overlays = drawList.overlays as Primitive[];
    const topOverlays = drawList.topOverlays as Primitive[];
    const text = drawList.text as TextEntry[];
    const overlayText = drawList.overlayText as TextEntry[];
    // Keep per-pixel-column path compaction active during gestures. Disabling it
    // mid-drag (the previous behavior) forced a full-resolution stroke of every
    // point on every drag frame — ~100x slower box-zoom at ~500k points — while
    // the min/max-per-column envelope is visually indistinguishable for dense data.

    const config = args.controller.peekConfig();
    const needsCursorState =
      config.showCrosshairLabels || config.showCursorSeriesMarker;
    const cursor = needsCursorState ? interaction.getCursorState() : null;
    const hover = interaction.getHoverState();
    const crosshair = interaction.getCrosshairState();
    if (config.showCrosshair && crosshair.enabled) {
      drawList.crosshair = {
        px: crosshair.px,
        py: crosshair.py,
        axis: crosshair.axis,
        color: config.crosshairColor,
        dash: config.crosshairDash
          ? {
              onPx: config.crosshairDash[0],
              offPx: config.crosshairDash[1],
            }
          : undefined,
      };
    }

    const indicator = interaction.getCursorIndicator();
    if (config.showIndicator && indicator.enabled) {
      drawList.cursorIndicator = {
        // Project through the interaction transform (same source as the
        // crosshair, log-axis aware) rather than a linear-only reimplementation.
        px: interaction.valueToPx(indicator.valueX, 0).x,
        color: indicator.color,
      };
    }

    const selection = interaction.getSelectionState();
    if (selection) {
      // A single-axis box spans the full extent of the untouched axis: "x"
      // (zoom X) covers the full Y range, "y" (zoom Y) covers the full X range.
      const xMin =
        selection.axis === "y"
          ? drawList.viewport.value.x.min
          : Math.min(selection.start[0], selection.current[0]);
      const xMax =
        selection.axis === "y"
          ? drawList.viewport.value.x.max
          : Math.max(selection.start[0], selection.current[0]);
      const yMin =
        selection.axis === "x"
          ? drawList.viewport.value.y.min
          : Math.min(selection.start[1], selection.current[1]);
      const yMax =
        selection.axis === "x"
          ? drawList.viewport.value.y.max
          : Math.max(selection.start[1], selection.current[1]);
      overlays.push({
        kind: "quad",
        mode: "rect",
        rects: new Float64Array([
          xMin - args.controller.model.axisOffsetX,
          yMin - args.controller.model.axisOffsetY,
          xMax - xMin,
          yMax - yMin,
        ]),
        count: 1,
        fill: withAlpha(config.crosshairColor, 0.16),
        stroke: withAlpha(config.crosshairColor, 0.85),
        strokeWidthPx: 1,
        roundness: 0,
        opacity: 1,
        origin: {
          x: args.controller.model.axisOffsetX,
          y: args.controller.model.axisOffsetY,
        },
      });
    }

    if (config.showCursorSeriesMarker && cursor?.inside) {
      const model = args.controller.model;
      const points = cursorSeriesPoints(cursor);
      for (let i = 0; i < points.length; i += 1) {
        const point = points[i]!;
        // A series on a secondary y-axis lives in that axis's range, so its
        // cursor marker must project through that axis (via the per-primitive
        // yRange tag) rather than the primary transform.
        const yAxisId = model.getSeries(point.seriesId)?.yAxisId;
        const yRange = yAxisId ? model.getExtraYRange(yAxisId) ?? undefined : undefined;
        topOverlays.push({
          kind: "quad",
          mode: "marker",
          centers: new Float64Array([
            point.x - model.axisOffsetX,
            point.y - model.axisOffsetY,
          ]),
          count: 1,
          sizePx: 6,
          fill: point.color,
          stroke: config.background,
          strokeWidthPx: 1,
          roundness: 0,
          opacity: 1,
          origin: {
            x: model.axisOffsetX,
            y: model.axisOffsetY,
          },
          yRange,
        });
      }
    }

    // Hover affordance: an unfocused object under the cursor gets a faint copy of
    // its focus box, so it reads as grabbable. Drawn beneath the selected
    // highlight; skipped for the already-selected object.
    const selectedObjectId = interaction.getSelectedObjectId();
    const hoverHit = hover?.hit;
    // Only hits that a click would actually focus (a line/border or a handle) —
    // not a band interior, where a click pans through rather than selecting.
    const hoverObjectId =
      hoverHit &&
      (hoverHit.kind === "object" || hoverHit.kind === "object-handle")
        ? hoverHit.objectId
        : null;
    if (
      hoverObjectId != null &&
      hoverObjectId !== selectedObjectId &&
      drawList.objectHighlights
    ) {
      const hl = drawList.objectHighlights.get(hoverObjectId);
      if (hl) {
        for (let i = 0; i < hl.length; i += 1) {
          const p = hl[i]!;
          topOverlays.push({
            ...p,
            opacity: (p.opacity ?? 1) * HOVER_HIGHLIGHT_OPACITY,
          });
        }
      }
    }

    topOverlays.push(...(drawList.selectedHighlight ?? []));

    const selectedHandles = interaction.getSelectedObjectHandles();
    if (selectedHandles.length > 0) {
      const hoverHandleId =
        hover?.hit?.kind === "object-handle" ? hover.hit.handleId : null;
      const accent = drawList.selectedAccent ?? config.crosshairColor;
      for (let i = 0; i < selectedHandles.length; i += 1) {
        const handle = selectedHandles[i]!;
        const active = hoverHandleId === handle.handleId;
        topOverlays.push({
          kind: "quad",
          mode: "marker",
          centers: new Float64Array([
            handle.x - args.controller.model.axisOffsetX,
            handle.y - args.controller.model.axisOffsetY,
          ]),
          count: 1,
          sizePx: Math.max(6, handle.sizePx - 1),
          fill: config.background,
          stroke: active ? withAlpha(accent, 0.92) : accent,
          strokeWidthPx: 1,
          roundness: 1,
          opacity: 1,
          origin: {
            x: args.controller.model.axisOffsetX,
            y: args.controller.model.axisOffsetY,
          },
        });
      }
    }

    if (config.showCrosshairLabels && cursor) {
      const plot = drawList.viewport.plot;
      const scales = drawList.viewport.scales;
      if (cursor.inside && cursor.px && cursor.formatted) {
        const xScaleSlot =
          scales.xSide === "top" ? scales.top : scales.bottom;
        const yScaleSlot =
          scales.ySide === "right" ? scales.right : scales.left;

        if (
          xScaleSlot &&
          drawList.crosshair &&
          (drawList.crosshair.axis === "x" || drawList.crosshair.axis === "xy")
        ) {
          const measured = measureTextFallback(
            args.measureText,
            cursor.formatted.x,
          );
          const rectWidth = measured.width + 10;
          overlayText.push({
            x: cursor.px.x - measured.width * 0.5,
            y: xScaleSlot.origin.y + (xScaleSlot.size.height - measured.height) * 0.5,
            text: cursor.formatted.x,
            color: config.layout.xScale.textColor,
            align: TextAlign.TopLeft,
            fixedBox: true,
            boxOrigin: {
              x: cursor.px.x - rectWidth * 0.5,
              y: xScaleSlot.origin.y,
            },
            clampRect: {
              minX: plot.origin.x,
              maxX: plot.origin.x + plot.size.width,
              minY: xScaleSlot.origin.y,
              maxY: xScaleSlot.origin.y + xScaleSlot.size.height,
            },
            box: {
              width: measured.width,
              height: measured.height,
              padX: 5,
              padY: 3,
              background: withAlpha(config.crosshairColor, 0.92),
              border: config.layout.xScale.lineColor,
              borderWidth: 1,
            },
          });
        }

        if (
          yScaleSlot &&
          drawList.crosshair &&
          (drawList.crosshair.axis === "y" || drawList.crosshair.axis === "xy")
        ) {
          const measured = measureTextFallback(
            args.measureText,
            cursor.formatted.y,
          );
          overlayText.push({
            x: yScaleSlot.origin.x + yScaleSlot.size.width * 0.5,
            y: cursor.px.y - (measured.height + 6) * 0.5,
            text: cursor.formatted.y,
            color: config.layout.yScale.textColor,
            align: TextAlign.Center,
            fixedBox: true,
            boxOrigin: {
              x: yScaleSlot.origin.x,
              y: cursor.px.y - (measured.height + 6) * 0.5,
            },
            clampRect: {
              minX: yScaleSlot.origin.x,
              maxX: yScaleSlot.origin.x + yScaleSlot.size.width,
              minY: plot.origin.y,
              maxY: plot.origin.y + plot.size.height,
            },
            box: {
              width: Math.max(1, yScaleSlot.size.width - 10),
              height: measured.height,
              exactWidth: true,
              padX: 5,
              padY: 3,
              background: withAlpha(config.crosshairColor, 0.92),
              border: config.layout.yScale.lineColor,
              borderWidth: 1,
            },
          });
        }
      }
    }

    return drawList;
  }
}
