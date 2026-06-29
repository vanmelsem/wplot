`render` owns the renderer-facing draw-list assembly for the core engine.

- `layout.ts` owns axis gutter and viewport layout math.
- `grid.ts` owns grid-line and axis-label generation for a resolved view.
- `contracts.ts` owns the renderer-facing draw-list contract.
- `draw_list.ts` translates core scene frames into the current
  `DrawList` shape consumed by the renderers in `src/core/runtime/render`.

This layer is the render boundary between scene output and the runtime
renderers.
