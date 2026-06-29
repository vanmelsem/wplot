import type { RgbaColor } from "../domain/series";

/**
 * A tiny perceptual-colormap helper. Each colormap is defined by a small set of
 * evenly spaced RGB control points (0..1) that are linearly interpolated. This
 * is not a pixel-exact reproduction of matplotlib's maps, but it is a faithful
 * visual approximation good enough for shading datapoints by value.
 */
export type ColormapName = "viridis" | "magma" | "plasma";

type Rgb = readonly [number, number, number];

// Evenly spaced anchor colors (t = 0, 0.25, 0.5, 0.75, 1).
const STOPS: Record<ColormapName, readonly Rgb[]> = {
  viridis: [
    [0.267, 0.005, 0.329],
    [0.231, 0.318, 0.545],
    [0.128, 0.567, 0.551],
    [0.369, 0.789, 0.383],
    [0.993, 0.906, 0.144],
  ],
  magma: [
    [0.001, 0.0, 0.014],
    [0.232, 0.059, 0.438],
    [0.55, 0.161, 0.506],
    [0.868, 0.288, 0.409],
    [0.987, 0.991, 0.749],
  ],
  plasma: [
    [0.05, 0.03, 0.528],
    [0.417, 0.0, 0.658],
    [0.692, 0.165, 0.564],
    [0.881, 0.392, 0.383],
    [0.94, 0.975, 0.131],
  ],
};

const clamp01 = (v: number): number => (v < 0 ? 0 : v > 1 ? 1 : v);

function sampleStops(stops: readonly Rgb[], t01: number): RgbaColor {
  const t = clamp01(t01);
  const last = stops.length - 1;
  if (last <= 0) {
    const only = stops[0] ?? ([0, 0, 0] as const);
    return [only[0], only[1], only[2], 1];
  }
  const scaled = t * last;
  const i = Math.min(last - 1, Math.floor(scaled));
  const frac = scaled - i;
  const a = stops[i]!;
  const b = stops[i + 1]!;
  return [
    a[0] + (b[0] - a[0]) * frac,
    a[1] + (b[1] - a[1]) * frac,
    a[2] + (b[2] - a[2]) * frac,
    1,
  ];
}

/**
 * Returns a sampler `t01 -> RgbaColor` for the named colormap. `t01` is clamped
 * to [0, 1]. Unknown names fall back to viridis.
 */
export function colormap(name: ColormapName): (t01: number) => RgbaColor {
  const stops = STOPS[name] ?? STOPS.viridis;
  return (t01: number) => sampleStops(stops, t01);
}

/**
 * Maps each value to a color by normalizing it into [0, 1] across [min, max].
 * A zero-width range maps everything to the colormap's low end.
 */
export function colorsFromValues(
  values: readonly number[],
  min: number,
  max: number,
  name: ColormapName,
): RgbaColor[] {
  const sampler = colormap(name);
  const span = max - min || 1;
  const out: RgbaColor[] = new Array(values.length);
  for (let i = 0; i < values.length; i += 1) {
    out[i] = sampler(((values[i] ?? min) - min) / span);
  }
  return out;
}
