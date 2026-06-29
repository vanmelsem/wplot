import type { DrawList, Primitive } from "../../render/contracts";
import { applyDpr } from "../../shared/geometry";

type RenderTransform = {
  valueMinX: number;
  valueMinY: number;
  scaleX: number;
  scaleY: number;
  plotX: number;
  plotBottom: number;
};

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

const sameColor = (
  a: readonly [number, number, number, number],
  b: readonly [number, number, number, number],
) =>
  a === b ||
  (a[0] === b[0] && a[1] === b[1] && a[2] === b[2] && a[3] === b[3]);

const toCss = (
  color: readonly [number, number, number, number],
  opacity = 1,
) => {
  const a = clamp01((color[3] ?? 1) * opacity);
  const r = Math.round((color[0] ?? 0) * 255);
  const g = Math.round((color[1] ?? 0) * 255);
  const b = Math.round((color[2] ?? 0) * 255);
  return `rgba(${r},${g},${b},${a})`;
};

const roundedRectPath = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) => {
  if (radius <= 0) {
    ctx.rect(x, y, width, height);
    return;
  }
  const r = Math.min(radius, Math.abs(width) * 0.5, Math.abs(height) * 0.5);
  const x0 = x;
  const y0 = y;
  const x1 = x + width;
  const y1 = y + height;
  const minX = Math.min(x0, x1);
  const maxX = Math.max(x0, x1);
  const minY = Math.min(y0, y1);
  const maxY = Math.max(y0, y1);
  ctx.moveTo(minX + r, minY);
  ctx.lineTo(maxX - r, minY);
  ctx.quadraticCurveTo(maxX, minY, maxX, minY + r);
  ctx.lineTo(maxX, maxY - r);
  ctx.quadraticCurveTo(maxX, maxY, maxX - r, maxY);
  ctx.lineTo(minX + r, maxY);
  ctx.quadraticCurveTo(minX, maxY, minX, maxY - r);
  ctx.lineTo(minX, minY + r);
  ctx.quadraticCurveTo(minX, minY, minX + r, minY);
};

function pxX(transform: RenderTransform, value: number, offset = 0): number {
  return transform.plotX + (value + offset - transform.valueMinX) * transform.scaleX;
}

function pxY(transform: RenderTransform, value: number, offset = 0): number {
  return transform.plotBottom - (value + offset - transform.valueMinY) * transform.scaleY;
}

function pxRound(value: number): number {
  return Math.round(value);
}

function drawAccumulatedColumn(
  ctx: CanvasRenderingContext2D,
  x: number,
  minY: number,
  maxY: number,
  inY: number,
  outY: number,
): void {
  if (minY === maxY) return;
  if (inY !== minY && outY !== minY) {
    ctx.lineTo(x, minY);
  }
  if (inY !== maxY && outY !== maxY) {
    ctx.lineTo(x, maxY);
  }
  ctx.lineTo(x, outY);
}

function shouldCompactPathColumns(
  transform: RenderTransform,
  x: Float32Array | Float64Array,
  count: number,
  originX: number,
): boolean {
  if (count < 128) return false;
  const firstX = pxRound(pxX(transform, x[0] ?? 0, originX));
  const lastX = pxRound(pxX(transform, x[count - 1] ?? 0, originX));
  const spanPx = Math.abs(lastX - firstX);
  if (spanPx <= 0) return true;
  return count / spanPx >= 1.25;
}

export class CanvasRenderer {
  private ctx: CanvasRenderingContext2D | null = null;

  constructor(private canvas: HTMLCanvasElement) {}

  render(drawList: DrawList): void {
    const { viewport } = drawList;
    const dpr = viewport.dpr || 1;
    const canvasPxW = Math.max(1, Math.round(applyDpr(viewport.canvas.width, dpr)));
    const canvasPxH = Math.max(1, Math.round(applyDpr(viewport.canvas.height, dpr)));
    if (this.canvas.width !== canvasPxW) this.canvas.width = canvasPxW;
    if (this.canvas.height !== canvasPxH) this.canvas.height = canvasPxH;
    const ctx =
      this.ctx ??
      (this.ctx = this.canvas.getContext("2d", {
        alpha: true,
      }));
    if (!ctx) return;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvasPxW, canvasPxH);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const cssW = viewport.canvas.width;
    const cssH = viewport.canvas.height;
    ctx.fillStyle = toCss(drawList.background, 1);
    ctx.fillRect(0, 0, cssW, cssH);

