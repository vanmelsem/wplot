import type {
  GuideHObjectState,
  GuideVObjectState,
  RectObjectState,
  SegmentObjectState,
  TagObjectState,
  XBandObjectState,
  YBandObjectState,
} from "./model";
import type { ObjectHandle } from "../../core/domain/objects";
import type { RgbaColor } from "../../core/domain/series";
import type {
  ObjectSceneAdapter,
  SceneBuildContext,
} from "../../core/scene/contracts";
import type { SceneText } from "../../core/scene/frame";
import {
  BOX_LABEL_PAD_X,
  BOX_LABEL_TEXT_HEIGHT,
  measureBoxLabel,
  plotClampRect,
  pushBoxLabel,
  valueToPlotPx,
  xAxisClampRect,
  yAxisClampRect,
} from "../../core/scene/primitives";
import { AnnotationObjectKinds as BuiltInObjectKinds } from "./kinds";

const X_AXIS_CHIP_EXTRA_HEIGHT_PX = 2;
const HANDLE_SIZE_PX = 10;

function createOrigin(ctx: SceneBuildContext) {
  return { x: ctx.axisOffsetX, y: ctx.axisOffsetY };
}

function highlightWithAlpha(color: RgbaColor, alpha: number): RgbaColor {
  return [color[0], color[1], color[2], alpha];
}

function lineAnchorStart(
  anchor: "start" | "center" | "end",
  spanStart: number,
  spanSize: number,
  boxSize: number,
): number {
  switch (anchor) {
    case "center":
      return spanStart + (spanSize - boxSize) * 0.5;
    case "end":
      return spanStart + spanSize - boxSize;
    default:
      return spanStart;
  }
}

function crossAnchorStart(
  align: "before" | "center" | "after",
  anchorPx: number,
  boxSize: number,
): number {
  switch (align) {
    case "before":
      return anchorPx - boxSize;
    case "after":
      return anchorPx;
    default:
      return anchorPx - boxSize * 0.5;
  }
}

function pushHorizontalGuideLabel(
  labels: SceneText[],
  ctx: SceneBuildContext,
  data: GuideHObjectState,
): void {
  if (!data.label) return;
  const lineY = valueToPlotPx(ctx, ctx.view.x.min, data.y).y;
  const measured = measureBoxLabel(data.label);
  const boxX = lineAnchorStart(
    data.labelAnchor,
    0,
    ctx.plotWidthPx,
    measured.rectWidth,
  );
  const boxY = crossAnchorStart(data.labelAlign, lineY, measured.rectHeight);
  pushBoxLabel({
    out: labels,
    x: boxX + BOX_LABEL_PAD_X,
    y: boxY,
    label: data.label,
    color: data.labelColor,
    background: data.labelBackground,
    border: data.labelBorder,
    borderWidthPx: data.labelBorderWidthPx,
    fixedBox: true,
    boxOrigin: { x: boxX, y: boxY },
    clampRect: plotClampRect(ctx),
  });
}

function pushVerticalGuideLabel(
  labels: SceneText[],
  ctx: SceneBuildContext,
  data: GuideVObjectState,
): void {
  if (!data.label) return;
  const lineX = valueToPlotPx(ctx, data.x, ctx.view.y.min).x;
  const measured = measureBoxLabel(data.label);
  const boxX = crossAnchorStart(data.labelAlign, lineX, measured.rectWidth);
  const boxY = lineAnchorStart(
    data.labelAnchor,
    0,
    ctx.plotHeightPx,
    measured.rectHeight,
  );
  pushBoxLabel({
    out: labels,
    x: boxX + BOX_LABEL_PAD_X,
    y: boxY,
    label: data.label,
    color: data.labelColor,
    background: data.labelBackground,
    border: data.labelBorder,
    borderWidthPx: data.labelBorderWidthPx,
    fixedBox: true,
    boxOrigin: { x: boxX, y: boxY },
    clampRect: plotClampRect(ctx),
  });
}

