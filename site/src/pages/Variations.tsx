import { useMemo, useState } from 'react'
import { createLinkGroup } from 'wplot'
import type { Plot as PlotInstance } from 'wplot'
import { annotations, hLine, vLine, xBand, tag } from 'wplot/extensions'
import type { PlotInitProps } from '../Plot'

import { PlotCard } from './PlotCard'
import {
  clamp,
  GRAY,
  palette,
  plotConfig,
  prng,
  randn,
  ORANGE,
  solid,
  withAlpha,
} from './theme'
import type { Hue } from './theme'
import styles from './pages.module.css'

/* ============================================================ data helpers */

const HUES: Hue[] = ['violet', 'cyan', 'gold', 'green', 'rose', 'blue']

function xAxis(n: number, span: number, start = 0): Float64Array {
  const x = new Float64Array(n)
  const step = span / Math.max(1, n - 1)
  for (let i = 0; i < n; i += 1) x[i] = start + i * step
  return x
}

// A lively but bounded signal: a sum of incommensurate sines plus a slow
// mean-reverting random walk, so it reads like real instrument data and never
// drifts off-screen.
function wave(
  n: number,
  seed: number,
  base: number,
  amp: number,
  freqs: readonly number[],
  noise: number,
  rev = 0.03,
): Float32Array {
  const rand = prng(seed)
  const y = new Float32Array(n)
  let w = 0
  for (let i = 0; i < n; i += 1) {
    const t = i / (n - 1)
    let s = 0
    for (let k = 0; k < freqs.length; k += 1) {
      s += (Math.sin(t * Math.PI * 2 * freqs[k]! + (k + 1) * 1.3 + seed) * amp) / (k + 1)
    }
    w += randn(rand) * noise - w * rev
    y[i] = base + s + w
  }
  return y
}

function ohlc(n: number, seed: number) {
  const rand = prng(seed)
  const x = xAxis(n, n - 1, 0)
  const open = new Float32Array(n)
  const high = new Float32Array(n)
  const low = new Float32Array(n)
  const close = new Float32Array(n)
  const vol = new Float32Array(n)
  let price = 72
  let mom = 0 // momentum -> trending runs
  let vola = 1.6 // wandering volatility -> clustering
  let pMin = Infinity
  let pMax = -Infinity
  let vMax = 0
  for (let i = 0; i < n; i += 1) {
    mom += randn(rand) * 0.09 - mom * 0.045 // momentum, slowly mean-reverting
    mom += (88 - price) * 0.0009 // gentle pull to the channel centre
    vola = clamp(vola + randn(rand) * 0.18, 0.6, 3.4) // volatility clusters
    const o = price
    const c = o + mom * 2.2 + randn(rand) * vola
    const hi = Math.max(o, c) + Math.abs(randn(rand)) * vola * 0.9
    const lo = Math.min(o, c) - Math.abs(randn(rand)) * vola * 0.9
    open[i] = o
    close[i] = c
    high[i] = hi
    low[i] = lo
    vol[i] = 14 + vola * 8 + Math.abs(c - o) * 10 + Math.abs(randn(rand)) * 12
    price = c
    pMin = Math.min(pMin, lo)
    pMax = Math.max(pMax, hi)
    vMax = Math.max(vMax, vol[i]!)
  }
  return { x, open, high, low, close, vol, pMin, pMax, vMax }
}

/* ============================================================ the variants */

// 1 — Signal wall: a single hero plot carrying many dense traces. Data-rich,
// monochrome-restrained palette, no fills — reads like a scope wall.
export function SignalWall() {
  const data = useMemo(() => {
    const n = 3000
    const x = xAxis(n, n, 0)
    const lines = HUES.slice(0, 3).map((hue, i) => ({
      hue,
      y: wave(n, 7 + i * 101, (i - 2) * 9, 6, [1 + i * 0.6, 3.3 + i, 8.1], 0.7),
    }))
    return { x, lines }
  }, [])
  const init: PlotInitProps = {
    initialValue: { x: { min: 0, max: data.x.length }, y: { min: -34, max: 34 } },
    config: plotConfig({ axisMode: { y: { notation: 'fixed', precision: 0 } } }),
  }
  const onReady = (plot: PlotInstance) => {
    data.lines.forEach((l, i) =>
      plot.series.add(
        `ch${i + 1}`,
        { kind: 'series/line', x: data.x, y: l.y, widthPx: 1 },
        { color: palette[l.hue] },
      ),
    )
  }
  return (
    <div className={styles.stack}>
      <PlotCard
        title="Channels"
        init={init}
        onReady={onReady}
        legend={data.lines.map((l, i) => ({ label: `ch${i + 1}`, color: palette[l.hue] }))}
      />
    </div>
  )
}

