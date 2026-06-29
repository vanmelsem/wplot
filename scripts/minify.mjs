// Deterministic post-build minify + size report for the library bundle.
//
// Vite's lib-mode ESM pipeline does not reliably strip whitespace, so the Vite
// build emits a clean unminified bundle and this step minifies it with esbuild
// (which, on this codebase, beats terser on gzip size). It also prints a
// raw/gzip/brotli size report against a budget so bundle regressions are caught.
import { readFileSync, writeFileSync, statSync } from "node:fs";
import { gzipSync, brotliCompressSync } from "node:zlib";
import { transform, build } from "esbuild";

const FILE = new URL("../dist/wplot.js", import.meta.url);
const SRC = (p) => new URL(`../${p}`, import.meta.url).pathname;
const OUT = (p) => new URL(`../dist/${p}`, import.meta.url).pathname;

// Gzip budget in bytes — a regression ceiling with headroom over the current
// ~36.3 KB. uPlot ships ~19.9 KB gz; wplot's core carries editable annotations,
// object picking, candles, link-groups, log axes, per-point gradients (+colormaps),
// line fills, infinite-lines, multiple secondary y-axes (independent ranges,
// per-axis gutters, per-axis vertical zoom), and the semantic theme helper
// (+ dark/light presets). The WebGPU heatmap is an opt-in extension and is NOT
// in this core bundle.
const GZIP_BUDGET = 38_000;

const source = readFileSync(FILE, "utf8");
const { code } = await transform(source, {
  minify: true,
  format: "esm",
  target: "es2020",
});
writeFileSync(FILE, code);

const bytes = Buffer.from(code);
const raw = bytes.byteLength;
const gz = gzipSync(bytes, { level: 9 }).byteLength;
const br = brotliCompressSync(bytes).byteLength;
const kb = (n) => `${(n / 1024).toFixed(1)} KB`;

console.log(`wplot.js  raw ${kb(raw)}  gzip ${kb(gz)}  brotli ${kb(br)}`);

// Additional distribution formats, bundled straight from source with esbuild so
// consumers can pick their module system: CJS (require) and IIFE (script tag /
// unpkg) for the core, plus ESM + CJS for the extensions subpath (which used to
// ship raw .ts). The ESM core above stays the canonical, budget-gated build.
async function emit(entry, outfile, format, globalName) {
  await build({
    entryPoints: [SRC(entry)],
    outfile: OUT(outfile),
    bundle: true,
    minify: true,
    format,
    target: "es2020",
    ...(globalName ? { globalName } : {}),
    logLevel: "silent",
  });
  const sz = gzipSync(readFileSync(OUT(outfile)), { level: 9 }).byteLength;
  console.log(`${outfile}  gzip ${kb(sz)}`);
}

await emit("src/index.ts", "wplot.cjs", "cjs");
await emit("src/index.ts", "wplot.iife.js", "iife", "wplot");
await emit("src/extensions.ts", "extensions.js", "esm");
await emit("src/extensions.ts", "extensions.cjs", "cjs");
// The heavy WebGPU heatmap also ships on its own `wplot/heatmap` subpath.
await emit("src/heatmap.ts", "heatmap.js", "esm");
await emit("src/heatmap.ts", "heatmap.cjs", "cjs");

if (gz > GZIP_BUDGET) {
  console.error(
    `✗ bundle over budget: gzip ${kb(gz)} > ${kb(GZIP_BUDGET)}`,
  );
  process.exit(1);
}
