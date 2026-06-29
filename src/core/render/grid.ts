import { generateTicks } from "./axis";
import {
  Scratch,
  TextAlign,
  type MeasureTextFn,
  type Primitive,
  type TextEntry,
} from "./contracts";
import {
  getConfiguredAxisSpec,
  type PlotConfig,
} from "../domain/config";
import type { ViewValue } from "../domain/view";
import type { AxisLabelMetrics, RenderLayout } from "./layout";

type TickMetrics = {
  sizes: Array<{ width: number; height: number } | null>;
  maxWidth: number;
  maxHeight: number;
};

type ResolvedGridTicks = {
  xTicks: ReturnType<typeof generateTicks>;
  yTicks: ReturnType<typeof generateTicks>;
  xMetrics: TickMetrics;
  yMetrics: TickMetrics;
};

function collectLabelMetrics(
  ticks: ReturnType<typeof generateTicks>,
  measureLabel: (value: string) => { width: number; height: number },
): TickMetrics {
  const sizes = new Array<{ width: number; height: number } | null>(
    ticks.ticks.length,
  ).fill(null);
  let maxWidth = 0;
  let maxHeight = 0;
  for (let i = 0; i < ticks.ticks.length; i += 1) {
    const tick = ticks.ticks[i];
    if (!tick?.label) continue;
    const measured = measureLabel(tick.label);
    sizes[i] = measured;
    maxWidth = Math.max(maxWidth, measured.width);
    maxHeight = Math.max(maxHeight, measured.height);
  }
  return { sizes, maxWidth, maxHeight };
}

function resolveGridTicks(args: {
  config: PlotConfig;
  layout: RenderLayout;
  view: ViewValue;
  measureText?: MeasureTextFn;
}): ResolvedGridTicks {
  const { config, layout, view, measureText } = args;
  const plot = layout.plot;
  const axisX = getConfiguredAxisSpec(config, "x");
  const axisY = getConfiguredAxisSpec(config, "y");
  const labelPad = 6;
  const measureLabel = (value: string) =>
    measureText
      ? measureText({ text: value })
      : { width: value.length * 6, height: 12 };

  let xTicks = generateTicks({
    axis: "x",
    range: view.x,
    spanPx: plot.size.width,
    spacingPx: config.gridSpacing[0],
    spec: axisX,
    labels: true,
  });
  let yTicks = generateTicks({
    axis: "y",
    range: view.y,
    spanPx: plot.size.height,
    spacingPx: config.gridSpacing[1],
    spec: axisY,
    labels: true,
  });

  let xMetrics = collectLabelMetrics(xTicks, measureLabel);
  let yMetrics = collectLabelMetrics(yTicks, measureLabel);
  const targetXSpacing = Math.max(
    config.gridSpacing[0],
    xMetrics.maxWidth + labelPad,
  );
  const targetYSpacing = Math.max(
    config.gridSpacing[1],
    yMetrics.maxHeight + labelPad,
  );

  if (targetXSpacing > config.gridSpacing[0] + 0.5) {
    xTicks = generateTicks({
      axis: "x",
      range: view.x,
      spanPx: plot.size.width,
      spacingPx: targetXSpacing,
      spec: axisX,
      labels: true,
    });
    xMetrics = collectLabelMetrics(xTicks, measureLabel);
  }
  if (targetYSpacing > config.gridSpacing[1] + 0.5) {
    yTicks = generateTicks({
      axis: "y",
      range: view.y,
      spanPx: plot.size.height,
      spacingPx: targetYSpacing,
      spec: axisY,
      labels: true,
    });
    yMetrics = collectLabelMetrics(yTicks, measureLabel);
  }

  return { xTicks, yTicks, xMetrics, yMetrics };
}

export function measureGridAxisMetrics(args: {
  config: PlotConfig;
  layout: RenderLayout;
  view: ViewValue;
  measureText?: MeasureTextFn;
  axisMetrics: { x: AxisLabelMetrics; y: AxisLabelMetrics };
}): void {
  const resolved = resolveGridTicks(args);
  args.axisMetrics.x.maxWidth = Math.max(
    args.axisMetrics.x.maxWidth,
    resolved.xMetrics.maxWidth,
  );
  args.axisMetrics.x.maxHeight = Math.max(
    args.axisMetrics.x.maxHeight,
    resolved.xMetrics.maxHeight,
  );
  args.axisMetrics.y.maxWidth = Math.max(
    args.axisMetrics.y.maxWidth,
    resolved.yMetrics.maxWidth,
  );
  args.axisMetrics.y.maxHeight = Math.max(
    args.axisMetrics.y.maxHeight,
    resolved.yMetrics.maxHeight,
  );
}

