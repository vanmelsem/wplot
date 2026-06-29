import { defineConfig } from "vite";

export default defineConfig(({ mode }) => {
  if (mode === "bench") {
    // The head-to-head wplot-vs-uPlot benchmark page (driven by scripts/bench.mjs
    // through headless Chromium). The interactive docs/examples live in `site/`.
    return {
      root: "bench",
      server: {
        open: "/benchmark.html",
      },
    };
  }

  return {
    build: {
      outDir: "dist",
      emptyOutDir: true,
      // Vite's lib-mode ESM pipeline does not reliably minify whitespace, so we
      // emit a clean unminified bundle here and minify deterministically with
      // esbuild in a post-build step (see scripts/minify.mjs).
      minify: false,
      lib: {
        entry: new URL("./src/index.ts", import.meta.url).pathname,
        name: "wplot",
        formats: ["es"],
        fileName: () => "wplot.js",
      },
      rollupOptions: {
        output: {
          inlineDynamicImports: true,
        },
      },
    },
  };
});
