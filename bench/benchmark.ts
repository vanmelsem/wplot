const SERVER_EVENTS_ROWS = 55_550;
const SERVER_EVENTS_SERIES = 3;
const SERVER_EVENTS_SEED = 20_260_313;
const SERVER_EVENTS_BASE_EPOCH_MINUTES = 28_600_000;
const SERVER_EVENTS_FIELDS = 8;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function createPrng(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state * 1_664_525 + 1_013_904_223) >>> 0;
    return state / 0xffff_ffff;
  };
}

function createPackedServerEvents(
  rows = SERVER_EVENTS_ROWS,
  seed = SERVER_EVENTS_SEED,
): number[] {
  const out = new Array<number>(
    SERVER_EVENTS_FIELDS + 1 + rows * SERVER_EVENTS_FIELDS,
  ).fill(0);
  out[0] = SERVER_EVENTS_FIELDS;
  const rand = createPrng(seed);

  let cpuNoiseA = 0.2;
  let cpuNoiseB = 0.4;
  let ramDrift = 0.52;
  let tcpBase = 12;

  for (let row = 0; row < rows; row += 1) {
    if (row % 80 === 0) cpuNoiseA = rand() * 2.5;
    if (row % 540 === 0) cpuNoiseB = rand() * 3.5;
    if (row % 1200 === 0) ramDrift = 0.44 + rand() * 0.16;
    if (row % 300 === 0) tcpBase = 9 + rand() * 12;

    const spike = row % 5000 === 0 ? 12 : 0;
    const idle = clamp(
      48 +
        Math.sin(row / 180) * 17 +
        Math.cos(row / 41) * 4 +
        cpuNoiseA +
        cpuNoiseB,
      8,
      96,
    );
    const recv = clamp(4 + Math.sin(row / 23) * 2 + rand() * 1.2, 0.2, 12);
    const send = clamp(
      tcpBase + Math.sin(row / 95) * 4 + Math.cos(row / 11) * 1.8 + spike,
      0.4,
      34,
    );
    const read = clamp(2 + Math.cos(row / 37) * 0.9 + rand() * 0.6, 0.1, 8);
    const used = clamp(
      8.5 + ramDrift * 12 + Math.sin(row / 260) * 1.8 + rand() * 0.3,
      6,
      18,
    );
    const free = clamp(
      18.5 - ramDrift * 10 + Math.cos(row / 210) * 1.6 + rand() * 0.25,
      4,
      16,
    );

    const offset = SERVER_EVENTS_FIELDS + 1 + row * SERVER_EVENTS_FIELDS;
    out[offset] = SERVER_EVENTS_BASE_EPOCH_MINUTES + row;
    out[offset + 1] = idle;
    out[offset + 2] = recv;
    out[offset + 3] = send;
    out[offset + 4] = read;
    out[offset + 5] = used;
    out[offset + 6] = free;
    out[offset + 7] = 0;
  }

  return out;
}

type BenchmarkLib = "wplot" | "uplot";
type BenchmarkKind = "line" | "scatter" | "candles" | "gradient";

type BenchmarkResult = {
  lib: BenchmarkLib;
  scenario: string;
  rows: number;
  visibleSeries: number;
  totalPoints: number;
  prepMs: number;
  chartMs: number;
  hoverBaselineMs: number;
  hoverTotalMs: number;
  hoverDeltaMs: number;
  zoomBaselineMs: number;
  zoomTotalMs: number;
  zoomDeltaMs: number;
  width: number;
  height: number;
};

type InteractionBenchmark = {
  frames: number;
  baselineMs: number;
  totalMs: number;
  deltaMs: number;
};

type PlotRect = {
  left: number;
  top: number;
  width: number;
  height: number;
};

type BenchmarkHarness = {
  plotRect: () => PlotRect;
  hover: (clientX: number, clientY: number) => void;
  zoomStart: (clientX: number, clientY: number) => void;
  zoomMove: (clientX: number, clientY: number) => void;
  zoomEnd: (clientX: number, clientY: number) => void;
  resetView: () => void;
};

type WPlotBenchmarkData = {
  x: Float64Array;
  cpu: Float32Array;
  ram: Float32Array;
  tcp: Float32Array;
  xRange: { min: number; max: number };
  yRange: { min: number; max: number };
};

