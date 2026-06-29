import { describe, expect, it } from "vitest";

import {
  createBuiltInObjectModelRegistry as createCoreObjectModelRegistry,
  createBuiltInSeriesModelRegistry,
} from "../src/core/domain/built_ins";
import { registerAnnotationObjectModels } from "../src/plugins/annotations";
function createBuiltInObjectModelRegistry() {
  const r = createCoreObjectModelRegistry();
  registerAnnotationObjectModels(r);
  return r;
}
import { AnnotationObjectKinds as BuiltInObjectKinds } from "../src/plugins/annotations";
import { BuiltInSeriesKinds } from "../src/core/domain/series";

describe("core built-in registries", () => {
  it("creates ready-to-use series and object registries", () => {
    const seriesRegistry = createBuiltInSeriesModelRegistry();
    const objectRegistry = createBuiltInObjectModelRegistry();

    expect(seriesRegistry.get(BuiltInSeriesKinds.line).kind).toBe(
      BuiltInSeriesKinds.line,
    );
    expect(objectRegistry.get(BuiltInObjectKinds.rect).kind).toBe(
      BuiltInObjectKinds.rect,
    );
  });
});
