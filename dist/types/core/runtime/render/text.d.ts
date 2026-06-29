import type { DrawList } from "../../render/contracts";
export declare const PLOT_TEXT_FONT = "12px IBM Plex Sans, system-ui, sans-serif";
type TextLayer = "static" | "overlay";
export declare class TextRenderer {
    private readonly canvas;
    private readonly layer;
    private ctx;
    constructor(canvas: HTMLCanvasElement, layer?: TextLayer);
    render(drawList: DrawList): void;
}
export {};
