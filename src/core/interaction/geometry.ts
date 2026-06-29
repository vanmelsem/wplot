import { clampRangeByTickStep } from "../render/axis";
import { getConfiguredAxisSpec } from "../domain/config";
import { PlotController } from "../api/controller";
import type { RenderLayout } from "../render/layout";
import {
  buildViewTransform,
  containsBounds,
  createViewport,
  pxToValue,
  valueToPx,
  type ViewTransform,
  type Viewport,
} from "./viewport";
import type { AxisHit, RenderState } from "./state";

export class InteractionGeometry {
  private renderState: RenderState | null = null;
  private transform: ViewTransform | null = null;

  constructor(private readonly controller: PlotController) {}

  setRenderState(state: RenderState | null): void {
    this.renderState = state;
    this.rebuildTransform();
  }

  getRenderState(): RenderState | null {
    return this.renderState;
  }

  getTransform(): ViewTransform | null {
    return this.transform;
  }

  getViewport(): Viewport {
    if (!this.renderState) {
      const view = this.controller.peekView();
      return createViewport(
        {
          dpr: 1,
          canvas: { width: 1, height: 1 },
          plot: { origin: { x: 0, y: 0 }, size: { width: 1, height: 1 } },
          scales: {
            top: null,
            right: null,
            bottom: null,
            left: null,
            xSide: null,
            ySide: null,
          },
        },
        view,
      );
    }
    return createViewport(this.renderState.layout, this.controller.peekView());
  }

  getPlotBounds(): RenderLayout["plot"] {
    return this.getViewport().plot;
  }

  insidePlot(px: number, py: number): boolean {
    return containsBounds(this.getViewport().plot, px, py);
  }

  safePxToValue(px: number, py: number): { x: number; y: number } | null {
    if (!this.transform || !this.renderState) return null;
    if (!this.insidePlot(px, py)) return null;
    return pxToValue(this.transform, px, py);
  }

  pxToValue(px: number, py: number): { x: number; y: number } {
    if (!this.transform) return { x: 0, y: 0 };
    return pxToValue(this.transform, px, py);
  }

  valueToPx(x: number, y: number): { x: number; y: number } {
    if (!this.transform) return { x: 0, y: 0 };
    return valueToPx(this.transform, x, y);
  }

  toleranceValue(px: number): { tolx: number; toly: number } {
    if (!this.transform) return { tolx: px, toly: px };
    return {
      tolx: px * Math.abs(this.transform.x.invScale),
      toly: px * Math.abs(this.transform.y.invScale),
    };
  }

  axisFromPointer(px: number, py: number): AxisHit | null {
    const viewport = this.getViewport();
    const plot = viewport.plot;
    const inPlotX = px >= plot.origin.x && px <= plot.origin.x + plot.size.width;
    const inPlotY = py >= plot.origin.y && py <= plot.origin.y + plot.size.height;
    const inXAxis =
      (!!viewport.scales.bottom &&
        inPlotX &&
        py >= viewport.scales.bottom.origin.y &&
        py <= viewport.scales.bottom.origin.y + viewport.scales.bottom.size.height) ||
      (!!viewport.scales.top &&
        inPlotX &&
        py >= viewport.scales.top.origin.y &&
        py <= viewport.scales.top.origin.y + viewport.scales.top.size.height);
    if (inXAxis) return { kind: "x" };
    // Secondary y-axis gutters take precedence over the primary, since they are
    // disjoint px ranges; a hit names which axis the pointer is over.
    const extra = viewport.scales.extraY;
    if (extra && inPlotY) {
      for (let i = 0; i < extra.length; i += 1) {
        const slot = extra[i]!;
        if (
          px >= slot.bounds.origin.x &&
          px <= slot.bounds.origin.x + slot.bounds.size.width
        ) {
          return { kind: "y", id: slot.id };
        }
      }
    }
    const inYAxis =
      (!!viewport.scales.left &&
        inPlotY &&
        px >= viewport.scales.left.origin.x &&
        px <= viewport.scales.left.origin.x + viewport.scales.left.size.width) ||
      (!!viewport.scales.right &&
        inPlotY &&
        px >= viewport.scales.right.origin.x &&
        px <= viewport.scales.right.origin.x + viewport.scales.right.size.width);
    if (inYAxis) return { kind: "y", id: "y" };
    return null;
  }

  clampZoomRanges(args: {
    nextX: { min: number; max: number };
    nextY: { min: number; max: number };
    currentX: { min: number; max: number };
    currentY: { min: number; max: number };
    pivotX: number;
    pivotY: number;
  }): { x: { min: number; max: number }; y: { min: number; max: number } } {
    const config = this.controller.peekConfig();
    const viewport = this.getViewport();
    const specX = getConfiguredAxisSpec(config, "x");
    const specY = getConfiguredAxisSpec(config, "y");
    return {
      x: clampRangeByTickStep({
        range: args.nextX,
        prevRange: args.currentX,
        pivot: args.pivotX,
        spanPx: viewport.plot.size.width,
        spacingPx: config.gridSpacing[0],
        spec: specX,
      }),
      y: clampRangeByTickStep({
        range: args.nextY,
        prevRange: args.currentY,
        pivot: args.pivotY,
        spanPx: viewport.plot.size.height,
        spacingPx: config.gridSpacing[1],
        spec: specY,
      }),
    };
  }

  rebuildTransform(): void {
    if (!this.renderState) {
      this.transform = null;
      return;
    }
    const config = this.controller.peekConfig();
    this.transform = buildViewTransform({
      viewport: this.getViewport(),
      scaleX: getConfiguredAxisSpec(config, "x").scale,
      scaleY: getConfiguredAxisSpec(config, "y").scale,
    });
  }
}
