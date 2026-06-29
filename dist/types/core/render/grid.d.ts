import { Scratch, type MeasureTextFn, type Primitive, type TextEntry } from "./contracts";
import { type PlotConfig } from "../domain/config";
import type { ViewValue } from "../domain/view";
import type { AxisLabelMetrics, RenderLayout } from "./layout";
export declare function measureGridAxisMetrics(args: {
    config: PlotConfig;
    layout: RenderLayout;
    view: ViewValue;
    measureText?: MeasureTextFn;
    axisMetrics: {
        x: AxisLabelMetrics;
        y: AxisLabelMetrics;
    };
}): void;
export declare function buildGrid(args: {
    config: PlotConfig;
    layout: RenderLayout;
    view: ViewValue;
    out: Primitive[];
    text: TextEntry[];
    scratch: Scratch;
    measureText?: MeasureTextFn;
    axisMetrics?: {
        x: AxisLabelMetrics;
        y: AxisLabelMetrics;
    };
    axisOffset?: {
        x: number;
        y: number;
    };
}): void;