function pushHorizontalGuideAxisLabel(
  labels: SceneText[],
  ctx: SceneBuildContext,
  data: GuideHObjectState,
): void {
  if (!data.showAxisValueLabel) return;
  const clampRect = yAxisClampRect(ctx);
  if (!clampRect) return;
  const label = ctx.formatYValue?.(data.y) ?? `${data.y}`;
  const measured = measureBoxLabel(label);
  const lineY = valueToPlotPx(ctx, ctx.view.x.min, data.y).y;
  const width = Math.max(1, ctx.yAxisWidthPx ?? 0);
  const innerWidth = Math.max(1, width - BOX_LABEL_PAD_X * 2);
  const boxX = (ctx.yAxisSide ?? "left") === "right" ? ctx.plotWidthPx : -width;
  const boxY = lineY - measured.rectHeight * 0.5;
  labels.push({
    x: boxX + width * 0.5,
    y: boxY,
    text: label,
    color: data.axisLabelColor,
    align: "center",
    fixedBox: true,
    boxOrigin: { x: boxX, y: boxY },
    clampRect,
    box: {
      width: innerWidth,
      height: measured.textHeight,
      exactWidth: true,
      padX: BOX_LABEL_PAD_X,
      padY: 3,
      background: data.axisLabelBackground,
      border: data.axisLabelBorder,
      borderWidth: data.axisLabelBorderWidthPx,
    },
  });
}

function pushVerticalGuideAxisLabel(
  labels: SceneText[],
  ctx: SceneBuildContext,
  data: GuideVObjectState,
): void {
  if (!data.showAxisValueLabel) return;
  const clampRect = xAxisClampRect(ctx);
  if (!clampRect) return;
  const label = ctx.formatXValue?.(data.x) ?? `${data.x}`;
  const measured = measureBoxLabel(label);
  const lineX = valueToPlotPx(ctx, data.x, ctx.view.y.min).x;
  const boxX = lineX - measured.rectWidth * 0.5;
  const boxY =
    (ctx.xAxisSide ?? "bottom") === "top"
      ? -(ctx.xAxisHeightPx ?? 0)
      : ctx.plotHeightPx;
  pushBoxLabel({
    out: labels,
    x: boxX + BOX_LABEL_PAD_X,
    y: boxY,
    label,
    color: data.axisLabelColor,
    background: data.axisLabelBackground,
    border: data.axisLabelBorder,
    borderWidthPx: data.axisLabelBorderWidthPx,
    fixedBox: true,
    boxOrigin: { x: boxX, y: boxY },
    clampRect,
    boxHeight: BOX_LABEL_TEXT_HEIGHT + X_AXIS_CHIP_EXTRA_HEIGHT_PX,
    boxTextBaseline: "top",
    boxTextTrack: "x-axis",
  });
}

function boxLabelArray() {
  return [] as SceneText[];
}

function centeredSpanLabelX(
  centerX: number,
  label: string,
  plotWidthPx: number,
): number {
  const measured = measureBoxLabel(label);
  return Math.max(0, Math.min(plotWidthPx - measured.rectWidth, centerX - measured.rectWidth * 0.5));
}

function centeredSpanLabelY(
  centerY: number,
  label: string,
  plotHeightPx: number,
): number {
  const measured = measureBoxLabel(label);
  return Math.max(0, Math.min(plotHeightPx - measured.rectHeight, centerY - measured.rectHeight * 0.5));
}

function segmentLabelBoxOrigin(
  ctx: SceneBuildContext,
  state: SegmentObjectState,
  label: string,
): { x: number; y: number } {
  const start = valueToPlotPx(ctx, state.x0, state.y0);
  const end = valueToPlotPx(ctx, state.x1, state.y1);
  const measured = measureBoxLabel(label);
  const midX = (start.x + end.x) * 0.5;
  const midY = (start.y + end.y) * 0.5;
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const length = Math.hypot(dx, dy);
  let normalX = 0;
  let normalY = -1;

  if (length > 0.001) {
    normalX = -dy / length;
    normalY = dx / length;
    if (normalY > 0) {
      normalX *= -1;
      normalY *= -1;
    }
  }

  const offset = measured.rectHeight * 0.5 + 6;
  const centerX = midX + normalX * offset;
  const centerY = midY + normalY * offset;
  return {
    x: centerX - measured.rectWidth * 0.5,
    y: centerY - measured.rectHeight * 0.5,
  };
}

