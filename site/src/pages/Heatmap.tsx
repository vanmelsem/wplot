import { useEffect, useMemo, useRef, useState } from 'react'
import { heatmap } from 'wplot/extensions'
import type { Colormap } from 'wplot/extensions'
import type { Plot as PlotInstance } from 'wplot'

import { Plot } from '../Plot'
import type { PlotInitProps } from '../Plot'
import { Select, Switch } from '../ui'
import { plotConfig, prng, randn, TRANSPARENT } from './theme'
import styles from './pages.module.css'

// Coarse time columns x dense value rows: adjacent cells differ visibly, so with
// nearest sampling the histogram stays crisp instead of melting into a gradient.
const COLS = 240
const ROWS = 640

const HEATMAP_SPAN_MIN = 12

// The plot's value-Y range. The heatmap rect MUST use these exact y0/y1 so the
// raster fills the plot vertically and stays aligned on pan/zoom.
const Y_MIN = 0
const Y_MAX = 1

// A colormap is just `t in [0,1] -> rgba bytes`. Build a few locally by
// interpolating anchor stops, using the public `Colormap` type.
function makeColormap(
  stops: ReadonlyArray<readonly [number, number, number]>,
): Colormap {
  return (t) => {
    const x = t <= 0 ? 0 : t >= 1 ? 1 : t
    const pos = x * (stops.length - 1)
    const i = Math.min(stops.length - 2, Math.floor(pos))
    const f = pos - i
    const a = stops[i]!
    const b = stops[i + 1]!
    return [
      Math.round(a[0] + (b[0] - a[0]) * f),
      Math.round(a[1] + (b[1] - a[1]) * f),
      Math.round(a[2] + (b[2] - a[2]) * f),
      255,
    ]
  }
}

const COLORMAPS: Record<string, Colormap> = {
  viridis: makeColormap([
    [68, 1, 84],
    [72, 40, 120],
    [62, 74, 137],
    [49, 104, 142],
    [38, 130, 142],
    [31, 158, 137],
    [53, 183, 121],
    [110, 206, 88],
    [181, 222, 43],
    [253, 231, 37],
  ]),
  inferno: makeColormap([
    [0, 0, 4],
    [40, 11, 84],
    [101, 21, 110],
    [159, 42, 99],
    [212, 72, 66],
    [245, 125, 21],
    [250, 193, 39],
    [252, 255, 164],
  ]),
  ice: makeColormap([
    [3, 5, 26],
    [12, 44, 92],
    [16, 90, 140],
    [24, 140, 160],
    [80, 190, 170],
    [160, 225, 200],
    [225, 248, 240],
  ]),
}

const CMAP_ITEMS = [
  { value: 'viridis', label: 'Viridis' },
  { value: 'inferno', label: 'Inferno' },
  { value: 'ice', label: 'Ice' },
] as const

// 2D histogram: per coarse time column, draw many samples from a mixture of
// drifting value "modes" plus a noise floor, and bin them into the dense rows.
function buildDensity(): Float32Array {
  const rand = prng(0x00c0ffee)
  const counts = new Float32Array(ROWS * COLS)
  const SAMPLES_PER_COL = 6000
  for (let c = 0; c < COLS; c += 1) {
    const u = COLS > 1 ? c / (COLS - 1) : 0
    const modes = [
      { mu: 0.3 + 0.18 * Math.sin(u * Math.PI * 1.3), sigma: 0.05, w: 0.5 + 0.4 * Math.sin(u * 6) },
      { mu: 0.56 + 0.1 * Math.sin(u * Math.PI * 2.1 + 1), sigma: 0.035, w: 0.6 },
      { mu: 0.76 - 0.18 * u + 0.05 * Math.cos(u * 9), sigma: 0.045, w: 0.3 + 0.5 * Math.max(0, Math.sin(u * 4 - 1)) },
    ]
    const totalW = modes.reduce((s, m) => s + Math.max(0, m.w), 0) || 1
    for (let s = 0; s < SAMPLES_PER_COL; s += 1) {
      let pick = rand() * totalW
      let chosen = modes[0]!
      for (const cand of modes) {
        const w = Math.max(0, cand.w)
        if (pick <= w) {
          chosen = cand
          break
        }
        pick -= w
      }
      const y = rand() < 0.08 ? rand() : chosen.mu + randn(rand) * chosen.sigma
      if (y < 0 || y > 1) continue
      const row = Math.min(ROWS - 1, Math.floor((1 - y) * ROWS))
      const idx = row * COLS + c
      counts[idx] = (counts[idx] ?? 0) + 1
    }
  }
  // sqrt compression spreads the perceptual range; per-cell counts stay discrete.
  for (let i = 0; i < counts.length; i += 1) counts[i] = Math.sqrt(counts[i] ?? 0)
  return counts
}

export function Heatmap() {
  const density = useMemo(buildDensity, [])
  const [cmap, setCmap] = useState<string>('viridis')
  const [linear, setLinear] = useState(false)

  const plotRef = useRef<PlotInstance | null>(null)
  const disposeRef = useRef<(() => void) | null>(null)
  const [ready, setReady] = useState(false)

  const init = useMemo<PlotInitProps>(
    () => ({
      // The plot-area background is transparent so the heatmap render LAYER
      // (stacked behind the series canvas) shows through; the page and gutters
      // are #060606, so it still blends seamlessly.
      initialValue: { x: { min: 0, max: HEATMAP_SPAN_MIN }, y: { min: Y_MIN, max: Y_MAX } },
      config: plotConfig({
        background: TRANSPARENT,
        showCursorSeriesMarker: false,
        gridSpacing: [90, 40],
        axisMode: {
          x: { formatter: ({ value }) => `${Math.round(value)}m` },
          y: { notation: 'fixed', precision: 1 },
        },
      }),
    }),
    [],
  )

  const onReady = (plot: PlotInstance) => {
    plotRef.current = plot
    setReady(true)
  }

  // Install / re-install the heatmap layer whenever a control changes. We grab
  // the disposer the plugin's `setup` returns (plot.use discards it) so we can
  // swap colormap / sampling live by tearing the old layer down first.
  useEffect(() => {
    const plot = plotRef.current
    if (!plot) return
    disposeRef.current?.()
    const teardown = heatmap({
      x0: 0,
      x1: HEATMAP_SPAN_MIN,
      y0: Y_MIN,
      y1: Y_MAX,
      rows: ROWS,
      cols: COLS,
      values: density,
      colormap: COLORMAPS[cmap] ?? COLORMAPS.viridis,
      sampling: linear ? 'linear' : 'nearest',
    }).setup(plot)
    disposeRef.current = typeof teardown === 'function' ? teardown : null
    plot.redraw()
    return () => {
      disposeRef.current?.()
      disposeRef.current = null
    }
  }, [ready, cmap, linear, density])

  return (
    <div className={styles.stack}>
      <div className={styles.toolbar}>
        <div className={styles.field}>
          <span className={styles.fieldLabel}>Colormap</span>
          <Select
            items={CMAP_ITEMS as unknown as { value: string; label: string }[]}
            value={cmap}
            onValueChange={(value) => {
              if (value) setCmap(value)
            }}
            width={132}
            aria-label="Colormap"
          />
        </div>
        <div className={styles.toolbarSpacer} />
        <Switch
          label="Linear sampling"
          checked={linear}
          onCheckedChange={setLinear}
        />
      </div>

      <article className={styles.panel}>
        <div className={styles.panelBody}>
          <Plot init={init} onReady={onReady} />
        </div>
      </article>
    </div>
  )
}

export default Heatmap
