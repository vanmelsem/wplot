import { Registry } from "../shared/registry";

export type ObjectId = number;
export type ObjectKind = string;

export type ObjectHandle = {
  id: number;
  x: number;
  y: number;
  sizePx: number;
  offsetXPx?: number;
  offsetYPx?: number;
};

export type ObjectEdit =
  | {
      kind: "drag-handle";
      handleId: number;
      startX: number;
      startY: number;
      nowX: number;
      nowY: number;
    }
  | {
      kind: "drag-object";
      startX: number;
      startY: number;
      nowX: number;
      nowY: number;
    };

export type ObjectRecord<TState> = {
  id: ObjectId;
  kind: ObjectKind;
  visible: boolean;
  locked: boolean;
  state: TState;
};

export type ObjectUpdate = {
  state?: unknown;
  visible?: boolean;
  locked?: boolean;
};

export interface ObjectModelAdapter<TInput, TState, TPatch = Partial<TState>> {
  readonly kind: ObjectKind;
  normalize(input: TInput): TState;
  patch?(state: TState, patch: TPatch): TState;
  handles?(state: TState): readonly ObjectHandle[];
  applyEdit?(state: TState, edit: ObjectEdit): TState;
  /** Mouse cursor when hovering this object (or one of its handles). */
  cursor?(isHandle: boolean, handleId: number | null): string;
}

export class ObjectModelRegistry extends Registry<
  ObjectModelAdapter<any, any, any>
> {
  constructor() {
    super("object kind");
  }
}
