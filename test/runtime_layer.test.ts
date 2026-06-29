import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  DomRuntime,
  type Layer,
  type LayerFrame,
} from "../src/core/runtime/dom_runtime";

// Construct a DomRuntime with injected fakes so a frame can run without a real
// DOM/canvas (the renderers, draw-list builder, interaction and controller are
// all stubs). This exercises the real `addLayer` registration, the per-frame
// `paintLayers` invocation, the LayerFrame shape, and disposal.

type AnyArgs = ConstructorParameters<typeof DomRuntime>[0];

const VIEWPORT = {
  plot: { origin: { x: 12, y: 34 }, size: { width: 100, height: 50 } },
};
const VIEW = { x: { min: 0, max: 10 }, y: { min: -5, max: 5 } };

function fakeCanvas(): HTMLCanvasElement {
  return {
    style: {} as CSSStyleDeclaration,
    width: 0,
    height: 0,
    getContext: () => null,
    addEventListener: () => {},
    removeEventListener: () => {},
    hasAttribute: () => false,
    setAttribute: () => {},
    getBoundingClientRect: () => ({
      left: 0,
      top: 0,
      right: 1,
      bottom: 1,
      width: 1,
      height: 1,
    }),
    focus: () => {},
    setPointerCapture: () => {},
    releasePointerCapture: () => {},
    tabIndex: 0,
    parentElement: null,
  } as unknown as HTMLCanvasElement;
}

function makeRuntime(): { runtime: DomRuntime; layerCanvas: HTMLCanvasElement } {
  const host = {
    clientWidth: 200,
    clientHeight: 120,
    getBoundingClientRect: () => ({ width: 200, height: 120 }),
  } as unknown as HTMLElement;

  const primaryCanvas = fakeCanvas();
  (primaryCanvas as unknown as { parentElement: unknown }).parentElement = host;
  const textCanvas = fakeCanvas();
  const overlayCanvas = fakeCanvas();
  const layerCanvas = fakeCanvas();

  const interaction = {
    onInvalidate: null as unknown,
    getViewport: () => VIEWPORT,
    valueToPx: (x: number, y: number) => ({ x: x * 2, y: y * 3 }),
    pxToValue: (px: number, py: number) => ({ x: px / 2, y: py / 3 }),
    getSelectedObjectId: () => null,
    setRenderState: () => {},
    dispose: () => {},
  };

  const controller = {
    peekConfig: () => ({ showStats: false }),
    peekView: () => VIEW,
  };

  const drawList = {
    overlays: [],
    topOverlays: [],
    text: [],
    overlayText: [],
  };
  const drawListBuilder = {
    buildState: () => ({ layout: {}, builtScene: {}, drawList }),
    decorateWithInteraction: (dl: unknown) => dl,
  };
  const noopRenderer = { render: () => {} };

  const args = {
    primaryCanvas,
    textCanvas,
    overlayCanvas,
    layerCanvas,
    controller,
    interaction,
    drawListBuilder,
    renderer: noopRenderer,
    rendererText: noopRenderer,
    rendererOverlayText: noopRenderer,
  };

  return {
    runtime: new DomRuntime(args as unknown as AnyArgs),
    layerCanvas,
  };
}

const originalRaf = globalThis.requestAnimationFrame;
const originalWindow = (globalThis as { window?: unknown }).window;
const originalResizeObserver = (globalThis as { ResizeObserver?: unknown })
  .ResizeObserver;

beforeEach(() => {
  globalThis.requestAnimationFrame = (() => 1) as typeof requestAnimationFrame;
  (globalThis as { window?: unknown }).window = { devicePixelRatio: 2 };
  (globalThis as { ResizeObserver?: unknown }).ResizeObserver = class {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
  };
});

afterEach(() => {
  if (originalRaf) globalThis.requestAnimationFrame = originalRaf;
  (globalThis as { window?: unknown }).window = originalWindow;
  (globalThis as { ResizeObserver?: unknown }).ResizeObserver =
    originalResizeObserver;
});

describe("DomRuntime.addLayer", () => {
  it("returns a disposer", () => {
    const { runtime } = makeRuntime();
    const dispose = runtime.addLayer({ draw: () => {} });
    expect(typeof dispose).toBe("function");
    dispose();
    runtime.dispose();
  });

  it("invokes registered layers each frame with a LayerFrame, and stops after disposal", () => {
    const { runtime, layerCanvas } = makeRuntime();
    const frames: LayerFrame[] = [];
    const layer: Layer = { draw: (frame) => frames.push(frame) };

    const dispose = runtime.addLayer(layer);
    runtime.start();
    runtime.flushScheduledFrame();

    expect(frames).toHaveLength(1);
    const frame = frames[0]!;
    // The layer canvas is handed in so the plugin can attach its own context.
    expect(frame.canvas).toBe(layerCanvas);
    expect(frame.dpr).toBe(2);
    // bounds come from the interaction viewport's plot rect.
    expect(frame.bounds.origin).toEqual({ x: 12, y: 34 });
    expect(frame.bounds.size).toEqual({ width: 100, height: 50 });
    // view + projection helpers are wired to the interaction controller.
    expect(frame.view).toEqual(VIEW);
    expect(frame.valueToPx(3, 4)).toEqual({ x: 6, y: 12 });
    expect(frame.pxToValue(6, 12)).toEqual({ x: 3, y: 4 });

    // After disposal the layer is no longer painted.
    dispose();
    runtime.flushScheduledFrame();
    expect(frames).toHaveLength(1);

    runtime.dispose();
  });
});
