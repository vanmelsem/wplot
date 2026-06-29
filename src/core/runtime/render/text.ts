import { TextAlign } from "../../render/contracts";
import type { DrawList, Primitive, TextEntry } from "../../render/contracts";
import { applyDpr } from "../../shared/geometry";
import {
  clamp,
  type BoxPlacement,
  layoutFloatingBoxes,
  measureTextBlock,
} from "./text_box_layout";

export const PLOT_TEXT_FONT = "12px IBM Plex Sans, system-ui, sans-serif";

type TextLayer = "static" | "overlay";

function toCss(
  color: readonly [number, number, number, number],
  opacity = 1,
): string {
  return `rgba(${Math.round(color[0] * 255)},${Math.round(color[1] * 255)},${Math.round(color[2] * 255)},${color[3] * opacity})`;
}

function drawScaleBackgrounds(
  ctx: CanvasRenderingContext2D,
  drawList: DrawList,
): void {
  const scales = drawList.viewport.scales;
  if (drawList.scaleStyle.x.show) {
    const bg = toCss(drawList.scaleStyle.x.background);
    if (scales.top) {
      ctx.fillStyle = bg;
      ctx.fillRect(
        scales.top.origin.x,
        scales.top.origin.y,
        scales.top.size.width,
        scales.top.size.height,
      );
    }
    if (scales.bottom) {
      ctx.fillStyle = bg;
      ctx.fillRect(
        scales.bottom.origin.x,
        scales.bottom.origin.y,
        scales.bottom.size.width,
        scales.bottom.size.height,
      );
    }
  }
  if (drawList.scaleStyle.y.show) {
    const bg = toCss(drawList.scaleStyle.y.background);
    if (scales.left) {
      ctx.fillStyle = bg;
      ctx.fillRect(
        scales.left.origin.x,
        scales.left.origin.y,
        scales.left.size.width,
        scales.left.size.height,
      );
    }
    if (scales.right) {
      ctx.fillStyle = bg;
      ctx.fillRect(
        scales.right.origin.x,
        scales.right.origin.y,
        scales.right.size.width,
        scales.right.size.height,
      );
    }
    if (scales.extraY) {
      ctx.fillStyle = bg;
      for (let i = 0; i < scales.extraY.length; i += 1) {
        const slot = scales.extraY[i]!;
        ctx.fillRect(
          slot.bounds.origin.x,
          slot.bounds.origin.y,
          slot.bounds.size.width,
          slot.bounds.size.height,
        );
      }
    }
  }
}

function drawScaleDividers(
  ctx: CanvasRenderingContext2D,
  drawList: DrawList,
): void {
  const plot = drawList.viewport.plot;
  const scales = drawList.viewport.scales;

  const drawDivider = (
    x0: number,
    y0: number,
    x1: number,
    y1: number,
    color: string,
    width: number,
  ) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.stroke();
  };

  if (drawList.scaleStyle.x.show) {
    const color = toCss(drawList.scaleStyle.x.lineColor);
    const width = drawList.scaleStyle.x.lineWidthPx;
    if (scales.top) {
      const y = plot.origin.y + 0.5;
      drawDivider(
        plot.origin.x,
        y,
        plot.origin.x + plot.size.width,
        y,
        color,
        width,
      );
    }
    if (scales.bottom) {
      const y = plot.origin.y + plot.size.height + 0.5;
      drawDivider(
        plot.origin.x,
        y,
        plot.origin.x + plot.size.width,
        y,
        color,
        width,
      );
    }
  }

  if (drawList.scaleStyle.y.show) {
    const color = toCss(drawList.scaleStyle.y.lineColor);
    const width = drawList.scaleStyle.y.lineWidthPx;
    if (scales.left) {
      const x = plot.origin.x + 0.5;
      drawDivider(
        x,
        plot.origin.y,
        x,
        plot.origin.y + plot.size.height,
        color,
        width,
      );
    }
    if (scales.right) {
      const x = plot.origin.x + plot.size.width + 0.5;
      drawDivider(
        x,
        plot.origin.y,
        x,
        plot.origin.y + plot.size.height,
        color,
        width,
      );
    }
    if (scales.extraY) {
      for (let i = 0; i < scales.extraY.length; i += 1) {
        const slot = scales.extraY[i]!;
        // Divider sits on the plot-facing edge of each gutter.
        const x =
          slot.side === "right"
            ? slot.bounds.origin.x + 0.5
            : slot.bounds.origin.x + slot.bounds.size.width + 0.5;
        drawDivider(
          x,
          plot.origin.y,
          x,
          plot.origin.y + plot.size.height,
          color,
          width,
        );
      }
    }
  }
}

