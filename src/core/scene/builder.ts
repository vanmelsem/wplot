import type { PlotDomainModel } from "../domain/model";
import { createViewState, type NumericRange } from "../domain/view";
import type { RgbaColor } from "../domain/series";
import type { SceneFrame, ScenePrimitive, SceneText } from "./frame";
import {
  objectHandlePickingEntry,
  type SceneBuildContext,
  type PickingEntry,
  type ScenePickingIndex,
  type SeriesLegendRow,
} from "./contracts";
import { ObjectSceneRegistry, SeriesSceneRegistry } from "./registry";

const DEFAULT_BACKGROUND: RgbaColor = [0, 0, 0, 0];
const DEFAULT_OBJECT_ACCENT: RgbaColor = [0.2, 0.6, 1, 1];

function withAlpha(color: RgbaColor, alpha: number): RgbaColor {
  return [color[0], color[1], color[2], alpha];
}

function tagYRange(
  primitives: readonly ScenePrimitive[],
  yRange: NumericRange,
): ScenePrimitive[] {
  const out: ScenePrimitive[] = new Array(primitives.length);
  for (let i = 0; i < primitives.length; i += 1) {
    out[i] = { ...primitives[i]!, yRange };
  }
  return out;
}

export type BuildSceneArgs = {
  dpr: number;
  plotWidthPx: number;
  plotHeightPx: number;
  selectedObjectId?: number | null;
  xAxisHeightPx?: number;
  yAxisWidthPx?: number;
  xAxisSide?: "top" | "bottom";
  yAxisSide?: "left" | "right";
  background?: RgbaColor;
  formatXValue?: (value: number) => string;
  formatYValue?: (value: number) => string;
};

export type BuiltScene = {
  frame: SceneFrame;
  picking: ScenePickingIndex;
  legend: readonly SeriesLegendRow[];
};

export class SceneFrameBuilder {
  constructor(args: {
    seriesRegistry: SeriesSceneRegistry;
    objectRegistry: ObjectSceneRegistry;
  }) {
    this.seriesRegistry = args.seriesRegistry;
    this.objectRegistry = args.objectRegistry;
  }

  readonly seriesRegistry: SeriesSceneRegistry;
  readonly objectRegistry: ObjectSceneRegistry;

  build(model: PlotDomainModel, args: BuildSceneArgs): BuiltScene {
    const view = model.getView();
    const ctx: SceneBuildContext = {
      view: createViewState(view),
      axisOffsetX: model.axisOffsetX,
      axisOffsetY: model.axisOffsetY,
      dpr: args.dpr,
      plotWidthPx: args.plotWidthPx,
      plotHeightPx: args.plotHeightPx,
      xAxisHeightPx: args.xAxisHeightPx,
      yAxisWidthPx: args.yAxisWidthPx,
      xAxisSide: args.xAxisSide,
      yAxisSide: args.yAxisSide,
      background: args.background,
      formatXValue: args.formatXValue,
      formatYValue: args.formatYValue,
    };

    const series: ScenePrimitive[] = [];
    const objects: ScenePrimitive[] = [];
    const overlays: ScenePrimitive[] = [];
    const labels: SceneText[] = [];
    const picking: PickingEntry[] = [];
    const legend: SeriesLegendRow[] = [];
    let selectedHighlight: readonly ScenePrimitive[] | undefined;
    let selectedAccent: RgbaColor | undefined;
    const objectHighlights = new Map<number, readonly ScenePrimitive[]>();
    model.forEachSeries((record) => {
      if (!record.style.visible) return;
      const adapter = this.seriesRegistry.get(record.kind);
      const fragment = adapter.build(record, ctx);
      if (!fragment) return;
      // Series on a secondary y-axis project through that axis's range. The
      // range is stamped onto every emitted primitive so the linear renderer
      // maps Y through it; the common primary-axis path leaves fragments
      // untouched (yRange undefined), keeping output byte-identical.
      const yRange = record.yAxisId
        ? ctx.view.extraY?.[record.yAxisId]
        : undefined;
      if (fragment.primitives) {
        series.push(...(yRange ? tagYRange(fragment.primitives, yRange) : fragment.primitives));
      }
      if (fragment.overlays) {
        overlays.push(...(yRange ? tagYRange(fragment.overlays, yRange) : fragment.overlays));
      }
      if (fragment.labels) labels.push(...fragment.labels);
      if (fragment.picking) picking.push(...fragment.picking);
      if (record.style.showInLegend) {
        legend.push({
          seriesId: record.id,
          name: record.name,
          style: record.style,
          valueText: fragment.legendValueText,
        });
      }
    });

    model.forEachObject((record) => {
      if (!record.visible) return;
      const adapter = this.objectRegistry.get(record.kind);
      const fragment = adapter.build(record, ctx);
      if (!fragment) return;
      if (fragment.primitives) objects.push(...fragment.primitives);
      if (fragment.overlays) overlays.push(...fragment.overlays);
      if (fragment.labels) labels.push(...fragment.labels);
      if (fragment.picking) picking.push(...fragment.picking);
      // Editable objects: precompute the focus-box highlight for every unlocked
      // object so the overlay pass can paint it on hover (faint) or selection
      // (full) without rebuilding the scene. Few objects, so this is cheap.
      if (!record.locked && adapter.highlight) {
        const accent = adapter.accent?.(record.state) ?? DEFAULT_OBJECT_ACCENT;
        const highlight = adapter.highlight(record, ctx, withAlpha(accent, 0.94));
        objectHighlights.set(record.id, highlight);
        if (args.selectedObjectId === record.id) {
          selectedAccent = accent;
          selectedHighlight = highlight;
          const handles =
            adapter.handles?.(record, ctx) ?? model.getObjectHandles(record.id);
          for (let i = 0; i < handles.length; i += 1) {
            picking.push(objectHandlePickingEntry(record.id, handles[i]!));
          }
        }
      }
    });

    return {
      frame: {
        view: ctx.view,
        background: args.background ?? DEFAULT_BACKGROUND,
        grid: [],
        series,
        objects,
        overlays,
        labels,
        selectedHighlight,
        selectedAccent,
        objectHighlights,
      },
      picking: { entries: picking },
      legend,
    };
  }
}
