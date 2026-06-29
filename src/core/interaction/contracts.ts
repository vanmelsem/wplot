import type { PickingHit } from "../scene/contracts";

export type PointerButton = "left" | "right";

export type Modifiers = {
  shift: boolean;
  ctrl: boolean;
  alt: boolean;
  meta: boolean;
};

export type PointerSnapshot = {
  x: number;
  y: number;
  insidePlot: boolean;
};

export interface ToolContext {
  setCursor(cursor: PointerSnapshot | null): void;
  setHover(hit: PickingHit | null): void;
  dispatch(command: { type: string }): void;
}

export interface InteractionTool {
  pointerMove?(
    ctx: ToolContext,
    pointer: PointerSnapshot,
    mods: Modifiers,
  ): boolean | void;
  pointerDown?(
    ctx: ToolContext,
    button: PointerButton,
    pointer: PointerSnapshot,
    mods: Modifiers,
  ): boolean | void;
  pointerUp?(
    ctx: ToolContext,
    button: PointerButton,
    pointer: PointerSnapshot,
    mods: Modifiers,
  ): boolean | void;
  wheel?(
    ctx: ToolContext,
    deltaY: number,
    pointer: PointerSnapshot,
    mods: Modifiers,
  ): boolean | void;
}
