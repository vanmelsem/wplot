import type { PickingHit, ScenePickingIndex } from "./contracts";
export declare function pickScene(index: ScenePickingIndex, wx: number, wy: number, tolx: number, toly: number, focusedObjectId?: number | null): PickingHit | null;