    const plot = viewport.plot;
    if (plot.size.width <= 0 || plot.size.height <= 0) return;

    const valueMinX = viewport.value.x.min;
    const valueMinY = viewport.value.y.min;
    const spanX = viewport.value.x.max - valueMinX || 1;
    const spanY = viewport.value.y.max - valueMinY || 1;
    const plotX = plot.origin.x;
    const plotY = plot.origin.y;
    const plotW = plot.size.width;
    const plotH = plot.size.height;
    const transform: RenderTransform = {
      valueMinX,
      valueMinY,
      scaleX: plotW / spanX,
      scaleY: plotH / spanY,
      plotX,
      plotBottom: plotY + plotH,
    };

    ctx.save();
    ctx.beginPath();
    ctx.rect(plotX, plotY, plotW, plotH);
    ctx.clip();

    // A primitive on a secondary y-axis carries its own y range; project its Y
    // through that range instead of the primary view's. X is always shared.
    const transformFor = (prim: Primitive): RenderTransform => {
      if (!prim.yRange) return transform;
      const span = prim.yRange.max - prim.yRange.min || 1;
      return {
        ...transform,
        valueMinY: prim.yRange.min,
        scaleY: plotH / span,
      };
    };

    const draw = (prim: Primitive) => {
      const t = transformFor(prim);
      switch (prim.kind) {
        case "path":
          this.drawPath(
            ctx,
            prim,
            t,
            drawList.compactLinePaths === true,
          );
          break;
        case "quad":
          if (prim.mode === "rect") {
            this.drawRects(ctx, prim, t);
          } else {
            this.drawMarkers(ctx, prim, t);
          }
          break;
        case "area":
          this.drawArea(ctx, prim, t);
          break;
        case "mesh":
          this.drawMesh(ctx, prim, t);
          break;
      }
    };

