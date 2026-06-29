import { describe, expect, it } from "vitest";

import { AnnotationObjectKinds as BuiltInObjectKinds } from "../src/plugins/annotations";
import { BuiltInSeriesKinds } from "../src/core/domain/series";
import { ObjectSceneRegistry, SeriesSceneRegistry } from "../src/core/scene/registry";

describe("core scene registries", () => {
  it("registers and resolves scene adapters by kind", () => {
    const seriesRegistry = new SeriesSceneRegistry();
    const objectRegistry = new ObjectSceneRegistry();

    const seriesAdapter = {
      kind: BuiltInSeriesKinds.line,
      createCache() {
        return { revision: 0 };
      },
      build() {
        return null;
      },
    };

    const objectAdapter = {
      kind: BuiltInObjectKinds.segment,
      build() {
        return null;
      },
    };

    seriesRegistry.register(seriesAdapter);
    objectRegistry.register(objectAdapter);

    expect(seriesRegistry.get(BuiltInSeriesKinds.line)).toBe(seriesAdapter);
    expect(objectRegistry.get(BuiltInObjectKinds.segment)).toBe(objectAdapter);
  });
});
