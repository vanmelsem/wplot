// Self-contained colormaps for the heatmap extension. Kept local on purpose: the
// extension must not reach into core rendering internals, so it carries its own
// tiny value -> rgba mapping. Channels are bytes in [0, 255]; alpha is opaque.

export type Rgba = readonly [r: number, g: number, b: number, a: number];

/** Maps a normalized scalar `t` (clamped to [0, 1]) to an opaque rgba byte tuple. */
export type Colormap = (t: number) => Rgba;

// Viridis anchor stops (perceptually uniform, monotonic in luminance). Sampled
// from the matplotlib `viridis` table; ~20 stops is plenty for an LUT this small.
const VIRIDIS_STOPS: ReadonlyArray<readonly [number, number, number]> = [
  [68, 1, 84],
  [72, 21, 103],
  [72, 38, 119],
  [69, 55, 129],
  [63, 71, 136],
  [57, 86, 140],
  [50, 100, 142],
  [45, 113, 142],
  [40, 125, 142],
  [35, 138, 141],
  [31, 150, 139],
  [32, 163, 134],
  [41, 175, 127],
  [60, 187, 117],
  [86, 198, 103],
  [117, 208, 84],
  [152, 216, 62],
  [190, 223, 38],
  [223, 227, 24],
  [253, 231, 37],
];

function sampleStops(
  stops: ReadonlyArray<readonly [number, number, number]>,
  t: number,
): Rgba {
  const clamped = t <= 0 ? 0 : t >= 1 ? 1 : t;
  const last = stops.length - 1;
  const pos = clamped * last;
  const lo = Math.min(last, Math.floor(pos));
  const hi = Math.min(last, lo + 1);
  const frac = pos - lo;
  const a = stops[lo]!;
  const b = stops[hi]!;
  return [
    Math.round(a[0] + (b[0] - a[0]) * frac),
    Math.round(a[1] + (b[1] - a[1]) * frac),
    Math.round(a[2] + (b[2] - a[2]) * frac),
    255,
  ];
}

/** The default colormap: viridis. `t` outside [0, 1] is clamped. */
export const viridis: Colormap = (t) => sampleStops(VIRIDIS_STOPS, t);

/** Simple perceptual grayscale ramp (handy fallback / for tests). */
export const grayscale: Colormap = (t) => {
  const v = Math.round((t <= 0 ? 0 : t >= 1 ? 1 : t) * 255);
  return [v, v, v, 255];
};

/**
 * Bake a colormap into a flat rgba8 LUT of `size` entries (length `size * 4`),
 * sampled at the bin centers. Used to upload the colormap as a 1D texture on the
 * WebGPU path.
 */
export function buildColormapLut(
  colormap: Colormap,
  size = 256,
): Uint8Array<ArrayBuffer> {
  const out = new Uint8Array(size * 4);
  const denom = size > 1 ? size - 1 : 1;
  for (let i = 0; i < size; i += 1) {
    const [r, g, b, a] = colormap(i / denom);
    const o = i * 4;
    out[o] = r;
    out[o + 1] = g;
    out[o + 2] = b;
    out[o + 3] = a;
  }
  return out;
}
