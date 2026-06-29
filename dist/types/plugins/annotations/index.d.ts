import type { Plugin } from "../../lib/plugin";
import type { ObjectExtension } from "../../core/api/extension";
import type { ObjectModelRegistry } from "../../core/domain/objects";
import type { ObjectSceneRegistry } from "../../core/scene/registry";
/**
 * The seven annotation kinds as paired model+scene extensions. Exposed for
 * direct registration in tests / advanced embeddings; most callers use the
 * {@link annotations} plugin.
 */
export declare const annotationObjectExtensions: readonly ObjectExtension[];
/** Register all seven editable annotation kinds on the plot. */
export declare function annotations(): Plugin;
/** Register all annotation kinds against anything exposing `registerObject`. */
export declare function registerAnnotationObjects(target: {
    registerObject(ext: ObjectExtension): void;
}): void;
/** Register the annotation model adapters directly into a core registry (tests). */
export declare function registerAnnotationObjectModels(registry: ObjectModelRegistry): void;
/** Register the annotation scene adapters directly into a core registry (tests). */
export declare function registerAnnotationObjectScenes(registry: ObjectSceneRegistry): void;
export { AnnotationObjectKinds, type AnnotationObjectKind } from "./kinds";
export { hLine, vLine, xBand, yBand, rect, segment, tag, type GuideOptions, type BandOptions, type RectOptions, type SegmentOptions, type TagOptions, } from "./builders";
export type { GuideHObjectInput, GuideVObjectInput, RectObjectInput, XBandObjectInput, YBandObjectInput, SegmentObjectInput, TagObjectInput, GuideHObjectState, GuideVObjectState, RectObjectState, XBandObjectState, YBandObjectState, SegmentObjectState, TagObjectState, } from "./model";