type UPlotBenchmarkData = [number[], number[], number[], number[]];
type UPlotRanges = {
  x: { min: number; max: number };
  y: { min: number; max: number };
};

const BENCHMARK_WIDTH = 1920;
const BENCHMARK_HEIGHT = 600;
const BENCHMARK_TIME_OFFSET_MS = SERVER_EVENTS_BASE_EPOCH_MINUTES * 60_000;
const HOVER_BENCHMARK_FRAMES = 120;
const ZOOM_BENCHMARK_CYCLES = 4;
const ZOOM_BENCHMARK_FRAMES_PER_CYCLE = 18;
const ZOOM_BENCHMARK_FRAMES =
  ZOOM_BENCHMARK_CYCLES * ZOOM_BENCHMARK_FRAMES_PER_CYCLE;

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

function round3(value: number) {
  return Math.round(value * 1000) / 1000;
}

function createBenchmarkPackedData(rows = SERVER_EVENTS_ROWS) {
  return createPackedServerEvents(rows);
}

function createBenchmarkPlotConfig(timeOffsetMs: number) {
  return {
    background: [0, 0, 0, 1] as const,
    borderColor: [0.122222, 0.122222, 0.122222, 1] as const,
    gridColor: [0.215, 0.215, 0.215, 0.64] as const,
    gridSpacing: [74, 34] as [number, number],
    internalLod: true,
    showLegend: false,
    showCrosshair: true,
    showCrosshairLabels: false,
    showCursorSeriesMarker: true,
    showIndicator: false,
    layout: {
      xScale: {
        show: true,
        side: "bottom" as const,
        min: 28,
        background: [0, 0, 0, 1] as const,
        lineColor: [0.159882, 0.159882, 0.159882, 0.88] as const,
        textColor: [1, 1, 1, 0.92] as const,
      },
      yScale: {
        show: true,
        side: "left" as const,
        min: 46,
        background: [0, 0, 0, 1] as const,
        lineColor: [0.159882, 0.159882, 0.159882, 0.88] as const,
        textColor: [1, 1, 1, 0.92] as const,
      },
    },
    axisMode: {
      x: { mode: "time" as const, timezone: "local" as const, offset: timeOffsetMs },
    },
  };
}

function prepareWPlotBenchmarkData(
  packed: readonly number[],
): WPlotBenchmarkData {
  const numFields = packed[0] ?? 8;
  const src = packed.slice(numFields + 1);
  const rows = Math.floor(src.length / numFields);
  const x = new Float64Array(rows);
  const cpu = new Float32Array(rows);
  const ram = new Float32Array(rows);
  const tcp = new Float32Array(rows);
  let yMin = Number.POSITIVE_INFINITY;
  let yMax = Number.NEGATIVE_INFINITY;

  for (let i = 0, row = 0; i < src.length; i += numFields, row += 1) {
    const epochMinutes = src[i] ?? 0;
    const idle = src[i + 1] ?? 0;
    const send = src[i + 3] ?? 0;
    const used = src[i + 5] ?? 0;
    const free = src[i + 6] ?? 0;
    const cpuValue = round3(100 - idle);
    const ramValue = round2((100 * used) / (used + free));
    const tcpValue = round2(send);

    x[row] = epochMinutes * 60_000 - BENCHMARK_TIME_OFFSET_MS;
    cpu[row] = cpuValue;
    ram[row] = ramValue;
    tcp[row] = tcpValue;
    yMin = Math.min(yMin, cpuValue, ramValue, tcpValue);
    yMax = Math.max(yMax, cpuValue, ramValue, tcpValue);
  }

  return {
    x,
    cpu,
    ram,
    tcp,
    xRange: { min: x[0] ?? 0, max: x[rows - 1] ?? 0 },
    yRange: {
      min: Number.isFinite(yMin) ? Math.floor(yMin - 5) : 0,
      max: Number.isFinite(yMax) ? Math.ceil(yMax + 5) : 100,
    },
  };
}

type WPlotCandles = {
  open: Float32Array;
  high: Float32Array;
  low: Float32Array;
  close: Float32Array;
  width: number;
};