    for (const prim of drawList.grid) draw(prim);
    for (const prim of drawList.series) draw(prim);
    for (const prim of drawList.objects) draw(prim);
    for (const prim of drawList.overlays) draw(prim);
    ctx.restore();
  }

  private drawPath(
    ctx: CanvasRenderingContext2D,
    prim: Extract<Primitive, { kind: "path" }>,
    transform: RenderTransform,
    compactLinePaths: boolean,
  ) {
    const count = prim.count;
    if (prim.segments ? count < 1 : count < 2) return;
    const originX = prim.origin?.x ?? 0;
    const originY = prim.origin?.y ?? 0;
    ctx.beginPath();
    if (prim.segments) {
      const pts = prim.points;
      if (!pts) return;
      for (let i = 0; i < count; i++) {
        const idx = i * 4;
        ctx.moveTo(
          pxX(transform, pts[idx] ?? 0, originX),
          pxY(transform, pts[idx + 1] ?? 0, originY),
        );
        ctx.lineTo(
          pxX(transform, pts[idx + 2] ?? 0, originX),
          pxY(transform, pts[idx + 3] ?? 0, originY),
        );
      }
    } else {
      const x = prim.x;
      const y = prim.y;
      if (x && y) {
        if (
          compactLinePaths &&
          shouldCompactPathColumns(transform, x, count, originX)
        ) {
          let accX = pxRound(pxX(transform, x[0] ?? 0, originX));
          let firstY = pxRound(pxY(transform, y[0] ?? 0, originY));
          ctx.moveTo(accX, firstY);
          let minY = firstY;
          let maxY = firstY;
          let inY = firstY;
          let outY = firstY;

          for (let i = 1; i < count; i++) {
            const nextX = pxRound(pxX(transform, x[i] ?? 0, originX));
            const nextY = pxRound(pxY(transform, y[i] ?? 0, originY));
            if (nextX === accX) {
              minY = Math.min(minY, nextY);
              maxY = Math.max(maxY, nextY);
              outY = nextY;
              continue;
            }

            drawAccumulatedColumn(ctx, accX, minY, maxY, inY, outY);
            ctx.lineTo(nextX, nextY);
            accX = nextX;
            minY = nextY;
            maxY = nextY;
            inY = nextY;
            outY = nextY;
          }

          drawAccumulatedColumn(ctx, accX, minY, maxY, inY, outY);
        } else {
          ctx.moveTo(
            pxX(transform, x[0] ?? 0, originX),
            pxY(transform, y[0] ?? 0, originY),
          );
          for (let i = 1; i < count; i++) {
            ctx.lineTo(
              pxX(transform, x[i] ?? 0, originX),
              pxY(transform, y[i] ?? 0, originY),
            );
          }
        }
      } else {
        const pts = prim.points;
        if (!pts) return;
        ctx.moveTo(
          pxX(transform, pts[0] ?? 0, originX),
          pxY(transform, pts[1] ?? 0, originY),
        );
        for (let i = 1; i < count; i++) {
          const idx = i * 2;
          ctx.lineTo(
            pxX(transform, pts[idx] ?? 0, originX),
            pxY(transform, pts[idx + 1] ?? 0, originY),
          );
        }
      }
    }
    if (prim.dashed) {
      ctx.setLineDash([prim.dashed.onPx, prim.dashed.offPx]);
      ctx.lineDashOffset = prim.dashed.phasePx ?? 0;
    } else {
      ctx.setLineDash([]);
      ctx.lineDashOffset = 0;
    }
    ctx.lineJoin = prim.join;
    ctx.lineCap = prim.cap;
    ctx.lineWidth = prim.widthPx;
    ctx.strokeStyle = toCss(prim.color, prim.opacity);
    ctx.stroke();
  }

  private drawRects(
    ctx: CanvasRenderingContext2D,
    prim: Extract<Primitive, { kind: "quad"; mode: "rect" }>,
    transform: RenderTransform,
  ) {
    const count = prim.count;
    if (count <= 0) return;
    const rects = prim.rects;
    const originX = prim.origin?.x ?? 0;
    const originY = prim.origin?.y ?? 0;
    ctx.beginPath();
    for (let i = 0; i < count; i++) {
      const idx = i * 4;
      const x = rects[idx] ?? 0;
      const y = rects[idx + 1] ?? 0;
      const w = rects[idx + 2] ?? 0;
      const h = rects[idx + 3] ?? 0;
      const x0 = pxX(transform, x, originX);
      const y0 = pxY(transform, y, originY);
      const x1 = pxX(transform, x + w, originX);
      const y1 = pxY(transform, y + h, originY);
      const minX = Math.min(x0, x1);
      const minY = Math.min(y0, y1);
      const width = Math.abs(x1 - x0);
      const height = Math.abs(y1 - y0);
      const radius = Math.min(width, height) * 0.5 * prim.roundness;
      roundedRectPath(ctx, minX, minY, width, height, radius);
    }
    ctx.fillStyle = toCss(prim.fill, prim.opacity);
    ctx.fill();
    if (prim.strokeWidthPx > 0) {
      ctx.lineWidth = prim.strokeWidthPx;
      ctx.strokeStyle = toCss(prim.stroke, prim.opacity);
      ctx.stroke();
    }
  }

  private drawMarkers(
    ctx: CanvasRenderingContext2D,
    prim: Extract<Primitive, { kind: "quad"; mode: "marker" }>,
    transform: RenderTransform,
  ) {
    const count = prim.count;
    if (count <= 0) return;
    const centers = prim.centers;
    const originX = prim.origin?.x ?? 0;
    const originY = prim.origin?.y ?? 0;
    const stroked = prim.strokeWidthPx > 0;
    const circle = prim.roundness >= 1;
    if (stroked) {
      ctx.lineWidth = prim.strokeWidthPx;
      ctx.strokeStyle = toCss(prim.stroke, prim.opacity);
    }

    const colors = prim.colors;
    const sizes = prim.sizes;

    if (!colors && !sizes) {
      // Fast path: uniform color + size. Batch every marker shape into a single
      // path and issue one fill (and one stroke) for the whole primitive instead
      // of per marker. Each shape opens a fresh subpath: rect()/roundedRectPath()
      // do so implicitly, and an explicit moveTo before each full arc keeps
      // consecutive circles from being joined by a connector line.
      const size = prim.sizePx;
      const half = size * 0.5;
      const radius = half * prim.roundness;
      const rounded = !circle && radius > 0;
      ctx.fillStyle = toCss(prim.fill, prim.opacity);
      ctx.beginPath();
      for (let i = 0; i < count; i++) {
        const idx = i * 2;
        const x = pxX(transform, centers[idx] ?? 0, originX);
        const y = pxY(transform, centers[idx + 1] ?? 0, originY);
        if (circle) {
          ctx.moveTo(x + half, y);
          ctx.arc(x, y, half, 0, Math.PI * 2);
        } else if (rounded) {
          roundedRectPath(ctx, x - half, y - half, size, size, radius);
        } else {
          ctx.rect(x - half, y - half, size, size);
        }
      }
      ctx.fill();
      if (stroked) ctx.stroke();
      return;
    }

    // Per-point path: optional per-point color and/or size. Adds each marker's
    // shape (with its own size) to the current subpath and flushes a fill at the
    // end of every consecutive same-color run, so a smooth gradient still issues
    // far fewer fills than one-per-point.
    const appendShape = (i: number, size: number) => {
      const idx = i * 2;
      const x = pxX(transform, centers[idx] ?? 0, originX);
      const y = pxY(transform, centers[idx + 1] ?? 0, originY);
      const half = size * 0.5;
      const radius = half * prim.roundness;
      if (circle) {
        ctx.moveTo(x + half, y);
        ctx.arc(x, y, half, 0, Math.PI * 2);
      } else if (radius > 0) {
        roundedRectPath(ctx, x - half, y - half, size, size, radius);
      } else {
        ctx.rect(x - half, y - half, size, size);
      }
    };
    const sizeAt = (i: number) => (sizes ? (sizes[i] ?? prim.sizePx) : prim.sizePx);

    if (!colors) {
      // Uniform color, per-point size: still a single fill.
      ctx.fillStyle = toCss(prim.fill, prim.opacity);
      ctx.beginPath();
      for (let i = 0; i < count; i++) appendShape(i, sizeAt(i));
      ctx.fill();
      if (stroked) ctx.stroke();
      return;
    }

    let runStart = 0;
    while (runStart < count) {
      const runColor = colors[runStart] ?? prim.fill;
      let runEnd = runStart + 1;
      while (runEnd < count && sameColor(colors[runEnd] ?? prim.fill, runColor)) {
        runEnd += 1;
      }
      ctx.fillStyle = toCss(runColor, prim.opacity);
      ctx.beginPath();
      for (let i = runStart; i < runEnd; i++) appendShape(i, sizeAt(i));
      ctx.fill();
      if (stroked) ctx.stroke();
      runStart = runEnd;
    }
  }

  private drawArea(
    ctx: CanvasRenderingContext2D,
    prim: Extract<Primitive, { kind: "area" }>,
    transform: RenderTransform,
  ) {
    const count = prim.count;
    if (count < 2) return;
    const originX = prim.origin?.x ?? 0;
    const originY = prim.origin?.y ?? 0;
    ctx.beginPath();
    ctx.moveTo(
      pxX(transform, prim.x[0] ?? 0, originX),
      pxY(transform, prim.y0[0] ?? 0, originY),
    );
    for (let i = 1; i < count; i += 1) {
      ctx.lineTo(
        pxX(transform, prim.x[i] ?? 0, originX),
        pxY(transform, prim.y0[i] ?? 0, originY),
      );
    }
    for (let i = count - 1; i >= 0; i -= 1) {
      ctx.lineTo(
        pxX(transform, prim.x[i] ?? 0, originX),
        pxY(transform, prim.y1[i] ?? 0, originY),
      );
    }
    ctx.closePath();
    ctx.fillStyle = toCss(prim.fill, prim.opacity);
    ctx.fill();
  }

  private drawMesh(
    ctx: CanvasRenderingContext2D,
    prim: Extract<Primitive, { kind: "mesh" }>,
    transform: RenderTransform,
  ) {
    const count = prim.count;
    if (count <= 0) return;
    const pos = prim.positions;
    const originX = prim.origin?.x ?? 0;
    const originY = prim.origin?.y ?? 0;
    ctx.beginPath();
    for (let i = 0; i < count; i += 3) {
      const idx = i * 2;
      ctx.moveTo(
        pxX(transform, pos[idx] ?? 0, originX),
        pxY(transform, pos[idx + 1] ?? 0, originY),
      );
      ctx.lineTo(
        pxX(transform, pos[idx + 2] ?? 0, originX),
        pxY(transform, pos[idx + 3] ?? 0, originY),
      );
      ctx.lineTo(
        pxX(transform, pos[idx + 4] ?? 0, originX),
        pxY(transform, pos[idx + 5] ?? 0, originY),
      );
      ctx.closePath();
    }
    ctx.fillStyle = toCss(prim.fill, prim.opacity);
    ctx.fill();
  }
}