function viewMidX(ctx: SceneBuildContext): number {
  return (ctx.view.x.min + ctx.view.x.max) * 0.5;
}

function viewMidY(ctx: SceneBuildContext): number {
  return (ctx.view.y.min + ctx.view.y.max) * 0.5;
}

function rectHandles(state: RectObjectState): readonly ObjectHandle[] {
  const xMin = Math.min(state.xMin, state.xMax);
  const xMax = Math.max(state.xMin, state.xMax);
  const yMin = Math.min(state.yMin, state.yMax);
  const yMax = Math.max(state.yMin, state.yMax);
  const xMid = (xMin + xMax) * 0.5;
  const yMid = (yMin + yMax) * 0.5;
  return [
    { id: 0, x: xMin, y: yMin, sizePx: HANDLE_SIZE_PX },
    { id: 1, x: xMax, y: yMin, sizePx: HANDLE_SIZE_PX },
    { id: 2, x: xMax, y: yMax, sizePx: HANDLE_SIZE_PX },
    { id: 3, x: xMin, y: yMax, sizePx: HANDLE_SIZE_PX },
    { id: 4, x: xMid, y: yMin, sizePx: HANDLE_SIZE_PX },
    { id: 5, x: xMax, y: yMid, sizePx: HANDLE_SIZE_PX },
    { id: 6, x: xMid, y: yMax, sizePx: HANDLE_SIZE_PX },
    { id: 7, x: xMin, y: yMid, sizePx: HANDLE_SIZE_PX },
  ];
}

function guideHHandles(
  state: GuideHObjectState,
  ctx: SceneBuildContext,
): readonly ObjectHandle[] {
  return [
    {
      id: 0,
      x: viewMidX(ctx),
      y: state.y,
      sizePx: HANDLE_SIZE_PX,
    },
  ];
}

function guideVHandles(
  state: GuideVObjectState,
  ctx: SceneBuildContext,
): readonly ObjectHandle[] {
  return [
    {
      id: 0,
      x: state.x,
      y: viewMidY(ctx),
      sizePx: HANDLE_SIZE_PX,
    },
  ];
}

function xBandHandles(
  state: XBandObjectState,
  ctx: SceneBuildContext,
): readonly ObjectHandle[] {
  const xMin = Math.min(state.xMin, state.xMax);
  const xMax = Math.max(state.xMin, state.xMax);
  const yMid = viewMidY(ctx);
  return [
    { id: 0, x: xMin, y: yMid, sizePx: HANDLE_SIZE_PX },
    { id: 1, x: xMax, y: yMid, sizePx: HANDLE_SIZE_PX },
  ];
}

function yBandHandles(
  state: YBandObjectState,
  ctx: SceneBuildContext,
): readonly ObjectHandle[] {
  const yMin = Math.min(state.yMin, state.yMax);
  const yMax = Math.max(state.yMin, state.yMax);
  const xMid = viewMidX(ctx);
  return [
    { id: 0, x: xMid, y: yMin, sizePx: HANDLE_SIZE_PX },
    { id: 1, x: xMid, y: yMax, sizePx: HANDLE_SIZE_PX },
  ];
}

function segmentHandles(state: SegmentObjectState): readonly ObjectHandle[] {
  return [
    { id: 0, x: state.x0, y: state.y0, sizePx: HANDLE_SIZE_PX },
    { id: 1, x: state.x1, y: state.y1, sizePx: HANDLE_SIZE_PX },
  ];
}

