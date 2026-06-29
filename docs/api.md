# API Reference

Primary entrypoint:

- `createPlot(init: PlotInit): Plot`

Source:

- `src/lib/plot.ts`

## `PlotInit`

Required:

- `host: HTMLElement`
- `initialValue: { x: Range; y: Range }`

Optional:

- `config: PlotConfigUpdate`
- `link: { group: LinkGroup } & LinkOptions`
- `plugins: readonly Plugin[]` — installed at construction via `plot.use`
  (see [Plugins & custom kinds](#plugins--custom-kinds))

`createPlot()` creates and manages its own internal canvas stack inside `host`.
The host should have an explicit size.

Example:

```ts
const plot = createPlot({
  host,
  initialValue: {
    x: { min: 0, max: 10_000 },
    y: { min: -1, max: 1 },
  },
  config: {
    showLegend: false,
    axisMode: {
      x: { mode: "time", timeDisplay: "relative" },
      y: { notation: "fixed", precision: 2 },
    },
  },
});
```

## Lifecycle

- `start()`: starts the DOM/runtime loop.
- `stop()`: stops rendering and input processing.
- `dispose()`: releases runtime resources and removes internal canvases. Runs
  every installed plugin's teardown (reverse install order).
- `batch(txn)`: coalesces grouped mutations into one flush.

## Plugins & custom kinds

The public plugin surface. See [docs/plugins.md](./plugins.md) for the full
guide and worked examples; this is the method reference.

### `plot.use`

- `use(plugin: Plugin) -> this`

Installs a plugin: runs its `setup(plot)` immediately and keeps any returned
teardown to run on `dispose`. Chainable. `createPlot({ plugins })` calls this for
each entry. A `Plugin` is `{ name: string; setup(plot): void | (() => void) }`.

```ts
import { heatmap, keyboardPan } from "wplot/extensions";

plot.use(keyboardPan()).use(heatmap({ x0, x1, y0, y1, rows, cols, values }));
```

### `plot.onDraw`

- `onDraw(painter: OverlayPainter) -> () => void`

Registers an overlay painter invoked every frame on the overlay canvas, and
returns a disposer. The painter receives an `OverlayFrame`:

- `ctx`: 2D context in **CSS-pixel** space (transform pre-scaled by `dpr`)
- `valueToPx(x, y) -> { x, y }`, `pxToValue(px, py) -> { x, y } | null`
- `bounds`: the plot rect (`origin` + `size`) in CSS px
- `view`: current `{ x, y }` ranges
- `dpr`: device pixel ratio

```ts
const off = plot.onDraw(({ ctx, bounds }) => {
  const c = plot.cursor.get();
  if (!c.inside || !c.px) return;
  ctx.fillStyle = "rgba(255,255,255,0.6)";
  ctx.fillRect(c.px.x, bounds.origin.y, 1, bounds.size.height);
});
```

### `plot.addLayer`

- `addLayer(layer: Layer) -> () => void`

Registers a **render layer** — a `{ draw(frame: LayerFrame): void }` object
invoked every frame on a dedicated canvas stacked **behind** the series (a
backdrop), and returns a disposer. Unlike an overlay painter, the layer owns its
own rendering context on `frame.canvas` (WebGPU or 2D); the runtime only hands it
the per-frame transform. This is the seam used by big-data raster extensions like
the WebGPU `heatmap`.

`LayerFrame` carries the same projection fields as `OverlayFrame`, but with
`canvas` instead of `ctx`:

- `canvas`: the layer's own `HTMLCanvasElement` (CSS-sized by the runtime; the
  layer owns the backing-store resolution)
- `valueToPx(x, y)`, `pxToValue(px, py)`, `bounds`, `view`, `dpr`

Because the layer sits behind the primary canvas, it is only visible where the
plot background is translucent — set `config.background` to an `alpha < 1` (e.g.
`[0, 0, 0, 0]`) on a plot that shows a layer. Most users consume this through the
`heatmap` extension rather than implementing `Layer` directly.

```ts
import { heatmap } from "wplot/extensions";

const off = plot.addLayer(/* custom Layer */);
// or, packaged as a plugin:
plot.use(heatmap({ x0, x1, y0, y1, rows, cols, values }));
```

### `plot.registerSeries` / `plot.registerObject`

- `registerSeries(extension: SeriesExtension) -> void`
- `registerObject(extension: ObjectExtension) -> void`

Register a custom series or annotation kind. An extension is a `{ model, scene }`
adapter pair; both adapters must declare the same `kind` (a mismatch throws).
After registering, add instances through the normal `plot.series.add` /
`plot.objects.add` — custom kinds use the open `CustomSeriesInput` /
`CustomObjectInput` shapes, so no cast is needed.

```ts
import { dotsSeries } from "wplot/extensions";

plot.registerSeries(dotsSeries());
plot.series.add("samples", { kind: "series/dots", x, y, sizePx: 6 });
```

## `plot.view`

- `get() -> { x, y }`
- `set({ x, y }) -> boolean`
- `reset() -> boolean`

Example:

```ts
plot.view.set({
  x: { min: 20_000, max: 40_000 },
  y: { min: 10, max: 80 },
});
```

`plot.view` controls the primary `{ x, y }` ranges. Secondary y-axes are read and
written through `plot.axes` (below).

## `plot.axes`

- `get(id: string) -> Range | null`
- `set(id: string, range: Range) -> boolean`

Read or override the range of a **secondary y-axis** declared via
`config.yAxes`. Secondary axes share the single primary x-axis but are
independent vertically; `get` returns `null` for an unknown id, `set` returns
`false`. The primary `{ x, y }` axes stay on `plot.view`.

Declare secondary axes in config and target a series at one with `yAxisId`:

```ts
const plot = createPlot({
  host,
  initialValue: { x: { min: 0, max: 100 }, y: { min: 0, max: 50 } },
  config: {
    // AxisDef[]: id, side ("left" | "right"), optional min/max/scale/notation/…
    yAxes: [{ id: "rate", side: "right", min: 0, max: 1 }],
  },
});

plot.series.add("load", { kind: "series/line", x, y });
plot.series.add("rate", { kind: "series/line", x, yRate }, { yAxisId: "rate" });

plot.axes.get("rate");                       // -> { min: 0, max: 1 }
plot.axes.set("rate", { min: 0, max: 2 });   // -> true
```

## `plot.cursor`

- `get() -> CursorEvent`

`CursorEvent` includes:

- `inside`
- `px`
- `value`
- `formatted`
- `hit`
- `seriesHits`
- `plotBounds`

Example:

```ts
const cursor = plot.cursor.get();
if (cursor.inside && cursor.value) {
  console.log(cursor.value.x, cursor.value.y);
}
```

## `plot.config`

- `get() -> PlotConfig`
- `update(patch) -> PlotConfig`

Useful config fields:

- `showCrosshair`
- `showCrosshairLabels`
- `showCursorSeriesMarker`
- `internalLod`
- `gridColor`
- `gridSpacing`
- `background`
- `layout`
- `axisMode.x / axisMode.y`

Axis formatting (`axisMode.x` / `axisMode.y`, each a partial `AxisSpec`):

- `scale: "linear" | "log"` — `"log"` generates decade / 1-2-5 ticks
- `formatter`
- `notation: "auto" | "fixed" | "scientific" | "engineering"`
- `precision`
- `timeDisplay: "absolute" | "relative" | "duration"`

Multiple y-axes (`yAxes: AxisDef[]`): declare secondary y-axes layered on the
primary `y`. Each `AxisDef` has an `id`, a `side` (`"left" | "right"`), an
optional initial `min`/`max`, and the same formatting fields as `AxisSpec` plus a
gutter `size`. Series target one with `series.add(name, input, { yAxisId })`;
read/write its range with `plot.axes.get/set`. A patch's `yAxes` replaces the
whole set (it is not deep-merged); omitting it keeps the previous set.

Example:

```ts
plot.config.update({
  axisMode: {
    x: { scale: "log" },                          // log x-axis
    y: { formatter: ({ value }) => `${value.toFixed(1)}%` },
  },
  yAxes: [{ id: "rate", side: "right", min: 0, max: 1 }],
});
```

## `plot.series`

- `add(name, input, style?) -> SeriesId`
- `append(id, payload) -> boolean`
- `appendMany(id, payloads) -> boolean`
- `setData(id, input) -> boolean`
- `setVisible(id, on) -> boolean`
- `list() -> readonly SeriesView[]`
- `getDatum(id, index) -> unknown | null`

`style` is `{ color?, yAxisId? }` — `yAxisId` assigns the series to a secondary
y-axis declared in `config.yAxes` (default: the primary `y`).

Built-in series kinds:

- `series/line` — optional `fill` (RGBA) + `fillTo` (baseline value, default `0`)
  shade the area between the line and the baseline
- `series/step`
- `series/scatter` — per-point `colors` and `sizes`, or value-driven gradients
  via `colorValues` + `colormap` (`"viridis" | "magma" | "plasma"`); markers
  default their stroke to the plot background
- `series/band`
- `series/bars`
- `series/candles`
- `series/infinite-lines` — full-height vertical rules at each `x` and/or
  full-width horizontal rules at each `y` (`{ x?, y?, color?, widthPx? }`),
  re-projected to span the live view each frame

Example:

```ts
const id = plot.series.add("cpu", {
  kind: "series/line",
  x: new Float64Array(times),
  y: new Float32Array(values),
  widthPx: 1.25,
  fill: [0.3, 0.5, 1, 0.15],     // area fill to the baseline
  fillTo: 0,
});

plot.series.append(id, { x: nextTime, y: nextValue });

// Gradient scatter: color each point from a scalar via a perceptual colormap.
plot.series.add("scores", {
  kind: "series/scatter",
  x, y,
  sizePx: 4,
  colorValues: scores,           // mapped across [min, max]
  colormap: "magma",
});

// Infinite vertical rules (e.g. event markers) spanning the view.
plot.series.add("events", {
  kind: "series/infinite-lines",
  x: [12, 30, 64],
  color: [1, 1, 1, 0.3],
});
```

## `plot.objects`

Low-level object API:

- `add(input) -> ObjectId`
- `updateState(id, patch) -> boolean`
- `setVisible(id, on) -> boolean`
- `setLocked(id, on) -> boolean`
- `remove(id) -> boolean`
- `list() -> readonly ObjectRecord[]`
- `get(id) -> ObjectRecord | null`
- `select(id) -> boolean`
- `clearSelection() -> boolean`
- `getSelected() -> ObjectId | null`

Use this layer when you want direct control over object state, visibility,
locking, or selection.

`ObjectRecord` includes:

- `id`
- `kind`
- `state`
- `visible`
- `locked`

Example:

```ts
const object = plot.objects.get(id);
if (object?.kind === "object/rect") {
  plot.objects.updateState(id, { xMax: 42 });
}
```

## `plot.annotations`

Typed creation helpers built on top of `plot.objects`:

- `addHLine(y, opts?) -> ObjectId`
- `addVLine(x, opts?) -> ObjectId`
- `addXBand(xMin, xMax, opts?) -> ObjectId`
- `addYBand(yMin, yMax, opts?) -> ObjectId`
- `addRect(xMin, xMax, yMin, yMax, opts?) -> ObjectId`
- `addSegment(x0, y0, x1, y1, opts?) -> ObjectId`
- `addTag(x, y, text, opts?) -> ObjectId`

Public option types:

- `GuideOptions`
- `BandOptions`
- `RectOptions`
- `SegmentOptions`
- `TagOptions`

Guide and band chips are formatter-driven numeric value chips only. Arbitrary
axis-chip text is not supported. Use in-plot `label` text for semantic names.

Examples:

```ts
plot.annotations.addHLine(12, {
  label: "Bias",
  showAxisValueLabel: true,
});

plot.annotations.addRect(10, 20, 0.2, 0.8, {
  label: "Window",
});
```

## `plot.interaction`

- `isEnabled() -> boolean`
- `setEnabled(on) -> void`
- `getHover() -> HoverEvent | null`
- `getSelection() -> SelectionState | null`

Example:

```ts
plot.interaction.setEnabled(false);
const hover = plot.interaction.getHover();
```

### Built-in gestures

On by default (toggle with `setEnabled`):

- **wheel** — zoom toward the cursor (`shift` = X-only, `alt` = Y-only).
- **drag** — pan.
- **box-zoom** — drag with a modifier: `shift` = X-range only, `alt` = Y-range
  only, `shift+alt` = full XY box.
- **axis drag** — drag inside an axis gutter to zoom that axis; wheeling over a
  secondary y-axis gutter zooms only that axis.
- **double-click** — reset the view.

### Editable annotations

Selectable objects (guides, bands, rects, segments, tags) drag through the same
interaction layer:

- For rect/band bodies, the **interior pans** the object (the filled area reports
  an `object-area` hit, leaving selection untouched), the **border moves** it, and
  **handles resize** it.
- Guides move along their axis; segments move as a whole.

## `plot.coords`

- `pxToValue(px, py) -> { x, y }`
- `valueToPx(x, y) -> { x, y }`
- `canvasSize() -> { width, height }`
- `plotSize() -> { width, height }`
- `bounds() -> Bounds<Px>`
- `dpr() -> number`

Example:

```ts
const { x, y } = plot.coords.pxToValue(240, 80);
const size = plot.coords.plotSize();
```

## Events

Subscribe with:

- `plot.subscribe(type, cb) -> unsubscribe`

Event types:

- `cursor`
- `hover`
- `click`
- `view`

Example:

```ts
const off = plot.subscribe("view", (ranges) => {
  console.log(ranges.x.min, ranges.x.max);
});
```

For custom DOM legends or readouts, use `cursor.seriesHits` from the `cursor`
event or from `plot.cursor.get()`.

## Defaults

Default built-in series adapters:

- line
- step
- scatter
- bars
- band
- candles
- infinite-lines

Default built-in object adapters:

- horizontal guide
- vertical guide
- rectangle
- x-band
- y-band
- segment
- tag
