import type { DrawList } from "../../render/contracts";
export declare class CanvasRenderer {
    private canvas;
    private ctx;
    constructor(canvas: HTMLCanvasElement);
    render(drawList: DrawList): void;
    private drawPath;
    private drawRects;
    private drawMarkers;
    private drawArea;
    private drawMesh;
}
