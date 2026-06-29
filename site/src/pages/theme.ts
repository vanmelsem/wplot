import type { PlotConfigUpdate, RgbaColor } from 'wplot'

/* ----------------------------------------------------------------- colors */

// #060606 (`--canvas`) as normalised RGBA. EVERY plot background — plot area and
// axis gutters — uses this so the canvas blends seamlessly into the page, which
// is also #060606. Cards are delineated with borders/shadows, never a fill.
export const CANVAS: RgbaColor = [0.023529, 0.023529, 0.023529, 1]

/** Transparent plot-area fill, used by the heatmap so its backdrop layer shows. */
export const TRANSPARENT: RgbaColor = [0, 0, 0, 0]

export type Hue =
  | 'violet'
  | 'cyan'
  | 'amber'
  | 'rose'
  | 'green'
  | 'blue'
  | 'gold'

// Series colors: the original demo palette (the page chrome stays shell-dark, but
// the data lines are the lively demo hues, anchored by the shell focus blue).
export const palette: Record<Hue, RgbaColor> = {
  violet: [0.54, 0.52, 1, 1],
  cyan: [0.38, 0.66, 0.78, 1],
  amber: [0.96, 0.74, 0.18, 1],
  rose: [0.95, 0.42, 0.5, 1],
  green: [0.36, 0.8, 0.52, 1],
  blue: [0.3, 0.498, 0.953, 1], // --focus #307ff3
  gold: [0.86, 0.74, 0.12, 1],
}

export const GRAY: RgbaColor = [0.5, 0.5, 0.5, 1]
export const ORANGE: RgbaColor = [0.95, 0.55, 0.15, 1]

export function withAlpha(color: RgbaColor, a: number): RgbaColor {
  return [color[0], color[1], color[2], a]
}

export function solid(color: RgbaColor): RgbaColor {
  return [color[0], color[1], color[2], 1]
}

/** Normalised RGBA tuple -> CSS `rgb(...)`/`rgba(...)` string, for legend swatches. */
export function cssRgba(color: RgbaColor): string {
  const r = Math.round(color[0] * 255)
  const g = Math.round(color[1] * 255)
  const b = Math.round(color[2] * 255)
  return color[3] >= 1 ? `rgb(${r} ${g} ${b})` : `rgba(${r} ${g} ${b} / ${color[3]})`
}

/* ------------------------------------------------------------- plot config */

type PlotConfigOptions = {
  axisMode?: PlotConfigUpdate['axisMode']
  yAxes?: PlotConfigUpdate['yAxes']
  /** Plot-area fill. Defaults to #060606; pass TRANSPARENT for raster layers. */
  background?: RgbaColor
  gridColor?: RgbaColor
  crosshairColor?: RgbaColor
  axisTextColor?: RgbaColor
  axisLineColor?: RgbaColor
  gridSpacing?: [number, number]
  showStats?: boolean
  showCursorSeriesMarker?: boolean
  /** Per-pixel-column path compaction. Off = sub-pixel line (smooth live pan). */
  internalLod?: boolean
  /** Hide axes + gutters for a clean sparkline look. */
  bareAxes?: boolean
  yScaleSide?: 'left' | 'right'
  yScaleMin?: number
  xScaleMin?: number
}

/**
 * A tasteful dark plot theme on #060606: faint grid + frame, subtle crosshair,
 * gutters that match the page so the plot dissolves into its card. Every page
 * builds its config from here so the look stays consistent.
 */
export function plotConfig(opts: PlotConfigOptions = {}): PlotConfigUpdate {
  const bg = opts.background ?? CANVAS
  const bare = opts.bareAxes ?? false
  return {
    gridSpacing: opts.gridSpacing ?? [76, 40],
    gridColor: opts.gridColor ?? [1, 1, 1, bare ? 0 : 0.05],
    crosshairColor: opts.crosshairColor ?? [1, 1, 1, 0.4],
    crosshairDash: [3, 2],
    // No plot-area frame: the layout's own hairline divider is the single line
    // between sections (the frame would double it).
    borderColor: [1, 1, 1, 0],
    background: bg,
    internalLod: opts.internalLod ?? true,
    showStats: opts.showStats ?? false,
    showLegend: false,
    showCrosshair: !bare,
    showCrosshairLabels: false,
    showCursorSeriesMarker: opts.showCursorSeriesMarker ?? !bare,
    showIndicator: false,
    axisMode: opts.axisMode,
    yAxes: opts.yAxes,
    layout: {
      margin: bare
        ? { top: 6, right: 6, bottom: 6, left: 6 }
        : { top: 0, right: 0, bottom: 0, left: 0 },
      xScale: {
        show: !bare,
        side: 'bottom',
        min: opts.xScaleMin ?? 26,
        background: bg,
        lineColor: opts.axisLineColor ?? [1, 1, 1, 0.1],
        textColor: opts.axisTextColor ?? [1, 1, 1, 0.55],
      },
      yScale: {
        show: !bare,
        side: opts.yScaleSide ?? 'left',
        min: opts.yScaleMin ?? 48,
        background: bg,
        lineColor: opts.axisLineColor ?? [1, 1, 1, 0.1],
        textColor: opts.axisTextColor ?? [1, 1, 1, 0.55],
      },
    },
  }
}

/* --------------------------------------------------------- data utilities */

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

/** Seeded LCG — deterministic synthetic data across reloads. */
export function prng(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (Math.imul(state, 1_664_525) + 1_013_904_223) >>> 0
    return state / 0xffff_ffff
  }
}

/** Box–Muller standard normal from a uniform source. */
export function randn(rand: () => number): number {
  let u = 0
  let v = 0
  while (u === 0) u = rand()
  while (v === 0) v = rand()
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
}

export function pulse(
  tSec: number,
  centerSec: number,
  widthSec: number,
  amplitude: number,
): number {
  const dt = (tSec - centerSec) / Math.max(widthSec, 1e-6)
  return amplitude * Math.exp(-dt * dt)
}

export function smoothSamples(
  values: readonly number[],
  alpha: number,
): Float32Array {
  const out = new Float32Array(values.length)
  if (values.length === 0) return out
  let state = values[0] ?? 0
  out[0] = state
  for (let i = 1; i < values.length; i += 1) {
    state += ((values[i] ?? state) - state) * alpha
    out[i] = state
  }
  return out
}
