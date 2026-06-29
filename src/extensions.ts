// wplot/extensions — batteries-included reference plugins and custom series.
//
// These are optional, tree-shakeable add-ons built entirely on the public plugin
// surface (see `src/plugins`), kept out of the lean core entry. Overlays such as
// tooltips and legends are intentionally NOT shipped — build them yourself with
// `plot.onDraw` (overlay painter) or `plot.subscribe("cursor", …)` so they match
// your own styling. Import what you need:
//
//   import { createPlot } from "wplot";
//   import { annotations, hLine, dotsSeries } from "wplot/extensions";
//
//   const plot = createPlot({ host, initialValue, plugins: [annotations()] });
//   plot.objects.add(hLine(80, { label: "threshold" }));
//
// The heavy WebGPU heatmap also has a dedicated `wplot/heatmap` subpath so it
// never enters a bundle that doesn't import it.
export * from "./plugins";