function renderEntries(
  ctx: CanvasRenderingContext2D,
  entries: readonly TextEntry[],
  plot: DrawList["viewport"]["plot"],
): void {
  if (entries.length === 0) return;

  ctx.fillStyle = "#cfd7e3";
  ctx.font = PLOT_TEXT_FONT;
  ctx.textBaseline = "top";
  ctx.textAlign = "left";

  const plotMinX = plot.origin.x + 2;
  const plotMaxX = plot.origin.x + plot.size.width - 2;
  const plotMinY = plot.origin.y + 2;
  const plotMaxY = plot.origin.y + plot.size.height - 2;
  const fixedMinX = plot.origin.x;
  const fixedMaxX = plot.origin.x + plot.size.width;
  const fixedMinY = plot.origin.y;
  const fixedMaxY = plot.origin.y + plot.size.height;

  let boxLayout: Map<number, BoxPlacement> | null = null;
  for (let i = 0; i < entries.length; i += 1) {
    const entry = entries[i];
    if (entry?.box && !entry.fixedBox) {
      boxLayout = layoutFloatingBoxes(ctx, entries, plot);
      break;
    }
  }

  for (let i = 0; i < entries.length; i += 1) {
    const entry = entries[i]!;
    const placed = boxLayout?.get(i);
    switch (entry.align) {
      case TextAlign.Center:
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        break;
      case TextAlign.TopLeft:
      default:
        ctx.textAlign = "left";
        ctx.textBaseline = "top";
        break;
    }

    if (!entry.box) {
      ctx.fillStyle = toCss(entry.color);
      ctx.fillText(entry.text, entry.x, entry.y);
      continue;
    }

    const measured = measureTextBlock(ctx, entry.text, entry.box.height);
    const measuredTextWidth = entry.box.exactWidth
      ? entry.box.width
      : Math.max(entry.box.width, measured.width);
    const x = placed?.x ?? entry.x;
    const y = placed?.y ?? entry.y;
    const rectW = placed?.rectW ?? measuredTextWidth + entry.box.padX * 2;
    const rectH = placed?.rectH ?? entry.box.height + entry.box.padY * 2;
    const unclampedRectX =
      entry.boxOrigin?.x ?? placed?.rectX ?? x - entry.box.padX;
    const unclampedRectY =
      entry.boxOrigin?.y ?? placed?.rectY ?? y - entry.box.padY;
    const minX = entry.clampRect
      ? entry.clampRect.minX
      : entry.fixedBox
        ? fixedMinX
        : plotMinX;
    const maxX = entry.clampRect
      ? entry.clampRect.maxX
      : entry.fixedBox
        ? fixedMaxX
        : plotMaxX;
    const minY = entry.clampRect
      ? entry.clampRect.minY
      : entry.fixedBox
        ? fixedMinY
        : plotMinY;
    const maxY = entry.clampRect
      ? entry.clampRect.maxY
      : entry.fixedBox
        ? fixedMaxY
        : plotMaxY;
    const rectX = clamp(unclampedRectX, minX, maxX - rectW);
    const rectY = clamp(unclampedRectY, minY, maxY - rectH);

    ctx.fillStyle = toCss(entry.box.background);
    ctx.fillRect(rectX, rectY, rectW, rectH);
    if (entry.box.borderWidth > 0) {
      ctx.strokeStyle = toCss(entry.box.border);
      ctx.lineWidth = entry.box.borderWidth;
      ctx.strokeRect(
        rectX + entry.box.borderWidth * 0.5,
        rectY + entry.box.borderWidth * 0.5,
        rectW - entry.box.borderWidth,
        rectH - entry.box.borderWidth,
      );
    }

    ctx.fillStyle = toCss(entry.color);
    const textX =
      entry.align === TextAlign.Center
        ? rectX + rectW * 0.5
        : rectX + entry.box.padX;
    const baseline = entry.boxTextBaseline ?? "middle";
    const measuredTextHeight = measured.height || entry.box.height;
    const textY =
      entry.boxTextTrack === "x-axis" && entry.clampRect
        ? entry.clampRect.minY +
          (entry.clampRect.maxY - entry.clampRect.minY - measuredTextHeight) *
            0.5 +
          (entry.boxTextOffsetY ?? 0)
        : baseline === "top"
          ? rectY + entry.box.padY + (entry.boxTextOffsetY ?? 0)
          : rectY + rectH * 0.5 + (entry.boxTextOffsetY ?? 0);
    ctx.textAlign = entry.align === TextAlign.Center ? "center" : "left";
    ctx.textBaseline = baseline;
    ctx.fillText(entry.text, textX, textY);
  }
}