export function buildGrid(args: {
  config: PlotConfig;
  layout: RenderLayout;
  view: ViewValue;
  out: Primitive[];
  text: TextEntry[];
  scratch: Scratch;
  measureText?: MeasureTextFn;
  axisMetrics?: { x: AxisLabelMetrics; y: AxisLabelMetrics };
  axisOffset?: { x: number; y: number };
}): void {
  const { config, layout, view, out, text, scratch, measureText, axisMetrics } = args;
  const plot = layout.plot;
  if (plot.size.width <= 0 || plot.size.height <= 0) return;

  const offsetX = args.axisOffset?.x ?? 0;
  const offsetY = args.axisOffset?.y ?? 0;
  const xScaleSlot =
    layout.scales.xSide === "top" ? layout.scales.top : layout.scales.bottom;
  const yScaleSlot =
    layout.scales.ySide === "right" ? layout.scales.right : layout.scales.left;
  const xTextColor = config.layout.xScale.textColor;
  const yTextColor = config.layout.yScale.textColor;

  const metricsX = axisMetrics?.x;
  const metricsY = axisMetrics?.y;
  const resolved = resolveGridTicks({
    config,
    layout,
    view,
    measureText,
  });
  const { xTicks, yTicks, xMetrics, yMetrics } = resolved;

  if (metricsX) {
    metricsX.maxWidth = Math.max(metricsX.maxWidth, xMetrics.maxWidth);
    metricsX.maxHeight = Math.max(metricsX.maxHeight, xMetrics.maxHeight);
  }
  if (metricsY) {
    metricsY.maxWidth = Math.max(metricsY.maxWidth, yMetrics.maxWidth);
    metricsY.maxHeight = Math.max(metricsY.maxHeight, yMetrics.maxHeight);
  }

  const xLinePoints = scratch.f64(xTicks.ticks.length * 4);
  const yLinePoints = scratch.f64(yTicks.ticks.length * 4);
  let xLineCount = 0;
  let yLineCount = 0;
  const spanX = view.x.max - view.x.min;
  const spanY = view.y.max - view.y.min;
  const xScale = spanX > 0 ? plot.size.width / spanX : 0;
  const yScale = spanY > 0 ? plot.size.height / spanY : 0;

  for (let i = 0; i < xTicks.ticks.length; i += 1) {
    const tick = xTicks.ticks[i]!;
    const x = plot.origin.x + (tick.value - view.x.min) * xScale;
    const isDividerTick =
      Math.abs(x - plot.origin.x) <= 0.75 ||
      Math.abs(x - (plot.origin.x + plot.size.width)) <= 0.75;

    if (!isDividerTick) {
      const base = xLineCount * 4;
      xLinePoints[base] = tick.value - offsetX;
      xLinePoints[base + 1] = view.y.min - offsetY;
      xLinePoints[base + 2] = tick.value - offsetX;
      xLinePoints[base + 3] = view.y.max - offsetY;
      xLineCount += 1;
    }

    if (!tick.label) continue;
    const measured = xMetrics.sizes[i] ?? { width: tick.label.length * 6, height: 12 };
    if (x < plot.origin.x || x > plot.origin.x + plot.size.width) continue;
    text.push({
      x: x - measured.width * 0.5,
      y: xScaleSlot
        ? xScaleSlot.origin.y + (xScaleSlot.size.height - measured.height) * 0.5
        : plot.origin.y + plot.size.height + 6,
      text: tick.label,
      color: xTextColor,
      align: TextAlign.TopLeft,
    });
  }

  if (xLineCount > 0) {
    out.push({
      kind: "path",
      segments: true,
      points: xLinePoints.subarray(0, xLineCount * 4),
      count: xLineCount,
      widthPx: 0.5,
      join: "miter",
      cap: "butt",
      color: config.gridColor,
      opacity: 1,
      origin: { x: offsetX, y: offsetY },
    });
  }

  for (let i = 0; i < yTicks.ticks.length; i += 1) {
    const tick = yTicks.ticks[i]!;
    const y = plot.origin.y + plot.size.height - (tick.value - view.y.min) * yScale;
    const isDividerTick =
      Math.abs(y - plot.origin.y) <= 0.75 ||
      Math.abs(y - (plot.origin.y + plot.size.height)) <= 0.75;

    if (!isDividerTick) {
      const base = yLineCount * 4;
      yLinePoints[base] = view.x.min - offsetX;
      yLinePoints[base + 1] = tick.value - offsetY;
      yLinePoints[base + 2] = view.x.max - offsetX;
      yLinePoints[base + 3] = tick.value - offsetY;
      yLineCount += 1;
    }

    if (!tick.label) continue;
    const measured = yMetrics.sizes[i] ?? { width: tick.label.length * 6, height: 12 };
    if (y < plot.origin.y || y > plot.origin.y + plot.size.height) continue;
    text.push({
      x:
        yScaleSlot && layout.scales.ySide === "right"
          ? yScaleSlot.origin.x + 8
          : yScaleSlot
            ? yScaleSlot.origin.x + yScaleSlot.size.width - 8 - measured.width
            : plot.origin.x - 8 - measured.width,
      y: y - measured.height * 0.5,
      text: tick.label,
      color: yTextColor,
      align: TextAlign.TopLeft,
    });
  }

  if (yLineCount > 0) {
    out.push({
      kind: "path",
      segments: true,
      points: yLinePoints.subarray(0, yLineCount * 4),
      count: yLineCount,
      widthPx: 0.5,
      join: "miter",
      cap: "butt",
      color: config.gridColor,
      opacity: 1,
      origin: { x: offsetX, y: offsetY },
    });
  }
}
