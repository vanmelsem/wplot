export type Point<T> = { x: T; y: T };
export type Size<T> = { width: T; height: T };
export type Bounds<T> = { origin: Point<T>; size: Size<T> };
export type Edges<T> = { top: T; right: T; bottom: T; left: T };
export type Corners<T> = {
  topLeft: T;
  topRight: T;
  bottomRight: T;
  bottomLeft: T;
};

export type Color = readonly [r: number, g: number, b: number, a: number];

// Px is CSS/canvas pixels. The renderers apply DPR when targeting device pixels.
export type Px = number;

export function applyDpr(px: Px, dpr: number): number {
  return px * dpr;
}
