export type CanvasSize = {
    /** CSS pixels. */
    cssW: number;
    cssH: number;
    /** Device (backing-store) pixels. */
    deviceW: number;
    deviceH: number;
};
/**
 * Ensure the canvas backing store matches CSS size x dpr, resizing only when it
 * changed (resizing clears the canvas, so avoid doing it every frame). Returns
 * both the CSS and device dimensions.
 */
export declare function ensureBackingSize(canvas: HTMLCanvasElement, dpr: number): CanvasSize;
