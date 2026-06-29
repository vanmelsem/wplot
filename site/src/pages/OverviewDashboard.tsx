import { useState } from 'react'
import type { ReactNode } from 'react'

import { CodeBlock } from './CodeBlock'
import { Heatmap } from './Heatmap'
import { Streaming } from './Streaming'
import {
  AnnotationsDemo,
  BarsPlot,
  CandlesPlot,
  CustomAxis,
  DualAxis,
  FillBetween,
  LinkedDemo,
  LogScale,
  RacingTelemetry,
  ReactorSpread as LayeredBandsPlot,
  ScatterCloud,
  SignalWall,
  SimpleArea,
  StateReadoutPlot,
  ThemeAccent,
  UnitsDemo,
} from './Variations'
import styles from './pages.module.css'

type OverviewDemo = {
  id: string
  index: string
  title: string
  detail: string
  plot: ReactNode
  code: string
  caption?: string
  tall?: boolean
}

type CodeOptions = {
  coreImports?: string
  imports?: string
  initialValue?: string
  config?: string
}

function plotCode(body: string, options: CodeOptions = {}) {
  const imports = [
    `import { ${options.coreImports ?? 'createPlot'} } from 'wplot'`,
    options.imports,
  ]
    .filter(Boolean)
    .join('\n')
  const initialValue =
    options.initialValue ?? `{ x: { min: 0, max: 100 }, y: { min: 0, max: 1 } }`
  const config = options.config ? `,\n  config: ${options.config.trim()}` : ''

  return `${imports}

const host = document.querySelector<HTMLDivElement>('#plot')!

const plot = createPlot({
  host,
  initialValue: ${initialValue}${config},
})

${body.trim()}

plot.start()`
}

