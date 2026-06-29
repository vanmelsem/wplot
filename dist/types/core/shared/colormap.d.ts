import type { RgbaColor } from "../domain/series";
/**
 * A tiny perceptual-colormap helper. Each colormap is defined by a small set of
 * evenly spaced RGB control points (0..1) that are linearly interpolated. This
 * is not a pixel-exact reproduction of matplotlib's maps, but it is a faithful
 * visual approximation good enough for shading datapoints by value.
 */
export type ColormapName = "viridis" | "magma" | "plasma";
/**
 * Returns a sampler `t01 -> RgbaColor` for the named colormap. `t01` is clamped
 * to [0, 1]. Unknown names fall back to viridis.
 */
export declare function colormap(name: ColormapName): (t01: number) => RgbaColor;
/**
 * Maps each value to a color by normalizing it into [0, 1] across [min, max].
 * A zero-width range maps everything to the colormap's low end.
 */
export declare function colorsFromValues(values: readonly number[], min: number, max: number, name: ColormapName): RgbaColor[];
