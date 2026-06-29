import type { Modifiers, PointerButton } from "../interaction/contracts";
export type QueuedInput = {
    kind: "pointermove";
    x: number;
    y: number;
    inside: boolean;
    mods: Modifiers;
} | {
    kind: "pointerdown" | "pointerup";
    button: PointerButton;
    x: number;
    y: number;
    inside: boolean;
    mods: Modifiers;
} | {
    kind: "wheel";
    deltaY: number;
    x: number;
    y: number;
    inside: boolean;
    mods: Modifiers;
} | {
    kind: "doubleclick";
    x: number;
    y: number;
    mods: Modifiers;
} | {
    kind: "leave" | "cancel";
} | {
    kind: "keydown";
    key: string;
};
export declare function enqueueQueuedInput(queue: QueuedInput[], input: QueuedInput): void;