const demos: readonly OverviewDemo[] = [
  {
    id: 'fill',
    index: '01',
    title: 'Band series',
    detail: 'A band series paints the region between upper and lower curves.',
    plot: <FillBetween />,
    caption: 'Hover for the crosshair, drag to pan, and wheel to zoom inside the canvas.',
    code: plotCode(
      `const x = new Float64Array(1000)
const lower = new Float32Array(1000)
const upper = new Float32Array(1000)

plot.series.add(
  'band',
  { kind: 'series/band', x, y0: lower, y1: upper, opacity: 0.14 },
  { color: [0.5, 0.46, 1, 1] },
)

plot.series.add('upper', { kind: 'series/line', x, y: upper, widthPx: 1 })
plot.series.add('lower', { kind: 'series/line', x, y: lower, widthPx: 1 })`,
      { initialValue: `{ x: { min: 0, max: 1000 }, y: { min: 10, max: 90 } }` },
    ),
  },
  {
    id: 'streaming',
    index: '02',
    title: 'Streaming',
    detail: 'Append samples into a moving x-window without rebuilding the plot.',
    plot: <Streaming />,
    caption: 'The x-view follows the stream clock while each frame appends new typed-array data.',
    code: plotCode(
      `const series = plot.series.add('stream', {
  kind: 'series/line',
  x: [0],
  y: [0],
  widthPx: 1,
})

function appendFrame(t: number, xs: Float64Array, ys: Float32Array) {
  plot.series.append(series, { x: xs, y: ys, max: 6000 })

  plot.view.set({
    x: { min: t - 4.5, max: t },
    y: plot.view.get().y,
  })

  plot.renderNow()
}`,
      {
        initialValue: `{ x: { min: -4.5, max: 0 }, y: { min: -2, max: 2 } }`,
        config: `{
    axisMode: { x: { formatter: ({ value }) => \`\${Math.round(value)}s\` } },
  }`,
      },
    ),
  },
  {
    id: 'heatmap',
    index: '03',
    title: 'Heatmap layer',
    detail: 'A dense value raster mounted behind the regular plot interaction layer.',
    plot: <Heatmap />,
    caption: 'The heatmap is a plot layer, so axes, cursor, zoom, and pan remain native.',
    code: plotCode(
      `const rows = 640
const cols = 240
const values = new Float32Array(rows * cols)

plot.use(
  heatmap({
    x0: 0,
    x1: 12,
    y0: 0,
    y1: 1,
    rows,
    cols,
    values,
    sampling: 'nearest',
  }),
)`,
      {
        imports: `import { heatmap } from 'wplot/extensions'`,
        initialValue: `{ x: { min: 0, max: 12 }, y: { min: 0, max: 1 } }`,
      },
    ),
  },
  {
    id: 'lines',
    index: '04',
    title: 'Multiple lines',
    detail: 'Multiple long typed-array traces in one canvas surface.',
    plot: <SignalWall />,
    code: plotCode(
      `const x = new Float64Array(3000)
const channels = [
  new Float32Array(3000),
  new Float32Array(3000),
  new Float32Array(3000),
]
const colors = [
  [0.5, 0.46, 1, 1],
  [0.32, 0.78, 0.95, 1],
  [0.92, 0.76, 0.32, 1],
] as const

channels.forEach((y, index) => {
  plot.series.add(
    'line-' + (index + 1),
    { kind: 'series/line', x, y, widthPx: 1 },
    { color: colors[index] },
  )
})`,
      { initialValue: `{ x: { min: 0, max: 3000 }, y: { min: -34, max: 34 } }` },
    ),
  },
  {
    id: 'bands',
    index: '05',
    title: 'Layered bands',
    detail: 'Nested band series with a center line and independent opacity.',
    plot: <LayeredBandsPlot />,
    code: plotCode(
      `const x = new Float64Array(2000)
const center = new Float32Array(2000)
const lower1 = new Float32Array(2000)
const upper1 = new Float32Array(2000)
const lower2 = new Float32Array(2000)
const upper2 = new Float32Array(2000)

plot.series.add('band-outer', {
  kind: 'series/band',
  x,
  y0: lower2,
  y1: upper2,
  opacity: 0.1,
})

plot.series.add('band-inner', {
  kind: 'series/band',
  x,
  y0: lower1,
  y1: upper1,
  opacity: 0.2,
})

plot.series.add('center', { kind: 'series/line', x, y: center, widthPx: 1 })`,
      { initialValue: `{ x: { min: 0, max: 2000 }, y: { min: 485, max: 625 } }` },
    ),
  },
  {
    id: 'linked',
    index: '06',
    title: 'Linked axes',
    detail: 'Two plots share the x view and cursor while keeping independent y axes.',
    plot: <LinkedDemo />,
    caption: 'Move across either plot; the linked cursor follows the shared x coordinate.',
    code: `import { createLinkGroup, createPlot } from 'wplot'

const group = createLinkGroup()
const link = {
  group,
  axes: { x: true, y: false },
  cursor: { x: true, y: false },
}

const upperHost = document.querySelector<HTMLDivElement>('#upper')!
const lowerHost = document.querySelector<HTMLDivElement>('#lower')!
const initialValue = { x: { min: 0, max: 1600 }, y: { min: 0, max: 80 } }

const upperPlot = createPlot({ host: upperHost, initialValue, link })
const lowerPlot = createPlot({ host: lowerHost, initialValue, link })

upperPlot.start()
lowerPlot.start()`,
    tall: true,
  },
  {
    id: 'annotations',
    index: '07',
    title: 'Annotations',
    detail: 'Guides, bands, regions, and tags live in the plot object layer.',
    plot: <AnnotationsDemo />,
    caption: 'Install the annotation plugin, add objects, then update, lock, hide, or remove them by id.',
    code: `import { createPlot } from 'wplot'
import { annotations, hLine, vLine, xBand, tag } from 'wplot/extensions'

const host = document.querySelector<HTMLDivElement>('#plot')!

const plot = createPlot({
  host,
  initialValue: { x: { min: 0, max: 1000 }, y: { min: 10, max: 95 } },
  plugins: [annotations()],
})

const windowId = plot.objects.add(
  xBand(300, 520, { label: 'window', showAxisValueLabels: false }),
)

plot.objects.add(hLine(78, { label: 'threshold' }))
plot.objects.add(vLine(700, { label: 'event' }))
plot.objects.add(tag(850, 56, 'tag', { borderWidthPx: 0 }))

plot.objects.updateState(windowId, { x0: 340, x1: 560 })
plot.objects.setLocked(windowId, true)

plot.start()`,
  },
  {
    id: 'scatter',
    index: '08',
    title: 'Scatter series',
    detail: 'Point rendering for sampled distributions and large datasets.',
    plot: <ScatterCloud />,
    code: plotCode(
      `const x = new Float32Array(5000)
const y = new Float32Array(5000)

plot.series.add('points', {
  kind: 'series/scatter',
  x,
  y,
  sizePx: 3.4,
  shape: 'circle',
  strokeWidthPx: 0,
})`,
      { initialValue: `{ x: { min: -4, max: 4 }, y: { min: -4, max: 4 } }` },
    ),
  },
  {
    id: 'candles',
    index: '09',
    title: 'Candlestick series',
    detail: 'OHLC rendering with canvas-native interaction and zoom.',
    plot: <CandlesPlot />,
    code: plotCode(
      `const x = new Float64Array(180)
const open = new Float32Array(180)
const high = new Float32Array(180)
const low = new Float32Array(180)
const close = new Float32Array(180)

plot.series.add('ohlc', {
  kind: 'series/candles',
  x,
  open,
  high,
  low,
  close,
  width: 0.66,
})`,
      { initialValue: `{ x: { min: 0, max: 180 }, y: { min: 55, max: 120 } }` },
    ),
  },
  {
    id: 'bars',
    index: '10',
    title: 'Bar series',
    detail: 'Discrete values rendered as canvas bars with optional baselines.',
    plot: <BarsPlot />,
    code: plotCode(
      `const x = new Float64Array(160)
const y = new Float32Array(160)
const y0 = new Float32Array(160)

plot.series.add(
  'bars',
  {
    kind: 'series/bars',
    x,
    y,
    y0,
    width: 0.62,
  },
  { color: [0.54, 0.52, 1, 0.82] },
)`,
      { initialValue: `{ x: { min: 0, max: 161 }, y: { min: 0, max: 108 } }` },
    ),
  },
  {
    id: 'racing',
    index: '11',
    title: 'Racing telemetry',
    detail: 'Steering versus lateral g, plus a sector-marked throttle and brake trace.',
    plot: <RacingTelemetry />,
    tall: true,
    caption: 'The lower trace uses distance and cursor state; sectors are annotation objects.',
    code: `import { createLinkGroup, createPlot } from 'wplot'
import { annotations, vLine } from 'wplot/extensions'

const group = createLinkGroup()
const link = { group, axes: { x: true, y: false }, cursor: { x: true, y: false } }

const scatter = createPlot({
  host: steeringHost,
  initialValue: { x: { min: -90, max: 90 }, y: { min: -3, max: 3 } },
})

speedBands.forEach((band, index) => {
  scatter.series.add(\`speed-\${index}\`, {
    kind: 'series/scatter',
    x: band.steering,
    y: band.lateralG,
    sizePx: 2.4,
    shape: 'circle',
    strokeWidthPx: 0,
  }, { color: band.color })
})

const throttle = createPlot({
  host: throttleHost,
  initialValue: { x: { min: 0, max: 7600 }, y: { min: -5, max: 105 } },
  link,
  plugins: [annotations()],
})

for (const x of sectorFeet) throttle.objects.add(vLine(x))
throttle.series.add('throttle', { kind: 'series/step', x: distance, y: throttlePct })
throttle.series.add('brake', { kind: 'series/step', x: distance, y: brakePct })
`,
  },
  {
    id: 'dual-axis',
    index: '12',
    title: 'Secondary axis',
    detail: 'Independent left and right y scales in the same plot.',
    plot: <DualAxis />,
    code: plotCode(
      `const x = new Float64Array(1400)
const a = new Float32Array(1400)
const b = new Float32Array(1400)

plot.series.add('line-a', { kind: 'series/line', x, y: a })
plot.series.add('line-b', { kind: 'series/line', x, y: b }, { yAxisId: 'right' })`,
      {
        initialValue: `{ x: { min: 0, max: 1400 }, y: { min: -10, max: 70 } }`,
        config: `{ yAxes: [{ id: 'right', side: 'right', min: 4, max: 22 }] }`,
      },
    ),
  },
  {
    id: 'area',
    index: '13',
    title: 'Area fill',
    detail: 'A minimal area line for dashboards and status views.',
    plot: <SimpleArea />,
    code: plotCode(
      `const x = new Float64Array(1200)
const y = new Float32Array(1200)

plot.series.add(
  'area',
  {
    kind: 'series/line',
    x,
    y,
    widthPx: 1,
    fill: [0.36, 0.8, 0.52, 0.16],
    fillTo: 0,
  },
)`,
      { initialValue: `{ x: { min: 0, max: 1200 }, y: { min: 0, max: 100 } }` },
    ),
  },
  {
    id: 'log',
    index: '14',
    title: 'Log scale',
    detail: 'Use log projection for positive ranges that span orders of magnitude.',
    plot: <LogScale />,
    code: plotCode(
      `const x = new Float64Array(700)
const y = new Float32Array(700)

plot.series.add('line', { kind: 'series/line', x, y, widthPx: 1 })`,
      {
        initialValue: `{ x: { min: 0, max: 700 }, y: { min: 1, max: 100_000 } }`,
        config: `{
    axisMode: {
      y: {
        scale: 'log',
        formatter: ({ value }) => \`10^\${Math.round(Math.log10(value))}\`,
      },
    },
  }`,
      },
    ),
  },
  {
    id: 'units',
    index: '15',
    title: 'Units',
    detail: 'Format axis ticks and guide value chips with the same formatter.',
    plot: <UnitsDemo />,
    caption: 'Use a formatter for domain-specific units, or engineering/scientific notation for automatic scaling.',
    code: plotCode(
      `const x = new Float64Array(1200)
const bytes = new Float32Array(1200)

plot.series.add('throughput', {
  kind: 'series/line',
  x,
  y: bytes,
  widthPx: 1,
  fill: [0.38, 0.66, 0.78, 0.14],
  fillTo: 0,
})`,
      {
        initialValue: `{ x: { min: 0, max: 1200 }, y: { min: 0, max: 9e6 } }`,
        config: `{
    axisMode: {
      y: {
        formatter: ({ value, step }) =>
          value >= 1e6 ? \`\${(value / 1e6).toFixed(step < 1e6 ? 1 : 0)} MB\`
          : value >= 1e3 ? \`\${Math.round(value / 1e3)} KB\`
          : \`\${Math.round(value)} B\`,
      },
    },
  }`,
      },
    ),
  },
  {
    id: 'themes',
    index: '16',
    title: 'Themes',
    detail: 'Theme the canvas, grid, crosshair, axes, and series through config.',
    plot: <ThemeAccent />,
    caption: 'Use `plot.theme.set(...)` for reusable palettes, then override individual series where needed.',
    code: `import { createPlot } from 'wplot'

const host = document.querySelector<HTMLDivElement>('#plot')!

const amberTheme = {
  background: [0.05, 0.04, 0.03, 1],
  grid: [0.96, 0.74, 0.18, 0.1],
  crosshair: [0.96, 0.74, 0.18, 0.5],
  text: [0.96, 0.74, 0.18, 0.7],
  axisLine: [0.96, 0.74, 0.18, 0.25],
} as const

const plot = createPlot({
  host,
  initialValue: { x: { min: 0, max: 1200 }, y: { min: 0, max: 100 } },
})

plot.theme.set(amberTheme)
plot.series.add('line', { kind: 'series/line', x, y }, { color: [0.96, 0.74, 0.18, 1] })
plot.start()`,
  },
  {
    id: 'axis-format',
    index: '17',
    title: 'Axis formatter',
    detail: 'A custom formatter can keep domain values on the axis itself.',
    plot: <CustomAxis />,
    caption: 'Format currency, dates, percentages, or domain ids without adding a legend.',
    code: plotCode(
      `const x = new Float64Array(1200)
const y = new Float32Array(1200)

plot.series.add('line', { kind: 'series/line', x, y, widthPx: 1 })`,
      {
        initialValue: `{ x: { min: 0, max: 1200 }, y: { min: 0, max: 9000 } }`,
        config: `{
    axisMode: {
      y: { formatter: ({ value }) => \`$\${(value / 1000).toFixed(1)}k\` },
    },
  }`,
      },
    ),
  },
  {
    id: 'state',
    index: '18',
    title: 'State',
    detail: 'Read live cursor and series state into external UI.',
    plot: <StateReadoutPlot />,
    caption: 'The legend and tooltip are DOM; the plot provides cursor, series, and pixel state.',
    code: `import { createPlot } from 'wplot'

const shell = document.querySelector<HTMLDivElement>('#plot-shell')!
shell.style.position = 'relative'

const host = document.createElement('div')
host.style.width = '100%'
host.style.height = '100%'

const legend = document.createElement('div')
legend.className = 'legend'
Object.assign(legend.style, {
  position: 'absolute',
  zIndex: '4',
})

const tooltip = document.createElement('div')
tooltip.className = 'tooltip'
tooltip.hidden = true
Object.assign(tooltip.style, {
  position: 'absolute',
  left: '0',
  top: '0',
  zIndex: '5',
  pointerEvents: 'none',
})

shell.append(host, legend, tooltip)

const x = new Float64Array(1000)
const alphaY = new Float32Array(1000)
const betaY = new Float32Array(1000)

const plot = createPlot({
  host,
  initialValue: { x: { min: 0, max: 1000 }, y: { min: 10, max: 90 } },
})

const colors = {
  alpha: '#84df9d',
  beta: '#6db7da',
}

plot.series.add(
  'alpha',
  { kind: 'series/line', x, y: alphaY, widthPx: 1 },
  { color: [0.52, 0.87, 0.62, 1] },
)

plot.series.add(
  'beta',
  { kind: 'series/line', x, y: betaY, widthPx: 1 },
  { color: [0.43, 0.72, 0.86, 1] },
)

legend.innerHTML = \`
  <span><i style="background:\${colors.alpha}"></i>alpha</span>
  <span><i style="background:\${colors.beta}"></i>beta</span>
\`

function placeLegend() {
  const bounds = plot.coords.bounds()
  legend.style.transform =
    \`translate(\${bounds.origin.x + 8}px, \${bounds.origin.y + 8}px)\`
}

function nearestIndex(xs: Float64Array, value: number) {
  const t = (value - xs[0]) / (xs[xs.length - 1] - xs[0])
  return Math.max(0, Math.min(xs.length - 1, Math.round(t * (xs.length - 1))))
}

const unsubscribeCursor = plot.subscribe('cursor', event => {
  if (!event.inside || !event.value || !event.px) {
    tooltip.hidden = true
    return
  }

  const index = nearestIndex(x, event.value.x)
  tooltip.hidden = false
  tooltip.textContent =
    \`x \${Math.round(x[index])} · alpha \${alphaY[index].toFixed(1)} · beta \${betaY[index].toFixed(1)}\`
  tooltip.style.transform = \`translate(\${event.px.x + 12}px, \${event.px.y - 34}px)\`
})

plot.view.set({
  x: { min: 120, max: 620 },
  y: plot.view.get().y,
})

plot.start()
placeLegend()

// later
unsubscribeCursor()`,
  },
]

