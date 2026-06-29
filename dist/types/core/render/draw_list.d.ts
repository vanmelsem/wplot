import type { DrawList, MeasureTextFn } from "./contracts";
import type { InteractionController } from "../interaction/controller";
import { PlotController } from "../api/controller";
import { type RenderLayout } from "./layout";
import type { BuiltScene } from "../scene/builder";
export type BuildDrawListArgs = {
    controller: PlotController;
    widthPx: number;
    heightPx: number;
    dpr: number;
    selectedObjectId?: number | null;
    measureText?: MeasureTextFn;
};
type DecorateDrawListArgs = {
    controller: PlotController;
    interaction?: InteractionController;
    measureText?: MeasureTextFn;
};
export type DrawListBuildState = {
    drawList: DrawList;
    layout: RenderLayout;
    builtScene: BuiltScene;
};
export declare class DrawListBuilder {
    private readonly scratch;
    build(args: BuildDrawListArgs): DrawList;
    buildState(args: BuildDrawListArgs): DrawListBuildState;
    decorateWithInteraction(drawList: DrawList, args: DecorateDrawListArgs): DrawList;
}
export {};