// 2 — Area stack: three translucent area fills layered front-to-back. Calm,
// editorial, "composition of flows".
export function AreaStack() {
  const data = useMemo(() => {
    const n = 1400
    const x = xAxis(n, n, 0)
    const a = wave(n, 11, 46, 8, [1, 2.4], 0.5)
    const b = wave(n, 23, 30, 6, [1.3, 3.1], 0.5)
    const c = wave(n, 37, 16, 5, [0.8, 2.0], 0.4)
    return { x, a, b, c }
  }, [])
  const init: PlotInitProps = {
    initialValue: { x: { min: 0, max: data.x.length }, y: { min: 0, max: 70 } },
    config: plotConfig({ axisMode: { y: { notation: 'fixed', precision: 0 } } }),
  }
  const layers: [keyof typeof data, Hue][] = [
    ['a', 'violet'],
    ['b', 'cyan'],
    ['c', 'gold'],
  ]
  const onReady = (plot: PlotInstance) => {
    for (const [key, hue] of layers) {
      plot.series.add(
        key,
        {
          kind: 'series/line',
          x: data.x,
          y: data[key] as Float32Array,
          widthPx: 1,
          fill: withAlpha(palette[hue], 0.18),
          fillTo: 0,
        },
        { color: palette[hue] },
      )
    }
  }
  return (
    <div className={styles.stack}>
      <PlotCard
        title="Throughput by tier"
        init={init}
        onReady={onReady}
        legend={[
          { label: 'edge', color: palette.violet },
          { label: 'core', color: palette.cyan },
          { label: 'origin', color: palette.gold },
        ]}
      />
    </div>
  )
}

// 3 — Dual axis: two signals on independent scales, left + right. A clean
// demonstration of the secondary-axis feature on a single hero plot.
export function DualAxis() {
  const data = useMemo(() => {
    const n = 2200
    const x = xAxis(n, n, 0)
    return {
      x,
      temp: wave(n, 51, 540, 26, [1, 2.6, 6], 1.4),
      flow: wave(n, 67, 12, 2.4, [1.4, 4.2], 0.18),
    }
  }, [])
  const init: PlotInitProps = {
    initialValue: { x: { min: 0, max: data.x.length }, y: { min: 440, max: 640 } },
    config: plotConfig({
      axisMode: { y: { notation: 'fixed', precision: 0 } },
      yAxes: [
        { id: 'flow', side: 'right', min: 4, max: 22, notation: 'fixed', precision: 1 },
      ],
    }),
  }
  const onReady = (plot: PlotInstance) => {
    plot.series.add(
      'Temp',
      { kind: 'series/line', x: data.x, y: data.temp, widthPx: 1 },
      { color: palette.gold },
    )
    plot.series.add(
      'Flow',
      { kind: 'series/line', x: data.x, y: data.flow, widthPx: 1 },
      { color: palette.cyan, yAxisId: 'flow' },
    )
  }
  return (
    <div className={styles.stack}>
      <PlotCard
        title="Reactor"
        init={init}
        onReady={onReady}
        legend={[
          { label: 'Temp (K)', color: palette.gold },
          { label: 'Flow (right)', color: palette.cyan },
        ]}
      />
    </div>
  )
}

// 5 — Scatter cloud: ~2,400 points colored by value through a colormap. Shows
// the per-point gradient feature; reads as a density/trend cloud.
export function ScatterCloud() {
  const data = useMemo(() => {
    const n = 900
    const rand = prng(91)
    const x = new Float64Array(n)
    const y = new Float32Array(n)
    for (let i = 0; i < n; i += 1) {
      const t = i / n
      const base = 24 + Math.sin(t * Math.PI * 2) * 14 + t * 26
      x[i] = t * 100 + randn(rand) * 1.3
      y[i] = base + randn(rand) * 7
    }
    return { x, y }
  }, [])
  const init: PlotInitProps = {
    initialValue: { x: { min: -2, max: 102 }, y: { min: 0, max: 80 } },
    config: plotConfig({ axisMode: { y: { notation: 'fixed', precision: 0 } } }),
  }
  const onReady = (plot: PlotInstance) => {
    plot.series.add(
      'Points',
      {
        kind: 'series/scatter',
        x: data.x,
        y: data.y,
        sizePx: 3.4,
        shape: 'circle',
        strokeWidthPx: 0,
      },
      { color: withAlpha(palette.cyan, 0.75) },
    )
  }
  return (
    <div className={styles.stack}>
      <PlotCard
        title="Sample cloud"
        init={init}
        onReady={onReady}
        legend={[{ label: 'Points', color: palette.cyan }]}
      />
    </div>
  )
}

// Candlesticks only — a single OHLC plot (no volume subplot).
export function CandlesPlot() {
  const data = useMemo(() => ohlc(200, 5), [])
  const init: PlotInitProps = {
    initialValue: {
      x: { min: -2, max: data.x.length + 1 },
      y: { min: data.pMin - 2, max: data.pMax + 2 },
    },
    config: plotConfig({ axisMode: { y: { notation: 'fixed', precision: 0 } } }),
  }
  const onReady = (plot: PlotInstance) => {
    plot.series.add('OHLC', {
      kind: 'series/candles',
      x: data.x,
      open: data.open,
      high: data.high,
      low: data.low,
      close: data.close,
      width: 0.66,
      upColor: solid(palette.green),
      downColor: solid(palette.rose),
    })
  }
  return (
    <div className={styles.stack}>
      <PlotCard title="Price" init={init} onReady={onReady} />
    </div>
  )
}