export function OverviewDashboard() {
  const [openCode, setOpenCode] = useState<Record<string, boolean>>({})

  const toggleCode = (id: string) => {
    setOpenCode((current) => ({ ...current, [id]: !current[id] }))
  }

  return (
    <div className={styles.overviewShell}>
      <main className={styles.overviewColumn}>
        <section className={styles.overviewIntro}>
          <div className={styles.overviewIntroTop}>
            <div className={styles.overviewBrand}>
              <span className={styles.overviewMark} aria-hidden="true" />
              <h1>wplot</h1>
            </div>
            <div className={styles.overviewIntroLinks}>
              <a
                href="https://github.com/vanmelsem/wplot"
                target="_blank"
                rel="noreferrer"
              >
                GitHub
              </a>
              <a href="/api">API</a>
            </div>
          </div>
          <span>
            A Canvas-2D plotting library — <strong>~32&nbsp;KB</strong> gzipped,
            <strong> zero dependencies</strong>, <strong>500k points</strong> drawn
            in ~14&nbsp;ms. Interactive canvases for lines, bands, heatmaps,
            streaming data, bars, racing telemetry, annotations, linked views,
            state readouts, and formatted axes.
          </span>
        </section>

        <div className={styles.overviewList}>
          {demos.map((demo) => (
            <section className={styles.overviewDemo} id={demo.id} key={demo.id}>
              <div className={styles.overviewDemoHead}>
                <div>
                  <div className={styles.overviewDemoTitle}>
                    <span>{demo.index}</span>
                    <h2>{demo.title}</h2>
                  </div>
                  <p>{demo.detail}</p>
                </div>
              </div>
              <div className={styles.overviewExampleFrame}>
                <div
                  className={`${styles.overviewPlotHost} ${
                    demo.tall ? styles.overviewPlotHostTall : ''
                  }`}
                >
                  {demo.plot}
                </div>
                <div className={styles.overviewCodePanel}>
                  <div className={styles.overviewCodeBar}>
                    <span className={styles.overviewCodeTab}>index.tsx</span>
                    <span className={styles.overviewCodeKind}>TypeScript</span>
                  </div>
                  <div
                    className={`${styles.overviewCodeBody} ${
                      openCode[demo.id] ? styles.overviewCodeBodyExpanded : ''
                    }`}
                  >
                    <CodeBlock code={demo.code} />
                    {!openCode[demo.id] ? (
                      <div className={styles.overviewCodeOverlay}>
                        <button
                          aria-expanded="false"
                          className={styles.overviewCodeReveal}
                          onClick={() => toggleCode(demo.id)}
                          type="button"
                        >
                          Show more
                        </button>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
              {demo.caption ? (
                <p className={styles.overviewCaption}>{demo.caption}</p>
              ) : null}
            </section>
          ))}
        </div>
      </main>
    </div>
  )
}

export default OverviewDashboard