export const GuideHObjectSceneAdapter: ObjectSceneAdapter<GuideHObjectState> = {
  kind: BuiltInObjectKinds.guideH,

  handles(record, ctx) {
    return guideHHandles(record.state, ctx);
  },

  accent(state) {
    return state.color;
  },

  highlight(record, ctx, color) {
    const origin = createOrigin(ctx);
    return [
      {
        kind: "path",
        points: new Float64Array([
          ctx.view.x.min - origin.x,
          record.state.y - origin.y,
          ctx.view.x.max - origin.x,
          record.state.y - origin.y,
        ]),
        count: 2,
        widthPx: Math.max(2, record.state.widthPx + 2),
        join: "miter",
        cap: "butt",
        color,
        opacity: 1,
        origin,
      },
    ];
  },

  build(record, ctx) {
    const origin = createOrigin(ctx);
    const points = new Float64Array([
      ctx.view.x.min - ctx.axisOffsetX,
      record.state.y - ctx.axisOffsetY,
      ctx.view.x.max - ctx.axisOffsetX,
      record.state.y - ctx.axisOffsetY,
    ]);
    const labels = boxLabelArray();
    pushHorizontalGuideLabel(labels, ctx, record.state);
    pushHorizontalGuideAxisLabel(labels, ctx, record.state);
    return {
      primitives: [
        {
          kind: "path",
          points,
          count: 2,
          widthPx: record.state.widthPx,
          join: "miter",
          cap: "butt",
          color: record.state.color,
          opacity: 1,
          origin,
        },
      ],
      labels,
      picking: [
        {
          kind: "object-horizontal-line",
          objectId: record.id,
          y: record.state.y,
        },
      ],
    };
  },
};

export const GuideVObjectSceneAdapter: ObjectSceneAdapter<GuideVObjectState> = {
  kind: BuiltInObjectKinds.guideV,

  handles(record, ctx) {
    return guideVHandles(record.state, ctx);
  },

  accent(state) {
    return state.color;
  },

  highlight(record, ctx, color) {
    const origin = createOrigin(ctx);
    return [
      {
        kind: "path",
        points: new Float64Array([
          record.state.x - origin.x,
          ctx.view.y.min - origin.y,
          record.state.x - origin.x,
          ctx.view.y.max - origin.y,
        ]),
        count: 2,
        widthPx: Math.max(2, record.state.widthPx + 2),
        join: "miter",
        cap: "butt",
        color,
        opacity: 1,
        origin,
      },
    ];
  },

  build(record, ctx) {
    const origin = createOrigin(ctx);
    const points = new Float64Array([
      record.state.x - ctx.axisOffsetX,
      ctx.view.y.min - ctx.axisOffsetY,
      record.state.x - ctx.axisOffsetX,
      ctx.view.y.max - ctx.axisOffsetY,
    ]);
    const labels = boxLabelArray();
    pushVerticalGuideLabel(labels, ctx, record.state);
    pushVerticalGuideAxisLabel(labels, ctx, record.state);
    return {
      primitives: [
        {
          kind: "path",
          points,
          count: 2,
          widthPx: record.state.widthPx,
          join: "miter",
          cap: "butt",
          color: record.state.color,
          opacity: 1,
          origin,
        },
      ],
      labels,
      picking: [
        {
          kind: "object-vertical-line",
          objectId: record.id,
          x: record.state.x,
        },
      ],
    };
  },
};