// 11a — Simple area: one clean filled area line, no annotations. (A pared-down
// take on the editorial plot — just the area.)
export function SimpleArea() {
  const data = useMemo(() => {
    const n = 1200
    const x = xAxis(n, n, 0)
    return { x, y: wave(n, 909, 54, 17, [0.8, 1.9, 4.3], 0.55, 0.02) }
  }, [])
  const init: PlotInitProps = {
    initialValue: { x: { min: 0, max: data.x.length }, y: { min: 0, max: 100 } },
    config: plotConfig({ axisMode: { y: { notation: 'fixed', precision: 0 } } }),
  }
  const onReady = (plot: PlotInstance) => {
    plot.series.add(
      'Value',
      {
        kind: 'series/line',
        x: data.x,
        y: data.y,
        widthPx: 1,
        fill: withAlpha(palette.green, 0.16),
        fillTo: 0,
      },
      { color: palette.green },
    )
  }
  return (
    <div className={styles.stack}>
      <PlotCard
        title="Area"
        init={init}
        onReady={onReady}
        legend={[{ label: 'Value', color: palette.green }]}
      />
    </div>
  )
}

// 12d — Reactor (spread): a mean temperature line with nested ±1σ / ±2σ filled
// bands fanning around it — a confidence/spread chart that shows off
// fill-between-lines (the band series). The spread widens through the soak where
// uncertainty is highest.
export function ReactorSpread({ link }: { link?: PlotInitProps['link'] } = {}) {
  const data = useMemo(() => {
    const n = 2000
    const x = xAxis(n, n, 0)
    const mean = new Float32Array(n)
    const lo1 = new Float32Array(n)
    const hi1 = new Float32Array(n)
    const lo2 = new Float32Array(n)
    const hi2 = new Float32Array(n)
    const rand = prng(421)
    let nm = 0
    for (let i = 0; i < n; i += 1) {
      const t = i / (n - 1)
      const p = t * Math.PI * 2
      nm = nm * 0.95 + randn(rand) * 0.2
      const m = 556 + Math.sin(p * 2) * 22 + Math.sin(p * 5 + 0.6) * 7 + nm
      // σ swells in the middle (more uncertainty during the soak).
      const std = 5 + 12 * Math.exp(-(((t - 0.55) / 0.22) ** 2)) + 2
      mean[i] = m
      lo1[i] = m - std
      hi1[i] = m + std
      lo2[i] = m - 2 * std
      hi2[i] = m + 2 * std
    }
    return { x, mean, lo1, hi1, lo2, hi2 }
  }, [])
  const init: PlotInitProps = {
    initialValue: { x: { min: 0, max: data.x.length }, y: { min: 485, max: 625 } },
    config: plotConfig({ axisMode: { y: { notation: 'fixed', precision: 0 } } }),
    link,
  }
  const onReady = (plot: PlotInstance) => {
    // Outer ±2σ band (faint) -> inner ±1σ band (stronger) -> the mean line.
    plot.series.add(
      '2sigma',
      { kind: 'series/band', x: data.x, y0: data.lo2, y1: data.hi2, opacity: 0.1 },
      { color: palette.violet },
    )
    plot.series.add(
      '1sigma',
      { kind: 'series/band', x: data.x, y0: data.lo1, y1: data.hi1, opacity: 0.2 },
      { color: palette.violet },
    )
    plot.series.add(
      'Mean',
      { kind: 'series/line', x: data.x, y: data.mean, widthPx: 1 },
      { color: palette.violet },
    )
  }
  return (
    <div className={styles.stack}>
      <PlotCard
        title="Reactor · spread"
        init={init}
        onReady={onReady}
        legend={[
          { label: 'Mean (K)', color: palette.violet },
          { label: '±1σ / ±2σ', color: withAlpha(palette.violet, 0.4) },
        ]}
      />
    </div>
  )
}

// A decade tick label: the axis carries log10(value) on a linear scale, so we
// map each tick position p back to 10^p for display (1, 10, 100, 1k, 10k, 100k).
function decadeLabel(p: number): string {
  const v = 10 ** p
  if (v >= 1000) return `${Math.round(v / 1000)}k`
  if (v >= 1) return `${Math.round(v)}`
  return v.toFixed(1)
}

