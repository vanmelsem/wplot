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
