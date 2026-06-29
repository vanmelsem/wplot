# Performance Workflow

`wplot` treats initial render, pointer interaction, and streaming updates as hot
paths. Any meaningful change to `src/core` should be checked against the
benchmark harness before merge.

For results, tables, and methodology, see **[docs/benchmarks.md](./benchmarks.md)**.
This page is the *workflow*: how to run the harness and where to look when perf
regresses.

## Automated harness (primary)

```sh
bun run bench
# defaults: sizes 10000,55550,166650 rows × 5 trials, dpr 1, wplot vs uplot, line
```

`scripts/bench.mjs` boots the Vite demo dev server, drives headless Chromium
across `{wplot,uplot} × sizes × trials` against `demo/benchmark.html`, reads the
machine-readable `window.__benchmarkResult`, and aggregates median + p95 per
`(lib, size)`. It prints a markdown table and writes raw + summary data to
`docs/benchmark-results.json`. Runs are apples-to-apples, so before/after
comparisons are meaningful.

Flags:

```sh
bun run bench --sizes 55550 --trials 10 --dpr 2
bun run bench --kind candles --libs wplot --sizes 10000
bun run bench --kind gradient --libs wplot --sizes 55550   # gradient scatter
```

`--kind` selects the scenario: omitted (line, both libs) or one of `candles`,
`scatter`, `gradient` (wplot-only — uPlot has no matching config in this harness).
Each `size` is a **row count**; the line/scatter/gradient scenarios render 3
visible series, so plotted points = `rows × 3`. Canvas is fixed at 1920×600, dark
theme, no legend.

Requires `@playwright/test` (Chromium). Run `bunx playwright install chromium`
once.

## Interactive page (secondary)

For eyeballing behavior during development:

```sh
bun run dev:benchmark
```

Or production-like, against the built demo:

```sh
bun run build:demo
# serve dist/ and open:
#   benchmark.html?lib=wplot&size=166650
#   benchmark.html?lib=uplot&size=166650&kind=gradient
```

The page renders the same scenario the automated harness drives and exposes the
result on `window.__benchmarkResult`.

## What the harness measures

- **init** — chart construction + series add + first settled render (2 rAF).
- **hover** — scripted cursor sweep cost above an idle-rAF baseline.
- **zoom** — scripted box-zoom drag cost above an idle-rAF baseline, using each
  library's built-in gesture path.

Headless Chromium is not vsync-throttled, so per-frame deltas are compressed; at
small N, `hover`/`zoom` deltas hover near the noise floor and only become
meaningful when a library does real per-frame CPU work. Pan is intentionally not
benchmarked (the uPlot setup here has no pan plugin, so it would not be 1:1).

## Guardrails

- Do not benchmark against `bun run dev` and treat the result as final; use
  `bun run bench` (or the built page).
- Do not compare mismatched visual workloads. Line width and decimation are
  meant to be matched between libraries (see `demo/benchmark.ts`).
- Do not add interaction throttling that harms immediate feel.
- Do not add micro-optimizations that materially complicate the code unless they
  remove real hot-path cost.

## Where to look when perf regresses

- `src/core/scene`
- `src/core/render`
- `src/core/runtime`
- `src/core/interaction`

Typical suspects:

- extra per-frame allocations
- unnecessary text/layout rebuilds
- scene work on cursor-only frames
- duplicated event handling or invalidation paths
- O(n visible segments) hit-testing during hover

The bundle has a hard gzip budget enforced by `scripts/minify.mjs`; check it with
`bun run size` (or any `bun run build`).
