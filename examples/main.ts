import "./style.css";
import { createPlot } from "../src/lib";
import { createLinkGroup } from "../src/core";
import type { PlotConfigUpdate } from "../src/core/model";

const app = document.querySelector<HTMLDivElement>("#app");
if (!app) throw new Error("Missing #app");

app.innerHTML = `
  <div class="plot-stack">
    <div class="plot-shell">
      <canvas class="plot-canvas" id="plot-a"></canvas>
      <canvas class="text-canvas" id="text-a"></canvas>
      <div class="plot-legend" id="legend-a"></div>
    </div>
    <div class="plot-shell">
      <canvas class="plot-canvas" id="plot-b"></canvas>
      <canvas class="text-canvas" id="text-b"></canvas>
      <div class="plot-legend" id="legend-b"></div>
    </div>
    <div class="plot-shell">
      <canvas class="plot-canvas" id="plot-d"></canvas>
      <canvas class="text-canvas" id="text-d"></canvas>
      <div class="plot-legend" id="legend-d"></div>
    </div>
    <div class="plot-shell">
      <canvas class="plot-canvas" id="plot-c"></canvas>
      <canvas class="text-canvas" id="text-c"></canvas>
      <div class="plot-legend" id="legend-c"></div>
    </div>
    <div class="plot-shell">
      <canvas class="plot-canvas" id="plot-e"></canvas>
      <canvas class="text-canvas" id="text-e"></canvas>
      <div class="plot-legend" id="legend-e"></div>
    </div>
    <div class="plot-shell">
      <canvas class="plot-canvas" id="plot-f"></canvas>
      <canvas class="text-canvas" id="text-f"></canvas>
      <div class="plot-legend" id="legend-f"></div>
    </div>
  </div>
  <div class="plot-tooltip" id="plot-tooltip"></div>
`;

const aCanvas = document.querySelector<HTMLCanvasElement>("#plot-a")!;
const aText = document.querySelector<HTMLCanvasElement>("#text-a")!;
const bCanvas = document.querySelector<HTMLCanvasElement>("#plot-b")!;
const bText = document.querySelector<HTMLCanvasElement>("#text-b")!;
const cCanvas = document.querySelector<HTMLCanvasElement>("#plot-c")!;
const cText = document.querySelector<HTMLCanvasElement>("#text-c")!;
const dCanvas = document.querySelector<HTMLCanvasElement>("#plot-d")!;
const dText = document.querySelector<HTMLCanvasElement>("#text-d")!;
const eCanvas = document.querySelector<HTMLCanvasElement>("#plot-e")!;
const eText = document.querySelector<HTMLCanvasElement>("#text-e")!;
const fCanvas = document.querySelector<HTMLCanvasElement>("#plot-f")!;
const fText = document.querySelector<HTMLCanvasElement>("#text-f")!;
const legendA = document.querySelector<HTMLDivElement>("#legend-a")!;
const legendB = document.querySelector<HTMLDivElement>("#legend-b")!;
const legendC = document.querySelector<HTMLDivElement>("#legend-c")!;
const legendD = document.querySelector<HTMLDivElement>("#legend-d")!;
const legendE = document.querySelector<HTMLDivElement>("#legend-e")!;
const legendF = document.querySelector<HTMLDivElement>("#legend-f")!;
const tooltip = document.querySelector<HTMLDivElement>("#plot-tooltip")!;
const isMobile =
  window.matchMedia("(max-width: 900px)").matches ||
  navigator.maxTouchPoints > 0;

