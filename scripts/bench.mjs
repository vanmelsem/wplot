// Headless wplot-vs-uPlot benchmark runner.
//
// Spawns the vite bench dev server (mode "bench", rooted at bench/), then drives
// Chromium across {wplot,uplot} × sizes × trials, reading window.__benchmarkResult
// from bench/benchmark.html. Aggregates median + p95 per (lib, size) and prints a
// markdown table, also writing raw + summary JSON to docs/benchmark-results.json.
//
// Usage:
//   bun run bench                                # defaults
//   bun run bench --sizes 10000,55550 --trials 5 --dpr 1
//   bun run bench --kind gradient --libs wplot --sizes 55550
//
// Requires @playwright/test (chromium). Run `bunx playwright install chromium` once.
import { spawn } from "node:child_process";
import { writeFileSync } from "node:fs";
import { chromium } from "@playwright/test";

const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
};

const SIZES = arg("sizes", "10000,55550,166650")
  .split(",")
  .map((s) => Number.parseInt(s, 10))
  .filter((n) => Number.isFinite(n) && n > 0);
const TRIALS = Number.parseInt(arg("trials", "5"), 10);
const DPR = Number.parseFloat(arg("dpr", "1"));
const LIBS = arg("libs", "wplot,uplot").split(",");
// Optional series kind: "candles" | "scatter" | "gradient". Omitted => the
// default line scenario (identical URL to before, so baselines stay comparable).
const KIND = arg("kind", "");

const median = (xs) => {
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
const percentile = (xs, p) => {
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.ceil((p / 100) * s.length) - 1)];
};

const PORT = 4317;
const stripAnsi = (s) => s.replace(/\[[0-9;]*m/g, "");

function startServer() {
  return new Promise((resolve, reject) => {
    const proc = spawn(
      "bunx",
      ["vite", "--mode", "bench", "--port", String(PORT), "--strictPort"],
      { cwd: new URL("..", import.meta.url).pathname, stdio: ["ignore", "pipe", "pipe"] },
    );
    let settled = false;
    // Vite emits ANSI even when piped, so strip it and key off "ready in";
    // the URL is constructed from the known strict port.
    const onData = (buf) => {
      if (settled) return;
      if (/ready in|Local:/.test(stripAnsi(buf.toString()))) {
        settled = true;
        resolve({ proc, url: `http://localhost:${PORT}` });
      }
    };
    proc.stdout.on("data", onData);
    proc.stderr.on("data", onData);
    proc.on("exit", (code) => {
      if (!settled) reject(new Error(`vite exited early (${code})`));
    });
    setTimeout(() => {
      if (!settled) reject(new Error("vite did not start within 60s"));
    }, 60_000);
  });
}

async function measure(page, baseUrl, lib, size) {
  const kindQuery = KIND ? `&kind=${KIND}` : "";
  await page.goto(`${baseUrl}/benchmark.html?lib=${lib}&size=${size}${kindQuery}`, {
    waitUntil: "load",
  });
  await page.waitForSelector('body[data-benchmark-ready="1"]', {
    timeout: 120_000,
  });
  return page.evaluate(() => window.__benchmarkResult);
}

async function main() {
  console.log(
    `benchmark: sizes=${SIZES} trials=${TRIALS} dpr=${DPR}${KIND ? ` kind=${KIND}` : ""}`,
  );
  const { proc, url } = await startServer();
  console.log(`dev server: ${url}`);
  const browser = await chromium.launch({
    args: ["--enable-precise-memory-info"],
  });
  const rows = [];
  const raw = [];
  try {
    const context = await browser.newContext({ deviceScaleFactor: DPR });
    const page = await context.newPage();
    for (const size of SIZES) {
      for (const lib of LIBS) {
        const trials = [];
        for (let t = 0; t < TRIALS; t += 1) {
          const r = await measure(page, url, lib, size);
          trials.push(r);
          raw.push(r);
        }
        const pick = (k) => trials.map((r) => r[k]);
        rows.push({
          lib,
          rows: size,
          points: size * (trials[0]?.visibleSeries ?? 3),
          initMed: median(pick("chartMs")),
          hoverMed: median(pick("hoverDeltaMs")),
          hoverP95: percentile(pick("hoverDeltaMs"), 95),
          zoomMed: median(pick("zoomDeltaMs")),
          zoomP95: percentile(pick("zoomDeltaMs"), 95),
        });
        const last = rows[rows.length - 1];
        console.log(
          `  ${lib.padEnd(6)} rows=${size} init=${last.initMed.toFixed(1)}ms ` +
            `hover=${last.hoverMed.toFixed(1)}ms zoom=${last.zoomMed.toFixed(1)}ms`,
        );
      }
    }
  } finally {
    await browser.close();
    proc.kill("SIGTERM");
  }

  const num = (n) => n.toFixed(1);
  let md = `| lib | points | init (ms) | hover med/p95 (ms) | zoom med/p95 (ms) |\n`;
  md += `| --- | ---: | ---: | ---: | ---: |\n`;
  for (const r of rows) {
    md += `| ${r.lib} | ${r.points} | ${num(r.initMed)} | ${num(r.hoverMed)}/${num(r.hoverP95)} | ${num(r.zoomMed)}/${num(r.zoomP95)} |\n`;
  }
  console.log(`\n${md}`);
  writeFileSync(
    new URL("../docs/benchmark-results.json", import.meta.url),
    JSON.stringify({ config: { SIZES, TRIALS, DPR }, summary: rows, raw }, null, 2),
  );
  console.log("wrote docs/benchmark-results.json");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
