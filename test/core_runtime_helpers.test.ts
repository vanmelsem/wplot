import { afterEach, describe, expect, it } from "vitest";

import { RuntimeFrameScheduler } from "../src/core/runtime/frame_scheduler";
import {
  enqueueQueuedInput,
  type QueuedInput,
} from "../src/core/runtime/input_queue";

const NO_MODS = {
  shift: false,
  ctrl: false,
  alt: false,
  meta: false,
} as const;

const originalRequestAnimationFrame = globalThis.requestAnimationFrame;

afterEach(() => {
  if (originalRequestAnimationFrame) {
    globalThis.requestAnimationFrame = originalRequestAnimationFrame;
  } else {
    delete (globalThis as { requestAnimationFrame?: typeof requestAnimationFrame })
      .requestAnimationFrame;
  }
});

describe("core runtime helpers", () => {
  it("coalesces consecutive pointer moves but preserves distinct inputs", () => {
    const queue: QueuedInput[] = [];

    enqueueQueuedInput(queue, {
      kind: "pointermove",
      x: 10,
      y: 10,
      inside: true,
      mods: NO_MODS,
    });
    enqueueQueuedInput(queue, {
      kind: "pointermove",
      x: 14,
      y: 16,
      inside: true,
      mods: NO_MODS,
    });
    enqueueQueuedInput(queue, {
      kind: "pointerdown",
      button: "left",
      x: 14,
      y: 16,
      inside: true,
      mods: NO_MODS,
    });
    enqueueQueuedInput(queue, {
      kind: "pointermove",
      x: 20,
      y: 24,
      inside: true,
      mods: NO_MODS,
    });

    expect(queue).toEqual([
      {
        kind: "pointermove",
        x: 14,
        y: 16,
        inside: true,
        mods: NO_MODS,
      },
      {
        kind: "pointerdown",
        button: "left",
        x: 14,
        y: 16,
        inside: true,
        mods: NO_MODS,
      },
      {
        kind: "pointermove",
        x: 20,
        y: 24,
        inside: true,
        mods: NO_MODS,
      },
    ]);
  });

  it("flushes runtimes enqueued during a frame in the same RAF cycle", () => {
    const callbacks: FrameRequestCallback[] = [];
    globalThis.requestAnimationFrame = ((cb: FrameRequestCallback) => {
      callbacks.push(cb);
      return callbacks.length;
    }) as typeof requestAnimationFrame;

    const scheduler = new RuntimeFrameScheduler();
    const calls: string[] = [];
    const second = {
      flushScheduledFrame() {
        calls.push("second");
      },
    };
    const first = {
      flushScheduledFrame() {
        calls.push("first");
        scheduler.enqueue(second);
      },
    };

    scheduler.enqueue(first);

    expect(callbacks).toHaveLength(1);
    callbacks[0]!(0);

    expect(calls).toEqual(["first", "second"]);
    expect(callbacks).toHaveLength(1);
  });
});
