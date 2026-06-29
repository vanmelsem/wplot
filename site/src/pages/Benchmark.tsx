import { useMemo, useRef, useState } from 'react'
import { createPlot } from 'wplot'
import type { NumericRange, Plot as PlotInstance, SeriesId } from 'wplot'
import type { PlotInitProps } from '../Plot'

import { Plot } from '../Plot'
import { Button } from '../ui'
import { palette, plotConfig, prng } from './theme'
import styles from './pages.module.css'

const SCENARIOS = [50_000, 166_000, 500_000] as const
const SEED_POINTS = 4_000

type LineData = { x: Float64Array; y: Float32Array }

function generateLine(n: number): LineData {
  const rand = prng((0xbeef ^ n) >>> 0)
  const x = new Float64Array(n)
  const y = new Float32Array(n)
  let v = 0
  for (let i = 0; i < n; i += 1) {
    v += (rand() - 0.5) * 2 + Math.sin(i / 220) * 0.4 + Math.sin(i / 53) * 0.12
    x[i] = i
    y[i] = v
  }
  return { x, y }
}

function rangeOf(values: Float32Array): NumericRange {
  let min = Infinity
  let max = -Infinity
  for (let i = 0; i < values.length; i += 1) {
    const v = values[i]!
    if (v < min) min = v
    if (v > max) max = v
  }
  const pad = (max - min || 1) * 0.08
  return { min: min - pad, max: max + pad }
}

function nextFrame(): Promise<number> {
  return new Promise((resolve) => requestAnimationFrame(resolve))
}

function median(values: number[]): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const mid = sorted.length >> 1
  return sorted.length % 2 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2
}

type Result = {
  points: number
  coldInitMs: number
  frameMs: number
  fps: number
}

// Cold init: build a throwaway plot in an offscreen but real-sized host, time
// createPlot + series.add + start through the first painted frame, then dispose.
async function measureColdInit(data: LineData): Promise<number> {
  const host = document.createElement('div')
  host.style.cssText =
    'position:absolute;left:-99999px;top:0;width:1200px;height:420px;'
  document.body.appendChild(host)
  try {
    const t0 = performance.now()
    const plot = createPlot({
      host,
      initialValue: { x: { min: 0, max: data.x.length - 1 }, y: rangeOf(data.y) },
      config: plotConfig(),
    })
    plot.series.add(
      'series',
      { kind: 'series/line', x: data.x, y: data.y, widthPx: 1 },
      { color: palette.blue },
    )
    plot.start()
    await nextFrame()
    const elapsed = performance.now() - t0
    plot.dispose()
    return elapsed
  } finally {
    host.remove()
  }
}

// Scripted pan/zoom on the visible plot: drive a window across the full range
// with an oscillating zoom for K frames, recording rAF-to-rAF deltas (which
// include the library's render). Median delta is the frame time.
function measurePanZoom(plot: PlotInstance, points: number): Promise<number[]> {
  return new Promise((resolve) => {
    const K = 90
    const span = points - 1
    const y = plot.view.get().y
    const durations: number[] = []
    let prev = performance.now()
    let k = 0
    const step = (now: number) => {
      durations.push(now - prev)
      prev = now
      const t = k / K
      const winFrac = 0.16 + 0.1 * Math.sin(t * Math.PI * 2)
      const win = span * winFrac
      const center = span * (0.1 + 0.8 * t)
      plot.view.set({ x: { min: center - win / 2, max: center + win / 2 }, y })
      k += 1
      if (k <= K) {
        requestAnimationFrame(step)
      } else {
        durations.shift() // drop the warm-up frame
        resolve(durations)
      }
    }
    requestAnimationFrame(step)
  })
}

export function Benchmark() {
  const plotRef = useRef<PlotInstance | null>(null)
  const seriesRef = useRef<SeriesId | null>(null)

  const [results, setResults] = useState<Record<number, Result>>({})
  const [running, setRunning] = useState<number | null>(null)
  const [active, setActive] = useState<number>(SEED_POINTS)

  const seed = useMemo(() => generateLine(SEED_POINTS), [])
  const init = useMemo<PlotInitProps>(
    () => ({
      initialValue: { x: { min: 0, max: SEED_POINTS - 1 }, y: rangeOf(seed.y) },
      config: plotConfig(),
    }),
    [seed],
  )

  const onReady = (plot: PlotInstance) => {
    plotRef.current = plot
    seriesRef.current = plot.series.add(
      'series',
      { kind: 'series/line', x: seed.x, y: seed.y, widthPx: 1.25 },
      { color: palette.blue },
    )
  }

  async function runScenario(points: number) {
    if (running != null) return
    setRunning(points)
    // Yield so the button's pressed state paints before the blocking gen runs.
    await nextFrame()

    const data = generateLine(points)
    const coldInitMs = await measureColdInit(data)

    const plot = plotRef.current
    const seriesId = seriesRef.current
    let frameMs = 0
    let fps = 0
    if (plot && seriesId != null) {
      plot.batch(() => {
        plot.series.setData(seriesId, {
          kind: 'series/line',
          x: data.x,
          y: data.y,
          widthPx: 1.25,
        })
        plot.view.set({ x: { min: 0, max: points - 1 }, y: rangeOf(data.y) })
      })
      setActive(points)
      const durations = await measurePanZoom(plot, points)
      frameMs = median(durations)
      fps = frameMs > 0 ? 1000 / frameMs : 0
    }

    setResults((prev) => ({
      ...prev,
      [points]: { points, coldInitMs, frameMs, fps },
    }))
    setRunning(null)
  }

  return (
    <section className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Benchmark</h1>
        <p className={styles.subtitle}>
          Build a line chart at a chosen size and measure cold init and the
          median frame time of a scripted pan/zoom sweep, in-page via{' '}
          <code>performance.now()</code>.
        </p>
      </header>

      <div className={styles.toolbar}>
        {SCENARIOS.map((points) => (
          <Button
            key={points}
            variant={active === points ? 'control' : 'ghost'}
            disabled={running != null}
            onClick={() => void runScenario(points)}
          >
            {running === points
              ? 'Measuring…'
              : `${(points / 1000).toLocaleString()}k points`}
          </Button>
        ))}
      </div>

      <div className={styles.stats}>
        {SCENARIOS.map((points) => {
          const result = results[points]
          return (
            <div className={styles.stat} key={points}>
              <span className={styles.statLabel}>
                {(points / 1000).toLocaleString()}k · cold init
              </span>
              <span className={styles.statValue}>
                {result ? result.coldInitMs.toFixed(1) : '—'}
                <span className={styles.statUnit}> ms</span>
              </span>
              <span className={styles.statHint}>
                {result
                  ? `pan/zoom ${result.frameMs.toFixed(2)} ms · ${Math.round(result.fps)} fps`
                  : 'not measured yet'}
              </span>
            </div>
          )
        })}
      </div>

      <article className={styles.panel}>
        <div className={styles.panelHead}>
          <span className={styles.panelTitle}>Rendered series</span>
          <span className={styles.panelMeta}>
            {active.toLocaleString()} points
          </span>
        </div>
        <div className={styles.panelBody}>
          <Plot init={init} onReady={onReady} />
        </div>
      </article>
    </section>
  )
}

export default Benchmark
