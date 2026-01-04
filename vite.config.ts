import { defineConfig } from "vite";

export default defineConfig(({ mode }) => {
  if (mode === "demo") {
    return {
      root: "examples",
      server: {
        open: "/",
      },
    };
  }

  return {
    build: {
      outDir: "dist",
      emptyOutDir: true,
      lib: {
        entry: new URL("./src/lib/index.ts", import.meta.url).pathname,
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