export const RectObjectSceneAdapter: ObjectSceneAdapter<RectObjectState> = {
  kind: BuiltInObjectKinds.rect,

  handles(record) {
    return rectHandles(record.state);
  },

  accent(state) {
    return state.stroke;
  },

  highlight(record, ctx, color) {
    const origin = createOrigin(ctx);
    const xMin = Math.min(record.state.xMin, record.state.xMax);
    const xMax = Math.max(record.state.xMin, record.state.xMax);
    const yMin = Math.min(record.state.yMin, record.state.yMax);
    const yMax = Math.max(record.state.yMin, record.state.yMax);
    return [
      {
        kind: "rect",
        rects: new Float64Array([
          xMin - origin.x,
          yMin - origin.y,
          xMax - xMin,
          yMax - yMin,
        ]),
        count: 1,
        fill: highlightWithAlpha(color, 0.08),
        stroke: color,
        strokeWidthPx: 2,
        roundness: 0,
        opacity: 1,
        origin,
      },
    ];
  },

  build(record, ctx) {
    const xMin = Math.min(record.state.xMin, record.state.xMax);
    const xMax = Math.max(record.state.xMin, record.state.xMax);
    const yMin = Math.min(record.state.yMin, record.state.yMax);
    const yMax = Math.max(record.state.yMin, record.state.yMax);
    const labels = boxLabelArray();
    if (record.state.label) {
      const anchorMin = valueToPlotPx(ctx, xMin, yMax);
      const anchorMax = valueToPlotPx(ctx, xMax, yMax);
      const labelLeft = centeredSpanLabelX(
        (anchorMin.x + anchorMax.x) * 0.5,
        record.state.label,
        ctx.plotWidthPx,
      );
      const labelTop = Math.max(0, Math.min(ctx.plotHeightPx, anchorMin.y));
      pushBoxLabel({
        out: labels,
        x: labelLeft + 5,
        y: labelTop + 9,
        label: record.state.label,
        color: record.state.labelColor,
        background: record.state.labelBackground,
        border: record.state.labelBorder,
        borderWidthPx: record.state.labelBorderWidthPx,
        fixedBox: true,
        boxOrigin: { x: labelLeft, y: labelTop },
        clampRect: plotClampRect(ctx),
      });
    }
    return {
      primitives: [
        {
          kind: "rect",
          rects: new Float64Array([
            xMin - ctx.axisOffsetX,
            yMin - ctx.axisOffsetY,
            xMax - xMin,
            yMax - yMin,
          ]),
          count: 1,
          fill: record.state.fill,
          stroke: record.state.stroke,
          strokeWidthPx: record.state.strokeWidthPx,
          roundness: 0,
          opacity: 1,
          origin: createOrigin(ctx),
        },
      ],
      labels,
      picking: [
        {
          kind: "object-rect",
          objectId: record.id,
          xMin,
          xMax,
          yMin,
          yMax,
        },
      ],
    };
  },
};