// 13 — Log scale: a spectrum — a 1/f-style background with resonant harmonic
// peaks rolling off across decades, above an undulating noise floor. Plotted as
// log10(magnitude) on a linear axis with a decade tick formatter + minor log
// gridlines, so it reads as a true log axis AND the data has real shape (not a
// boring straight exponential).
export function LogScale() {
  const data = useMemo(() => {
    const n = 700
    const x = xAxis(n, n, 0)
    const a = new Float32Array(n) // spectrum magnitude, log10 in 0..5 -> 1..100k
    const b = new Float32Array(n) // noise floor
    const rand = prng(515)
    const bump = (t: number, c: number, w: number, h: number) =>
      h * Math.exp(-(((t - c) / w) ** 2))
    let na = 0
    let nb = 0
    for (let i = 0; i < n; i += 1) {
      const t = i / (n - 1)
      // Declining 1/f background with sharp resonant peaks (descending harmonics).
      let s = 3.6 - t * 2.9
      s += bump(t, 0.1, 0.028, 1.15)
      s += bump(t, 0.28, 0.024, 0.92)
      s += bump(t, 0.5, 0.02, 0.66)
      s += bump(t, 0.73, 0.018, 0.5)
      s += bump(t, 0.9, 0.016, 0.36)
      na = na * 0.7 + randn(rand) * 0.5
      a[i] = clamp(s + na * 0.03, 0.05, 4.96)
      // Gently undulating noise floor the spectrum rolls toward.
      nb = nb * 0.7 + randn(rand) * 0.5
      b[i] = clamp(
        1.32 +
          Math.sin(t * Math.PI * 3 + 0.6) * 0.2 +
          Math.sin(t * Math.PI * 11) * 0.06 +
          nb * 0.04,
        0.05,
        4.96,
      )
    }
    return { x, a, b }
  }, [])
  const init: PlotInitProps = {
    initialValue: { x: { min: 0, max: data.x.length }, y: { min: 0, max: 5 } },
    config: plotConfig({
      // Tight Y spacing so every decade gets a labelled major line (1,10,…,100k).
      gridSpacing: [76, 34],
      axisMode: { y: { formatter: ({ value }) => decadeLabel(value) } },
    }),
  }
  const onReady = (plot: PlotInstance) => {
    // Minor log gridlines: within each decade, lines at 2,3,…,9 ×10^n sit at
    // log10(k)+n — unevenly spaced, compressed toward the top of the decade.
    // Drawing these (on top of the even decade majors) is what makes the axis
    // read as logarithmic. Added first so they sit behind the data.
    const minorY: number[] = []
    for (let n = 0; n < 5; n += 1) {
      for (let k = 2; k <= 9; k += 1) minorY.push(n + Math.log10(k))
    }
    plot.series.add('grid', {
      kind: 'series/infinite-lines',
      y: minorY,
      color: [1, 1, 1, 0.045],
      widthPx: 1,
    })
    plot.series.add(
      'Signal',
      { kind: 'series/line', x: data.x, y: data.a, widthPx: 1 },
      { color: palette.violet },
    )
    plot.series.add(
      'Noise floor',
      { kind: 'series/line', x: data.x, y: data.b, widthPx: 1 },
      { color: palette.gold },
    )
  }
  return (
    <div className={styles.stack}>
      <PlotCard
        title="Spectrum"
        init={init}
        onReady={onReady}
        legend={[
          { label: 'Signal', color: palette.violet },
          { label: 'Noise floor', color: palette.gold },
        ]}
      />
    </div>
  )
}

// Fill between two visible lines — an upper and lower curve with a translucent
// band painted between them.
export function FillBetween() {
  const data = useMemo(() => {
    const n = 1000
    const x = xAxis(n, n, 0)
    const upper = new Float32Array(n)
    const lower = new Float32Array(n)
    const rand = prng(321)
    let u = 0
    let l = 0
    for (let i = 0; i < n; i += 1) {
      const t = i / (n - 1)
      const base = 50 + Math.sin(t * Math.PI * 2) * 15
      const spread = 9 + Math.sin(t * Math.PI * 3 + 1) * 5
      u = u * 0.9 + randn(rand) * 0.6
      l = l * 0.9 + randn(rand) * 0.6
      upper[i] = base + spread + u
      lower[i] = base - spread + l
    }
    return { x, upper, lower }
  }, [])
  const init: PlotInitProps = {
    initialValue: { x: { min: 0, max: data.x.length }, y: { min: 10, max: 90 } },
    config: plotConfig({ axisMode: { y: { notation: 'fixed', precision: 0 } } }),
  }
  const onReady = (plot: PlotInstance) => {
    plot.series.add(
      'between',
      { kind: 'series/band', x: data.x, y0: data.lower, y1: data.upper, opacity: 0.14 },
      { color: palette.violet },
    )
    plot.series.add(
      'Upper',
      { kind: 'series/line', x: data.x, y: data.upper, widthPx: 1 },
      { color: palette.violet },
    )
    plot.series.add(
      'Lower',
      { kind: 'series/line', x: data.x, y: data.lower, widthPx: 1 },
      { color: palette.cyan },
    )
  }
  return (
    <div className={styles.stack}>
      <PlotCard
        title="Range"
        init={init}
        onReady={onReady}
        legend={[
          { label: 'Upper', color: palette.violet },
          { label: 'Lower', color: palette.cyan },
        ]}
      />
    </div>
  )
}

// Two plots sharing one x-axis + cursor via a link group.
export function LinkedDemo() {
  const group = useMemo(createLinkGroup, [])
  const link = useMemo(
    () => ({
      group,
      axes: { x: true, y: false } as const,
      cursor: { x: true, y: false } as const,
    }),
    [group],
  )
  const data = useMemo(() => {
    const n = 1600
    const x = xAxis(n, n, 0)
    return {
      x,
      pressure: wave(n, 71, 42, 13, [1, 2.6, 6], 0.7),
      flow: wave(n, 72, 0, 6, [1.4, 4.2], 0.4),
    }
  }, [])
  const mk = (yMin: number, yMax: number): PlotInitProps => ({
    initialValue: { x: { min: 0, max: data.x.length }, y: { min: yMin, max: yMax } },
    config: plotConfig({ axisMode: { y: { notation: 'fixed', precision: 0 } } }),
    link,
  })
  return (
    <div className={styles.stack}>
      <PlotCard
        title="Pressure"
        init={mk(0, 80)}
        onReady={(plot) =>
          plot.series.add(
            'Pressure',
            { kind: 'series/line', x: data.x, y: data.pressure, widthPx: 1 },
            { color: palette.violet },
          )
        }
      />
      <PlotCard
        title="Flow"
        init={mk(-12, 12)}
        onReady={(plot) =>
          plot.series.add(
            'Flow',
            { kind: 'series/line', x: data.x, y: data.flow, widthPx: 1 },
            { color: palette.cyan },
          )
        }
      />
    </div>
  )
}

