// wplot/heatmap — the WebGPU heatmap on a dedicated subpath.
//
// This is the only genuinely heavy extension (raw WGSL + a GPU device path, with
// a Canvas-2D fallback), so it gets its own entry point: importing `wplot/heatmap`
// pulls in the heatmap and nothing else, and it never lands in a bundle that
// doesn't ask for it — regardless of the consumer bundler's tree-shaking. It is
// also re-exported from the `wplot/extensions` umbrella for convenience.
export * from "./plugins/heatmap";
