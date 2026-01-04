import "./stress.css";
import { createPlot } from "../src/lib";

const app = document.querySelector<HTMLDivElement>("#app");
if (!app) throw new Error("Missing #app");

app.innerHTML = `
  <div class="plot-shell">
    <canvas class="plot-canvas" id="plot-main"></canvas>
    <canvas class="text-canvas" id="text-main"></canvas>
    <div class="plot-legend" id="legend-main"></div>
  </div>
`;

const plotCanvas = document.querySelector<HTMLCanvasElement>("#plot-main")!;
const textCanvas = document.querySelector<HTMLCanvasElement>("#text-main")!;
const legendEl = document.querySelector<HTMLDivElement>("#legend-main")!;
const isMobile =
  window.matchMedia("(max-width: 900px)").matches ||
  navigator.maxTouchPoints > 0;

const palette = [
  [0.28, 0.76, 0.9, 0.9],
  [0.96, 0.68, 0.38, 0.9],
  [0.71, 0.55, 0.95, 0.9],
] as const;

const baseConfig = {
  gridSpacing: [85, 60] as [number, number],
  gridColor: [0.2, 0.22, 0.25, 0.25] as const,
  crosshairColor: [0.62, 0.72, 0.85, 1] as const,
  borderColor: [0.22, 0.24, 0.26, 1] as const,
  background: [0.063, 0.067, 0.067, 1] as const,
};

const pointCount = 1_000_000;
const plot = createPlot({
  canvas: plotCanvas,
  textCanvas,
  initialWorld: {
    x: { min: 0, max: pointCount - 1 },
    y: { min: -50, max: 50 },
  },
  config: baseConfig,
});
if (isMobile) plot.actions.setEnabled(false);

function buildStressLines(lineCount: number, pointCount: number) {
  const x = new Float32Array(pointCount);
  for (let i = 0; i < pointCount; i++) {
    x[i] = i;
  }

  const ys: Float32Array[] = [];
  for (let i = 0; i < lineCount; i++) {
    const y = new Float32Array(pointCount);
    let acc = (i - (lineCount - 1) * 0.5) * 6;
    const drift = 0.4 + i * 0.08;
    for (let j = 0; j < pointCount; j++) {
      acc += (Math.random() - 0.5) * drift;
      y[j] = acc;
    }
    ys.push(y);
  }
  return { x, ys };
}

const stress = buildStressLines(3, pointCount);
const ids = stress.ys.map((y, i) =>
  plot.series.add(
    `series/${i + 1}`,
    { kind: "series/line", x: stress.x, y, widthPx: 0.7 },
    { color: palette[i % palette.length]! },
  ),
);

function renderLegend() {
  legendEl.innerHTML = "";
  const series = plot.series.list();
  for (const s of series) {
    const item = document.createElement("div");
    item.className = `legend-item${s.visible ? "" : " is-off"}`;
    const swatch = document.createElement("span");
    swatch.className = "legend-swatch";
    swatch.style.background = `rgba(${Math.round(s.color[0] * 255)},${Math.round(
      s.color[1] * 255,
    )},${Math.round(s.color[2] * 255)},${s.color[3]})`;
    const label = document.createElement("span");
    label.textContent = s.name;
    item.appendChild(swatch);
    item.appendChild(label);
    if (!isMobile) {
      item.addEventListener("click", () => {
        plot.series.visible(s.id, !s.visible);
        renderLegend();
      });
    }
    legendEl.appendChild(item);
  }
}

renderLegend();
plot.start();
