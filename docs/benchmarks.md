# Benchmarks

Reproducible head-to-head benchmarks of `wplot` vs [uPlot](https://github.com/leeoniya/uPlot),
both Canvas-2D libraries. Numbers are produced by an automated headless runner so
before/after comparisons are apples-to-apples.

## Running

```sh
bun run bench                                    # defaults: sizes 10000,55550,166650 rows × 5 trials, dpr 1
bun run bench --sizes 55550 --trials 10 --dpr 2
bun run bench --kind gradient --libs wplot --sizes 55550
```

`scripts/bench.mjs` boots the vite demo dev server (via `bunx vite`), drives
headless Chromium across `{wplot,uplot} × sizes × trials` against
`demo/benchmark.html`, reads the machine-readable `window.__benchmarkResult`, and
aggregates median + p95. Raw + summary data is written to
`docs/benchmark-results.json`.

Each "size" is a **row count**; the line/scatter/gradient scenarios render 3
visible series, so total plotted points = `rows × 3`. Canvas is fixed at
1920×600, dark theme, no legend.

### Scenarios (`--kind`)

- **line** (default, both libs) — the canonical head-to-head; identical URL to
  earlier runs, so historical baselines stay comparable.
- **scatter** — markers instead of polylines (wplot only).
- **gradient** — scatter where every point is colored from `colorValues` via a
  colormap (wplot only). Exercises colormap resolution at add time plus the
  per-point fill/stroke draw path, which is much heavier than single-color
  markers — at 166k points it is draw-bound (see the note below).
- **candles** — one OHLC series derived from the same data (wplot only).
- The **heatmap** extension is a GPU render layer, not a series scenario; it is
  browser/WebGPU-dependent and intentionally not wired into the headless harness
  (CI must not depend on a GPU). Eyeball it via `bun run dev` on the demo.

### Methodology notes / caveats

- **Init** = chart construction + series add + first settled render (2 rAF).
- **Hover** = scripted cursor sweep cost above an idle-rAF baseline (120 frames).
- **Zoom** = scripted box-zoom drag cost above an idle-rAF baseline (72 frames).
  The drag is horizontal at constant y, and **wplot is configured x-only**
  (`setZoomType("x")` in `runWPlot`) to match uPlot's default x-only drag — so
  both libraries actually commit a rescale + re-decimate each cycle. (Without
  this, wplot's default "xy" box would never commit on a purely horizontal drag
  and would skip the work uPlot does, making the zoom row meaningless.)
- Headless Chromium is **not vsync-throttled**, so per-frame deltas are compressed.
  At small N, `hover`/`zoom` deltas hover near zero (and can go slightly negative
  from baseline noise). They become meaningful only when a library does real
  per-frame CPU work that exceeds the noise floor — which is exactly what the
  500k-point zoom row below exposes.
- Line width and decimation are intended to be matched between libraries; see
  the fairness notes in `demo/benchmark.ts`.
- **Comparison limits.** All numbers here are produced by *this* runner on *one*
  machine, both libraries side by side, so they are internally comparable. They
  are **not** comparable to uPlot's own published figures
  (<https://leeoniya.github.io/uPlot/>): those were measured on different
  hardware, at a different point count (≈166.6k single-series), in 2023. Treat
  uPlot's site numbers as a separate data set, not a baseline for these.
- **Scatter/candles are draw-bound at extreme density — by design.** Lines
  decimate per pixel column automatically; markers, bars and candles are drawn
  one-per-primitive, so gradient scatter and candles past
  ~tens-of-points-per-pixel are dominated by canvas fills (see the
  gradient/candle rows below). The core intentionally does **not** decimate these
  — like uPlot, you pre-aggregate your data, or use the WebGPU layer for big-data
  rasters. The "faster than uPlot" claims are about **line series at scale and
  zoom responsiveness**, which is where the structural win is.

## Bundle size

Measured from the production build (`bun run build` / `bun run size`,
esbuild-minified) and uPlot's shipped `dist/uPlot.iife.min.js`. The WebGPU
heatmap and other `wplot/extensions` add-ons are tree-shakeable and excluded from
the core bundle below.

| library | raw | gzip | brotli |
| --- | ---: | ---: | ---: |
| **wplot core (current)** | **134 KB** | **36.3 KB** | **31.4 KB** |
| uPlot 1.6.24 | 44.9 KB | 19.4 KB | 17.5 KB |

The core is ~36.3 KB gzip — ~1.9× uPlot's gzip size; it also ships object
picking, candles, multi-axis, link-groups, the render-layer seam, and the
editable-object engine that uPlot leaves to plugins. The gzip budget enforced by
`scripts/minify.mjs` is 38 KB; the GPU heatmap and the annotation kinds stay out
of core via the `wplot/extensions` subpath.

## Baseline — Phase 0 (before any perf work)

`dpr=1`, 5 trials, medians (p95 where shown). Lower is better.

| library | points | init (ms) | hover med/p95 | zoom med/p95 |
| --- | ---: | ---: | ---: | ---: |
| wplot | 30,000 | 11.3 | 1.1 / 10.4 | 0.2 / 1.0 |
| uplot | 30,000 | 12.0 | — / 10.1 | — / 1.9 |
| wplot | 166,650 | 12.3 | 1.1 / 4.5 | 0.3 / 5.9 |
| uplot | 166,650 | 13.8 | 3.7 / 10.0 | 0.8 / 4.3 |
| wplot | 499,950 | **12.6** | 7.0 / 7.6 | **817.0** / 831.0 🔴 |
| uplot | 499,950 | 20.2 | 6.1 / 6.9 | 8.1 / 8.5 |

### Reading the baseline

- **Init: wplot is competitive and faster at scale** (12.6 ms vs 20.2 ms at ~500k points).
- **Hover: comparable** to uPlot across sizes.
- **Zoom at 500k points: wplot is ~100× slower (817 ms vs 8 ms).** This is a real
  CPU regression, not headless noise: during an active gesture wplot disables its
  per-pixel-column path compaction (`draw_list.ts`: `compactLinePaths && !hasActiveGesture()`)
  and strokes the full-resolution path every drag frame (~17 ms/frame × ~48 drag frames).
  uPlot keeps decimating throughout the drag.

## Fixes landed

### Consistent gesture decimation (the 817 ms zoom)

`draw_list.ts` previously disabled per-pixel-column path compaction during any
active gesture. Removing that downgrade (compaction stays on whenever
`internalLod` is set) keeps the min/max-per-column envelope — visually identical
for dense data — active throughout a drag.

500k-point result, same harness (`dpr=1`, 5 trials, medians):

| library | init (ms) | hover med/p95 | zoom med/p95 |
| --- | ---: | ---: | ---: |
| **wplot (after fix)** | **14.3** | **0.9 / 5.8** | **0.1 / 4.4** |
| wplot (before) | 12.6 | 7.0 / 7.6 | 817.0 / 831.0 |
| uplot | 20.7 | 4.9 / 6.0 | 0.1 / 0.6 |

The 500k-point box-zoom median dropped from **817 ms → ~0.1 ms** by keeping
decimation on during the drag (this row isolates wplot's own regression fix; for
the fair head-to-head where both libraries commit the same x-zoom, see "Latest
results" below).

### Pooled scene-adapter allocations + batched markers

The scatter/bars/candles scene adapters reused fresh `Float64Array`s every frame
(candles ≈ 19 MB/s of garbage at 60fps); they now reuse per-series scratch
buffers. Marker rendering was one `beginPath`/`fill`/`stroke` per point (~40k
canvas calls for 10k points) and is now a single batched path per primitive.
These cut GC pressure and draw-call count without changing any primitive
output (the characterization tests pin counts/kinds/ordering).

## Latest results

`dpr=1`, 5 trials, medians (p95 where shown). Lower is better.

**Line — 3 series, 500k points (head-to-head):**

| library | init (ms) | hover med/p95 | zoom med/p95 |
| --- | ---: | ---: | ---: |
| **wplot** | **14.6** | 4.3 / 8.7 | **0.1 / 5.8** |
| uplot | 24.1 | 1.7 / 6.9 | 8.7 / 24.7 |

**Both libraries perform the same x-axis box-zoom here** (wplot's box-zoom is set
to x-only via `setZoomType("x")` to match uPlot's default x-only drag, so each
does a real rescale + re-decimate every cycle — see the fairness note below).
wplot leads on cold init (~1.6×) and on box-zoom (p95 5.8 ms vs 24.7 ms, ~4×),
because its per-pixel-column gesture decimation keeps the rescale cheap; hover is
comparable (uPlot edges median, wplot edges p95).

**Candles — wplot:**

| candles | init (ms) | hover med/p95 | zoom med/p95 |
| --- | ---: | ---: | ---: |
| 10,000 (realistic) | 13.3 | 3.7 / 9.1 | 1.2 / 5.0 |
| 166,650 (pathological, ~86/px) | 75.0 | — | 2913 |

Candles are smooth at realistic densities. At extreme density they are
draw-bound: unlike line series (which collapse to a min/max envelope per pixel
column automatically), candle bodies/wicks are drawn one-per-visible-candle.
This is by design — wplot's core does not per-pixel-decimate markers, bars or
candles. Like uPlot, the expectation is that you **aggregate/decimate your data
before plotting** (e.g. bucket OHLC into the pixel resolution you actually show),
and reach for the **WebGPU layer extension** when you genuinely need to render a
massive raster every frame. Keeping this out of core is a deliberate leanness
choice, not a missing feature.

**Gradient scatter — wplot (`--kind gradient`):**

Same point counts as the scatter scenario, but every marker is colored per-point
from `colorValues` via a colormap. Spot run, `dpr=1`, 3 trials, medians:

| points | init (ms) | zoom med/p95 |
| --- | ---: | ---: |
| 166,650 (55,550 rows × 3) | ~267 | ~14,200 / 14,680 |

Gradient scatter is sharply draw-bound at this density: per-point fill colors
defeat the single-batched-path marker optimization (each point flushes its own
fill/stroke), and the core does not decimate markers per pixel column. This is the
expected cost of a fully-colored point cloud — keep gradient scatter to realistic
densities, **pre-decimate your data**, or use the **WebGPU layer** for a true
big-data raster. (Same stance as candles above: aggregation is the caller's job.)

## Reproduce

```sh
bun run build && bun run size      # bundle sizes
bun run bench                      # line, wplot vs uplot, default sizes
bun run bench --kind candles --libs wplot --sizes 10000
bun run bench --kind gradient --libs wplot --sizes 55550
```


