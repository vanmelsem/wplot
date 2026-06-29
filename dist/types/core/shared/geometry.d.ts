export type Point<T> = {
    x: T;
    y: T;
};
export type Size<T> = {
    width: T;
    height: T;
};
export type Bounds<T> = {
    origin: Point<T>;
    size: Size<T>;
};
export type Edges<T> = {
    top: T;
    right: T;
    bottom: T;
    left: T;
};
export type Corners<T> = {
    topLeft: T;
    topRight: T;
    bottomRight: T;
    bottomLeft: T;
};
export type Color = readonly [r: number, g: number, b: number, a: number];
export type Px = number;
export declare function applyDpr(px: Px, dpr: number): number;
