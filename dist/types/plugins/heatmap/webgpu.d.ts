import type { Layer } from "../../core/runtime/dom_runtime";
import type { HeatmapData } from "./types";
/** True when the host exposes the WebGPU entry point. */
export declare function isWebgpuAvailable(): boolean;
export declare function createWebgpuHeatmapLayer(data: HeatmapData, onReady?: () => void): Layer;
