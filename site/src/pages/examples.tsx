import type { ReactNode } from 'react'

import { CodeBlock } from './CodeBlock'
import { Streaming } from './Streaming'
import { Heatmap } from './Heatmap'
import { OverviewDashboard } from './OverviewDashboard'
import {
  AnnotationsDemo,
  AreaStack,
  CandlesPlot,
  CustomAxis,
  DualAxis,
  FillBetween,
  LinkedDemo,
  LogScale,
  ReactorSpread,
  ScatterCloud,
  SignalWall,
  SimpleArea,
  ThemeAccent,
  UnitsDemo,
  ZoomDemo,
} from './Variations'
import styles from './doc.module.css'

/* layout helpers */
const Lead = ({ children }: { children: ReactNode }) => (
  <p className={styles.lead}>{children}</p>
)
const P = ({ children }: { children: ReactNode }) => (
  <p className={styles.p}>{children}</p>
)
const H2 = ({ children }: { children: ReactNode }) => (
  <h2 className={styles.h2}>{children}</h2>
)
const Frame = ({ children, tall }: { children: ReactNode; tall?: boolean }) => (
  <div className={styles.plotArea} style={tall ? { height: 540 } : undefined}>
    {children}
  </div>
)
const Code = ({ children }: { children: string }) => <CodeBlock code={children} />

export type Example = {
  id: string
  label: string
  group: string
  title: string
  body: ReactNode
}

export const GROUPS = ['Get started', 'Charts', 'Features', 'Plugins', 'Reference']