// One line annotated with every guide type: an x-band region, an h-line
// threshold, a v-line event marker, and a point tag.
export function AnnotationsDemo() {
  const data = useMemo(() => {
    const n = 1000
    const x = xAxis(n, n, 0)
    const y = wave(n, 808, 50, 16, [0.8, 2, 4.3], 0.6, 0.02)
    return { x, y, tagY: y[850]! }
  }, [])
  const init: PlotInitProps = {
    initialValue: { x: { min: 0, max: data.x.length }, y: { min: 10, max: 95 } },
    config: plotConfig({ axisMode: { y: { notation: 'fixed', precision: 0 } } }),
  }
  const onReady = (plot: PlotInstance) => {
    plot.use(annotations())
    plot.series.add(
      'Signal',
      { kind: 'series/line', x: data.x, y: data.y, widthPx: 1 },
      { color: palette.cyan },
    )
    plot.objects.add(
      xBand(300, 520, {
        fill: withAlpha(palette.blue, 0.08),
        stroke: withAlpha(palette.blue, 0.3),
        strokeWidthPx: 1,
        label: 'window',
        labelBackground: solid(palette.blue),
        labelColor: [1, 1, 1, 1],
        showAxisValueLabels: false,
      }),
    )
    plot.objects.add(
      hLine(78, {
        color: withAlpha(GRAY, 0.6),
        widthPx: 1,
        label: 'threshold',
        labelAnchor: 'start',
        labelAlign: 'after',
        labelBackground: solid(GRAY),
        labelColor: [1, 1, 1, 1],
      }),
    )
    plot.objects.add(
      vLine(700, {
        color: ORANGE,
        widthPx: 1,
        label: 'event',
        labelAnchor: 'start',
        labelAlign: 'after',
        labelBackground: ORANGE,
        labelColor: [1, 1, 1, 1],
      }),
    )
    plot.objects.add(
      tag(data.x[850]!, data.tagY, 'tag', {
        background: solid(palette.cyan),
        borderWidthPx: 0,
        color: [1, 1, 1, 1],
        offsetYPx: -14,
      }),
    )
  }
  return (
    <div className={styles.stack}>
      <PlotCard
        title="Annotations"
        init={init}
        onReady={onReady}
        legend={[{ label: 'Signal', color: palette.cyan }]}
      />
    </div>
  )
}

// Axis values formatted with units via a formatter — SI bytes here.
export function UnitsDemo() {
  const data = useMemo(() => {
    const n = 1200
    const x = xAxis(n, n, 0)
    return { x, y: wave(n, 61, 4.5e6, 1.8e6, [1, 2.4, 5], 8e4) }
  }, [])
  const fmtBytes = (v: number) =>
    v >= 1e6
      ? `${(v / 1e6).toFixed(1)} MB`
      : v >= 1e3
        ? `${Math.round(v / 1e3)} KB`
        : `${Math.round(v)} B`
  const init: PlotInitProps = {
    initialValue: { x: { min: 0, max: data.x.length }, y: { min: 0, max: 9e6 } },
    config: plotConfig({
      yScaleMin: 64,
      axisMode: { y: { formatter: ({ value }) => fmtBytes(value) } },
    }),
  }
  const onReady = (plot: PlotInstance) => {
    plot.series.add(
      'Throughput',
      {
        kind: 'series/line',
        x: data.x,
        y: data.y,
        widthPx: 1,
        fill: withAlpha(palette.cyan, 0.14),
        fillTo: 0,
      },
      { color: palette.cyan },
    )
  }
  return (
    <div className={styles.stack}>
      <PlotCard
        title="Throughput"
        init={init}
        onReady={onReady}
        legend={[{ label: 'bytes/s', color: palette.cyan }]}
      />
    </div>
  )
}

// An interactive line plot wired for a specific box-zoom mode, for the
// selection demos. `axis: 'xy'` = box select; `'x'` = x-range select.
export function ZoomDemo({ axis }: { axis: 'x' | 'xy' }) {
  const data = useMemo(() => {
    const n = 1600
    const x = xAxis(n, n, 0)
    return { x, y: wave(n, axis === 'x' ? 5 : 9, 40, 16, [1, 2.6, 6], 0.7) }
  }, [axis])
  const init: PlotInitProps = {
    initialValue: { x: { min: 0, max: data.x.length }, y: { min: -10, max: 90 } },
    config: plotConfig({ axisMode: { y: { notation: 'fixed', precision: 0 } } }),
  }
  const onReady = (plot: PlotInstance) => {
    plot.series.add(
      'Signal',
      { kind: 'series/line', x: data.x, y: data.y, widthPx: 1 },
      { color: axis === 'x' ? palette.violet : palette.cyan },
    )
    plot.interaction.setZoomType(axis)
  }
  return (
    <div className={styles.stack}>
      <PlotCard title={axis === 'x' ? 'X-range select' : 'Box select'} init={init} onReady={onReady} />
    </div>
  )
}

