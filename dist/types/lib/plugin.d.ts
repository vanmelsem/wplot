import type { Plot } from "./plot";
/**
 * A plugin is set up once against a {@link Plot} instance. `setup` may subscribe
 * to events, register an overlay painter via {@link Plot.onDraw}, register custom
 * series/objects via {@link Plot.registerSeries} / {@link Plot.registerObject},
 * or drive the public API. Return a teardown function to release resources; it is
 * invoked on {@link Plot.dispose}.
 *
 * @example
 * ```ts
 * const crosshairReadout: Plugin = {
 *   name: "crosshair-readout",
 *   setup(plot) {
 *     return plot.onDraw(({ ctx, bounds }) => {
 *       const c = plot.cursor.get();
 *       if (!c.inside || !c.px) return;
 *       ctx.fillStyle = "rgba(255,255,255,0.9)";
 *       ctx.fillRect(c.px.x, bounds.origin.y, 1, bounds.size.height);
 *     });
 *   },
 * };
 * ```
 */
export type Plugin = {
    readonly name: string;
    setup(plot: Plot): void | (() => void);
};
export type { SeriesExtension, ObjectExtension } from "../core/api/extension";
export type { OverlayFrame, OverlayPainter, } from "../core/runtime/dom_runtime";
export type { SeriesModelAdapter, SeriesNormalizeContext, SeriesRecord, SeriesStyle, RgbaColor, } from "../core/domain/series";
export type { ObjectModelAdapter, ObjectRecord as ObjectModelRecord, ObjectHandle, ObjectEdit, } from "../core/domain/objects";
export type { SeriesSceneAdapter, ObjectSceneAdapter, SceneBuildContext, SceneFragment, PickingEntry, PickingHit, } from "../core/scene/contracts";
export type { ScenePrimitive, ScenePath, SceneRect, SceneMarker, SceneArea, SceneText, SceneOrigin, } from "../core/scene/frame";
export type { NumericRange, ViewState } from "../core/domain/view";