export const XBandObjectSceneAdapter: ObjectSceneAdapter<XBandObjectState> = {
  kind: BuiltInObjectKinds.xBand,

  handles(record, ctx) {
    return xBandHandles(record.state, ctx);
  },

  accent(state) {
    return state.stroke;
  },

  highlight(record, ctx, color) {
    const origin = createOrigin(ctx);
    const xMin = Math.min(record.state.xMin, record.state.xMax);
    const xMax = Math.max(record.state.xMin, record.state.xMax);
    return [
      {
        kind: "rect",
        rects: new Float64Array([
          xMin - origin.x,
          ctx.view.y.min - origin.y,
          xMax - xMin,
          ctx.view.y.max - ctx.view.y.min,
        ]),
        count: 1,
        fill: highlightWithAlpha(color, 0.06),
        stroke: highlightWithAlpha(color, 0),
        strokeWidthPx: 0,
        roundness: 0,
        opacity: 1,
        origin,
      },
      {
        kind: "path",
        points: new Float64Array([
          xMin - origin.x,
          ctx.view.y.min - origin.y,
          xMin - origin.x,
          ctx.view.y.max - origin.y,
          xMax - origin.x,
          ctx.view.y.min - origin.y,
          xMax - origin.x,
          ctx.view.y.max - origin.y,
        ]),
        count: 2,
        segments: true,
        widthPx: 2,
        join: "miter",
        cap: "butt",
        color,
        opacity: 1,
        origin,
      },
    ];
  },

  build(record, ctx) {
    const xMin = Math.min(record.state.xMin, record.state.xMax);
    const xMax = Math.max(record.state.xMin, record.state.xMax);
    const origin = createOrigin(ctx);
    const primitives = [
      {
        kind: "rect" as const,
        rects: new Float64Array([
          xMin - ctx.axisOffsetX,
          ctx.view.y.min - ctx.axisOffsetY,
          xMax - xMin,
          ctx.view.y.max - ctx.view.y.min,
        ]),
        count: 1,
        fill: record.state.fill,
        stroke: record.state.fill,
        strokeWidthPx: 0,
        roundness: 0,
        opacity: 1,
        origin,
      },
      {
        kind: "path" as const,
        points: new Float64Array([
          xMin - ctx.axisOffsetX,
          ctx.view.y.min - ctx.axisOffsetY,
          xMin - ctx.axisOffsetX,
          ctx.view.y.max - ctx.axisOffsetY,
          xMax - ctx.axisOffsetX,
          ctx.view.y.min - ctx.axisOffsetY,
          xMax - ctx.axisOffsetX,
          ctx.view.y.max - ctx.axisOffsetY,
        ]),
        count: 2,
        segments: true,
        widthPx: record.state.strokeWidthPx,
        join: "miter" as const,
        cap: "butt" as const,
        color: record.state.stroke,
        opacity: 1,
        origin,
      },
    ];
    const labels = boxLabelArray();
    if (record.state.label) {
      const anchorMin = valueToPlotPx(ctx, xMin, ctx.view.y.max);
      const anchorMax = valueToPlotPx(ctx, xMax, ctx.view.y.max);
      const labelLeft = centeredSpanLabelX(
        (anchorMin.x + anchorMax.x) * 0.5,
        record.state.label,
        ctx.plotWidthPx,
      );
      pushBoxLabel({
        out: labels,
        x: labelLeft + 5,
        y: 9,
        label: record.state.label,
        color: record.state.labelColor,
        background: record.state.labelBackground,
        border: record.state.labelBorder,
        borderWidthPx: record.state.labelBorderWidthPx,
        fixedBox: true,
        boxOrigin: { x: labelLeft, y: 0 },
        clampRect: plotClampRect(ctx),
      });
    }
    if (record.state.showAxisValueLabels) {
      const clampRect = xAxisClampRect(ctx);
      const boxY =
        (ctx.xAxisSide ?? "bottom") === "top"
          ? -(ctx.xAxisHeightPx ?? 0)
          : ctx.plotHeightPx;
      if (clampRect) {
        const pushChip = (x: number, label: string) => {
          const measured = measureBoxLabel(label);
          const lineX = valueToPlotPx(ctx, x, ctx.view.y.min).x;
          const boxX = lineX - measured.rectWidth * 0.5;
          pushBoxLabel({
            out: labels,
            x: boxX + BOX_LABEL_PAD_X,
            y: boxY,
            label,
            color: record.state.axisLabelColor,
            background: record.state.axisLabelBackground,
            border: record.state.axisLabelBorder,
            borderWidthPx: record.state.axisLabelBorderWidthPx,
            fixedBox: true,
            boxOrigin: { x: boxX, y: boxY },
            clampRect,
            boxHeight: BOX_LABEL_TEXT_HEIGHT + X_AXIS_CHIP_EXTRA_HEIGHT_PX,
            boxTextBaseline: "top",
            boxTextTrack: "x-axis",
          });
        };
        pushChip(xMin, ctx.formatXValue?.(xMin) ?? `${xMin}`);
        pushChip(xMax, ctx.formatXValue?.(xMax) ?? `${xMax}`);
      }
    }
    return {
      primitives,
      labels,
      picking: [
        {
          kind: "object-x-band",
          objectId: record.id,
          xMin,
          xMax,
        },
      ],
    };
  },
};