// A fully re-themed plot — warm background, amber grid/crosshair, custom palette.
export function ThemeAccent() {
  const data = useMemo(() => {
    const n = 1400
    const x = xAxis(n, n, 0)
    return {
      x,
      a: wave(n, 31, 40, 14, [1, 2.6, 6], 0.7),
      b: wave(n, 47, 20, 10, [1.3, 3.1], 0.6),
    }
  }, [])
  const init: PlotInitProps = {
    initialValue: { x: { min: 0, max: data.x.length }, y: { min: -10, max: 70 } },
    config: plotConfig({
      background: [0.05, 0.04, 0.03, 1],
      gridColor: [0.96, 0.74, 0.18, 0.1],
      crosshairColor: [0.96, 0.74, 0.18, 0.5],
      axisTextColor: [0.96, 0.74, 0.18, 0.7],
      axisLineColor: [0.96, 0.74, 0.18, 0.25],
      axisMode: { y: { notation: 'fixed', precision: 0 } },
    }),
  }
  const onReady = (plot: PlotInstance) => {
    plot.series.add('A', { kind: 'series/line', x: data.x, y: data.a, widthPx: 1 }, { color: palette.amber })
    plot.series.add('B', { kind: 'series/line', x: data.x, y: data.b, widthPx: 1 }, { color: palette.rose })
  }
  return (
    <div className={styles.stack}>
      <PlotCard
        title="Amber"
        init={init}
        onReady={onReady}
        legend={[
          { label: 'A', color: palette.amber },
          { label: 'B', color: palette.rose },
        ]}
      />
    </div>
  )
}

// Custom axis labels via a formatter — currency on Y, here.
export function CustomAxis() {
  const data = useMemo(() => {
    const n = 1200
    const x = xAxis(n, n, 0)
    return { x, y: wave(n, 53, 4200, 1400, [1, 2.4, 5], 60) }
  }, [])
  const init: PlotInitProps = {
    initialValue: { x: { min: 0, max: data.x.length }, y: { min: 0, max: 9000 } },
    config: plotConfig({
      axisMode: {
        y: { formatter: ({ value }) => `$${(value / 1000).toFixed(1)}k` },
      },
    }),
  }
  const onReady = (plot: PlotInstance) => {
    plot.series.add(
      'Revenue',
      {
        kind: 'series/line',
        x: data.x,
        y: data.y,
        widthPx: 1,
        fill: withAlpha(palette.green, 0.14),
        fillTo: 0,
      },
      { color: palette.green },
    )
  }
  return (
    <div className={styles.stack}>
      <PlotCard
        title="Revenue"
        init={init}
        onReady={onReady}
        legend={[{ label: 'Revenue ($)', color: palette.green }]}
      />
    </div>
  )
}

export function BarsPlot() {
  const data = useMemo(() => {
    const n = 160
    const x = new Float64Array(n)
    const y = new Float32Array(n)
    const baseline = new Float32Array(n)
    const rand = prng(727)
    let level = 54
    for (let i = 0; i < n; i += 1) {
      x[i] = i + 1
      const t = i / (n - 1)
      level += randn(rand) * 1.4 - (level - 52) * 0.025
      const seasonal =
        Math.sin(t * Math.PI * 2.2) * 20 +
        Math.sin(t * Math.PI * 9.4 + 0.8) * 7
      const pulse =
        Math.exp(-(((i - 34) / 5.8) ** 2)) * 28 +
        Math.exp(-(((i - 88) / 7.2) ** 2)) * 22 +
        Math.exp(-(((i - 128) / 4.4) ** 2)) * 34
      y[i] = clamp(level + seasonal + pulse, 4, 102)
      baseline[i] = 0
    }
    return { x, y, baseline }
  }, [])
  const init: PlotInitProps = {
    initialValue: { x: { min: 0, max: 161 }, y: { min: 0, max: 108 } },
    config: plotConfig({
      gridSpacing: [80, 38],
      axisMode: { y: { notation: 'fixed', precision: 0 } },
    }),
  }
  const onReady = (plot: PlotInstance) => {
    plot.series.add(
      'bars',
      {
        kind: 'series/bars',
        x: data.x,
        y: data.y,
        y0: data.baseline,
        width: 0.74,
      },
      { color: withAlpha(palette.violet, 0.72) },
    )
  }
  return (
    <div className={styles.stack}>
      <PlotCard title="Bars" init={init} onReady={onReady} />
    </div>
  )
}

type RacingTelemetryData = {
  distance: Float64Array
  throttle: Float32Array
  brake: Float32Array
  speed: Float32Array
  steering: Float32Array
  lateralG: Float32Array
  sectorFeet: readonly number[]
  scatterBands: ReadonlyArray<{
    x: Float64Array
    y: Float32Array
    color: typeof palette.violet
  }>
}

