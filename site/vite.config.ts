import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const root = dirname(fileURLToPath(import.meta.url))
// The wplot repo root (one level up from `site/`). Pages import the library
// straight from its TypeScript source so the docs always track HEAD.
const repoRoot = resolve(root, '..')

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    // Order matters: the more specific `wplot/extensions` entry must precede
    // the bare `wplot` entry, otherwise the prefix match would hijack it.
    alias: [
      {
        find: 'wplot/extensions',
        replacement: resolve(repoRoot, 'src/plugins/index.ts'),
      },
      {
        find: 'wplot/heatmap',
        replacement: resolve(repoRoot, 'src/plugins/heatmap/index.ts'),
      },
      { find: 'wplot', replacement: resolve(repoRoot, 'src/lib/index.ts') },
    ],
  },
  server: {
    // Allow Vite to read the library source that lives outside `site/`.
    fs: { allow: [repoRoot] },
  },
})
