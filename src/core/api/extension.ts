import type { ObjectModelAdapter } from "../domain/objects";
import type { SeriesModelAdapter } from "../domain/series";
import type { ObjectSceneAdapter, SeriesSceneAdapter } from "../scene/contracts";

/**
 * A custom series, as a single registrable unit. A series needs a model adapter
 * (storage / append / read semantics) and a scene adapter (geometry, picking).
 * Both must declare the same `kind`.
 */
export type SeriesExtension<
  TInput = any,
  TState = any,
  TDatum = any,
  TAppend = TInput,
> = {
  readonly model: SeriesModelAdapter<TInput, TState, TDatum, TAppend>;
  readonly scene: SeriesSceneAdapter<TState>;
};

/** A custom annotation object, paired model + scene adapters with the same `kind`. */
export type ObjectExtension<TInput = any, TState = any, TPatch = any> = {
  readonly model: ObjectModelAdapter<TInput, TState, TPatch>;
  readonly scene: ObjectSceneAdapter<TState>;
};