// Map the reused packed CPU series into a single OHLC candle series: each row's
// close is the CPU value and its open is the previous close, with a small
// high/low spread. This keeps the existing data source while exercising the
// candles scene adapter (the heaviest per-frame allocator before pooling).
function deriveWPlotCandles(data: WPlotBenchmarkData): WPlotCandles {
  const n = data.cpu.length;
  const open = new Float32Array(n);
  const high = new Float32Array(n);
  const low = new Float32Array(n);
  const close = new Float32Array(n);
  let prev = data.cpu[0] ?? 0;
  for (let i = 0; i < n; i += 1) {
    const c = data.cpu[i] ?? 0;
    const o = prev;
    open[i] = o;
    close[i] = c;
    high[i] = Math.max(o, c) + 0.5;
    low[i] = Math.min(o, c) - 0.5;
    prev = c;
  }
  const step = (data.x[1] ?? 60_000) - (data.x[0] ?? 0) || 60_000;
  return { open, high, low, close, width: Math.abs(step) * 0.7 };
}

function prepareUPlotBenchmarkData(
  packed: readonly number[],
): { data: UPlotBenchmarkData; ranges: UPlotRanges } {
  const numFields = packed[0] ?? 8;
  const src = packed.slice(numFields + 1);
  const rows = Math.floor(src.length / numFields);
  const data: UPlotBenchmarkData = [
    Array<number>(rows),
    Array<number>(rows),
    Array<number>(rows),
    Array<number>(rows),
  ];
  let yMin = Number.POSITIVE_INFINITY;
  let yMax = Number.NEGATIVE_INFINITY;

  for (let i = 0, row = 0; i < src.length; i += numFields, row += 1) {
    data[0][row] = (src[i] ?? 0) * 60;
    const cpuValue = round3(100 - (src[i + 1] ?? 0));
    const used = src[i + 5] ?? 0;
    const free = src[i + 6] ?? 0;
    const ramValue = round2((100 * used) / (used + free));
    const tcpValue = round2(src[i + 3] ?? 0);
    data[1][row] = cpuValue;
    data[2][row] = ramValue;
    data[3][row] = tcpValue;
    yMin = Math.min(yMin, cpuValue, ramValue, tcpValue);
    yMax = Math.max(yMax, cpuValue, ramValue, tcpValue);
  }

  return {
    data,
    ranges: {
      x: { min: data[0][0] ?? 0, max: data[0][rows - 1] ?? 0 },
      y: {
        min: Number.isFinite(yMin) ? Math.floor(yMin - 5) : 0,
        max: Number.isFinite(yMax) ? Math.ceil(yMax + 5) : 100,
      },
    },
  };
}

function waitTwoFrames(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => resolve());
    });
  });
}

function waitFrame(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => resolve());
  });
}

async function measureFrameSequence(
  frames: number,
  beforeFrame?: (frame: number) => void,
): Promise<number> {
  const start = performance.now();
  for (let frame = 0; frame < frames; frame += 1) {
    beforeFrame?.(frame);
    await waitFrame();
  }
  return performance.now() - start;
}

async function benchmarkFrames(
  frames: number,
  beforeFrame: (frame: number) => void,
): Promise<InteractionBenchmark> {
  const baselineMs = await measureFrameSequence(frames);
  await waitTwoFrames();
  const totalMs = await measureFrameSequence(frames, beforeFrame);
  await waitTwoFrames();
  return {
    frames,
    baselineMs,
    totalMs,
    deltaMs: totalMs - baselineMs,
  };
}

function dispatchPointerEvent(
  target: EventTarget,
  type: string,
  args: {
    clientX: number;
    clientY: number;
    button?: number;
    buttons?: number;
    shiftKey?: boolean;
  },
) {
  target.dispatchEvent(
    new PointerEvent(type, {
      bubbles: true,
      composed: true,
      cancelable: true,
      pointerId: 1,
      pointerType: "mouse",
      isPrimary: true,
      clientX: args.clientX,
      clientY: args.clientY,
      button: args.button ?? 0,
      buttons: args.buttons ?? 0,
      shiftKey: args.shiftKey ?? false,
    }),
  );
}