export const EXAMPLES: readonly Example[] = [
  {
    id: 'overview',
    label: 'Overview',
    group: 'Get started',
    title: 'wplot',
    body: <OverviewDashboard />,
  },
  {
    id: 'data',
    label: 'Data',
    group: 'Get started',
    title: 'Data',
    body: (
      <>
        <Lead>
          Data goes in as plain <strong>typed-array columns</strong> — an x array
          and a y array — and stays that way. No object-per-point, no reshaping;
          the columns are stored as-is and read by binary-search windowing.
        </Lead>
        <Frame>
          <SignalWall />
        </Frame>
        <H2>Add, append, replace</H2>
        <Code>{`plot.series.add('s', { kind: 'series/line', x, y })     // initial data
plot.series.append(id, { x: xs, y: ys, max: 8000 })     // stream (bounded ring buffer)
plot.series.setData(id, { kind: 'series/line', x, y })  // replace wholesale`}</Code>
        <H2>Pass typed arrays</H2>
        <P>
          <strong>Tip:</strong> pass <code>Float64Array</code> /{' '}
          <code>Float32Array</code> directly. A plain <code>number[]</code> is
          converted on ingest (a one-time allocation); a typed array skips that. Use{' '}
          <code>Float64Array</code> for x (timestamps need the precision) and{' '}
          <code>Float32Array</code> for y where ~1e-7 relative error is fine — it
          halves the memory and bandwidth.
        </P>
        <Code>{`const x = new Float64Array(n)   // x / timestamps: full precision
const y = new Float32Array(n)   // y values: compact
plot.series.add('s', { kind: 'series/line', x, y })`}</Code>
        <H2>Big data</H2>
        <P>
          On every frame only the visible window is walked (binary search), and
          each pixel column is compacted to its min/max — so a million-point series
          strokes just a few segments per column while staying visually exact.
          Streaming stays flat in memory via the <code>append</code>{' '}
          <code>max</code> ring buffer.
        </P>
      </>
    ),
  },
  {
    id: 'performance',
    label: 'Performance',
    group: 'Get started',
    title: 'Performance',
    body: (
      <>
        <Lead>
          A Canvas-2D engine tuned for big, live datasets. Head-to-head with uPlot
          (the other lean Canvas-2D library), same harness, headless Chromium,
          3 series, dpr 1 — lower is better.
        </Lead>
        <H2>Render time</H2>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>points</th>
              <th>wplot init</th>
              <th>uPlot init</th>
              <th>wplot zoom</th>
              <th>uPlot zoom</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>167k</td>
              <td>12.7 ms</td>
              <td>17.6 ms</td>
              <td>1.0 ms</td>
              <td>2.0 ms</td>
            </tr>
            <tr>
              <td>500k</td>
              <td>14.6 ms</td>
              <td>24.1 ms</td>
              <td>5.8 ms</td>
              <td>24.7 ms</td>
            </tr>
          </tbody>
        </table>
        <P>
          Both libraries commit the same x-axis zoom (p95 shown). wplot pulls ahead
          on init at scale (~1.6×) and on box-zoom (~4× lower p95) thanks to
          per-pixel-column gesture decimation; hover is comparable. Headless
          Chromium isn&rsquo;t vsync-throttled, so per-frame deltas compress —
          reproduce with <code>bun run bench</code>.
        </P>
        <H2>Bundle size</H2>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>library</th>
              <th>raw</th>
              <th>gzip</th>
              <th>brotli</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>wplot core</td>
              <td>113 KB</td>
              <td>31.8 KB</td>
              <td>27.7 KB</td>
            </tr>
            <tr>
              <td>uPlot 1.6</td>
              <td>44.9 KB</td>
              <td>19.4 KB</td>
              <td>17.5 KB</td>
            </tr>
          </tbody>
        </table>
        <P>
          The core is ~1.6× uPlot&rsquo;s gzip — but it ships candlesticks, multiple
          axes, link-groups, log scales, and the editable-object engine built in,
          which uPlot leaves to plugins. The annotation kinds and the WebGPU heatmap
          stay out of core, on the <code>wplot/extensions</code> and{' '}
          <code>wplot/heatmap</code> subpaths.
        </P>
      </>
    ),
  },
  {
    id: 'streaming',
    label: 'Streaming',
    group: 'Charts',
    title: 'Live streaming',
    body: (
      <>
        <Lead>
          wplot streams live data at the display&rsquo;s full refresh rate. Drive
          your own animation loop, append samples, and draw — the data scrolls
          sub-pixel smooth with a fixed, jitter-free time axis.
        </Lead>
        <Frame tall>
          <Streaming />
        </Frame>
        <P>
          Two things keep it fast and flat. <code>series.append(…, &#123; max
          &#125;)</code> keeps a bounded ring buffer, so memory never grows no
          matter how long the feed runs. And <code>plot.renderNow()</code> draws
          synchronously inside your <code>requestAnimationFrame</code> loop —
          bypassing the request-coalescing scheduler so you get one draw per
          frame at the panel&rsquo;s real refresh rate.
        </P>
        <Code>{`import { createPlot } from 'wplot'

const plot = createPlot({
  host,
  initialValue: { x: { min: -4.5, max: 0 }, y: { min: -2, max: 2 } },
})
const id = plot.series.add('Feedback',
  { kind: 'series/line', x: [0], y: [0], widthPx: 1.5 },
  { color: [0.38, 0.66, 0.78, 1] })
plot.start()

let t = 0
function frame(now) {
  requestAnimationFrame(frame)
  plot.series.append(id, { x: xs, y: ys, max: 8000 }) // bounded ring buffer
  plot.view.set({ x: { min: t - 4.5, max: t }, y })
  plot.renderNow()                                    // one draw per frame
}
requestAnimationFrame(frame)`}</Code>
      </>
    ),
  },
  {
    id: 'lines',
    label: 'Lines',
    group: 'Charts',
    title: 'Lines',
    body: (
      <>
        <Lead>
          The workhorse. Add as many line series as you like — wplot stores data
          in columnar typed arrays and compacts each pixel column, so millions of
          points stay smooth.
        </Lead>
        <Frame>
          <SignalWall />
        </Frame>
        <Code>{`for (let i = 0; i < channels.length; i++) {
  plot.series.add(\`ch\${i + 1}\`,
    { kind: 'series/line', x, y: channels[i], widthPx: 1.5 },
    { color: palette[i] })
}`}</Code>
        <P>
          Lines render sub-pixel by default. For very dense data, per-pixel-column
          min/max compaction keeps the silhouette exact while drawing only a few
          segments per column — there&rsquo;s nothing to configure.
        </P>
      </>
    ),
  },
  {
    id: 'fills',
    label: 'Fills & bands',
    group: 'Charts',
    title: 'Fills & bands',
    body: (
      <>
        <Lead>
          Fill under a line to a baseline, between two arbitrary curves, stacked,
          or as a confidence band — all from the same two primitives:{' '}
          <code>fill</code>/<code>fillTo</code> on a line, and the{' '}
          <code>series/band</code> kind.
        </Lead>

        <H2>Fill to a baseline</H2>
        <P>Give a line a translucent fill down to a fixed value.</P>
        <Frame>
          <SimpleArea />
        </Frame>
        <Code>{`plot.series.add('Value',
  { kind: 'series/line', x, y, widthPx: 1.5,
    fill: [0.36, 0.8, 0.52, 0.16], fillTo: 0 },
  { color: [0.36, 0.8, 0.52, 1] })`}</Code>

        <H2>Fill between two lines</H2>
        <P>A band series fills the region between an upper and a lower curve.</P>
        <Frame>
          <FillBetween />
        </Frame>
        <Code>{`plot.series.add('between',
  { kind: 'series/band', x, y0: lower, y1: upper, opacity: 0.14 },
  { color: [0.54, 0.52, 1, 1] })
plot.series.add('Upper', { kind: 'series/line', x, y: upper, widthPx: 1.5 }, ...)
plot.series.add('Lower', { kind: 'series/line', x, y: lower, widthPx: 1.5 }, ...)`}</Code>

        <H2>Stacked areas</H2>
        <P>Layer several filled lines for a composition-over-time view.</P>
        <Frame>
          <AreaStack />
        </Frame>

        <H2>Confidence band</H2>
        <P>Nest bands (±1σ, ±2σ) under a mean line for a spread / fan chart.</P>
        <Frame>
          <ReactorSpread />
        </Frame>
      </>
    ),
  },
  {
    id: 'scatter',
    label: 'Scatter',
    group: 'Charts',
    title: 'Scatter',
    body: (
      <>
        <Lead>
          Thousands of points through a batched marker path — round or square,
          with optional per-point color or size.
        </Lead>
        <Frame>
          <ScatterCloud />
        </Frame>
        <Code>{`plot.series.add('Points', {
  kind: 'series/scatter',
  x, y,
  sizePx: 3.4,
  shape: 'circle',
  strokeWidthPx: 0,
}, { color: [0.38, 0.66, 0.78, 0.75] })`}</Code>
        <P>
          Pass <code>colorValues</code> + a <code>colormap</code> to color each
          point by a scalar (a gradient), or <code>sizes</code> to scale them —
          markers are drawn in batched color/size runs so it stays fast.
        </P>
      </>
    ),
  },
  {
    id: 'candles',
    label: 'Candles',
    group: 'Charts',
    title: 'Candlesticks',
    body: (
      <>
        <Lead>
          OHLC candlesticks with up/down colors, built in. Drag to box-zoom,
          shift-drag to pan, wheel to zoom.
        </Lead>
        <Frame>
          <CandlesPlot />
        </Frame>
        <Code>{`plot.series.add('OHLC', {
  kind: 'series/candles',
  x, open, high, low, close,
  width: 0.66,
  upColor: [0.36, 0.8, 0.52, 1],
  downColor: [0.95, 0.42, 0.5, 1],
})`}</Code>
      </>
    ),
  },
  {
    id: 'linked',
    label: 'Linked plots',
    group: 'Features',
    title: 'Linked plots',
    body: (
      <>
        <Lead>
          Share one x-axis and cursor across separate plots with a link group.
          Pan or zoom either plot and the others follow — in the same frame, so
          there&rsquo;s no lag between panels.
        </Lead>
        <Frame tall>
          <LinkedDemo />
        </Frame>
        <Code>{`import { createLinkGroup } from 'wplot'

const group = createLinkGroup()
const link = {
  group,
  axes:  { x: true, y: false }, // share X only
  cursor: { x: true },          // shared crosshair
}

const pressure = createPlot({ host: a, initialValue, link })
const flow     = createPlot({ host: b, initialValue, link })`}</Code>
        <P>
          Choose exactly what links: <code>axes</code> controls which scales are
          shared (X, Y, or both), and <code>cursor</code> mirrors the crosshair.
          Each plot keeps its own Y range here, so the two panels zoom
          independently in the vertical.
        </P>
      </>
    ),
  },
  {
    id: 'annotations',
    label: 'Annotations',
    group: 'Features',
    title: 'Annotations',
    body: (
      <>
        <Lead>
          Mark up a plot with guides, regions, and tags. Annotations live in their
          own object layer — they project with the data and can be made
          draggable.
        </Lead>
        <Frame>
          <AnnotationsDemo />
        </Frame>
        <Code>{`import { annotations, xBand, hLine, vLine, tag } from 'wplot/extensions'

const plot = createPlot({ host, initialValue, plugins: [annotations()] })
plot.objects.add(xBand(300, 520, { label: 'window' }))   // shaded region
plot.objects.add(hLine(78, { label: 'threshold' }))      // horizontal guide
plot.objects.add(vLine(700, { label: 'event' }))         // vertical guide
plot.objects.add(tag(x, y, 'tag'))                       // point label`}</Code>
        <P>
          Opt in with the <code>annotations()</code> plugin from{' '}
          <code>wplot/extensions</code>. The full set: <code>hLine</code> /{' '}
          <code>vLine</code> guides, <code>xBand</code> / <code>yBand</code>{' '}
          regions, <code>rect</code>, <code>segment</code>, and <code>tag</code>.
          Each <code>plot.objects.add</code> returns an id you can{' '}
          <code>updateState</code>, <code>setVisible</code>, <code>setLocked</code>{' '}
          or <code>remove</code> — and a live readout (a value pinned to the axis)
          is just an h-line you move each frame.
        </P>
      </>
    ),
  },
  {
    id: 'log',
    label: 'Log scale',
    group: 'Features',
    title: 'Log scale',
    body: (
      <>
        <Lead>
          Plot across orders of magnitude — spectra, latencies, anything with a
          wide dynamic range — with decade gridlines and the characteristic
          compressed minor ticks.
        </Lead>
        <Frame>
          <LogScale />
        </Frame>
        <Code>{`const plot = createPlot({
  host,
  initialValue: { x: { min: 0, max: 700 }, y: { min: 0, max: 5 } },
  config: { axisMode: { y: { formatter: ({ value }) => decade(value) } } },
})
// minor decade lines via a full-width infinite-lines series
plot.series.add('grid', {
  kind: 'series/infinite-lines', y: minorTicks, color: [1, 1, 1, 0.045],
})`}</Code>
      </>
    ),
  },
  {
    id: 'themes',
    label: 'Themes',
    group: 'Features',
    title: 'Themes',
    body: (
      <>
        <Lead>
          Everything is themeable from the config — no CSS to fight. Background,
          grid, crosshair, axis text and every series color are yours to set, so a
          plot drops cleanly into any product&rsquo;s look.
        </Lead>
        <H2>A custom theme</H2>
        <P>Set the surface, grid and crosshair colors, and pick your palette.</P>
        <Frame>
          <ThemeAccent />
        </Frame>
        <Code>{`config: {
  background: [0.05, 0.04, 0.03, 1],       // warm surface + gutters
  gridColor: [0.96, 0.74, 0.18, 0.1],      // amber grid
  crosshairColor: [0.96, 0.74, 0.18, 0.5],
  axisTextColor: [0.96, 0.74, 0.18, 0.7],  // axis labels
  axisLineColor: [0.96, 0.74, 0.18, 0.25], // axis + tick lines
}
plot.series.add('A', { kind: 'series/line', x, y }, { color: [0.96, 0.74, 0.18, 1] })`}</Code>

        <H2>Custom axis labels</H2>
        <P>
          Format ticks however you like with a formatter — currency, units, dates,
          log decades. The same hook drives the value-chip on guides.
        </P>
        <Frame>
          <CustomAxis />
        </Frame>
        <Code>{`config: {
  axisMode: {
    y: { formatter: ({ value }) => \`$\${(value / 1000).toFixed(1)}k\` },
  },
}`}</Code>
      </>
    ),
  },
  {
    id: 'units',
    label: 'Units',
    group: 'Features',
    title: 'Units',
    body: (
      <>
        <Lead>
          Real measurements have units. Format tick labels (and the live
          value-chips) with a formatter, or use the built-in engineering /
          scientific notation for automatic SI scaling.
        </Lead>
        <Frame>
          <UnitsDemo />
        </Frame>
        <Code>{`// custom unit formatter (SI bytes)
config: {
  axisMode: {
    y: { formatter: ({ value }) =>
      value >= 1e6 ? \`\${(value / 1e6).toFixed(1)} MB\`
      : value >= 1e3 ? \`\${Math.round(value / 1e3)} KB\`
      : \`\${value} B\` },
  },
}

// or built-in SI scaling, no formatter needed:
config: { axisMode: { y: { notation: 'engineering' } } }   // 1.2k, 3.4M, …`}</Code>
        <P>
          The <code>formatter</code> receives the tick <code>value</code> and its{' '}
          <code>step</code>, so you can vary precision by zoom. It&rsquo;s the same
          hook used by guide value-chips, so units stay consistent everywhere.
        </P>
      </>
    ),
  },
  {
    id: 'more',
    label: 'More',
    group: 'Features',
    title: 'More',
    body: (
      <>
        <Lead>
          A grab-bag of the rest — everything below is built in, no plugin needed.
        </Lead>
        <H2>Multiple Y axes</H2>
        <P>
          Add secondary y-axes (left or right) and bind a series to one with{' '}
          <code>yAxisId</code> — two scales, one shared x.
        </P>
        <Frame>
          <DualAxis />
        </Frame>
        <Code>{`config: { yAxes: [{ id: 'flow', side: 'right', min: 4, max: 22 }] }

plot.series.add('Temp', { kind: 'series/line', x, y: temp })
plot.series.add('Flow', { kind: 'series/line', x, y: flow }, { yAxisId: 'flow' })`}</Code>
        <H2>Box-zoom &amp; select</H2>
        <P>
          Shift-drag a rectangle to zoom into it; double-click to reset. Dragging
          on an axis gutter zooms just that axis, and the box can be constrained to
          an x- or y-range with one call.
        </P>
        <Frame>
          <ZoomDemo axis="xy" />
        </Frame>
        <Code>{`// shift-drag = box zoom (full rectangle, default)
plot.interaction.setZoomType('x')  // constrain the box to an x-range
plot.interaction.setZoomType('y')  // constrain to a y-range
// + drag an axis gutter to zoom that axis; wheel zoom is axis-locked with modifiers`}</Code>

        <H2>More series & interactions</H2>
        <P>
          Also built in: <code>series/step</code> (staircases),{' '}
          <code>series/bars</code> (with a <code>y0</code> baseline),{' '}
          <code>series/infinite-lines</code> (full-extent guides at given x/y), and
          time axes. Interactions include wheel zoom (axis-locked with modifiers),
          shift-drag box-zoom, drag-to-pan, and hover with a nearest-point cursor
          marker.
        </P>
      </>
    ),
  },
  {
    id: 'plugins',
    label: 'Plugins & extensions',
    group: 'Plugins',
    title: 'Plugins & extensions',
    body: (
      <>
        <Lead>
          The core stays lean; everything else is opt-in. A <code>Plugin</code> is
          just an object with a <code>name</code> and a <code>setup(plot)</code>{' '}
          that wires things up and returns an optional cleanup. Pass plugins at
          creation time.
        </Lead>
        <H2>Overlays — draw your own</H2>
        <P>
          <code>plot.onDraw</code> hands you the overlay canvas and a per-frame
          projection every frame — build tooltips, legends, crosshair readouts,
          whatever you like, perfectly pixel-aligned with the data.
        </P>
        <Code>{`import type { Plugin } from 'wplot'

const crosshair: Plugin = {
  name: 'crosshair-readout',
  setup(plot) {
    return plot.onDraw((frame) => {
      const { ctx, view, bounds } = frame
      ctx.fillStyle = 'rgba(255,255,255,0.6)'
      ctx.fillText(view.x.max.toFixed(1), bounds.origin.x + 8, 16)
    })
  },
}

const plot = createPlot({ host, initialValue, plugins: [crosshair] })`}</Code>
        <H2>Custom series & objects</H2>
        <P>
          Register new data kinds with <code>plot.registerSeries</code> /{' '}
          <code>plot.registerObject</code> — you supply how the data is stored and
          turned into draw primitives, and it behaves like any built-in kind.
        </P>
        <H2>Render layers — GPU & rasters</H2>
        <P>
          <code>plot.addLayer</code> stacks an extra canvas behind the series with
          its own context (WebGL/WebGPU or 2D) and the same per-frame transform.
          That seam is exactly how the heatmap extension paints a pixel-perfect
          raster under your plots.
        </P>
      </>
    ),
  },
  {
    id: 'api',
    label: 'API & types',
    group: 'Reference',
    title: 'API & types',
    body: (
      <>
        <Lead>
          The public surface is intentionally small: create a plot, add data,
          read state, subscribe to interaction, and opt into plugins or custom
          adapters when you need more.
        </Lead>
        <H2>Create</H2>
        <Code>{`import { createPlot, type PlotInit } from 'wplot'

type PlotInit = {
  host: HTMLElement
  initialValue: { x: Range; y: Range }
  config?: PlotConfigUpdate
  link?: { group: LinkGroup } & LinkOptions
  plugins?: readonly Plugin[]
}

const plot = createPlot({ host, initialValue, plugins })`}</Code>
        <H2>Plot instance</H2>
        <Code>{`plot.series.add(name, input, style?)
plot.series.append(id, { x, y, max })
plot.series.setData(id, input)
plot.series.list()

plot.view.get()
plot.view.set({ x, y })
plot.cursor.get()
plot.coords.valueToPx(x, y)
plot.coords.pxToValue(px, py)

plot.subscribe('cursor', event => {})
plot.onDraw(frame => {})
plot.addLayer(layer)
plot.use(plugin)
plot.dispose()`}</Code>
        <H2>Series inputs</H2>
        <Code>{`type SeriesInput =
  | { kind: 'series/line'; x; y; widthPx?; fill?; fillTo? }
  | { kind: 'series/band'; x; y0; y1; opacity? }
  | { kind: 'series/scatter'; x; y; sizePx?; shape? }
  | { kind: 'series/candles'; x; open; high; low; close }
  | { kind: 'series/bars'; x; y; y0? }
  | { kind: 'series/step'; x; y }
  | { kind: 'series/infinite-lines'; x?; y? }
  | ({ kind: string } & Record<string, unknown>) // plugin series`}</Code>
        <H2>Plugins</H2>
        <Code>{`import type { Plugin } from 'wplot'

type Plugin = {
  readonly name: string
  setup(plot: Plot): void | (() => void)
}

const plugin: Plugin = {
  name: 'readout',
  setup(plot) {
    const off = plot.subscribe('cursor', event => {
      console.log(event.formatted?.x)
    })
    return off
  },
}`}</Code>
      </>
    ),
  },
  {
    id: 'heatmap',
    label: 'Heatmap',
    group: 'Plugins',
    title: 'Heatmap',
    body: (
      <>
        <Lead>
          A WebGPU-accelerated density raster, opt-in from the{' '}
          <code>wplot/extensions</code> entry — pixel-perfect under pan and zoom,
          with a Canvas-2D fallback when WebGPU isn&rsquo;t available.
        </Lead>
        <Frame tall>
          <Heatmap />
        </Frame>
        <Code>{`import { createPlot } from 'wplot'
import { heatmap } from 'wplot/extensions'

const plot = createPlot({ host, initialValue, plugins: [heatmap()] })

plot.series.add('Density', {
  kind: 'heatmap',
  cols, rows, values,
  colormap: 'viridis',
  sampling: 'nearest',
})`}</Code>
      </>
    ),
  },
]
