import { describe, expect, it } from "vitest";

import {
  AnnotationObjectKinds as BuiltInObjectKinds,
  registerAnnotationObjectModels,
} from "../src/plugins/annotations";
import { PlotDomainModel } from "../src/core/domain/model";
import { ObjectModelRegistry } from "../src/core/domain/objects";
import { SeriesModelRegistry } from "../src/core/domain/series";

function createObjectRegistry() {
  const registry = new ObjectModelRegistry();
  registerAnnotationObjectModels(registry);
  return registry;
}

describe("core plot object model", () => {
  it("normalizes, patches, and edits rect objects through the model", () => {
    const model = new PlotDomainModel({
      seriesRegistry: new SeriesModelRegistry(),
      objectRegistry: createObjectRegistry(),
      initialValue: {
        x: { min: 0, max: 10 },
        y: { min: 0, max: 10 },
      },
    });

    const id = model.addObject({
      kind: BuiltInObjectKinds.rect,
      xMin: 8,
      xMax: 2,
      yMin: 9,
      yMax: 1,
    });

    expect(model.getObject(id)?.state).toMatchObject({
      xMin: 2,
      xMax: 8,
      yMin: 1,
      yMax: 9,
    });
    expect(model.getObjectHandles(id)).toHaveLength(8);

    expect(
      model.updateObject(id, {
        state: { xMin: 12, xMax: 4 },
      }),
    ).toBe(true);
    expect(model.getObject(id)?.state).toMatchObject({
      xMin: 4,
      xMax: 12,
    });

    expect(
      model.applyObjectEdit(id, {
        kind: "drag-handle",
        handleId: 2,
        startX: 12,
        startY: 9,
        nowX: 14,
        nowY: 11,
      }),
    ).toBe(true);
    expect(model.getObject(id)?.state).toMatchObject({
      xMin: 4,
      xMax: 14,
      yMin: 1,
      yMax: 11,
    });
  });

  it("respects locking and exposes object state", () => {
    const model = new PlotDomainModel({
      seriesRegistry: new SeriesModelRegistry(),
      objectRegistry: createObjectRegistry(),
      initialValue: {
        x: { min: 0, max: 10 },
        y: { min: 0, max: 10 },
      },
    });

    const id = model.addObject({
      kind: BuiltInObjectKinds.tag,
      x: 3,
      y: 4,
      text: "note",
      locked: true,
    });

    expect(model.getObject(id)).toMatchObject({
      id,
      kind: BuiltInObjectKinds.tag,
      visible: true,
      locked: true,
    });
    expect(
      model.applyObjectEdit(id, {
        kind: "drag-object",
        startX: 3,
        startY: 4,
        nowX: 5,
        nowY: 7,
      }),
    ).toBe(false);

    expect(model.setObjectLocked(id, false)).toBe(true);
    expect(model.setObjectVisible(id, false)).toBe(true);
    expect(model.getObject(id)?.visible).toBe(false);

    expect(
      model.applyObjectEdit(id, {
        kind: "drag-object",
        startX: 3,
        startY: 4,
        nowX: 5,
        nowY: 7,
      }),
    ).toBe(true);
    expect(model.getObject(id)?.state).toMatchObject({ x: 5, y: 7 });
    expect(model.removeObject(id)).toBe(true);
    expect(model.removeObject(id)).toBe(false);
  });

  it("stores view state separately from object edits and resets cleanly", () => {
    const model = new PlotDomainModel({
      seriesRegistry: new SeriesModelRegistry(),
      objectRegistry: createObjectRegistry(),
      initialValue: {
        x: { min: 0, max: 10 },
        y: { min: -5, max: 5 },
      },
    });

    expect(
      model.setView({
        x: { min: 2, max: 8 },
        y: { min: -2, max: 3 },
      }),
    ).toBe(true);
    expect(model.getView()).toEqual({
      x: { min: 2, max: 8 },
      y: { min: -2, max: 3 },
    });
    expect(model.resetView()).toBe(true);
    expect(model.getView()).toEqual({
      x: { min: 0, max: 10 },
      y: { min: -5, max: 5 },
    });
  });
});
