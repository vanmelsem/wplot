import type { Modifiers, PointerButton } from "../interaction/contracts";

export type QueuedInput =
  | {
      kind: "pointermove";
      x: number;
      y: number;
      inside: boolean;
      mods: Modifiers;
    }
  | {
      kind: "pointerdown" | "pointerup";
      button: PointerButton;
      x: number;
      y: number;
      inside: boolean;
      mods: Modifiers;
    }
  | {
      kind: "wheel";
      deltaY: number;
      x: number;
      y: number;
      inside: boolean;
      mods: Modifiers;
    }
  | {
      kind: "doubleclick";
      x: number;
      y: number;
      mods: Modifiers;
    }
  | {
      kind: "leave" | "cancel";
    }
  | {
      kind: "keydown";
      key: string;
    };

export function enqueueQueuedInput(
  queue: QueuedInput[],
  input: QueuedInput,
): void {
  const last = queue[queue.length - 1];
  // Only coalesce consecutive moves. Down/up/wheel/key events stay discrete so
  // gesture boundaries and click semantics remain exact.
  if (input.kind === "pointermove" && last?.kind === "pointermove") {
    queue[queue.length - 1] = input;
    return;
  }
  queue.push(input);
}
