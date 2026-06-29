import { useMemo } from 'react'
import { createLinkGroup } from 'wplot'
import type { Plot as PlotInstance } from 'wplot'
import {
  annotations,
  hLine,
  xBand,
  type BandOptions,
  type GuideOptions,
} from 'wplot/extensions'
import type { PlotInitProps } from '../Plot'

import { PlotCard } from './PlotCard'
import { palette, plotConfig, solid, withAlpha } from './theme'
import {
  buildDenseTelemetry,
  DEG_END_MS,
  DEG_START_MS,
  INITIAL_WINDOW_MS,
  TIME_OFFSET_MS,
  TOTAL_DURATION_MS,
} from './telemetry-data'
import styles from './pages.module.css'

const X_VIEW = {
  min: TOTAL_DURATION_MS - INITIAL_WINDOW_MS,
  max: TOTAL_DURATION_MS,
} as const

const TIME_AXIS = {
  x: { mode: 'time', timezone: 'local', offset: TIME_OFFSET_MS },
} as const

// All plots in the stack share one x-axis and one cursor (vertical is per-plot),
// so panning/zooming or hovering any plot moves the whole column together.
const LINK_AXES = { x: true, y: false } as const
const LINK_CURSOR = { x: true, y: false } as const

// The degradation window: a translucent red x-band repeated across every plot so
// it reads as one vertical region spanning the column. Only the top plot carries
// the text label to avoid clutter.
function degradationBand(withLabel: boolean): BandOptions {
  // Neutral white-translucent region (shell has no red); the label chip uses
  // the focus blue accent so it still reads.
  return {
    fill: [1, 1, 1, 0.05],
    stroke: [1, 1, 1, 0.22],
    strokeWidthPx: 1,
    label: withLabel ? 'Degradation window' : undefined,
    labelBackground: solid(palette.blue),
    labelColor: [1, 1, 1, 1],
    labelBorderWidthPx: 0,
    showAxisValueLabels: false,
  }
}

// The throttle "bias" guide: a horizontal reference line with a chip on the axis.
const biasGuide: GuideOptions = {
  color: withAlpha(palette.cyan, 0.95),
  widthPx: 1,
  label: 'Bias',
  labelAnchor: 'start',
  labelAlign: 'after',
  labelBackground: solid(palette.cyan),
  labelColor: [1, 1, 1, 1],
  labelBorder: solid(palette.cyan),
  showAxisValueLabel: true,
  axisLabelBackground: solid(palette.cyan),
  axisLabelBorder: solid(palette.cyan),
}

export function Telemetry() {
  const data = useMemo(buildDenseTelemetry, [])
  const group = useMemo(createLinkGroup, [])

  const link = useMemo(
    () => ({ group, axes: LINK_AXES, cursor: LINK_CURSOR }),
    [group],
  )

  const chamberInit: PlotInitProps = {
    initialValue: { x: X_VIEW, y: { min: 0, max: 390 } },
    config: plotConfig({
      axisMode: { ...TIME_AXIS, y: { notation: 'fixed', precision: 0 } },
    }),
    link,
  }
  const buildChamber = (plot: PlotInstance) => {
    plot.use(annotations())
    plot.series.add(
      'Chamber target',
      { kind: 'series/step', x: data.x, y: data.chamberTarget, widthPx: 1.1 },
      { color: palette.gold },
    )
    plot.series.add(
      'Chamber actual',
      { kind: 'series/line', x: data.x, y: data.chamberActual, widthPx: 1.4 },
      { color: palette.violet },
    )
    plot.objects.add(xBand(DEG_START_MS, DEG_END_MS, degradationBand(true)))
  }

  const throttleInit: PlotInitProps = {
    initialValue: { x: X_VIEW, y: { min: -28, max: 98 } },
    config: plotConfig({
      axisMode: {
        ...TIME_AXIS,
        y: {
          formatter: ({ value, step }) =>
            step >= 1 ? `${Math.round(value)}%` : `${value.toFixed(1)}%`,
        },
      },
      // Secondary right y-axis for the throttle error, which swings in a much
      // tighter band than the 0..100% command/feedback on the primary axis. It
      // shares the x-axis; the error series targets it by id.
      yAxes: [
        {
          id: 'error',
          side: 'right',
          min: -16,
          max: 16,
          notation: 'fixed',
          precision: 0,
        },
      ],
    }),
    link,
  }
  const buildThrottle = (plot: PlotInstance) => {
    plot.use(annotations())
    plot.series.add(
      'Throttle command',
      { kind: 'series/line', x: data.x, y: data.throttleCmd, widthPx: 1.2 },
      { color: palette.violet },
    )
    plot.series.add(
      'Throttle feedback',
      { kind: 'series/line', x: data.x, y: data.throttleFeedback, widthPx: 1.25 },
      { color: palette.cyan },
    )
    plot.series.add(
      'Throttle error',
      { kind: 'series/line', x: data.x, y: data.throttleError, widthPx: 1 },
      { color: palette.gold, yAxisId: 'error' },
    )
    plot.objects.add(hLine(12, biasGuide))
    plot.objects.add(xBand(DEG_START_MS, DEG_END_MS, degradationBand(false)))
  }

  const mixtureInit: PlotInitProps = {
    initialValue: { x: X_VIEW, y: { min: 2.492, max: 2.521 } },
    config: plotConfig({
      axisMode: { ...TIME_AXIS, y: { notation: 'fixed', precision: 3 } },
    }),
    link,
  }
  const buildMixture = (plot: PlotInstance) => {
    plot.use(annotations())
    plot.series.add(
      'Pump load',
      {
        kind: 'series/line',
        x: data.processX,
        y: data.pumpLoad,
        widthPx: 1.2,
        fill: withAlpha(palette.cyan, 0.12),
        fillTo: 2.492,
      },
      { color: palette.cyan },
    )
    plot.series.add(
      'Mixture ratio',
      { kind: 'series/line', x: data.processX, y: data.mixtureRatio, widthPx: 1.2 },
      { color: palette.violet },
    )
    plot.objects.add(xBand(DEG_START_MS, DEG_END_MS, degradationBand(false)))
  }

  return (
    <section className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Overview</h1>
        <p className={styles.subtitle}>
          Linked rocket-engine telemetry — pan/zoom any plot and the column
          follows; shared crosshair; a secondary right-hand axis on the throttle
          plot; a degradation window across the stack.
        </p>
      </header>

      <div className={styles.stack}>
        <PlotCard
          title="Chamber pressure"
          meta="psi · step target + actual"
          init={chamberInit}
          onReady={buildChamber}
          legend={[
            { label: 'Target', color: palette.gold },
            { label: 'Actual', color: palette.violet },
          ]}
        />
        <PlotCard
          title="Throttle valve"
          meta="% command/feedback · right axis: error"
          init={throttleInit}
          onReady={buildThrottle}
          legend={[
            { label: 'Command', color: palette.violet },
            { label: 'Feedback', color: palette.cyan },
            { label: 'Error (right axis)', color: palette.gold },
          ]}
        />
        <PlotCard
          title="Turbopump & mixture"
          meta="coefficient · 2 s process average"
          init={mixtureInit}
          onReady={buildMixture}
          legend={[
            { label: 'Pump load', color: palette.cyan },
            { label: 'Mixture ratio', color: palette.violet },
          ]}
        />
      </div>
    </section>
  )
}

export default Telemetry