function showTooltip(
  canvas: HTMLCanvasElement,
  ev: { screen?: { x: number; y: number } },
  html: string,
): void {
  if (!ev.screen) return;
  const rect = canvas.getBoundingClientRect();
  tooltip.innerHTML = html;
  tooltip.style.opacity = "1";
  const pad = 12;
  let x = rect.left + ev.screen.x + pad;
  let y = rect.top + ev.screen.y + pad;
  const w = tooltip.offsetWidth;
  const h = tooltip.offsetHeight;
  if (x + w > window.innerWidth - 8) x = rect.left + ev.screen.x - w - pad;
  if (y + h > window.innerHeight - 8) y = rect.top + ev.screen.y - h - pad;
  tooltip.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px)`;
}

function hideTooltip(): void {
  tooltip.style.opacity = "0";
}

const linkGroup = createLinkGroup();

const plotColors = {
  purple: [140 / 255, 115 / 255, 217 / 255, 1] as const,
  purpleSoft: [140 / 255, 115 / 255, 217 / 255, 0.35] as const,
  turquoise: [51 / 255, 204 / 255, 204 / 255, 1] as const,
  turquoiseSoft: [51 / 255, 204 / 255, 204 / 255, 0.35] as const,
  violet: [209 / 255, 127 / 255, 217 / 255, 1] as const,
  gray: [0.7, 0.72, 0.75, 1] as const,
  rect: [179 / 255, 179 / 255, 179 / 255, 1] as const,
};

function withAlpha(
  color: readonly [number, number, number, number],
  alpha: number,
) {
  return [color[0], color[1], color[2], alpha] as const;
}

const clusterGuide60 = withAlpha(plotColors.turquoise, 0.5);
const clusterGuide90 = withAlpha(plotColors.violet, 0.55);

const baseConfig = {
  gridSpacing: [60, 30] as [number, number],
  gridColor: [0.2, 0.22, 0.25, 0.35] as const,
  crosshairColor: [0.62, 0.72, 0.85, 1] as const,
  borderColor: [0.22, 0.24, 0.26, 1] as const,
  background: [0.063, 0.067, 0.067, 1] as const,
} satisfies PlotConfigUpdate;

const plotA = createPlot({
  canvas: aCanvas,
  textCanvas: aText,
  initialWorld: { x: { min: -1, max: 1 }, y: { min: -1, max: 1 } },
  config: baseConfig,
});

const linkedCount = 7200;
const linkedStep = 60_000;
const linkedMax = (linkedCount - 1) * linkedStep;
const linkedWindow = 900;
const linkedMin = Math.max(0, linkedMax - linkedWindow * linkedStep);
const linkedOffset = Date.now() - linkedMax;

const linkedConfig: PlotConfigUpdate = {
  ...baseConfig,
  axisMode: {
    x: { mode: "time", offset: linkedOffset },
  },
};

const plotB = createPlot({
  canvas: bCanvas,
  textCanvas: bText,
  initialWorld: {
    x: { min: linkedMin, max: linkedMax },
    y: { min: 0, max: 100 },
  },
  config: linkedConfig,
  link: {
    group: linkGroup,
    axes: { x: true, y: true },
    cursor: { x: true, y: true },
  },
});

const plotC = createPlot({
  canvas: cCanvas,
  textCanvas: cText,
  initialWorld: {
    x: { min: linkedMin, max: linkedMax },
    y: { min: 0, max: 100 },
  },
  config: linkedConfig,
  link: {
    group: linkGroup,
    axes: { x: true, y: true },
    cursor: { x: true, y: true },
  },
});

const streamCount = 1200;
const streamStep = 1;
let streamX = (streamCount - 1) * streamStep;
const streamY = { min: -6, max: 6 };

const plotD = createPlot({
  canvas: dCanvas,
  textCanvas: dText,
  initialWorld: {
    x: { min: streamX - streamStep * (streamCount - 1), max: streamX },
    y: streamY,
  },
  config: baseConfig,
});
plotD.actions.setEnabled(false);

const plotE = createPlot({
  canvas: eCanvas,
  textCanvas: eText,
  initialWorld: { x: { min: -0.4, max: 2.4 }, y: { min: -10, max: 5 } },
  config: baseConfig,
});

const plotF = createPlot({
  canvas: fCanvas,
  textCanvas: fText,
  initialWorld: { x: { min: -2.2, max: 2.2 }, y: { min: -1.9, max: 1.9 } },
  config: baseConfig,
});

const allPlots = [plotA, plotB, plotC, plotD, plotE, plotF];
if (isMobile) {
  for (const plot of allPlots) plot.actions.setEnabled(false);
  tooltip.style.display = "none";
}

function buildSine(length: number, freq: number, amp: number, phase: number) {
  const x = new Float32Array(length);
  const y = new Float32Array(length);
  const step = 4 / Math.max(length - 1, 1);
  for (let i = 0; i < length; i++) {
    const xv = -2 + i * step;
    const yRaw = Math.sin(xv * freq + phase) * amp;
    const yv = Math.abs(yRaw) < 1e-9 ? 0 : yRaw;
    x[i] = xv;
    y[i] = yv;
  }
  return { x, y };
}

function colorToCss(color: readonly [number, number, number, number]) {
  const r = Math.round(color[0] * 255);
  const g = Math.round(color[1] * 255);
  const b = Math.round(color[2] * 255);
  const a = Math.max(0, Math.min(1, color[3]));
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

function renderLegend(
  container: HTMLElement,
  plot: ReturnType<typeof createPlot>,
) {
  container.innerHTML = "";
  for (const s of plot.series.list()) {
    const item = document.createElement("div");
    item.className = "legend-item";
    if (!s.visible) item.classList.add("is-off");
    item.addEventListener("click", () => {
      plot.series.visible(s.id, !s.visible);
      renderLegend(container, plot);
      positionLegend(container, plot);
    });
    const swatch = document.createElement("span");
    swatch.className = "legend-swatch";
    swatch.style.background = colorToCss(s.color);
    const label = document.createElement("span");
    label.textContent = s.name;
    item.appendChild(swatch);
    item.appendChild(label);
    container.appendChild(item);
  }
}

function positionLegend(
  container: HTMLElement,
  plot: ReturnType<typeof createPlot>,
) {
  const rect = plot.coords.plotRect();
  const pad = 8;
  container.style.left = `${rect.origin.x + pad}px`;
  container.style.top = `${rect.origin.y + pad}px`;
}

function wireLegend(
  container: HTMLElement,
  plot: ReturnType<typeof createPlot>,
) {
  renderLegend(container, plot);
  positionLegend(container, plot);
  plot.subscribe("view", () => positionLegend(container, plot));
}

function buildScatter(count: number) {
  const x = new Float32Array(count);
  const y = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    x[i] = Math.random() * 4 - 2;
    y[i] = Math.random() * 2 - 1;
  }
  return { x, y };
}

function buildBars(count: number) {
  const x = new Float32Array(count);
  const y = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    x[i] = -1.8 + i * (3.6 / Math.max(count - 1, 1));
    y[i] = 0.45 + Math.cos(i * 0.1) * 0.35;
  }
  return { x, y, width: 3.6 / Math.max(count - 1, 1) };
}

function randn() {
  let u = 0;
  let v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function buildHrDiagram(count: number) {
  const x = new Float32Array(count);
  const y = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    x[i] = -0.4 + Math.random() * 2.8;
    y[i] = -10 + Math.random() * 15;
  }
  return { x, y };
}

function buildNoisyStep(length: number) {
  const x = new Float32Array(length);
  const y = new Float32Array(length);
  const step = 4 / Math.max(length - 1, 1);
  let accum = 0;
  for (let i = 0; i < length; i++) {
    const xv = -2 + i * step;
    accum += (Math.random() - 0.5) * 0.04;
    x[i] = xv;
    y[i] = accum + (Math.random() - 0.5) * 0.4;
  }
  return { x, y };
}

function buildStaticLines(lineCount: number, pointCount: number) {
  const x = new Float32Array(pointCount);
  const step = 4 / Math.max(pointCount - 1, 1);
  for (let i = 0; i < pointCount; i++) {
    x[i] = -2 + i * step;
  }
  const ys: Float32Array[] = [];
  for (let i = 0; i < lineCount; i++) {
    const y = new Float32Array(pointCount);
    const offset = (i - (lineCount - 1) * 0.5) * 0.15;
    const phase = i * 0.35;
    for (let j = 0; j < pointCount; j++) {
      const t = (j / Math.max(pointCount - 1, 1)) * Math.PI * 6 + phase;
      y[j] = Math.sin(t) * 0.08 + offset;
    }
    ys.push(y);
  }
  return { x, ys };
}

type StreamState = {
  value: number;
  min: number;
  max: number;
  noise: number;
};

function createStreamState(
  count: number,
  step: number,
  start: number,
  min: number,
  max: number,
  noise: number,
): { x: Float32Array; y: Float32Array; state: StreamState } {
  const x = new Float32Array(count);
  const y = new Float32Array(count);
  let value = start;
  for (let i = 0; i < count; i++) {
    const t = i * step;
    x[i] = t;
    const extra = randn() * noise;
    const next = value + extra;
    value =
      next > max || next < min
        ? Math.max(min, Math.min(max, value - extra))
        : next;
    y[i] = value;
  }
  return { x, y, state: { value, min, max, noise } };
}

function advanceStream(state: StreamState): number {
  const prev = state.value;
  const extra = randn() * state.noise;
  const next = prev + extra;
  state.value =
    next > state.max || next < state.min
      ? Math.max(state.min, Math.min(state.max, prev - extra))
      : next;
  return state.value;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function buildClusterBase(count: number, step: number) {
  const x = new Float32Array(count);
  const base = new Float32Array(count);
  let high = true;
  let nextSwitch = 80;
  let value = 55;
  for (let i = 0; i < count; i++) {
    x[i] = i * step;
    if (i >= nextSwitch) {
      high = !high;
      nextSwitch += 70 + Math.floor(Math.random() * 60);
    }
    const target = high ? 58 : 12;
    value += (target - value) * 0.08 + (Math.random() - 0.5) * 3.2;
    value = clamp(value, 2, 98);
    base[i] = value;
  }
  return { x, base };
}

function buildClusterBand(count: number, step: number) {
  const { x, base } = buildClusterBase(count, step);
  const mean = new Float32Array(count);
  const upper = new Float32Array(count);
  const lower = new Float32Array(count);
  const observed = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    const v = base[i] ?? 0;
    mean[i] = v;
    observed[i] = clamp(v + (Math.random() - 0.5) * 4, 0, 100);
    upper[i] = clamp(v + 8, 0, 100);
    lower[i] = clamp(v - 8, 0, 100);
  }
  return { x, mean, upper, lower, observed };
}

function buildClusterLines(count: number, step: number) {
  const { x, base } = buildClusterBase(count, step);
  const a = new Float32Array(count);
  const b = new Float32Array(count);
  const c = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    const v = base[i] ?? 0;
    a[i] = clamp(v + (Math.random() - 0.5) * 4, 0, 100);
    b[i] = clamp(v + 8 + (Math.random() - 0.5) * 3, 0, 100);
    c[i] = clamp(v - 8 + (Math.random() - 0.5) * 3, 0, 100);
  }
  return { x, a, b, c };
}

const waveA = buildSine(2000, 3, 0.42, 0);
const waveB = buildSine(2000, 4, 0.25, Math.PI * 0.25);
const scatterA = buildScatter(260);
const bars = buildBars(80);
const stepData = buildNoisyStep(600);

plotA.series.add(
  "sine/a",
  { kind: "series/line", x: waveA.x, y: waveA.y, widthPx: 1.2 },
  { color: plotColors.purple },
);
plotA.series.add(
  "sine/b",
  { kind: "series/line", x: waveB.x, y: waveB.y, widthPx: 1.2 },
  { color: plotColors.purple },
);
plotA.series.add(
  "band",
  { kind: "series/band", x: waveA.x, y0: waveA.y, y1: waveB.y, opacity: 0.2 },
  { color: plotColors.purpleSoft },
);
plotA.series.add(
  "step",
  {
    kind: "series/step",
    x: stepData.x,
    y: stepData.y,
    widthPx: 1.1,
    align: "center",
  },
  { color: plotColors.purple },
);
plotA.series.add(
  "scatter/a",
  {
    kind: "series/scatter",
    x: scatterA.x,
    y: scatterA.y,
    sizePx: 2,
    shape: "square",
    strokeWidthPx: 0,
  },
  { color: plotColors.turquoise },
);
plotA.series.add(
  "bars",
  { kind: "series/bars", x: bars.x, y: bars.y, width: bars.width },
  { color: plotColors.turquoiseSoft },
);
plotA.items.add({
  kind: "item/annotation/rect",
  xMin: -0.6,
  xMax: 0.0,
  yMin: -0.4,
  yMax: 0.4,
  fill: withAlpha(plotColors.rect, 0.2),
  stroke: plotColors.rect,
  strokeWidthPx: 1.2,
});
wireLegend(legendA, plotA);

const band = buildClusterBand(linkedCount, linkedStep);
plotB.series.add(
  "observed",
  { kind: "series/line", x: band.x, y: band.observed, widthPx: 1.1 },
  { color: plotColors.violet },
);
plotB.series.add(
  "mean",
  { kind: "series/line", x: band.x, y: band.mean, widthPx: 1.1 },
  { color: plotColors.purple },
);
plotB.series.add(
  "band",
  {
    kind: "series/band",
    x: band.x,
    y0: band.lower,
    y1: band.upper,
    opacity: 0.2,
  },
  { color: plotColors.purpleSoft },
);
plotB.items.add({
  kind: "item/guide/hline",
  y: 60,
  color: clusterGuide60,
  widthPx: 1,
});
plotB.items.add({
  kind: "item/guide/hline",
  y: 90,
  color: clusterGuide90,
  widthPx: 1,
});
wireLegend(legendB, plotB);

const multi = buildClusterLines(linkedCount, linkedStep);
plotC.series.add(
  "cluster/a",
  { kind: "series/line", x: multi.x, y: multi.a, widthPx: 1.1 },
  { color: plotColors.turquoise },
);
plotC.series.add(
  "cluster/b",
  { kind: "series/line", x: multi.x, y: multi.b, widthPx: 1.1 },
  { color: plotColors.purple },
);
plotC.series.add(
  "cluster/c",
  { kind: "series/line", x: multi.x, y: multi.c, widthPx: 1.1 },
  { color: plotColors.violet },
);
plotC.items.add({
  kind: "item/guide/hline",
  y: 60,
  color: clusterGuide60,
  widthPx: 1,
});
plotC.items.add({
  kind: "item/guide/hline",
  y: 90,
  color: clusterGuide90,
  widthPx: 1,
});
wireLegend(legendC, plotC);

const streamSeed = [
  createStreamState(streamCount, streamStep, -3, -5, 0, 0.22),
  createStreamState(streamCount, streamStep, -1, -4, 2, 0.2),
  createStreamState(streamCount, streamStep, 1, -2, 4, 0.24),
  createStreamState(streamCount, streamStep, 3, 0, 5, 0.22),
];
const streamStates = streamSeed.map((seed) => seed.state);
const streamColors = [
  [0x52 / 255, 0x1b / 255, 0x82 / 255, 1] as const,
  [0xb1 / 255, 0x2a / 255, 0x90 / 255, 1] as const,
  [0xf0 / 255, 0x6b / 255, 0x3a / 255, 1] as const,
  [0xff / 255, 0xa0 / 255, 0x60 / 255, 1] as const,
];
const streamIds = streamSeed.map((seed, idx) =>
  plotD.series.add(
    `stream/${idx + 1}`,
    { kind: "series/line", x: seed.x, y: seed.y, widthPx: 1 },
    { color: streamColors[idx] ?? plotColors.purple },
  ),
);
const streamOffset = Date.now() - streamX;
plotD.style.config({
  axisMode: { x: { mode: "time", timezone: "local", offset: streamOffset } },
});
wireLegend(legendD, plotD);

const hr = buildHrDiagram(10_000);
plotE.series.add(
  "scatter",
  {
    kind: "series/scatter",
    x: hr.x,
    y: hr.y,
    sizePx: 0.8,
    shape: "square",
    strokeWidthPx: 0,
  },
  { color: [0.95, 0.82, 0.45, 0.75] as const },
);
wireLegend(legendE, plotE);

const staticLineCount = 19;
const staticPointCount = 2048;
const staticLines = buildStaticLines(staticLineCount, staticPointCount);
const staticBase = staticLines.ys;
const staticLive = staticBase.map((line) => new Float32Array(line));
const staticIds = staticLive.map((line, idx) =>
  plotF.series.add(
    `line/${idx + 1}`,
    { kind: "series/line", x: staticLines.x, y: line, widthPx: 1 },
    { color: plotColors.turquoise },
  ),
);
wireLegend(legendF, plotF);

const animateStream = () => {
  streamX += streamStep;
  for (let s = 0; s < streamStates.length; s++) {
    const state = streamStates[s]!;
    const nextY = advanceStream(state);
    plotD.series.append(streamIds[s] ?? 0, {
      x: streamX,
      y: nextY,
      max: streamCount,
    });
  }
  plotD.view.set({
    x: { min: streamX - streamStep * (streamCount - 1), max: streamX },
    y: streamY,
  });
  for (let i = 0; i < staticLive.length; i++) {
    const base = staticBase[i]!;
    const live = staticLive[i]!;
    for (let p = 0; p < live.length; p++) {
      live[p] = base[p]! + (Math.random() - 0.5) * 0.04;
    }
    plotF.series.write(staticIds[i] ?? 0, {
      kind: "series/line",
      x: staticLines.x,
      y: live,
      widthPx: 1,
    });
  }
  requestAnimationFrame(animateStream);
};

plotA.start();
plotB.start();
plotC.start();
plotD.start();
plotE.start();
plotF.start();
requestAnimationFrame(animateStream);

const plotEntries: Array<[ReturnType<typeof createPlot>, HTMLCanvasElement]> = [
  [plotA, aCanvas],
  [plotB, bCanvas],
  [plotC, cCanvas],
  [plotD, dCanvas],
  [plotE, eCanvas],
  [plotF, fCanvas],
];
if (!isMobile) {
  for (const [plot, canvas] of plotEntries) {
    plot.subscribe("cursor", (ev) => {
      if (!ev.inside || !ev.screen || !ev.world) return hideTooltip();
      const x = ev.world.x.toFixed(2);
      const y = ev.world.y.toFixed(2);
      showTooltip(canvas, ev, `${x}, ${y}`);
    });

    plot.subscribe("hover", (ev) => {
      if (!ev.screen || !ev.world) return;
      if (!ev.hit) return;
      if (ev.hit.kind !== "series-point") return;
      const datum = plot.series.datum(ev.hit.seriesId, ev.hit.index);
      if (!datum || typeof datum !== "object") return;
      const d = datum as { x?: number; y?: number };
      const sx = d.x != null ? d.x.toFixed(2) : ev.world.x.toFixed(2);
      const sy = d.y != null ? d.y.toFixed(2) : ev.world.y.toFixed(2);
      showTooltip(
        canvas,
        ev,
        `<div>${ev.hit.seriesName}</div><div>${sx}, ${sy}</div>`,
      );
    });
  }
}
