# Core Architecture

`src/core` is the internal plotting engine for `wplot`.

## Layers

- `domain`: semantic plot state and mutations
- `storage`: typed-array storage and window operations
- `scene`: geometry building and picking output
- `render`: layout, axes, grid, and draw-list assembly
- `interaction`: pointer, selection, pan, zoom, hover, and link state
- `runtime`: DOM and canvas orchestration
- `api`: internal controller/composition layer used by `src/lib`
- `shared`: small shared geometry and utility types

## Rules

- `domain` cannot import `scene`, `render`, `runtime`, or DOM code.
- `storage` stays below scene/render/interaction.
- `scene` cannot import DOM/runtime code.
- `render` should not mutate semantic state.
- `runtime` and `api` are the only layers allowed to compose the full stack.

## Intent

`src/core` is optimized for:

- deterministic render state
- explicit invalidation
- responsive pointer interaction
- lean, typed data movement

It is not a public plugin surface.