function dispatchMouseEvent(
  target: EventTarget,
  type: string,
  args: {
    clientX: number;
    clientY: number;
    button?: number;
    buttons?: number;
    shiftKey?: boolean;
  },
) {
  target.dispatchEvent(
    new MouseEvent(type, {
      bubbles: true,
      composed: true,
      cancelable: true,
      clientX: args.clientX,
      clientY: args.clientY,
      button: args.button ?? 0,
      buttons: args.buttons ?? 0,
      shiftKey: args.shiftKey ?? false,
    }),
  );
}

function hoverPoint(rect: PlotRect, frame: number, frames: number) {
  const t = frames <= 1 ? 0 : frame / (frames - 1);
  const padX = Math.min(24, rect.width * 0.04);
  const padY = Math.min(18, rect.height * 0.08);
  return {
    x: rect.left + padX + (rect.width - padX * 2) * t,
    y:
      rect.top +
      rect.height * 0.5 +
      Math.sin(frame * 0.17) * Math.max(10, rect.height * 0.18 - padY),
  };
}

async function benchmarkHover(harness: BenchmarkHarness) {
  return benchmarkFrames(HOVER_BENCHMARK_FRAMES, (frame) => {
    const rect = harness.plotRect();
    const point = hoverPoint(rect, frame, HOVER_BENCHMARK_FRAMES);
    harness.hover(point.x, point.y);
  });
}

async function benchmarkBoxZoom(harness: BenchmarkHarness) {
  return benchmarkFrames(ZOOM_BENCHMARK_FRAMES, (frame) => {
    const cycleFrame = frame % ZOOM_BENCHMARK_FRAMES_PER_CYCLE;
    const rect = harness.plotRect();
    const startX = rect.left + rect.width * 0.2;
    const endX = rect.left + rect.width * 0.78;
    const y = rect.top + rect.height * 0.45;
    if (cycleFrame === 0) {
      harness.zoomStart(startX, y);
      return;
    }
    if (cycleFrame <= 12) {
      const t = (cycleFrame - 1) / 11;
      harness.zoomMove(startX + (endX - startX) * t, y);
      return;
    }
    if (cycleFrame === 13) {
      harness.zoomEnd(endX, y);
      return;
    }
    if (cycleFrame === 16) {
      harness.resetView();
    }
  });
}

function writeBenchmarkResult(
  waitEl: HTMLElement,
  resultEl: HTMLElement,
  result: BenchmarkResult,
) {
  waitEl.textContent =
    `${result.lib} render ${result.chartMs.toFixed(1)} ms, hover ${result.hoverDeltaMs.toFixed(1)} ms, zoom ${result.zoomDeltaMs.toFixed(1)} ms`;
  resultEl.textContent = JSON.stringify(result);
  document.body.dataset.benchmarkReady = "1";
  (window as Window & { __benchmarkResult?: BenchmarkResult }).__benchmarkResult =
    result;
}

function formatPlotStats(frameMs: number | null, fps: number | null): string {
  const frameText = frameMs === null ? "--" : frameMs.toFixed(1);
  const fpsText = fps === null ? "--" : fps.toFixed(0);
  return `frame ${frameText} ms\nfps ${fpsText}`;
}

function setPlotStats(
  statsEl: HTMLElement,
  frameMs: number | null,
  fps: number | null,
): void {
  statsEl.textContent = formatPlotStats(frameMs, fps);
}

function createPlotStatsLoop(statsEl: HTMLElement): () => void {
  let raf = 0;
  let lastTs = 0;
  let avgFrameMs = 16.7;
  let avgFps = 60;

  const tick = (ts: number) => {
    if (lastTs > 0) {
      const frameMs = Math.max(0, ts - lastTs);
      avgFrameMs += (frameMs - avgFrameMs) * 0.18;
      const fps = frameMs > 0 ? 1000 / frameMs : avgFps;
      avgFps += (fps - avgFps) * 0.18;
      setPlotStats(statsEl, avgFrameMs, avgFps);
    }
    lastTs = ts;
    raf = requestAnimationFrame(tick);
  };

  setPlotStats(statsEl, null, null);
  raf = requestAnimationFrame(tick);

  return () => cancelAnimationFrame(raf);
}

