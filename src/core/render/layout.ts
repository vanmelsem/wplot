import type { BoxEdges, LayoutConfig } from "../domain/config";

export type RenderPoint = {
  x: number;
  y: number;
};

export type RenderSize = {
  width: number;
  height: number;
};

export type RenderBounds = {
  origin: RenderPoint;
  size: RenderSize;
};

export type ExtraAxisSlot = {
  id: string;
  side: "left" | "right";
  bounds: RenderBounds;
};

/** Resolved geometry for an additional y-axis gutter (id, side, px width). */
export type ExtraAxisLayout = {
  id: string;
  side: "left" | "right";
  widthPx: number;
};

export type RenderLayout = {
  dpr: number;
  canvas: RenderSize;
  plot: RenderBounds;
  scales: {
    top: RenderBounds | null;
    right: RenderBounds | null;
    bottom: RenderBounds | null;
    left: RenderBounds | null;
    xSide: "top" | "bottom" | null;
    ySide: "left" | "right" | null;
    /** Gutters for additional y-axes, stacked outward. Absent when none. */
    extraY?: readonly ExtraAxisSlot[];
  };
};

export type AxisLabelMetrics = {
  maxWidth: number;
  maxHeight: number;
};

export type AxisGutters = BoxEdges<number>;

export const AXIS_LABEL_PADDING = 8;

export function createAxisLabelMetrics(): { x: AxisLabelMetrics; y: AxisLabelMetrics } {
  return {
    x: { maxWidth: 0, maxHeight: 0 },
    y: { maxWidth: 0, maxHeight: 0 },
  };
}

export function computeAxisGutters(args: {
  layout: LayoutConfig;
  metricsX: AxisLabelMetrics;
  metricsY: AxisLabelMetrics;
  extraY?: readonly ExtraAxisLayout[];
}): AxisGutters {
  const { layout, metricsX, metricsY, extraY } = args;
  const margin = layout.margin;
  const xScaleSize = layout.xScale.show
    ? typeof layout.xScale.size === "number"
      ? layout.xScale.size
      : Math.max(layout.xScale.min, metricsX.maxHeight + AXIS_LABEL_PADDING)
    : 0;
  const yScaleSize = layout.yScale.show
    ? typeof layout.yScale.size === "number"
      ? layout.yScale.size
      : Math.max(layout.yScale.min, metricsY.maxWidth + AXIS_LABEL_PADDING)
    : 0;

  let extraLeft = 0;
  let extraRight = 0;
  if (extraY) {
    for (let i = 0; i < extraY.length; i += 1) {
      const axis = extraY[i]!;
      if (axis.side === "left") extraLeft += axis.widthPx;
      else extraRight += axis.widthPx;
    }
  }

  return {
    left:
      margin.left +
      (layout.yScale.show && layout.yScale.side === "left" ? yScaleSize : 0) +
      extraLeft,
    right:
      margin.right +
      (layout.yScale.show && layout.yScale.side === "right" ? yScaleSize : 0) +
      extraRight,
    top:
      margin.top +
      (layout.xScale.show && layout.xScale.side === "top" ? xScaleSize : 0),
    bottom:
      margin.bottom +
      (layout.xScale.show && layout.xScale.side === "bottom" ? xScaleSize : 0),
  };
}

function rectOrNull(
  x: number,
  y: number,
  width: number,
  height: number,
): RenderBounds | null {
  if (width <= 0 || height <= 0) return null;
  return { origin: { x, y }, size: { width, height } };
}

export function buildRenderLayout(args: {
  width: number;
  height: number;
  dpr: number;
  layout: LayoutConfig;
  gutters: AxisGutters;
  extraY?: readonly ExtraAxisLayout[];
}): RenderLayout {
  const { width, height, dpr, layout, gutters, extraY } = args;
  const margin = layout.margin;
  const plotOriginX = gutters.left;
  const plotOriginY = gutters.top;
  const plotWidth = Math.max(1, width - gutters.left - gutters.right);
  const plotHeight = Math.max(1, height - gutters.top - gutters.bottom);

  // Total px consumed by extra axes on each side; the primary y gutter sits
  // between the plot and the extra stack, extras stack further outward.
  let extraLeftTotal = 0;
  let extraRightTotal = 0;
  if (extraY) {
    for (let i = 0; i < extraY.length; i += 1) {
      const axis = extraY[i]!;
      if (axis.side === "left") extraLeftTotal += axis.widthPx;
      else extraRightTotal += axis.widthPx;
    }
  }

  const leftScaleWidth = Math.max(
    0,
    gutters.left - margin.left - extraLeftTotal,
  );
  const rightScaleWidth = Math.max(
    0,
    gutters.right - margin.right - extraRightTotal,
  );
  const topScaleHeight =
    gutters.top > margin.top ? gutters.top - margin.top : 0;
  const bottomScaleHeight =
    gutters.bottom > margin.bottom ? gutters.bottom - margin.bottom : 0;

  const scales: RenderLayout["scales"] = {
    top: rectOrNull(plotOriginX, margin.top, plotWidth, topScaleHeight),
    right: rectOrNull(
      plotOriginX + plotWidth,
      plotOriginY,
      rightScaleWidth,
      plotHeight,
    ),
    bottom: rectOrNull(
      plotOriginX,
      plotOriginY + plotHeight,
      plotWidth,
      bottomScaleHeight,
    ),
    left: rectOrNull(
      margin.left + extraLeftTotal,
      plotOriginY,
      leftScaleWidth,
      plotHeight,
    ),
    xSide: layout.xScale.show ? layout.xScale.side : null,
    ySide: layout.yScale.show ? layout.yScale.side : null,
  };

  if (extraY && extraY.length > 0) {
    const slots: ExtraAxisSlot[] = [];
    // Left extras fill [margin.left .. primary left gutter), outermost first.
    let leftCursor = margin.left;
    // Right extras start just past the primary right gutter, stacking outward.
    let rightCursor = plotOriginX + plotWidth + rightScaleWidth;
    for (let i = 0; i < extraY.length; i += 1) {
      const axis = extraY[i]!;
      if (axis.side === "left") {
        const bounds = rectOrNull(
          leftCursor,
          plotOriginY,
          axis.widthPx,
          plotHeight,
        );
        leftCursor += axis.widthPx;
        if (bounds) slots.push({ id: axis.id, side: "left", bounds });
      } else {
        const bounds = rectOrNull(
          rightCursor,
          plotOriginY,
          axis.widthPx,
          plotHeight,
        );
        rightCursor += axis.widthPx;
        if (bounds) slots.push({ id: axis.id, side: "right", bounds });
      }
    }
    if (slots.length > 0) scales.extraY = slots;
  }

  return {
    dpr,
    canvas: { width, height },
    plot: {
      origin: { x: plotOriginX, y: plotOriginY },
      size: { width: plotWidth, height: plotHeight },
    },
    scales,
  };
}
