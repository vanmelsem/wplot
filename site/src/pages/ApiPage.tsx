import { CodeBlock } from './CodeBlock'
import styles from './pages.module.css'

type ApiSection = {
  index: string
  title: string
  detail: string
  code: string
}

const sections: readonly ApiSection[] = [
  {
    index: '01',
    title: 'Install',
    detail: 'Import the core from wplot. Optional layers and objects live on extension entry points.',
    code: `// npm install wplot

import { createPlot, type Plot, type PlotInit, type Plugin } from 'wplot'
import { annotations, hLine, xBand } from 'wplot/extensions'`,
  },
  {
    index: '02',
    title: 'Create',
    detail: 'Mount into a host element, define the initial x/y view, install plugins, then start the renderer.',
    code: `import { createPlot } from 'wplot'

type Range = { min: number; max: number }

type PlotInit = {
  host: HTMLElement
  initialValue: { x: Range; y: Range }
  config?: PlotConfigUpdate
  link?: { group: LinkGroup } & LinkOptions
  plugins?: readonly Plugin[]
}

const plot = createPlot({
  host,
  initialValue: { x: { min: 0, max: 1000 }, y: { min: 0, max: 1 } },
  plugins: [],
})

plot.start()`,
  },
  {
    index: '03',
    title: 'Series',
    detail: 'Add, append, replace, hide, remove, and inspect series through the imperative series API.',
    code: `import { createPlot } from 'wplot'

const x = new Float64Array(1000)
const y = new Float32Array(1000)

const id = plot.series.add(
  'signal',
  { kind: 'series/line', x, y, widthPx: 1 },
  { color: [0.5, 0.46, 1, 1] },
)

plot.series.append(id, { x: nextX, y: nextY, max: 8000 })
plot.series.appendMany(id, chunks)
plot.series.setData(id, { kind: 'series/line', x: replacementX, y: replacementY })
plot.series.setVisible(id, true)
plot.series.list()`,
  },
  {
    index: '04',
    title: 'Inputs',
    detail: 'Built-in input shapes cover common time-series and chart primitives; custom kinds are plugin-owned.',
    code: `type SeriesInput =
  | { kind: 'series/line'; x; y; widthPx?: number; fill?: Color; fillTo?: number }
  | { kind: 'series/band'; x; y0; y1; opacity?: number }
  | { kind: 'series/scatter'; x; y; sizePx?: number; shape?: 'circle' | 'square' }
  | { kind: 'series/candles'; x; open; high; low; close; width?: number }
  | { kind: 'series/bars'; x; y; y0?: number; width?: number }
  | { kind: 'series/step'; x; y }
  | { kind: 'series/infinite-lines'; x?: number[]; y?: number[] }
  | ({ kind: string } & Record<string, unknown>)`,
  },
  {
    index: '05',
    title: 'View and state',
    detail: 'The plot instance is readable, so external panels can stay in sync without owning render state.',
    code: `import { createPlot, type Plot } from 'wplot'

function snapshot(plot: Plot) {
  return {
    view: plot.view.get(),
    cursor: plot.cursor.get(),
    hover: plot.interaction.getHover(),
    selection: plot.interaction.getSelection(),
    selectedObject: plot.objects.getSelected(),
    series: plot.series.list(),
    bounds: plot.coords.bounds(),
  }
}

const unsubscribe = plot.subscribe('cursor', () => {
  console.log(snapshot(plot))
})

plot.view.set({ x: { min: 120, max: 620 }, y: plot.view.get().y })
unsubscribe()`,
  },
  {
    index: '06',
    title: 'Annotations',
    detail: 'Annotations are plot objects, so they can be selected, updated, locked, hidden, and removed.',
    code: `import { createPlot } from 'wplot'
import { annotations, hLine, vLine, xBand, yBand, tag } from 'wplot/extensions'

const plot = createPlot({
  host,
  initialValue,
  plugins: [annotations()],
})

const bandId = plot.objects.add(xBand(300, 520, { label: 'window' }))
plot.objects.add(yBand(40, 64, { label: 'range' }))
plot.objects.add(hLine(78, { label: 'threshold' }))
plot.objects.add(vLine(700, { label: 'event' }))
plot.objects.add(tag(850, 56, 'peak'))

plot.objects.updateState(bandId, { x0: 340, x1: 560 })
plot.objects.setLocked(bandId, true)
plot.objects.setVisible(bandId, true)
plot.objects.remove(bandId)`,
  },
  {
    index: '07',
    title: 'Axes and units',
    detail: 'Use tick formatters for units and log scale for positive values spanning orders of magnitude.',
    code: `import { createPlot } from 'wplot'

const plot = createPlot({
  host,
  initialValue: { x: { min: 0, max: 1200 }, y: { min: 1, max: 100_000 } },
  config: {
    axisMode: {
      x: { formatter: ({ value }) => \`\${Math.round(value)}s\` },
      y: {
        scale: 'log',
        formatter: ({ value }) => \`10^\${Math.round(Math.log10(value))}\`,
      },
    },
  },
})`,
  },
  {
    index: '08',
    title: 'Themes',
    detail: 'Themes expand into config updates for canvas color, grid, crosshair, borders, and axis text.',
    code: `import { createPlot } from 'wplot'

const plot = createPlot({ host, initialValue })

plot.theme.set({
  background: [0.06, 0.06, 0.06, 1],
  grid: [1, 1, 1, 0.08],
  crosshair: [1, 1, 1, 0.42],
  text: [1, 1, 1, 0.68],
  axisLine: [1, 1, 1, 0.16],
  border: [1, 1, 1, 0.14],
})`,
  },
  {
    index: '09',
    title: 'Overlays',
    detail: 'Draw custom UI on the overlay canvas in CSS-pixel space and request redraws when state changes.',
    code: `import { createPlot } from 'wplot'

const plot = createPlot({ host, initialValue })

const disposeOverlay = plot.onDraw(({ ctx, bounds }) => {
  const cursor = plot.cursor.get()
  if (!cursor.inside || !cursor.px) return

  ctx.fillStyle = 'rgba(127, 132, 255, 0.14)'
  ctx.fillRect(cursor.px.x - 6, bounds.origin.y, 12, bounds.size.height)
})

const disposeCursor = plot.subscribe('cursor', () => plot.redraw())`,
  },
  {
    index: '10',
    title: 'Plugins',
    detail: 'A plugin receives the plot instance, wires behavior, and returns cleanup.',
    code: `import { createPlot, type Plugin } from 'wplot'

const readout: Plugin = {
  name: 'readout',
  setup(plot) {
    const disposeCursor = plot.subscribe('cursor', event => {
      console.log(event.formatted?.x, event.formatted?.y)
    })

    const disposeDraw = plot.onDraw(({ ctx, bounds }) => {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.64)'
      ctx.fillText('live', bounds.origin.x + 8, bounds.origin.y + 16)
    })

    return () => {
      disposeCursor()
      disposeDraw()
    }
  },
}

const plot = createPlot({ host, initialValue, plugins: [readout] })`,
  },
]

function CodeCard({ code }: { code: string }) {
  return (
    <div className={styles.apiCodeCard}>
      <CodeBlock code={code} />
    </div>
  )
}

export function ApiPage() {
  return (
    <div className={styles.apiShell}>
      <main className={styles.apiColumn}>
        <section className={styles.apiIntro}>
          <a href="/" className={styles.apiBack}>
            wplot
          </a>
          <h1>API &amp; types</h1>
          <p>
            The core API is intentionally small: create a plot, add data, read
            state, format axes, draw overlays, and package custom behavior as
            plugins.
          </p>
        </section>

        <div className={styles.apiList}>
          {sections.map((section) => (
            <section className={styles.apiSection} key={section.index}>
              <div className={styles.apiSectionHead}>
                <span>{section.index}</span>
                <div>
                  <h2>{section.title}</h2>
                  <p>{section.detail}</p>
                </div>
              </div>
              <CodeCard code={section.code} />
            </section>
          ))}
        </div>
      </main>
    </div>
  )
}

export default ApiPage