function createBenchmarkResult(
  lib: BenchmarkLib,
  rows: number,
  prepMs: number,
  chartMs: number,
  hover: InteractionBenchmark,
  zoom: InteractionBenchmark,
  kind: BenchmarkKind = "line",
  visibleSeries: number = SERVER_EVENTS_SERIES,
): BenchmarkResult {
  const base = `server-events-${rows * visibleSeries}`;
  return {
    lib,
    scenario: kind === "line" ? base : `${base}-${kind}`,
    rows,
    visibleSeries,
    totalPoints: rows * visibleSeries,
    prepMs,
    chartMs,
    hoverBaselineMs: hover.baselineMs,
    hoverTotalMs: hover.totalMs,
    hoverDeltaMs: hover.deltaMs,
    zoomBaselineMs: zoom.baselineMs,
    zoomTotalMs: zoom.totalMs,
    zoomDeltaMs: zoom.deltaMs,
    width: BENCHMARK_WIDTH,
    height: BENCHMARK_HEIGHT,
  };
}

const wait = document.getElementById("wait");
const host = document.getElementById("plot");
const statsEl = document.getElementById("plot-stats");
const resultEl = document.getElementById("result-json");

if (!wait || !host || !statsEl || !resultEl) {
  throw new Error("Missing benchmark DOM");
}

const params = new URLSearchParams(window.location.search);
const libParam = params.get("lib");
const targetLib: BenchmarkLib = libParam === "uplot" ? "uplot" : "wplot";
const kindParam = params.get("kind");
const targetKind: BenchmarkKind =
  kindParam === "scatter"
    ? "scatter"
    : kindParam === "candles"
      ? "candles"
      : kindParam === "gradient"
        ? "gradient"
        : "line";
const sizeParam = Number.parseInt(params.get("size") ?? "", 10);
const benchmarkRows =
  Number.isFinite(sizeParam) && sizeParam > 0 ? sizeParam : SERVER_EVENTS_ROWS;
createPlotStatsLoop(statsEl);

function resetHost(): void {
  host.innerHTML = "";
  host.append(statsEl);
}

function createWPlotHarness(plot: {
  view: { reset: () => void };
  coords: {
    bounds: () => {
      origin: { x: number; y: number };
      size: { width: number; height: number };
    };
  };
}): BenchmarkHarness {
  const target = host.querySelector<HTMLCanvasElement>(".plot-canvas");
  if (!target) {
    throw new Error("Missing wplot canvas");
  }
  return {
    plotRect() {
      const canvasRect = target.getBoundingClientRect();
      const bounds = plot.coords.bounds();
      return {
        left: canvasRect.left + bounds.origin.x,
        top: canvasRect.top + bounds.origin.y,
        width: bounds.size.width,
        height: bounds.size.height,
      };
    },
    hover(clientX, clientY) {
      dispatchPointerEvent(target, "pointermove", { clientX, clientY });
    },
    zoomStart(clientX, clientY) {
      dispatchPointerEvent(target, "pointerdown", {
        clientX,
        clientY,
        button: 0,
        buttons: 1,
        shiftKey: true,
      });
    },
    zoomMove(clientX, clientY) {
      dispatchPointerEvent(target, "pointermove", {
        clientX,
        clientY,
        buttons: 1,
        shiftKey: true,
      });
    },
    zoomEnd(clientX, clientY) {
      dispatchPointerEvent(target, "pointerup", {
        clientX,
        clientY,
        button: 0,
        buttons: 0,
        shiftKey: true,
      });
    },
    resetView() {
      plot.view.reset();
    },
  };
}

