import { Registry } from "../shared/registry";
import type { ObjectSceneAdapter, SeriesSceneAdapter } from "./contracts";

export class SeriesSceneRegistry extends Registry<SeriesSceneAdapter<any>> {
  constructor() {
    super("series scene adapter");
  }
}

export class ObjectSceneRegistry extends Registry<ObjectSceneAdapter<any>> {
  constructor() {
    super("object scene adapter");
  }
}
