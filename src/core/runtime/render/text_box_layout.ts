import type { Bounds, Px } from "../../shared/geometry";
import { TextAlign } from "../../render/contracts";
import type { TextEntry } from "../../render/contracts";

export type MeasuredTextBlock = {
  width: number;
  ascent: number;
  descent: number;
  height: number;
};

export type BoxPlacement = {
  x: number;
  y: number;
  textWidth: number;
  textHeight: number;
  rectX: number;
  rectY: number;
  rectW: number;
  rectH: number;
};

function overlaps(
  a: { x: number; y: number; w: number; h: number },
  b: { x: number; y: number; w: number; h: number },
): boolean {
  return (
    a.x < b.x + b.w &&
    a.x + a.w > b.x &&
    a.y < b.y + b.h &&
    a.y + a.h > b.y
  );
}

export function clamp(value: number, min: number, max: number): number {
  if (max < min) return min;
  return Math.min(max, Math.max(min, value));
}

export function measureTextBlock(
  ctx: CanvasRenderingContext2D,
  text: string,
  fallbackHeight = 12,
): MeasuredTextBlock {
  const measured = ctx.measureText(text);
  const ascent =
    measured.fontBoundingBoxAscent ??
    measured.actualBoundingBoxAscent ??
    fallbackHeight - 3;
  const descent =
    measured.fontBoundingBoxDescent ??
    measured.actualBoundingBoxDescent ??
    3;
  return {
    width: measured.width,
    ascent,
    descent,
    height: ascent + descent || fallbackHeight,
  };
}

export function layoutFloatingBoxes(
  ctx: CanvasRenderingContext2D,
  text: readonly TextEntry[],
  plot: Bounds<Px>,
): Map<number, BoxPlacement> {
  const layout = new Map<number, BoxPlacement>();
  const placedBoxes: Array<{ x: number; y: number; w: number; h: number }> = [];
  const plotMinX = plot.origin.x + 2;
  const plotMaxX = plot.origin.x + plot.size.width - 2;
  const plotMinY = plot.origin.y + 2;
  const plotMaxY = plot.origin.y + plot.size.height - 2;

  for (let i = 0; i < text.length; i += 1) {
    const entry = text[i];
    if (!entry?.box || entry.fixedBox) continue;
    const measured = measureTextBlock(ctx, entry.text);
    const boxWidth = Math.max(entry.box.width, measured.width);
    const boxHeight = Math.max(entry.box.height, measured.height);
    const rectW = boxWidth + entry.box.padX * 2;
    const rectH = boxHeight + entry.box.padY * 2;

    let textX = entry.x;
    let textY = entry.y;
    if (entry.align === TextAlign.Center) {
      textX -= boxWidth * 0.5;
      textY -= boxHeight * 0.5;
    }

    let rectX = clamp(textX - entry.box.padX, plotMinX, plotMaxX - rectW);
    let rectY = clamp(textY - entry.box.padY, plotMinY, plotMaxY - rectH);
    const baseRect = { x: rectX, y: rectY, w: rectW, h: rectH };
    let probe = { ...baseRect };
    const stride = rectH + 2;
    let collision = placedBoxes.some((placed) => overlaps(probe, placed));

    if (collision) {
      for (let step = 1; step <= 8 && collision; step += 1) {
        probe.y = clamp(baseRect.y + step * stride, plotMinY, plotMaxY - rectH);
        collision = placedBoxes.some((placed) => overlaps(probe, placed));
      }
    }
    if (collision) {
      for (let step = 1; step <= 8 && collision; step += 1) {
        probe.y = clamp(baseRect.y - step * stride, plotMinY, plotMaxY - rectH);
        collision = placedBoxes.some((placed) => overlaps(probe, placed));
      }
    }

    rectX = probe.x;
    rectY = probe.y;
    placedBoxes.push({ x: rectX, y: rectY, w: rectW, h: rectH });
    layout.set(i, {
      x: rectX + entry.box.padX,
      y: rectY + entry.box.padY,
      textWidth: boxWidth,
      textHeight: boxHeight,
      rectX,
      rectY,
      rectW,
      rectH,
    });
  }

  return layout;
}