function createUPlotHarness(
  chart: {
    root: HTMLElement;
    batch: (tx: () => void) => void;
    setScale: (scaleKey: string, limits: { min: number; max: number }) => void;
  },
  ranges: UPlotRanges,
): BenchmarkHarness {
  const target =
    chart.root.querySelector<HTMLElement>(".u-over") ?? chart.root;
  return {
    plotRect() {
      const rect = target.getBoundingClientRect();
      return {
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height,
      };
    },
    hover(clientX, clientY) {
      dispatchMouseEvent(target, "mousemove", { clientX, clientY });
    },
    zoomStart(clientX, clientY) {
      dispatchMouseEvent(target, "mousedown", {
        clientX,
        clientY,
        button: 0,
        buttons: 1,
      });
    },
    zoomMove(clientX, clientY) {
      dispatchMouseEvent(target, "mousemove", {
        clientX,
        clientY,
        buttons: 1,
      });
    },
    zoomEnd(clientX, clientY) {
      dispatchMouseEvent(document, "mouseup", {
        clientX,
        clientY,
        button: 0,
        buttons: 0,
      });
    },
    resetView() {
      chart.batch(() => {
        chart.setScale("x", ranges.x);
        chart.setScale("y", ranges.y);
      });
    },
  };
}

async function runWPlot(
  packed: readonly number[],
  rows: number,
  kind: BenchmarkKind,
) {
  const { createPlot } = await import("../src/lib");
  const prepStart = performance.now();
  const data = prepareWPlotBenchmarkData(packed);
  const candles = kind === "candles" ? deriveWPlotCandles(data) : null;
  const prepMs = performance.now() - prepStart;

  resetHost();
  const chartStart = performance.now();
  const plot = createPlot({
    host,
    initialValue: {
      x: data.xRange,
      y: data.yRange,
    },
    config: createBenchmarkPlotConfig(BENCHMARK_TIME_OFFSET_MS),
  });
  // Match uPlot's default drag-zoom, which is x-only (`{x:true, y:false}`). The
  // scripted box-zoom gesture drags horizontally at constant y; with wplot's
  // default "xy" box the commit needs vertical travel too and would never fire,
  // so wplot would skip the rescale uPlot performs — an unfair zoom comparison.
  // Forcing x-only makes both libraries do the same x-axis zoom + re-decimate.
  plot.interaction.setZoomType("x");

  let visibleSeries = SERVER_EVENTS_SERIES;
  if (kind === "candles" && candles) {
    visibleSeries = 1;
    plot.series.add(
      "OHLC",
      {
        kind: "series/candles",
        x: data.x,
        open: candles.open,
        high: candles.high,
        low: candles.low,
        close: candles.close,
        width: candles.width,
      },
      { color: [0.6, 0.7, 0.95, 1] },
    );
  } else if (kind === "scatter") {
    plot.series.add(
      "CPU",
      { kind: "series/scatter", x: data.x, y: data.cpu, sizePx: 3 },
      { color: [0.95, 0.34, 0.34, 1] },
    );
    plot.series.add(
      "RAM",
      { kind: "series/scatter", x: data.x, y: data.ram, sizePx: 3 },
      { color: [0.26, 0.54, 0.95, 1] },
    );
    plot.series.add(
      "TCP Out",
      { kind: "series/scatter", x: data.x, y: data.tcp, sizePx: 3 },
      { color: [0.29, 0.74, 0.44, 1] },
    );
  } else if (kind === "gradient") {
    // Gradient scatter: same point counts as the scatter scenario, but each
    // series is colored per-point from `colorValues` via a colormap. This
    // exercises the colormap resolution at add time plus the per-point fill/stroke
    // draw path (heavier than single-color markers).
    plot.series.add(
      "CPU",
      {
        kind: "series/scatter",
        x: data.x,
        y: data.cpu,
        sizePx: 3,
        colorValues: Array.from(data.cpu),
        colormap: "viridis",
      },
      { color: [0.95, 0.34, 0.34, 1] },
    );
    plot.series.add(
      "RAM",
      {
        kind: "series/scatter",
        x: data.x,
        y: data.ram,
        sizePx: 3,
        colorValues: Array.from(data.ram),
        colormap: "magma",
      },
      { color: [0.26, 0.54, 0.95, 1] },
    );
    plot.series.add(
      "TCP Out",
      {
        kind: "series/scatter",
        x: data.x,
        y: data.tcp,
        sizePx: 3,
        colorValues: Array.from(data.tcp),
        colormap: "plasma",
      },
      { color: [0.29, 0.74, 0.44, 1] },
    );
  } else {
    plot.series.add(
      "CPU",
      { kind: "series/line", x: data.x, y: data.cpu, widthPx: 1 },
      { color: [0.95, 0.34, 0.34, 1] },
    );
    plot.series.add(
      "RAM",
      { kind: "series/line", x: data.x, y: data.ram, widthPx: 1 },
      { color: [0.26, 0.54, 0.95, 1] },
    );
    plot.series.add(
      "TCP Out",
      { kind: "series/line", x: data.x, y: data.tcp, widthPx: 1 },
      { color: [0.29, 0.74, 0.44, 1] },
    );
  }

  plot.start();
  await waitTwoFrames();
  const renderMs = performance.now() - chartStart;
  const harness = createWPlotHarness(plot);
  const hover = await benchmarkHover(harness);
  const zoom = await benchmarkBoxZoom(harness);
  return createBenchmarkResult(
    "wplot",
    rows,
    prepMs,
    renderMs,
    hover,
    zoom,
    kind,
    visibleSeries,
  );
}