function drawCrosshair(
  ctx: CanvasRenderingContext2D,
  drawList: DrawList,
): void {
  const plot = drawList.viewport.plot;
  if (!drawList.crosshair || plot.size.width <= 0 || plot.size.height <= 0) {
    return;
  }

  const point = { x: drawList.crosshair.px, y: drawList.crosshair.py };
  const showX =
    drawList.crosshair.axis === "x" || drawList.crosshair.axis === "xy";
  const showY =
    drawList.crosshair.axis === "y" || drawList.crosshair.axis === "xy";
  ctx.save();
  ctx.beginPath();
  ctx.rect(plot.origin.x, plot.origin.y, plot.size.width, plot.size.height);
  ctx.clip();
  ctx.strokeStyle = `rgba(${Math.round(drawList.crosshair.color[0] * 255)},${Math.round(drawList.crosshair.color[1] * 255)},${Math.round(drawList.crosshair.color[2] * 255)},${drawList.crosshair.color[3]})`;
  ctx.lineWidth = 0.5;
  if (drawList.crosshair.dash) {
    ctx.setLineDash([
      drawList.crosshair.dash.onPx,
      drawList.crosshair.dash.offPx,
    ]);
  } else {
    ctx.setLineDash([]);
  }
  ctx.beginPath();
  if (showX) {
    ctx.moveTo(point.x, plot.origin.y);
    ctx.lineTo(point.x, plot.origin.y + plot.size.height);
  }
  if (showY) {
    ctx.moveTo(plot.origin.x, point.y);
    ctx.lineTo(plot.origin.x + plot.size.width, point.y);
  }
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();
}

function drawCursorIndicator(
  ctx: CanvasRenderingContext2D,
  drawList: DrawList,
): void {
  const plot = drawList.viewport.plot;
  if (
    !drawList.cursorIndicator ||
    plot.size.width <= 0 ||
    plot.size.height <= 0
  ) {
    return;
  }

  const x = drawList.cursorIndicator.px;
  ctx.save();
  ctx.beginPath();
  ctx.rect(plot.origin.x, plot.origin.y, plot.size.width, plot.size.height);
  ctx.clip();
  ctx.strokeStyle = `rgba(${Math.round(drawList.cursorIndicator.color[0] * 255)},${Math.round(drawList.cursorIndicator.color[1] * 255)},${Math.round(drawList.cursorIndicator.color[2] * 255)},${drawList.cursorIndicator.color[3]})`;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x + 0.5, plot.origin.y);
  ctx.lineTo(x + 0.5, plot.origin.y + plot.size.height);
  ctx.stroke();
  ctx.restore();
}

function drawTopOverlays(
  ctx: CanvasRenderingContext2D,
  drawList: DrawList,
): void {
  if (drawList.topOverlays.length === 0) return;

  const plot = drawList.viewport.plot;
  const valueMinX = drawList.viewport.value.x.min;
  const valueMinY = drawList.viewport.value.y.min;
  const spanX = drawList.viewport.value.x.max - valueMinX || 1;
  const spanY = drawList.viewport.value.y.max - valueMinY || 1;
  const plotX = plot.origin.x;
  const plotY = plot.origin.y;
  const plotW = plot.size.width;
  const plotH = plot.size.height;
  const scaleX = plotW / spanX;
  const scaleY = plotH / spanY;
  const plotBottom = plotY + plotH;
  const pxX = (value: number, offset = 0) =>
    plotX + (value + offset - valueMinX) * scaleX;
  const pxY = (value: number, offset = 0) =>
    plotBottom - (value + offset - valueMinY) * scaleY;

  ctx.save();
  ctx.beginPath();
  ctx.rect(plotX, plotY, plotW, plotH);
  ctx.clip();
  for (let i = 0; i < drawList.topOverlays.length; i += 1) {
    const prim = drawList.topOverlays[i]!;
    if (prim.kind !== "quad" || prim.mode !== "marker" || prim.count <= 0) {
      continue;
    }
    const centers = prim.centers;
    const size = prim.sizePx;
    const half = size * 0.5;
    const originX = prim.origin?.x ?? 0;
    const originY = prim.origin?.y ?? 0;
    // A marker tagged with a yRange belongs to a secondary y-axis: project its
    // Y through that axis's range, not the primary one (shared X). Without this,
    // a cursor marker for a right-axis series lands at the wrong height.
    const yr = prim.yRange;
    const markerMinY = yr ? yr.min : valueMinY;
    const markerScaleY = yr ? plotH / (yr.max - yr.min || 1) : scaleY;
    const markerPxY = (value: number, offset = 0) =>
      plotBottom - (value + offset - markerMinY) * markerScaleY;
    ctx.fillStyle = toCss(prim.fill, prim.opacity);
    if (prim.strokeWidthPx > 0) {
      ctx.lineWidth = prim.strokeWidthPx;
      ctx.strokeStyle = toCss(prim.stroke, prim.opacity);
    }
    for (let j = 0; j < prim.count; j += 1) {
      const idx = j * 2;
      const x = pxX(centers[idx] ?? 0, originX);
      const y = markerPxY(centers[idx + 1] ?? 0, originY);
      ctx.beginPath();
      ctx.rect(x - half, y - half, size, size);
      ctx.fill();
      if (prim.strokeWidthPx > 0) {
        ctx.stroke();
      }
    }
  }
  ctx.restore();
}