function buildRacingTelemetry(): RacingTelemetryData {
  const n = 2400
  const distance = xAxis(n, 7600, 0)
  const throttle = new Float32Array(n)
  const brake = new Float32Array(n)
  const speed = new Float32Array(n)
  const steering = new Float32Array(n)
  const lateralG = new Float32Array(n)
  const rand = prng(718_2026)
  const corners = [
    { c: 610, w: 150, dir: -1, brake: 0.7, angle: 58 },
    { c: 1500, w: 118, dir: 1, brake: 0.82, angle: 84 },
    { c: 2050, w: 210, dir: -1, brake: 0.56, angle: 42 },
    { c: 3510, w: 150, dir: 1, brake: 0.78, angle: 72 },
    { c: 4780, w: 190, dir: -1, brake: 0.62, angle: 56 },
    { c: 5960, w: 135, dir: 1, brake: 0.9, angle: 88 },
    { c: 6500, w: 155, dir: -1, brake: 0.66, angle: 64 },
    { c: 7080, w: 170, dir: 1, brake: 0.7, angle: 68 },
  ]
  let v = 128
  let steerNoise = 0
  let gState = 0
  for (let i = 0; i < n; i += 1) {
    const d = distance[i]!
    let corner = 0
    let turn = 0
    let braking = 0
    for (const item of corners) {
      const g = Math.exp(-(((d - item.c) / item.w) ** 2))
      const phase = (d - item.c) / item.w
      corner += g * item.brake
      turn +=
        g *
        item.dir *
        item.angle *
        (1 + Math.sin(phase * 3.4) * 0.16 + Math.sin(phase * 6.2) * 0.06)
      const entry = Math.exp(-(((d - item.c + item.w * 0.5) / (item.w * 0.34)) ** 2))
      braking += entry * item.brake
    }
    const shiftCut =
      Math.exp(-(((d - 2580) / 38) ** 2)) +
      Math.exp(-(((d - 4390) / 42) ** 2)) +
      Math.exp(-(((d - 5700) / 48) ** 2)) +
      Math.exp(-(((d - 6820) / 45) ** 2))
    const targetSpeed = 146 - corner * 86 - braking * 26 + Math.sin(d / 510) * 5
    v += (targetSpeed - v) * 0.047 + randn(rand) * 0.08
    speed[i] = clamp(v, 54, 154)
    brake[i] = clamp(braking * 112 + randn(rand) * 0.28, 0, 100)
    throttle[i] = clamp((1 - corner * 0.92) * 100 - braking * 82 - shiftCut * 45 + randn(rand) * 0.36, 0, 100)
    steerNoise = steerNoise * 0.78 + randn(rand) * 1.65
    const saw = Math.sin(d / 33) * Math.max(0, corner - 0.18) * 6.5
    steering[i] = clamp(turn + steerNoise + saw, -88, 88)
    let lateralSlip = 0
    for (const item of corners) {
      const phase = (d - item.c) / item.w
      const g = Math.exp(-(phase ** 2))
      lateralSlip +=
        g *
        item.dir *
        item.brake *
        (Math.sin(phase * 2.8 - 1.05) * 0.42 + Math.sin(phase * 5.4) * 0.12)
    }
    const targetG =
      (turn / 88) * (speed[i]! / 107) ** 2 * 2.05 +
      lateralSlip +
      Math.sin(d / 125) * corner * 0.2
    gState += (targetG - gState) * 0.078 + randn(rand) * 0.038
    lateralG[i] = clamp(gState + randn(rand) * 0.032, -2.85, 2.85)
  }

  const bands = [
    { min: 0, max: 118, color: palette.cyan },
    { min: 118, max: 200, color: palette.blue },
  ] as const
  const scatterBands = bands.map((band) => {
    const xs: number[] = []
    const ys: number[] = []
    for (let i = 0; i < n; i += 3) {
      const s = speed[i]!
      if (s >= band.min && s < band.max) {
        xs.push(steering[i]!)
        ys.push(lateralG[i]!)
      }
    }
    return {
      x: Float64Array.from(xs),
      y: Float32Array.from(ys),
      color: band.color,
    }
  })

  return {
    distance,
    throttle,
    brake,
    speed,
    steering,
    lateralG,
    sectorFeet: [1760, 3560, 4860, 6120],
    scatterBands,
  }
}

const DISTANCE_AXIS = {
  x: { formatter: ({ value }: { value: number }) => `${Math.round(value)}ft` },
} as const

function addSectorLines(plot: PlotInstance, sectorFeet: readonly number[]) {
  plot.use(annotations())
  sectorFeet.forEach((x) => {
    plot.objects.add(
      vLine(x, {
        color: withAlpha(palette.cyan, 0.44),
        widthPx: 1,
        showAxisValueLabel: false,
      }),
    )
  })
}

export function RacingTelemetry() {
  const data = useMemo(buildRacingTelemetry, [])
  const group = useMemo(createLinkGroup, [])
  const link = useMemo(
    () => ({
      group,
      axes: { x: true, y: false } as const,
      cursor: { x: true, y: false } as const,
    }),
    [group],
  )
  const distanceView = { x: { min: 0, max: 7600 }, y: { min: 0, max: 1 } }

  const scatterInit: PlotInitProps = {
    initialValue: { x: { min: -90, max: 90 }, y: { min: -3, max: 3 } },
    config: plotConfig({
      gridSpacing: [70, 44],
      axisMode: {
        x: { formatter: ({ value }) => `${Math.round(value)}°` },
        y: { formatter: ({ value }) => `${value.toFixed(1)}g` },
      },
    }),
  }
  const throttleInit: PlotInitProps = {
    initialValue: { ...distanceView, y: { min: -5, max: 105 } },
    config: plotConfig({
      gridSpacing: [80, 34],
      axisMode: {
        ...DISTANCE_AXIS,
        y: { formatter: ({ value }) => `${Math.round(value)}%` },
      },
    }),
    link,
  }
  return (
    <div className={styles.racingStack}>
      <PlotCard
        title="Steering / lateral g"
        init={scatterInit}
        onReady={(plot) => {
          data.scatterBands.forEach((band, index) => {
            plot.series.add(
              `speed-${index}`,
              {
                kind: 'series/scatter',
                x: band.x,
                y: band.y,
                sizePx: 1.9,
                shape: 'circle',
                strokeWidthPx: 0,
              },
              { color: withAlpha(band.color, 0.58) },
            )
          })
          plot.series.add('zero-x', {
            kind: 'series/infinite-lines',
            x: [0],
            color: [1, 1, 1, 0.14],
            widthPx: 1,
          })
          plot.series.add('zero-y', {
            kind: 'series/infinite-lines',
            y: [0],
            color: [1, 1, 1, 0.14],
            widthPx: 1,
          })
        }}
      />
      <PlotCard
        title="Throttle"
        init={throttleInit}
        onReady={(plot) => {
          addSectorLines(plot, data.sectorFeet)
          plot.series.add(
            'throttle',
            {
              kind: 'series/step',
              x: data.distance,
              y: data.throttle,
              widthPx: 1,
            },
            { color: palette.green },
          )
          plot.series.add(
            'brake',
            {
              kind: 'series/step',
              x: data.distance,
              y: data.brake,
              widthPx: 0.9,
              align: 'end',
            },
            { color: palette.rose },
          )
        }}
      />
    </div>
  )
}

