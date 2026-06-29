# Plugins & Extensions

`wplot` has a small, typed public plugin system. Earlier versions deliberately
kept extension internal; that stance is gone. You can now decorate the plot,
react to its events, and register entirely new series and annotation kinds
**without forking the library or touching `src/core`** — all through the public
API exported from `wplot`.

There are four extension surfaces, from lightest to heaviest:

| Surface | Entry point | Use it for |
| --- | --- | --- |
| Overlay painter | `plot.onDraw(painter)` | Tooltips, crosshairs, HUDs, custom markers drawn **over** the chart |
| Render layer | `plot.addLayer(layer)` | Big-data raster backdrops drawn **behind** the series on their own canvas (WebGPU or 2D), e.g. the heatmap |
| Plugin | `plot.use(plugin)` / `plugins:` | Packaging a piece of behavior (event wiring + overlays + layers + teardown) as a reusable unit |
| Custom kind | `plot.registerSeries` / `plot.registerObject` | A new series type or annotation object that participates in storage, scene building, and picking |

A small set of reference plugins ships from the tree-shakeable `wplot/extensions`
subpath; everything below is built on the same public surface those plugins use,
so they double as worked examples. Tooltips and legends are intentionally **not**
shipped — they are pure `onDraw` + `cursor` decoration you build to match your own
styling (see [Build your own tooltip](#build-your-own-tooltip) below).

```ts
import { createPlot } from "wplot";
import { heatmap, keyboardPan, dotsSeries } from "wplot/extensions";
```

---

## Writing a plugin

A plugin is a plain object: a `name` and a `setup` that runs once against a
`Plot`. From `setup` you can subscribe to events, register an overlay painter,
register custom kinds, or drive the public API. Return a function to release
whatever you allocated — it runs on `plot.dispose()`.

```ts
import type { Plugin } from "wplot";

export type Plugin = {
  readonly name: string;
  setup(plot: Plot): void | (() => void);
};
```

Install plugins either eagerly at construction or imperatively later. Both go
through the same path; `createPlot` simply calls `plot.use(...)` for each entry
in `plugins`.

```ts
// At construction:
const plot = createPlot({
  host,
  initialValue: { x: { min: 0, max: 100 }, y: { min: -1, max: 1 } },
  plugins: [keyboardPan()],
});

// Or imperatively (chainable):
plot.use(keyboardPan()).use(heatmap(data));
```

### Teardown

`plot.use(plugin)` invokes `setup` immediately and keeps any returned teardown.
On `plot.dispose()` all teardowns run in **reverse install order**, and a throw
in one teardown never blocks the others or the rest of disposal. A
well-behaved plugin returns a single disposer that undoes everything it set up:

```ts
const liveCount: Plugin = {
  name: "live-count",
  setup(plot) {
    const off = plot.subscribe("view", (range) => {
      console.log("x span", range.x.max - range.x.min);
    });
    return off; // unsubscribed on dispose
  },
};
```

`plot.onDraw(...)` and `plot.subscribe(...)` both already return disposers, so
most teardowns are just "call the things `setup` returned".

---

## The overlay draw surface — `plot.onDraw`

`plot.onDraw(painter)` registers a painter invoked **every frame** on a
dedicated overlay canvas that sits above the chart. It returns a disposer.

The painter receives an `OverlayFrame`:

```ts
type OverlayFrame = {
  readonly ctx: CanvasRenderingContext2D;       // CSS-pixel space; transform pre-scaled by dpr
  valueToPx(x: number, y: number): { x: Px; y: Px };
  pxToValue(px: Px, py: Px): { x: number; y: number } | null;
  readonly bounds: Bounds<Px>;                  // plot rect (origin + size) in CSS px
  readonly view: { x: NumericRange; y: NumericRange };
  readonly dpr: number;
};
```

Key facts:

- **Coordinates are CSS pixels.** The context transform is already scaled by the
  device pixel ratio, so draw in CSS pixels and it stays crisp on HiDPI. `dpr` is
  exposed if you need it for, say, sub-pixel hairlines.
- The overlay is cleared and repainted each frame; you don't manage clearing.
- `bounds` is the plot area (inside the axes). `valueToPx` / `pxToValue` convert
  between data space and CSS pixels — `pxToValue` returns `null` outside the plot.
- A painter that throws is swallowed and never breaks the frame loop, but keep
  painters cheap: they run on the hot path.

A minimal crosshair:

```ts
const crosshair: Plugin = {
  name: "crosshair",
  setup(plot) {
    return plot.onDraw(({ ctx, bounds }) => {
      const c = plot.cursor.get();
      if (!c.inside || !c.px) return;
      ctx.strokeStyle = "rgba(255,255,255,0.5)";
      ctx.beginPath();
      ctx.moveTo(c.px.x, bounds.origin.y);
      ctx.lineTo(c.px.x, bounds.origin.y + bounds.size.height);
      ctx.stroke();
    });
  },
};
```

### Build your own tooltip

wplot does not ship a tooltip or legend plugin — they are pure decoration, and
shipping one would bake in styling choices. A tooltip is a complete `onDraw`
example built only on public surface — `plot.onDraw` for the painter,
`plot.cursor.get()` for the snapped per-series hits, and `plot.series.getDatum`
to read values. The skeleton:

```ts
import type { Plugin } from "wplot";

export function tooltip(): Plugin {
  return {
    name: "tooltip",
    setup(plot) {
      return plot.onDraw(({ ctx, bounds }) => {
        const cursor = plot.cursor.get();
        const hits = cursor.seriesHits;
        if (!cursor.inside || !cursor.px || !hits?.length) return;

        // 1. Resolve each hit to a label + value.
        const rows = hits.map((hit) => {
          const datum = plot.series.getDatum(hit.seriesId, hit.index);
          const y =
            datum && typeof datum === "object" && "y" in datum
              ? (datum as { y: unknown }).y
              : undefined;
          return {
            label: hit.seriesName ?? `series ${hit.seriesId}`,
            value: typeof y === "number" ? y.toFixed(2) : "",
            // hit.color is normalized [r, g, b, a] with channels in 0..1.
            color: hit.color,
          };
        });

        // 2. Lay out and draw the box in CSS px, flipping near the edges
        //    using `bounds` so it never spills out of the plot.
        // ...measure rows, position at cursor.px, fill rect + text...
      });
    },
  };
}
```

The two pieces of public state a tooltip leans on:

- `plot.cursor.get()` returns a `CursorEvent` with `inside`, `px` (CSS-pixel
  cursor position), and `seriesHits` — one entry per series snapped at the
  cursor, each carrying `seriesId`, `index`, and optionally `seriesName` and
  `color`.
- `plot.series.getDatum(seriesId, index)` reads back the raw datum for a hit,
  whatever shape the series stores.

Because it draws on the overlay, the tooltip costs nothing on the main render
pass and survives pan/zoom for free.

### Build your own legend

A legend wants live DOM, not canvas, so build it as a plugin around the `cursor`
event rather than `onDraw`:

```ts
import type { Plugin } from "wplot";

export function legend(mount: HTMLElement): Plugin {
  return {
    name: "legend",
    setup(plot) {
      const el = mount.appendChild(document.createElement("div"));
      const off = plot.subscribe("cursor", (cursor) => {
        el.replaceChildren(
          ...(cursor.seriesHits ?? []).map((hit) => {
            const row = document.createElement("div");
            const datum = plot.series.getDatum(hit.seriesId, hit.index);
            const y = datum && typeof datum === "object" && "y" in datum
              ? (datum as { y: number }).y
              : undefined;
            row.textContent = `${hit.seriesName ?? hit.seriesId}: ${y ?? ""}`;
            return row;
          }),
        );
      });
      return () => { off(); el.remove(); };       // teardown on dispose
    },
  };
}
```

`cursor.seriesHits` (also on `plot.cursor.get()`) is the same snapped per-series
hit list the tooltip reads — reuse it for any read-out UI.

---

## Render layers — `plot.addLayer`

An overlay painter draws **over** the chart on a shared 2D context. A render
layer is the mirror image: it draws **behind** the series on its **own** canvas,
and it owns the rendering context — WebGPU or 2D — so it can push big-data rasters
the scene graph would never want to hold as primitives. This is the seam the
WebGPU heatmap is built on.

`plot.addLayer(layer)` registers a `Layer` and returns a disposer:

```ts
type Layer = { draw(frame: LayerFrame): void };

type LayerFrame = {
  readonly canvas: HTMLCanvasElement;           // the layer's own canvas
  valueToPx(x: number, y: number): { x: Px; y: Px };
  pxToValue(px: Px, py: Px): { x: number; y: number } | null;
  readonly bounds: Bounds<Px>;                  // plot rect in CSS px
  readonly view: { x: NumericRange; y: NumericRange };
  readonly dpr: number;
};
```

Key facts:

- The layer canvas is **stacked below the primary series canvas** and is
  non-interactive (the primary canvas owns pointer input). The runtime syncs its
  CSS size each frame; the layer owns the backing-store resolution (CSS px × dpr).
- You get `canvas`, not a `ctx` — acquire WebGPU or 2D yourself, lazily, at
  draw-time (so constructing the layer stays safe in non-DOM environments).
- Re-projecting your content from `valueToPx` **every frame** is what keeps it
  pixel-aligned under pan/zoom.
- Because the layer sits behind the series, it only shows where the plot
  background is translucent. Set `config.background` to an `alpha < 1` (e.g.
  `[0, 0, 0, 0]`) on a plot that hosts a layer; the axis gutters keep their own
  opaque background.

### Worked example: the WebGPU heatmap (`wplot/extensions` → `heatmap`)

The shipped `heatmap` plugin (`src/plugins/heatmap`) is a render layer wrapped in
a `Plugin`. Its `setup` picks the WebGPU layer when `navigator.gpu` is present and
the Canvas-2D layer otherwise, then calls `plot.addLayer`:

```ts
import type { Plugin } from "wplot";
import type { Layer } from "wplot";

export function heatmap(data: HeatmapData, options: HeatmapOptions = {}): Plugin {
  return {
    name: "heatmap",
    setup(plot) {
      const layer: Layer =
        !options.forceCanvas2d && isWebgpuAvailable()
          ? createWebgpuHeatmapLayer(data)
          : createCanvas2dHeatmapLayer(data);
      return plot.addLayer(layer);              // disposer removes the layer
    },
  };
}
```

`HeatmapData` is a big-data raster over the value-space rect `(x0, y0)`–`(x1, y1)`,
sampled on a `rows × cols` grid stored row-major in `values` (a `Float32Array`),
with optional `valueMin`/`valueMax`, a `colormap`, and `sampling`
(`"nearest" | "linear"`). The Canvas-2D fallback bakes the colormapped grid into
an `ImageData` once, then each frame blits it into the projected data rect
(`projectDataRect(data, frame.valueToPx)`) clipped to `frame.bounds` — so the
fallback is **pixel-perfect on pan/zoom** without WebGPU. Use it as a plugin:

```ts
import { heatmap } from "wplot/extensions";

plot.config.update({ background: [0, 0, 0, 0] });   // let the layer show through
plot.use(heatmap({ x0: 0, x1: 100, y0: 0, y1: 50, rows: 64, cols: 128, values }));
```

The heatmap is the only render layer wplot ships; everything it needs is on the
public `addLayer` seam, so your own GPU/raster layers follow the same shape.

---

## Custom series — `plot.registerSeries`

A custom series is registered as one unit — a `SeriesExtension`, which is a
`{ model, scene }` pair whose adapters **must declare the same `kind`** (the
controller throws on a mismatch):

```ts
type SeriesExtension = {
  readonly model: SeriesModelAdapter; // storage / normalize / append / read-back
  readonly scene: SeriesSceneAdapter; // geometry as draw primitives + picking
};
```

- The **model adapter** owns the data: `normalize(input)` turns a public input
  into internal state (use typed arrays on hot paths), and `readDatum(state, i)`
  reads a point back. Optional `append` / `appendMany` / `replace` enable
  streaming and `setData`.
- The **scene adapter** owns geometry: `build(record, ctx)` returns a
  `SceneFragment` of draw primitives (and optional picking entries), or `null`
  when there is nothing to draw.

Register the pair, then add instances through the normal `plot.series.add` —
custom kinds use the open `CustomSeriesInput` shape (`{ kind: string } & …`), so
**no cast is needed**:

```ts
import { dotsSeries, DOTS_SERIES_KIND } from "wplot/extensions";

plot.registerSeries(dotsSeries());

plot.series.add("samples", {
  kind: DOTS_SERIES_KIND,
  x: [0, 1, 2, 3],
  y: [10, 14, 9, 22],
  sizePx: 8,
});
```

### Walkthrough: the dots series (`src/plugins/dots_series.ts`)

A minimal scatter rendered as filled markers, implemented end-to-end on the
public extension API.

**1. Declare the kind and the shapes.** The `kind` string is the join key
between the two adapters and the input.

```ts
export const DOTS_SERIES_KIND = "series/dots";

export type DotsSeriesInput = {
  kind: typeof DOTS_SERIES_KIND;
  x: readonly number[];
  y: readonly number[];
  sizePx?: number;
};

type DotsSeriesState = { x: Float64Array; y: Float64Array; sizePx: number };
type DotsSeriesDatum = { x: number; y: number };
```

**2. The model adapter** — normalize input into typed-array state, and read a
datum back by index (this is what `plot.series.getDatum`, and therefore any
tooltip or legend you build, calls):

```ts
import type { SeriesModelAdapter } from "wplot";

const model: SeriesModelAdapter<DotsSeriesInput, DotsSeriesState, DotsSeriesDatum> = {
  kind: DOTS_SERIES_KIND,
  normalize(input) {
    return {
      x: Float64Array.from(input.x),
      y: Float64Array.from(input.y),
      sizePx: input.sizePx ?? 6,
    };
  },
  readDatum(state, index) {
    if (index < 0 || index >= state.x.length) return null;
    return { x: state.x[index]!, y: state.y[index]! };
  },
};
```

**3. The scene adapter** — turn state into a `marker` primitive. Geometry is
emitted in **local space** (value minus the axis offset carried on `ctx`); the
primitive's `origin` carries the offset back, matching the built-in adapters.
The marker's `fill`/`stroke` use `record.style.color`, the normalized
`[r, g, b, a]` the plot assigned the series.

```ts
import type { SeriesSceneAdapter, ScenePrimitive } from "wplot";

const scene: SeriesSceneAdapter<DotsSeriesState> = {
  kind: DOTS_SERIES_KIND,
  build(record, ctx) {
    const { x, y, sizePx } = record.state;
    const count = x.length;
    if (count === 0) return null;

    const centers = new Float64Array(count * 2);
    for (let i = 0; i < count; i += 1) {
      centers[i * 2] = x[i]! - ctx.axisOffsetX;
      centers[i * 2 + 1] = y[i]! - ctx.axisOffsetY;
    }

    const marker: ScenePrimitive = {
      kind: "marker",
      centers,
      count,
      sizePx,
      fill: record.style.color,
      stroke: record.style.color,
      strokeWidthPx: 0,
      roundness: 1,            // 1 = circle
      opacity: 1,
      origin: { x: ctx.axisOffsetX, y: ctx.axisOffsetY },
    };

    return {
      primitives: [marker],
      legendValueText: (y[count - 1] ?? 0).toFixed(2),
    };
  },
};

export function dotsSeries(): SeriesExtension<
  DotsSeriesInput,
  DotsSeriesState,
  DotsSeriesDatum
> {
  return { model, scene };
}
```

#### Picking

To make a custom series hover- and cursor-aware, return `picking` entries from
`build`. For point series, emit a `marker-series` (or `polyline-series`) entry
referencing the `x`/`y` arrays, the `count`, and a `baseIndex`. The interaction
layer indexes those entries and resolves cursor hits back to `seriesId` + point
`index` — the same hits a tooltip or legend you build reads. (The reference dots
series keeps things minimal and skips picking; add a `picking` array to opt in.)

The full set of primitives a scene adapter may emit (`ScenePath`, `SceneRect`,
`SceneMarker`, `SceneArea`, plus `SceneText` labels) and picking-entry kinds are
exported from `wplot` and documented in the generated
[API reference](./api/index.html).

---

## Custom objects — `plot.registerObject`

Custom annotation objects mirror custom series: register an `ObjectExtension`
(`{ model, scene }` with matching `kind`), then add instances through
`plot.objects.add` using the open `CustomObjectInput` shape — again **no cast**.

The model adapter is an `ObjectModelAdapter`:

```ts
type ObjectModelAdapter<TInput, TState, TPatch> = {
  readonly kind: ObjectKind;
  normalize(input: TInput): TState;
  patch?(state: TState, patch: TPatch): TState;       // for plot.objects.updateState
  handles?(state: TState): readonly ObjectHandle[];   // editable drag handles
  applyEdit?(state: TState, edit: ObjectEdit): TState; // drag-handle / drag-object
};
```

The scene adapter is an `ObjectSceneAdapter` — the same `build(record, ctx) →
SceneFragment | null` as series, plus an optional `handles(record, ctx)` that
returns the draggable handle geometry. Implement `handles` + `applyEdit` and the
object becomes editable through the existing selection/drag interaction with no
extra wiring; emit `object-*` picking entries so it can be selected.

```ts
plot.registerObject(myMarkerBand());
plot.objects.add({ kind: "object/my-marker-band", from: 12, to: 30 });
```

Keep object edits deterministic across drag frames and keep handle ids stable —
the interaction layer assumes both.

---

## Reference plugins (`wplot/extensions`)

Optional, tree-shakeable add-ons built entirely on the public surface above.
Import only what you use; nothing here is pulled into the lean core entry.

| Export | Kind | What it does |
| --- | --- | --- |
| `heatmap(data, options?)` | render-layer plugin | WebGPU-accelerated 2D heatmap as a backdrop layer (Canvas-2D fallback). Pixel-perfect on pan/zoom. Built on `plot.addLayer`. |
| `keyboardPan(options?)` | behavior plugin | Arrow-key panning — the one navigation gesture the core does **not** ship (wheel-zoom, drag-pan, box-zoom, axis-zoom, and double-click reset are all built in). Pure `plot.view` get/set, gated on the `cursor` event. |
| `dotsSeries()` | custom series | The `series/dots` marker scatter walked through above. Register with `plot.registerSeries`. |

Tooltips and legends are deliberately not in this list — see
[Build your own tooltip](#build-your-own-tooltip) and
[Build your own legend](#build-your-own-legend).

```ts
import { createPlot } from "wplot";
import { heatmap, keyboardPan, dotsSeries } from "wplot/extensions";

const plot = createPlot({
  host,
  initialValue: { x: { min: 0, max: 100 }, y: { min: 0, max: 50 } },
  config: { background: [0, 0, 0, 0] },     // so the heatmap layer shows through
  plugins: [keyboardPan(), heatmap(field)],
});

plot.registerSeries(dotsSeries());
plot.series.add("samples", { kind: "series/dots", x, y, sizePx: 6 });
plot.start();
```

The extensions module also exports the heatmap's helpers (`viridis`, `grayscale`,
`buildColormapLut`, `projectDataRect`, `inferValueRange`, `buildRgbaGrid`,
`isWebgpuAvailable`) and the keyboard-pan primitives (`panKeyDelta`, `nudgeView`)
plus the `DOTS_SERIES_KIND` constant and option/input types.

> Locally (inside this repo) the same entry points are at `src/lib` and
> `src/extensions`; the `wplot` / `wplot/extensions` specifiers above are the
> packaged form declared in `package.json`'s `exports`.

## See also

- [API reference](./api.md) — the public `Plot` methods, including `use`,
  `onDraw`, `addLayer`, `registerSeries`, and `registerObject`.
- [Generated TypeDoc](./api/index.html) — full type signatures for every
  authoring contract (`SeriesModelAdapter`, `SeriesSceneAdapter`,
  `ObjectModelAdapter`, `OverlayFrame`, `LayerFrame`, the scene primitives, …).
  Run `bun run docs`.
- [Architecture](./architecture.md) — where the plugin seam sits in the engine.