export const YBandObjectSceneAdapter: ObjectSceneAdapter<YBandObjectState> = {
  kind: BuiltInObjectKinds.yBand,

  handles(record, ctx) {
    return yBandHandles(record.state, ctx);
  },

  accent(state) {
    return state.stroke;
  },

  highlight(record, ctx, color) {
    const origin = createOrigin(ctx);
    const yMin = Math.min(record.state.yMin, record.state.yMax);
    const yMax = Math.max(record.state.yMin, record.state.yMax);
    return [
      {
        kind: "rect",
        rects: new Float64Array([
          ctx.view.x.min - origin.x,
          yMin - origin.y,
          ctx.view.x.max - ctx.view.x.min,
          yMax - yMin,
        ]),
        count: 1,
        fill: highlightWithAlpha(color, 0.06),
        stroke: highlightWithAlpha(color, 0),
        strokeWidthPx: 0,
        roundness: 0,
        opacity: 1,
        origin,
      },
      {
        kind: "path",
        points: new Float64Array([
          ctx.view.x.min - origin.x,
          yMin - origin.y,
          ctx.view.x.max - origin.x,
          yMin - origin.y,
          ctx.view.x.min - origin.x,
          yMax - origin.y,
          ctx.view.x.max - origin.x,
          yMax - origin.y,
        ]),
        count: 2,
        segments: true,
        widthPx: 2,
        join: "miter",
        cap: "butt",
        color,
        opacity: 1,
        origin,
      },
    ];
  },

  build(record, ctx) {
    const yMin = Math.min(record.state.yMin, record.state.yMax);
    const yMax = Math.max(record.state.yMin, record.state.yMax);
    const origin = createOrigin(ctx);
    const labels = boxLabelArray();
    if (record.state.label) {
      const anchorMin = valueToPlotPx(ctx, ctx.view.x.min, yMin);
      const anchorMax = valueToPlotPx(ctx, ctx.view.x.min, yMax);
      const labelTop = centeredSpanLabelY(
        (anchorMin.y + anchorMax.y) * 0.5,
        record.state.label,
        ctx.plotHeightPx,
      );
      pushBoxLabel({
        out: labels,
        x: 5,
        y: labelTop + 9,
        label: record.state.label,
        color: record.state.labelColor,
        background: record.state.labelBackground,
        border: record.state.labelBorder,
        borderWidthPx: record.state.labelBorderWidthPx,
        fixedBox: true,
        boxOrigin: { x: 0, y: labelTop },
        clampRect: plotClampRect(ctx),
      });
    }
    if (record.state.showAxisValueLabels) {
      const clampRect = yAxisClampRect(ctx);
      const width = Math.max(1, ctx.yAxisWidthPx ?? 0);
      const boxX = (ctx.yAxisSide ?? "left") === "right" ? ctx.plotWidthPx : -width;
      if (clampRect) {
        const pushChip = (y: number, label: string) => {
          const measured = measureBoxLabel(label);
          const lineY = valueToPlotPx(ctx, ctx.view.x.min, y).y;
          const innerWidth = Math.max(1, width - BOX_LABEL_PAD_X * 2);
          const boxY = lineY - measured.rectHeight * 0.5;
          labels.push({
            x: boxX + width * 0.5,
            y: boxY,
            text: label,
            color: record.state.axisLabelColor,
            align: "center",
            fixedBox: true,
            boxOrigin: { x: boxX, y: boxY },
            clampRect,
            box: {
              width: innerWidth,
              height: measured.textHeight,
              exactWidth: true,
              padX: BOX_LABEL_PAD_X,
              padY: 3,
              background: record.state.axisLabelBackground,
              border: record.state.axisLabelBorder,
              borderWidth: record.state.axisLabelBorderWidthPx,
            },
          });
        };
        pushChip(yMin, ctx.formatYValue?.(yMin) ?? `${yMin}`);
        pushChip(yMax, ctx.formatYValue?.(yMax) ?? `${yMax}`);
      }
    }
    return {
      primitives: [
        {
          kind: "rect",
          rects: new Float64Array([
            ctx.view.x.min - ctx.axisOffsetX,
            yMin - ctx.axisOffsetY,
            ctx.view.x.max - ctx.view.x.min,
            yMax - yMin,
          ]),
          count: 1,
          fill: record.state.fill,
          stroke: record.state.fill,
          strokeWidthPx: 0,
          roundness: 0,
          opacity: 1,
          origin,
        },
        {
          kind: "path",
          points: new Float64Array([
            ctx.view.x.min - ctx.axisOffsetX,
            yMin - ctx.axisOffsetY,
            ctx.view.x.max - ctx.axisOffsetX,
            yMin - ctx.axisOffsetY,
            ctx.view.x.min - ctx.axisOffsetX,
            yMax - ctx.axisOffsetY,
            ctx.view.x.max - ctx.axisOffsetX,
            yMax - ctx.axisOffsetY,
          ]),
          count: 2,
          segments: true,
          widthPx: record.state.strokeWidthPx,
          join: "miter",
          cap: "butt",
          color: record.state.stroke,
          opacity: 1,
          origin,
        },
      ],
      labels,
      picking: [
        {
          kind: "object-y-band",
          objectId: record.id,
          yMin,
          yMax,
        },
      ],
    };
  },
};

