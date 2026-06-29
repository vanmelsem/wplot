import { ObjectSceneRegistry, SeriesSceneRegistry } from "./registry";
import {
  BandSeriesSceneAdapter,
  BarsSeriesSceneAdapter,
  CandlesSeriesSceneAdapter,
  InfiniteLinesSeriesSceneAdapter,
  LineSeriesSceneAdapter,
  ScatterSeriesSceneAdapter,
  StepSeriesSceneAdapter,
} from "./series_adapters";

export function registerBuiltInSeriesScenes(
  registry: SeriesSceneRegistry,
): void {
  registry.register(LineSeriesSceneAdapter);
  registry.register(StepSeriesSceneAdapter);
  registry.register(ScatterSeriesSceneAdapter);
  registry.register(BandSeriesSceneAdapter);
  registry.register(BarsSeriesSceneAdapter);
  registry.register(CandlesSeriesSceneAdapter);
  registry.register(InfiniteLinesSeriesSceneAdapter);
}

export function createBuiltInSeriesSceneRegistry(): SeriesSceneRegistry {
  const registry = new SeriesSceneRegistry();
  registerBuiltInSeriesScenes(registry);
  return registry;
}

// Core ships zero default object scene adapters; see domain/built_ins.ts.
export function createBuiltInObjectSceneRegistry(): ObjectSceneRegistry {
  return new ObjectSceneRegistry();
}