function nearestIndex(x: Float64Array, value: number): number {
  if (x.length <= 1) return 0
  const first = x[0]!
  const last = x[x.length - 1]!
  const t = (value - first) / Math.max(1e-9, last - first)
  return Math.max(0, Math.min(x.length - 1, Math.round(t * (x.length - 1))))
}

export function StateReadoutPlot() {
  type Readout = {
    x: number
    alpha: number
    beta: number
    left: number
    top: number
  }
  type OverlayBounds = {
    left: number
    top: number
    width: number
    height: number
  }

  const data = useMemo(() => {
    const n = 1200
    const x = xAxis(n, 1200, 0)
    return {
      x,
      alpha: wave(n, 991, 54, 14, [0.85, 2.2, 5.4], 0.42),
      beta: wave(n, 417, 34, 9, [1.2, 3.3, 6.8], 0.36),
    }
  }, [])
  const [readout, setReadout] = useState<Readout | null>(null)
  const [overlayBounds, setOverlayBounds] = useState<OverlayBounds | null>(null)
  const init: PlotInitProps = {
    initialValue: { x: { min: 0, max: 1200 }, y: { min: 0, max: 84 } },
    config: plotConfig({
      gridSpacing: [80, 40],
      axisMode: { y: { notation: 'fixed', precision: 0 } },
      showCursorSeriesMarker: true,
    }),
  }
  const onReady = (plot: PlotInstance) => {
    plot.series.add(
      'alpha',
      { kind: 'series/line', x: data.x, y: data.alpha, widthPx: 1 },
      { color: palette.green },
    )
    plot.series.add(
      'beta',
      { kind: 'series/line', x: data.x, y: data.beta, widthPx: 1 },
      { color: palette.cyan },
    )

    const readBounds = (): OverlayBounds => {
      const bounds = plot.coords.bounds()
      return {
        left: bounds.origin.x,
        top: bounds.origin.y,
        width: bounds.size.width,
        height: bounds.size.height,
      }
    }

    setOverlayBounds(readBounds())

    const update = (activeX: number, px?: { x: number; y: number }) => {
      const index = nearestIndex(data.x, activeX)
      const x = data.x[index]!
      const alpha = data.alpha[index]!
      const beta = data.beta[index]!

      const bounds = readBounds()
      setOverlayBounds(bounds)
      const fallback = plot.coords.valueToPx(x, alpha)
      const rawLeft = (px?.x ?? fallback.x) + 12
      const rawTop = (px?.y ?? fallback.y) - 34
      const minLeft = bounds.left + 8
      const minTop = bounds.top + 8

      setReadout({
        x,
        alpha,
        beta,
        left: clamp(rawLeft, minLeft, Math.max(minLeft, bounds.left + bounds.width - 292)),
        top: clamp(rawTop, minTop, Math.max(minTop, bounds.top + bounds.height - 36)),
      })
    }

    const disposeCursor = plot.subscribe('cursor', (event) => {
      if (!event.inside || !event.value) {
        setReadout(null)
        return
      }
      update(event.value.x, event.px)
    })

    return () => {
      disposeCursor()
    }
  }
  const legendInset = overlayBounds
    ? { transform: `translate(${overlayBounds.left + 8}px, ${overlayBounds.top + 8}px)` }
    : undefined
  return (
    <div className={styles.stateDomShell}>
      <PlotCard title="State" init={init} onReady={onReady} />
      <div className={styles.stateLegendDom} style={legendInset} aria-hidden="true">
        <span className={styles.stateLegendItem}>
          <span className={`${styles.stateLegendSwatch} ${styles.stateLegendAlpha}`} />
          alpha
        </span>
        <span className={styles.stateLegendItem}>
          <span className={`${styles.stateLegendSwatch} ${styles.stateLegendBeta}`} />
          beta
        </span>
      </div>
      {readout ? (
        <div
          className={styles.stateTooltipDom}
          style={{ transform: `translate(${readout.left}px, ${readout.top}px)` }}
        >
          <span>x {Math.round(readout.x)}</span>
          <span className={styles.stateTooltipAlpha}>alpha {readout.alpha.toFixed(1)}</span>
          <span className={styles.stateTooltipBeta}>beta {readout.beta.toFixed(1)}</span>
        </div>
      ) : null}
    </div>
  )
}
