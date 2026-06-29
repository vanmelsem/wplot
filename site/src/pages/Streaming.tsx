import { useEffect, useMemo, useRef, useState } from 'react'
import type { ObjectId, Plot as PlotInstance, SeriesId } from 'wplot'
import { annotations, hLine } from 'wplot/extensions'
import type { PlotInitProps } from '../Plot'

import { Button, Slider } from '../ui'
import { PlotCard } from './PlotCard'
import { palette, plotConfig, prng, randn, solid } from './theme'
import styles from './pages.module.css'

// A wide, slowly-sliding window. Time MOVES (the view follows the stream clock),
// the Y-axis is fixed so the trace never breathes vertically, and the line is
// sub-pixel (no per-column snapping) — that combination is what reads as smooth.
const WINDOW_SEC = 4.5
const MAX_SAMPLES = 6000
const Y_RANGE = { min: -2.1, max: 2.1 } as const

export function Streaming() {
  const plotRef = useRef<PlotInstance | null>(null)
  const refs = useRef<{
    cmd: SeriesId
    fb: SeriesId
    fbTag: ObjectId
  } | null>(null)

  const [running, setRunning] = useState(true)
  const [rate, setRate] = useState(240)
  const runningRef = useRef(running)
  runningRef.current = running
  const rateRef = useRef(rate)
  rateRef.current = rate

  const init = useMemo<PlotInitProps>(
    () => ({
      initialValue: { x: { min: -WINDOW_SEC, max: 0 }, y: Y_RANGE },
      config: plotConfig({
        axisMode: {
          // Clean integer-second ticks that slide with the data (no churn).
          x: { formatter: ({ value }) => `${Math.round(value)}s` },
          y: { notation: 'fixed', precision: 1 },
        },
        gridSpacing: [150, 40],
        // Latest values live on the right, next to the newest data.
        yScaleSide: 'right',
        // Sub-pixel line so the slide is smooth, not shimmering column-to-column.
        internalLod: false,
      }),
    }),
    [],
  )

  const onReady = (plot: PlotInstance) => {
    plotRef.current = plot
    plot.use(annotations())
    const cmd = plot.series.add(
      'Command',
      { kind: 'series/step', x: [0], y: [0], widthPx: 1, align: 'end' },
      { color: palette.violet },
    )
    const fb = plot.series.add(
      'Feedback',
      { kind: 'series/line', x: [0], y: [0], widthPx: 1 },
      { color: palette.cyan },
    )
    // One live value chip pinned to the y-axis at the feedback's latest value.
    // (A single chip avoids two tags colliding when the signals cross.)
    const fbTag = plot.objects.add(
      hLine(0, {
        color: [0, 0, 0, 0],
        widthPx: 0,
        showAxisValueLabel: true,
        axisLabelBackground: solid(palette.cyan),
        axisLabelColor: [1, 1, 1, 1],
        axisLabelBorder: solid(palette.cyan),
      }),
    )
    refs.current = { cmd, fb, fbTag }
    // X is owned by the stream clock — lock it so dragging only pans Y (no ugly
    // elastic fight on the x-axis).
    plot.interaction.setPanAxes(false, true)
  }

  // Command: a tight stepped setpoint. Feedback: a smooth oscillator that tracks
  // it and rings around it with a little wander + light noise (some randomness,
  // but smooth — no high-frequency fuzz).
  useEffect(() => {
    let raf = 0
    let lastNow = performance.now()
    let streamT = 0
    let sampledT = 0

    const rand = prng(20_260_628)
    let cmdTarget = 0
    let nextTargetAt = 0
    let fbCenter = 0
    let oscPhase = 0
    let amp = 0.32
    let freq = 1.6
    let noise = 0

    const stepSample = (t: number, dt: number): [number, number] => {
      if (t >= nextTargetAt) {
        // Walk the setpoint in fine sub-steps (±0.25 / ±0.5) for a detailed
        // staircase with more, smaller steps.
        const deltas = [-0.5, -0.25, 0.25, 0.5]
        cmdTarget += deltas[Math.floor(rand() * 4)]!
        cmdTarget = Math.max(-1.5, Math.min(1.5, Math.round(cmdTarget * 4) / 4))
        nextTargetAt = t + 0.4 + rand() * 0.5 // every 0.4–0.9s
      }
      fbCenter += (cmdTarget - fbCenter) * Math.min(1, dt * 5)
      // Slow, gentle oscillation (less fast movement) with a little wander + noise.
      amp += (0.32 - amp) * 0.02 + randn(rand) * 0.006
      amp = Math.max(0.18, Math.min(0.46, amp))
      freq += (1.6 - freq) * 0.02 + randn(rand) * 0.02
      freq = Math.max(1.1, Math.min(2.3, freq))
      oscPhase += dt * 2 * Math.PI * freq
      noise = noise * 0.85 + randn(rand) * 0.3
      return [cmdTarget, fbCenter + Math.sin(oscPhase) * amp + noise * 0.02]
    }

    const loop = (now: number) => {
      raf = requestAnimationFrame(loop)
      const dt = (now - lastNow) / 1000
      lastNow = now
      const plot = plotRef.current
      const r = refs.current
      if (!plot || !r || !runningRef.current) return

      streamT += Math.min(dt, 0.1)
      const stepDt = 1 / rateRef.current

      const xs: number[] = []
      const yc: number[] = []
      const yf: number[] = []
      let added = 0
      while (sampledT + stepDt <= streamT && added < 5000) {
        sampledT += stepDt
        const [c, f] = stepSample(sampledT, stepDt)
        xs.push(sampledT)
        yc.push(c)
        yf.push(f)
        added += 1
      }

      plot.batch(() => {
        if (xs.length > 0) {
          plot.series.append(r.cmd, { x: xs, y: yc, max: MAX_SAMPLES })
          plot.series.append(r.fb, { x: xs, y: yf, max: MAX_SAMPLES })
          // Live value chip tracks the feedback's latest value.
          plot.objects.updateState(r.fbTag, { y: yf[yf.length - 1]! })
        }
        // X follows the stream clock; Y is whatever the user has dragged it to
        // (defaults to Y_RANGE), preserved here so vertical panning sticks.
        const cur = plot.view.get()
        plot.view.set({
          x: { min: streamT - WINDOW_SEC, max: streamT },
          y: cur.y,
        })
      })
      // Draw synchronously this rAF tick (not via the coalescing scheduler), so
      // we render every frame and hit the display's full refresh rate.
      plot.renderNow()
    }

    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [])

  return (
    <div className={styles.stack}>
      <div className={styles.toolbar}>
        <Button onClick={() => setRunning((on) => !on)}>
          {running ? 'Pause' : 'Start'}
        </Button>
        <div className={styles.field}>
          <span className={styles.fieldLabel}>Rate</span>
          <div style={{ width: 160 }}>
            <Slider
              fullWidth
              min={20}
              max={480}
              step={20}
              value={rate}
              onValueChange={(value) =>
                setRate(Array.isArray(value) ? value[0]! : (value as number))
              }
              aria-label="Samples per second"
            />
          </div>
          <span className={styles.panelMeta}>{rate} Hz</span>
        </div>
      </div>

      <PlotCard
        title="Live oscilloscope"
        init={init}
        onReady={onReady}
        legend={[
          { label: 'Command', color: palette.violet },
          { label: 'Feedback', color: palette.cyan },
        ]}
      />
    </div>
  )
}

export default Streaming
