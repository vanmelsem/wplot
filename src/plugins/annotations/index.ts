// Editable annotations as an opt-in plugin. Core ships the generic editable-
// object ENGINE (model + scene + picking + interaction); this plugin supplies
// the seven concrete KINDS — guide lines, bands, rect, segment, tag — and
// registers them through the public `plot.registerObject` seam.
//
//   import { annotations, hLine } from "wplot/extensions";
//
//   const plot = createPlot({ host, initialValue, plugins: [annotations()] });
//   plot.objects.add(hLine(80, { label: "threshold" }));

import type { Plugin } from "../../lib/plugin";
import type { ObjectExtension } from "../../core/api/extension";
import type { ObjectModelRegistry } from "../../core/domain/objects";
import type { ObjectSceneRegistry } from "../../core/scene/registry";
import {
  GuideHObjectModelAdapter,
  GuideVObjectModelAdapter,
  RectObjectModelAdapter,
  SegmentObjectModelAdapter,
  TagObjectModelAdapter,
  XBandObjectModelAdapter,
  YBandObjectModelAdapter,
} from "./model";
import {
  GuideHObjectSceneAdapter,
  GuideVObjectSceneAdapter,
  RectObjectSceneAdapter,
  SegmentObjectSceneAdapter,
  TagObjectSceneAdapter,
  XBandObjectSceneAdapter,
  YBandObjectSceneAdapter,
} from "./scene";

const ANNOTATION_OBJECTS: readonly ObjectExtension[] = [
  { model: GuideHObjectModelAdapter, scene: GuideHObjectSceneAdapter },
  { model: GuideVObjectModelAdapter, scene: GuideVObjectSceneAdapter },
  { model: RectObjectModelAdapter, scene: RectObjectSceneAdapter },
  { model: XBandObjectModelAdapter, scene: XBandObjectSceneAdapter },
  { model: YBandObjectModelAdapter, scene: YBandObjectSceneAdapter },
  { model: SegmentObjectModelAdapter, scene: SegmentObjectSceneAdapter },
  { model: TagObjectModelAdapter, scene: TagObjectSceneAdapter },
];

/**
 * The seven annotation kinds as paired model+scene extensions. Exposed for
 * direct registration in tests / advanced embeddings; most callers use the
 * {@link annotations} plugin.
 */
export const annotationObjectExtensions: readonly ObjectExtension[] =
  ANNOTATION_OBJECTS;

/** Register all seven editable annotation kinds on the plot. */
export function annotations(): Plugin {
  return {
    name: "annotations",
    setup(plot) {
      for (const ext of ANNOTATION_OBJECTS) plot.registerObject(ext);
    },
  };
}

/** Register all annotation kinds against anything exposing `registerObject`. */
export function registerAnnotationObjects(target: {
  registerObject(ext: ObjectExtension): void;
}): void {
  for (const ext of ANNOTATION_OBJECTS) target.registerObject(ext);
}

/** Register the annotation model adapters directly into a core registry (tests). */
export function registerAnnotationObjectModels(
  registry: ObjectModelRegistry,
): void {
  for (const ext of ANNOTATION_OBJECTS) registry.register(ext.model);
}

/** Register the annotation scene adapters directly into a core registry (tests). */
export function registerAnnotationObjectScenes(
  registry: ObjectSceneRegistry,
): void {
  for (const ext of ANNOTATION_OBJECTS) registry.register(ext.scene);
}

export { AnnotationObjectKinds, type AnnotationObjectKind } from "./kinds";

export {
  hLine,
  vLine,
  xBand,
  yBand,
  rect,
  segment,
  tag,
  type GuideOptions,
  type BandOptions,
  type RectOptions,
  type SegmentOptions,
  type TagOptions,
} from "./builders";

export type {
  GuideHObjectInput,
  GuideVObjectInput,
  RectObjectInput,
  XBandObjectInput,
  YBandObjectInput,
  SegmentObjectInput,
  TagObjectInput,
  GuideHObjectState,
  GuideVObjectState,
  RectObjectState,
  XBandObjectState,
  YBandObjectState,
  SegmentObjectState,
  TagObjectState,
} from "./model";