async function runUPlot(packed: readonly number[], rows: number) {
  const [{ default: uPlot }] = await Promise.all([
    import("uplot"),
    import("uplot/dist/uPlot.min.css"),
  ]);
  const prepStart = performance.now();
  const prepared = prepareUPlotBenchmarkData(packed);
  const data = prepared.data;
  const prepMs = performance.now() - prepStart;

  resetHost();
  const chartStart = performance.now();
  const chart = new uPlot(
    {
      width: BENCHMARK_WIDTH,
      height: BENCHMARK_HEIGHT,
      legend: { show: false },
      select: {
        show: true,
      },
      series: [
        {},
        {
          stroke: "red",
          width: 1 / devicePixelRatio,
        },
        {
          stroke: "blue",
          width: 1 / devicePixelRatio,
        },
        {
          stroke: "green",
          width: 1 / devicePixelRatio,
        },
      ],
      axes: [
        {
          stroke: "rgba(31,31,31,0.88)",
          grid: { stroke: "rgba(55,55,55,0.64)" },
          ticks: { stroke: "rgba(31,31,31,0.88)" },
        },
        {
          stroke: "rgba(31,31,31,0.88)",
          grid: { stroke: "rgba(55,55,55,0.64)" },
          ticks: { stroke: "rgba(31,31,31,0.88)" },
        },
      ],
    },
    data,
    host,
  );
  await waitTwoFrames();
  const renderMs = performance.now() - chartStart;
  const harness = createUPlotHarness(
    {
      root: chart.root,
      batch: chart.batch.bind(chart),
      setScale: chart.setScale.bind(chart),
    },
    prepared.ranges,
  );
  const hover = await benchmarkHover(harness);
  const zoom = await benchmarkBoxZoom(harness);
  return createBenchmarkResult(
    "uplot",
    rows,
    prepMs,
    renderMs,
    hover,
    zoom,
  );
}

async function run() {
  // uPlot has no comparable built-in candles/scatter/gradient config in this
  // harness, so non-line kinds run wplot only. The default (no `kind`) keeps both
  // libs and the exact line scenario, so existing baselines stay comparable.
  const uplotUnsupportedKind = targetLib === "uplot" && targetKind !== "line";
  const effectiveLib: BenchmarkLib = uplotUnsupportedKind ? "wplot" : targetLib;
  const kindLabel = targetKind === "line" ? "" : ` ${targetKind}`;

  document.title = `${effectiveLib}${kindLabel} 1:1 benchmark`;
  wait.textContent = uplotUnsupportedKind
    ? `uPlot has no ${targetKind} config; running wplot...`
    : `Preparing ${effectiveLib}${kindLabel} benchmark...`;
  resetHost();
  host.style.width = `${BENCHMARK_WIDTH}px`;
  host.style.height = `${BENCHMARK_HEIGHT}px`;

  const packed = createBenchmarkPackedData(benchmarkRows);

  wait.textContent = `Rendering ${effectiveLib}${kindLabel}...`;
  const result =
    effectiveLib === "wplot"
      ? await runWPlot(packed, benchmarkRows, targetKind)
      : await runUPlot(packed, benchmarkRows);

  writeBenchmarkResult(wait, resultEl, result);
}

void run();
