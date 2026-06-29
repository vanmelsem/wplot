export type Rgba = readonly [r: number, g: number, b: number, a: number];
/** Maps a normalized scalar `t` (clamped to [0, 1]) to an opaque rgba byte tuple. */
export type Colormap = (t: number) => Rgba;
/** The default colormap: viridis. `t` outside [0, 1] is clamped. */
export declare const viridis: Colormap;
/** Simple perceptual grayscale ramp (handy fallback / for tests). */
export declare const grayscale: Colormap;
/**
 * Bake a colormap into a flat rgba8 LUT of `size` entries (length `size * 4`),
 * sampled at the bin centers. Used to upload the colormap as a 1D texture on the
 * WebGPU path.
 */
export declare function buildColormapLut(colormap: Colormap, size?: number): Uint8Array<ArrayBuffer>;
