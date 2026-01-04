import type { LayoutConfig } from "./model";
import type { Edges } from "./core";

export type AxisLabelMetrics = {
  maxWidth: number;
  maxHeight: number;
};

export type AxisGutters = Edges<number>;

const AXIS_LABEL_PADDING = 8;
const AXIS_GUTTER_GROW_THRESHOLD = 1;
const AXIS_GUTTER_SHRINK_THRESHOLD = 4;

function applyHysteresis(prev: number, next: number): number {
  if (next > prev + AXIS_GUTTER_GROW_THRESHOLD) return next;
  if (next < prev - AXIS_GUTTER_SHRINK_THRESHOLD) return next;
  return prev;
}

export function computeAxisGutters(args: {
  layout: LayoutConfig;
  metricsX: AxisLabelMetrics;
  metricsY: AxisLabelMetrics;
  prev?: AxisGutters;
}): AxisGutters {
  const { layout, metricsX, metricsY, prev } = args;
  const margin = layout.margin;
  const xAxisSize =
    typeof layout.xAxis.size === "number"
      ? layout.xAxis.size
      : Math.max(layout.xAxis.min, metricsX.maxHeight + AXIS_LABEL_PADDING);
  const yAxisSize =
    typeof layout.yAxis.size === "number"
      ? layout.yAxis.size
      : Math.max(layout.yAxis.min, metricsY.maxWidth + AXIS_LABEL_PADDING);

  const target = {
    left: Math.max(margin.left, yAxisSize),
    right: margin.right,
    top: margin.top,
    bottom: Math.max(margin.bottom, xAxisSize),
  };

  if (!prev) return target;

  return {
    left: applyHysteresis(prev.left, target.left),
    right: applyHysteresis(prev.right, target.right),
    top: applyHysteresis(prev.top, target.top),
    bottom: applyHysteresis(prev.bottom, target.bottom),
  };
}
