`runtime` owns DOM attachment, frame scheduling, resize observation, and canvas
render orchestration for the core engine.

- `dom_runtime.ts` is the browser-facing shell.
- `render/` owns the canvas/text renderer implementation used by the DOM shell.
- It consumes core controller state, the core interaction controller, and the
  draw-list builder.