function drawStats(
  ctx: CanvasRenderingContext2D,
  drawList: DrawList,
): void {
  const plot = drawList.viewport.plot;
  if (!drawList.stats) return;

  const stats = drawList.stats;
  const gpuText =
    stats.gpuMs < 0 ? "gpu n/a" : `gpu ${stats.gpuMs.toFixed(2)} ms`;
  const text = `frame ${stats.frameMs.toFixed(2)} ms  cpu ${stats.cpuMs.toFixed(2)} ms  ${gpuText}  ${stats.fps.toFixed(0)} fps`;
  const pad = 6;
  const statsX = plot.origin.x + plot.size.width - pad;
  const statsY = plot.origin.y + pad;
  ctx.textAlign = "right";
  ctx.textBaseline = "top";
  ctx.fillStyle = "rgba(210, 220, 235, 0.85)";
  ctx.fillText(text, statsX, statsY);

  if (!stats.buffers?.length) return;

  const formatCount = (value: number) => {
    if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}m`;
    if (value >= 10_000) return `${Math.round(value / 1000)}k`;
    if (value >= 1_000) return `${(value / 1000).toFixed(1)}k`;
    return `${Math.round(value)}`;
  };

  const barWidth = Math.min(160, Math.max(90, plot.size.width * 0.25));
  const barRight = statsX;
  const barLeft = Math.max(plot.origin.x + pad, barRight - barWidth);
  const labelX = barLeft - 8;
  const rowHeight = 16;
  const barHeight = 4;
  const maxRows = Math.min(stats.buffers.length, 6);

  for (let i = 0; i < maxRows; i += 1) {
    const stat = stats.buffers[i]!;
    const y = statsY + 14 + i * rowHeight;
    if (labelX > plot.origin.x + pad + 24) {
      const label = `${stat.name} ${formatCount(stat.count)}/${formatCount(stat.budget)} (${formatCount(stat.total)})`;
      ctx.fillStyle = "rgba(210, 220, 235, 0.75)";
      ctx.fillText(label, labelX, y);
    }
    const barY = y + rowHeight - barHeight - 2;
    ctx.fillStyle = "rgba(60, 70, 80, 0.6)";
    ctx.fillRect(barLeft, barY, barWidth, barHeight);
    const fill = Math.max(0, Math.min(1, stat.ratio));
    const color = [stat.color[0], stat.color[1], stat.color[2], 0.85] as const;
    ctx.fillStyle = toCss(color);
    ctx.fillRect(barLeft, barY, barWidth * fill, barHeight);
  }
}

export class TextRenderer {
  private ctx: CanvasRenderingContext2D | null = null;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly layer: TextLayer = "static",
  ) {}

  render(drawList: DrawList): void {
    const { dpr, canvas: canvasSize, plot } = drawList.viewport;
    const w = Math.max(1, Math.round(applyDpr(canvasSize.width, dpr)));
    const h = Math.max(1, Math.round(applyDpr(canvasSize.height, dpr)));
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w;
      this.canvas.height = h;
    }

    const ctx =
      this.ctx ??
      (this.ctx = this.canvas.getContext("2d", {
        alpha: true,
      }));
    if (!ctx) return;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    if (this.layer === "static") {
      drawScaleBackgrounds(ctx, drawList);
      renderEntries(ctx, drawList.text, plot);
      drawScaleDividers(ctx, drawList);
      return;
    }

    drawCrosshair(ctx, drawList);
    drawCursorIndicator(ctx, drawList);
    renderEntries(ctx, drawList.overlayText, plot);
    drawTopOverlays(ctx, drawList);
    drawStats(ctx, drawList);
  }
}
