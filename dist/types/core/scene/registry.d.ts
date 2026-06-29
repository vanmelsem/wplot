import { Registry } from "../shared/registry";
import type { ObjectSceneAdapter, SeriesSceneAdapter } from "./contracts";
export declare class SeriesSceneRegistry extends Registry<SeriesSceneAdapter<any>> {
    constructor();
}
export declare class ObjectSceneRegistry extends Registry<ObjectSceneAdapter<any>> {
    constructor();
}
