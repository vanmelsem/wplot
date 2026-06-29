import { InteractionController } from "../core/interaction/controller";
import type { ViewValue } from "../core/domain/view";
import type {
  CursorEvent,
  PlotEventMap,
} from "../core/interaction/events";

export type LinkAxes = { x?: boolean; y?: boolean };
export type LinkCursor = { x?: boolean; y?: boolean };

export type LinkOptions = {
  id?: string;
  axes?: LinkAxes;
  cursor?: LinkCursor;
};

type Unsubscribe = () => void;

type LinkableInteraction = Pick<
  InteractionController,
  "events" | "peekView" | "setView" | "syncLinkedCursor"
>;

type LinkEntry = {
  controller: LinkableInteraction;
  axes: LinkAxes;
  cursor: LinkCursor;
  unsubView: Unsubscribe;
  unsubCursor: Unsubscribe;
};

function sameRange(
  left: { min: number; max: number },
  right: { min: number; max: number },
): boolean {
  return left.min === right.min && left.max === right.max;
}

export class LinkGroup {
  private entries: LinkEntry[] = [];
  private suppressDepth = 0;

  register(
    controller: LinkableInteraction,
    options: LinkOptions = {},
  ): () => void {
    const axes = options.axes ?? { x: true, y: true };
    const cursor = options.cursor ?? { x: true, y: true };
    const entry: LinkEntry = {
      controller,
      axes,
      cursor,
      unsubView: () => {},
      unsubCursor: () => {},
    };

    entry.unsubView = controller.events.subscribe(
      "view",
      (event: PlotEventMap["view"]) => this.onView(entry, event),
    );
    entry.unsubCursor = controller.events.subscribe(
      "cursor",
      (event: PlotEventMap["cursor"]) => this.onCursor(entry, event),
    );

    this.entries.push(entry);
    return () => this.unregister(entry);
  }

  private unregister(entry: LinkEntry): void {
    entry.unsubView();
    entry.unsubCursor();
    this.entries = this.entries.filter((candidate) => candidate !== entry);
  }

  private onView(source: LinkEntry, event: PlotEventMap["view"]): void {
    if (this.suppressDepth > 0) return;
    this.suppressDepth += 1;
    try {
      for (let i = 0; i < this.entries.length; i += 1) {
        const entry = this.entries[i]!;
        if (entry === source) continue;
        const current = entry.controller.peekView();
        const next = {
          x: entry.axes.x === false ? current.x : event.x,
          y: entry.axes.y === false ? current.y : event.y,
        };
        if (sameRange(current.x, next.x) && sameRange(current.y, next.y)) {
          continue;
        }
        entry.controller.setView(next as ViewValue);
      }
    } finally {
      this.suppressDepth -= 1;
    }
  }

  private onCursor(source: LinkEntry, event: CursorEvent): void {
    if (this.suppressDepth > 0) return;
    this.suppressDepth += 1;
    try {
      const value =
        event.inside && event.value
          ? event.value
          : null;
      for (let i = 0; i < this.entries.length; i += 1) {
        const entry = this.entries[i]!;
        if (entry === source) continue;
        if (entry.cursor.x === false && entry.cursor.y === false) continue;
        entry.controller.syncLinkedCursor(value, entry.cursor, {
          hitTest: false,
          snap: false,
        });
      }
    } finally {
      this.suppressDepth -= 1;
    }
  }
}

export function createLinkGroup(): LinkGroup {
  return new LinkGroup();
}
