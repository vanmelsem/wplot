import type { PlotDomainModel } from "../domain/model";
import type { RgbaColor } from "../domain/series";
import type { SceneFrame } from "./frame";
import { type ScenePickingIndex, type SeriesLegendRow } from "./contracts";
import { ObjectSceneRegistry, SeriesSceneRegistry } from "./registry";
export type BuildSceneArgs = {
    dpr: number;
    plotWidthPx: number;
    plotHeightPx: number;
    selectedObjectId?: number | null;
    xAxisHeightPx?: number;
    yAxisWidthPx?: number;
    xAxisSide?: "top" | "bottom";
    yAxisSide?: "left" | "right";
    background?: RgbaColor;
    formatXValue?: (value: number) => string;
    formatYValue?: (value: number) => string;
};
export type BuiltScene = {
    frame: SceneFrame;
    picking: ScenePickingIndex;
    legend: readonly SeriesLegendRow[];
};
export declare class SceneFrameBuilder {
    constructor(args: {
        seriesRegistry: SeriesSceneRegistry;
        objectRegistry: ObjectSceneRegistry;
    });
    readonly seriesRegistry: SeriesSceneRegistry;
    readonly objectRegistry: ObjectSceneRegistry;
    build(model: PlotDomainModel, args: BuildSceneArgs): BuiltScene;
}