export const SegmentObjectSceneAdapter: ObjectSceneAdapter<SegmentObjectState> = {
  kind: BuiltInObjectKinds.segment,

  handles(record) {
    return segmentHandles(record.state);
  },

  accent(state) {
    return state.color;
  },

  highlight(record, ctx, color) {
    const origin = createOrigin(ctx);
    return [
      {
        kind: "path",
        points: new Float64Array([
          record.state.x0 - origin.x,
          record.state.y0 - origin.y,
          record.state.x1 - origin.x,
          record.state.y1 - origin.y,
        ]),
        count: 2,
        widthPx: 3,
        join: "miter",
        cap: "butt",
        color,
        opacity: 1,
        origin,
      },
    ];
  },

  build(record, ctx) {
    const origin = createOrigin(ctx);
    const labels = boxLabelArray();
    if (record.state.label) {
      const boxOrigin = segmentLabelBoxOrigin(
        ctx,
        record.state,
        record.state.label,
      );
      pushBoxLabel({
        out: labels,
        x: boxOrigin.x + BOX_LABEL_PAD_X,
        y: boxOrigin.y,
        label: record.state.label,
        color: record.state.labelColor,
        background: record.state.labelBackground,
        border: record.state.labelBorder,
        borderWidthPx: record.state.labelBorderWidthPx,
        boxOrigin,
        clampRect: plotClampRect(ctx),
      });
    }
    return {
      primitives: [
        {
          kind: "path",
          points: new Float64Array([
            record.state.x0 - ctx.axisOffsetX,
            record.state.y0 - ctx.axisOffsetY,
            record.state.x1 - ctx.axisOffsetX,
            record.state.y1 - ctx.axisOffsetY,
          ]),
          count: 2,
          widthPx: record.state.widthPx,
          join: "miter",
          cap: "butt",
          color: record.state.color,
          opacity: 1,
          origin,
        },
      ],
      labels,
      picking: [
        {
          kind: "object-segment",
          objectId: record.id,
          x0: record.state.x0,
          y0: record.state.y0,
          x1: record.state.x1,
          y1: record.state.y1,
        },
      ],
    };
  },
};

export const TagObjectSceneAdapter: ObjectSceneAdapter<TagObjectState> = {
  kind: BuiltInObjectKinds.tag,

  accent(state) {
    return state.color;
  },

  highlight(record, ctx, color) {
    const origin = createOrigin(ctx);
    return [
      {
        kind: "marker",
        centers: new Float64Array([
          record.state.x - origin.x,
          record.state.y - origin.y,
        ]),
        count: 1,
        sizePx: Math.max(10, record.state.markerSizePx + 8),
        fill: highlightWithAlpha(color, 0.12),
        stroke: color,
        strokeWidthPx: 2,
        roundness: 2,
        opacity: 1,
        origin,
      },
    ];
  },

  build(record, ctx) {
    const anchor = valueToPlotPx(ctx, record.state.x, record.state.y);
    return {
      primitives: [
        {
          kind: "marker",
          centers: new Float64Array([
            record.state.x - ctx.axisOffsetX,
            record.state.y - ctx.axisOffsetY,
          ]),
          count: 1,
          sizePx: record.state.markerSizePx,
          fill: record.state.color,
          stroke: record.state.color,
          strokeWidthPx: 0,
          roundness: record.state.markerRoundness,
          opacity: 1,
          origin: createOrigin(ctx),
        },
      ],
      labels: [
        {
          x: anchor.x + record.state.offsetXPx,
          y: anchor.y + record.state.offsetYPx,
          text: record.state.text,
          color: record.state.color,
          align: "top-left",
          box: {
            width: Math.max(8, record.state.text.length * 7),
            height: 12,
            padX: 4,
            padY: 2,
            background: record.state.background,
            border: record.state.border,
            borderWidth: record.state.borderWidthPx,
          },
        },
      ],
      picking: [
        {
          kind: "object-point",
          objectId: record.id,
          x: record.state.x,
          y: record.state.y,
          scale: 2,
        },
      ],
    };
  },
};
