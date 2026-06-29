import { describe, expect, it } from "vitest";

import type { DrawList } from "../src/core/render/contracts";
import { CanvasRenderer } from "../src/core/runtime/render/canvas";

class FakeCanvasContext2D {
  readonly calls: Array<{ op: string; args: number[] }> = [];
  fillStyle = "";
  strokeStyle = "";
  lineWidth = 1;
  lineJoin: CanvasLineJoin = "miter";
  lineCap: CanvasLineCap = "butt";
  lineDashOffset = 0;

  setTransform(): void {}
  clearRect(): void {}
  fillRect(): void {}
  save(): void {}
  beginPath(): void {}
  rect(): void {}
  clip(): void {}
  restore(): void {}
  stroke(): void {}
  fill(): void {}
  setLineDash(): void {}
  quadraticCurveTo(): void {}
  closePath(): void {}
  arc(): void {}

  moveTo(x: number, y: number): void {
    this.calls.push({ op: "moveTo", args: [x, y] });
  }

  lineTo(x: number, y: number): void {
    this.calls.push({ op: "lineTo", args: [x, y] });
  }
}

function createDrawList(points: {
  x: Float64Array;
  y: Float64Array;
  count: number;
}, opts?: { compactLinePaths?: boolean }): DrawList {
  return {
    viewport: {
      value: {
        x: { min: 0, max: 10 },
        y: { min: 0, max: 10 },
      },
      dpr: 1,
      canvas: { width: 10, height: 10 },
      plot: {
        origin: { x: 0, y: 0 },
        size: { width: 10, height: 10 },
      },
      scales: {
        xSide: "bottom",
        ySide: "left",
        top: null,
        right: null,
        bottom: null,
        left: null,
      },
    },
    background: [0, 0, 0, 1],
    borderColor: [0, 0, 0, 1],
    scaleStyle: {
      x: {
        show: false,
        side: "bottom",
        background: [0, 0, 0, 0],
        textColor: [1, 1, 1, 1],
        lineColor: [1, 1, 1, 1],
        lineWidthPx: 1,
      },
      y: {
        show: false,
        side: "left",
        background: [0, 0, 0, 0],
        textColor: [1, 1, 1, 1],
        lineColor: [1, 1, 1, 1],
        lineWidthPx: 1,
      },
    },
    grid: [],
    series: [
      {
        kind: "path",
        x: points.x,
        y: points.y,
        count: points.count,
        widthPx: 1,
        join: "round",
        cap: "round",
        color: [1, 1, 1, 1],
        opacity: 1,
      },
    ],
    objects: [],
    overlays: [],
    topOverlays: [],
    text: [],
    overlayText: [],
    compactLinePaths: opts?.compactLinePaths ?? false,
  };
}

describe("canvas renderer", () => {
  it("compacts dense line points that land in the same x pixel column", () => {
    const ctx = new FakeCanvasContext2D();
    const canvas = {
      width: 0,
      height: 0,
      getContext: () => ctx,
    } as unknown as HTMLCanvasElement;

    const count = 160;
    const x = new Float64Array(count);
    const y = new Float64Array(count);
    for (let i = 0; i < count - 1; i += 1) {
      x[i] = i / 100;
      y[i] = 4 + (i % 3);
    }
    x[count - 1] = 2;
    y[count - 1] = 4;

    const renderer = new CanvasRenderer(canvas);
    renderer.render(
      createDrawList({
        x,
        y,
        count,
      }, { compactLinePaths: true }),
    );

    const lineTos = ctx.calls.filter((call) => call.op === "lineTo");
    expect(lineTos.length).toBeLessThan(count - 1);
    expect(lineTos.at(-1)).toEqual({ op: "lineTo", args: [2, 6] });
  });

  it("keeps the original path shape when each point lands on a distinct x pixel", () => {
    const ctx = new FakeCanvasContext2D();
    const canvas = {
      width: 0,
      height: 0,
      getContext: () => ctx,
    } as unknown as HTMLCanvasElement;

    const renderer = new CanvasRenderer(canvas);
    renderer.render(
      createDrawList({
        x: new Float64Array([0, 2, 4, 6]),
        y: new Float64Array([1, 2, 3, 4]),
        count: 4,
      }),
    );

    const lineTos = ctx.calls.filter((call) => call.op === "lineTo");
    expect(lineTos).toEqual([
      { op: "lineTo", args: [2, 8] },
      { op: "lineTo", args: [4, 7] },
      { op: "lineTo", args: [6, 6] },
    ]);
  });
});
