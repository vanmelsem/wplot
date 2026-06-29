# Architecture

`wplot` has two real boundaries:

- `src/lib`: public API only
- `src/core`: implementation only

The public layer stays thin. It exposes the `Plot` facade plus a narrow set of
**plugin authoring contracts** (the `Plugin` shape, the overlay-painter surface,
and the model/scene adapter *types*). It does not expose the internal registry
instances, scene builders, or runtime objects.

The implementation lives under `src/core` and is split by responsibility:

- `domain`: series, objects, config, view, and model state
- `storage`: typed-array storage and offset-aware windows
- `scene`: geometry building and picking-friendly scene output
- `render`: layout, axes, grid, and draw-list assembly
- `runtime`: DOM wiring, canvas/text renderers, the overlay-painter surface, and
  the render-layer seam
- `interaction`: pointer, hover, selection, pan, zoom, and cursor state
- `api`: controller composition around the internal layers, plus custom-kind registration
- `shared`: small shared primitives — the generic adapter `Registry`, geometry,
  and the perceptual `colormap` helper (viridis/magma/plasma) used by
  value-driven gradient scatter

## Dependency Direction

Allowed:

- `domain` -> `storage`, `shared`
- `scene` -> `domain`, `shared`
- `render` -> `scene`, `domain`, `shared`
- `interaction` -> `api`, `scene`, `render`, `shared`
- `runtime` -> `api`, `interaction`, `render`
- `lib` -> `api`, `interaction`, `runtime`

Disallowed:

- `domain` importing `render`, `runtime`, or DOM code
- `scene` importing `runtime`
- `render` mutating semantic model state
- `lib` re-exporting internal **registry instances** or concrete adapters as
  public API (adapter *type contracts* are public so plugins can implement them;
  the registries that hold them are not)

## Runtime Data Flow

1. `lib/createPlot()` creates the internal canvas stack — four stacked canvases:
   a **layer** canvas (backdrop, z-index 0, non-interactive), then **primary**
   (series), **text**, and **overlay** — then wires a controller, interaction
   controller, and DOM runtime, and installs any `plugins`.
2. Pointer and wheel input enter `core/interaction`.
3. Interaction mutates view or object state through the controller.
4. `core/scene` builds geometry and picking state from the current model.
5. `core/render` turns scene output into a draw list.
6. `core/runtime` runs registered **render layers** on the layer canvas, paints
   canvas primitives and text on the primary/text canvases in the current RAF,
   then runs registered **overlay painters** on the overlay canvas. Layers draw
   behind the series; overlays draw on top.

## The Adapter Registry

Series and objects are open-ended: each has a **model** adapter (storage /
normalize / append / read-back) and a **scene** adapter (geometry + picking).
All four registries — series-model, object-model, series-scene, object-scene —
are the same generic `Registry<A extends Keyed>` (`shared/registry.ts`): a
`Map<kind, adapter>` with a throwing lookup. The four named registries are thin
subclasses that fix the adapter type and the not-found label.

Built-in kinds are registered at controller construction
(`domain/built_ins.ts`, `scene/built_ins.ts`). The same registries are the
plugin seam.

## The Plugin Seam

Four public extension points, all narrow:

- **Overlay painters** — `runtime/dom_runtime.ts` keeps a set of
  `OverlayPainter`s. After each frame it builds an `OverlayFrame` (the overlay
  2D context pre-scaled to CSS pixels by the device pixel ratio, plus
  `valueToPx`/`pxToValue`, `bounds`, `view`, `dpr`) and invokes each painter,
  guarded so a throwing painter cannot break the frame loop. `Plot.onDraw`
  registers one and returns a disposer.
- **Render layers** — the same runtime keeps a set of `Layer`s drawn on a
  dedicated **layer canvas stacked behind the primary series canvas**. Each frame
  it builds a `LayerFrame` — the same projection fields as `OverlayFrame` but
  carrying the layer's own `canvas` instead of a `ctx` — so a layer owns its
  rendering context (WebGPU or 2D) and re-projects itself each frame to stay
  pixel-aligned. `Plot.addLayer` registers one and returns a disposer. This is
  the seam the heatmap extension is built on; the core ships no layers itself.
- **Custom series/objects** — `Plot.registerSeries` / `registerObject` take a
  `{ model, scene }` extension and register the model adapter into the domain
  model's registry **and** the scene adapter into the scene builder's registry
  (`api/controller.ts`). The controller enforces that both halves declare the
  same `kind`. Custom-kind inputs flow through the normal `series.add` /
  `objects.add` via the open `CustomSeriesInput` / `CustomObjectInput` shapes,
  so no cast is needed.
- **Plugins** — a `Plugin` is just `{ name, setup(plot) }`. `setup` composes the
  surfaces above (and the rest of the public API); its returned teardown is run
  on `dispose`. Plugins add no new core capability — they are a packaging and
  lifecycle convention over the public surface.

## Multiple Y-Axes

Secondary y-axes are an **additive** layer over the single-axis model, not a
rewrite of it. A plot still has exactly one primary `{ x, y }` pair on
`plot.view`; declaring `config.yAxes: AxisDef[]` adds independent vertical axes
that **share the single x-axis**. The design keeps the default path untouched:

- A `SeriesRecord` carries an optional `yAxisId`; absent (or `"y"`) means the
  primary axis, so existing single-axis records and serialized scenes are
  unchanged.
- The model seeds each declared axis's range at construction and exposes
  `getExtraYRange` / `setExtraYRange`, surfaced publicly as `plot.axes.get/set`.
- The render path projects each primitive through its target axis's own y-range
  (a primitive on a secondary axis carries that range); the x projection is
  shared. Interaction routes vertical zoom/pan over an axis gutter to that axis.
- `AxisDef` reuses the same `AxisSpec` formatting fields (`resolveAxisDefSpec`),
  so secondary axes share the tick pipeline (including log scale).

Config patches replace the `yAxes` set wholesale rather than deep-merging it,
matching how a caller reasons about axis topology.

## Build Pipeline

`bun run build` is three steps:

1. `tsc -b` — type-check the project.
2. `vite build` — bundle the library entry to `dist/wplot.js` (Vite's lib-mode
   ESM pipeline does not reliably strip whitespace).
3. `bun scripts/minify.mjs` — minify the bundle with esbuild (which beats
   terser on gzip for this codebase) and assert a gzip size budget, so bundle
   regressions fail the build.

The `wplot/extensions` subpath is shipped as source and tree-shakeable, kept out
of the lean core entry. The **WebGPU heatmap** lives there (`src/plugins/heatmap`)
and is the reason GPU code never bloats the core: it is an opt-in extension built
on the public `addLayer` seam, carries its own colormap LUTs, and falls back to
Canvas-2D — so the **core stays pure Canvas-2D** and the GPU path is paid for only
by apps that import it.

## API Boundary

`src/lib/plot.ts` is the stable high-level API boundary.

- It exposes grouped user-facing operations plus the three plugin surfaces.
- It does not expose internal registries, scene builders, or runtime details.
- Public names match the real model: `objects`, not `items`.
- Public customization stays formatter-driven and typed where it can be.
- Public extension points stay narrow: an overlay/HUD surface and custom
  series/object kinds — not a generic render-lifecycle hook system.
