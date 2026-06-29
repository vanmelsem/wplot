import { InfiniteLinesSeriesModelAdapter } from "./infinite_lines_series";
import { ObjectModelRegistry } from "./objects";
import {
  BandSeriesModelAdapter,
  BarsSeriesModelAdapter,
  CandlesSeriesModelAdapter,
} from "./range_series";
import { SeriesModelRegistry } from "./series";
import {
  LineSeriesModelAdapter,
  ScatterSeriesModelAdapter,
  StepSeriesModelAdapter,
} from "./time_value_series";

export function registerBuiltInSeriesModels(
  registry: SeriesModelRegistry,
): void {
  registry.register(LineSeriesModelAdapter);
  registry.register(StepSeriesModelAdapter);
  registry.register(ScatterSeriesModelAdapter);
  registry.register(BandSeriesModelAdapter);
  registry.register(BarsSeriesModelAdapter);
  registry.register(CandlesSeriesModelAdapter);
  registry.register(InfiniteLinesSeriesModelAdapter);
}

export function createBuiltInSeriesModelRegistry(): SeriesModelRegistry {
  const registry = new SeriesModelRegistry();
  registerBuiltInSeriesModels(registry);
  return registry;
}

// Core ships zero default object kinds — annotation kinds are an opt-in plugin
// (`wplot/extensions`), registered via `plot.registerObject`. The registry is
// created empty and tolerates an empty object set.
export function createBuiltInObjectModelRegistry(): ObjectModelRegistry {
  return new ObjectModelRegistry();
}
