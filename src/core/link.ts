import { containsBounds, worldToScreen } from "./core";
import { Engine, Unsubscribe, PlotEvents } from "./engine";

export type LinkAxes = { x?: boolean; y?: boolean };
export type LinkCursor = { x?: boolean; y?: boolean };

export type LinkOptions = {
  id?: string;
  axes?: LinkAxes;
  cursor?: LinkCursor;
};

type LinkEntry = {
  controller: Engine;
  axes: LinkAxes;
  cursor: LinkCursor;
  unsubView: Unsubscribe;
  unsubCursor: Unsubscribe;
};

export class LinkGroup {
  private entries: LinkEntry[] = [];
  private syncingView = false;
  private syncingCursor = false;

  register(controller: Engine, options: LinkOptions = {}): () => void {
    const axes = options.axes ?? { x: true, y: true };
    const cursor = options.cursor ?? { x: true, y: true };
    const entry = {
      controller,
      axes,
      cursor,
      unsubView: () => {},
      unsubCursor: () => {},
    } as LinkEntry;

    entry.unsubView = controller.events.subscribe(
      "view",
      (ev: PlotEvents["view"]) => this.onView(entry, ev),
    );
    entry.unsubCursor = controller.events.subscribe(
      "cursor",
      (ev: PlotEvents["cursor"]) => this.onCursor(entry, ev),
    );

    this.entries.push(entry);
    return () => this.unregister(entry);
  }

  private unregister(entry: LinkEntry): void {
    entry.unsubView();
    entry.unsubCursor();
    this.entries = this.entries.filter((e) => e !== entry);
  }

  private onView(source: LinkEntry, ev: PlotEvents["view"]): void {
    if (this.syncingView) return;
    this.syncingView = true;
    for (const entry of this.entries) {
      if (entry === source) continue;
      const x = entry.axes.x === false ? entry.controller.view.world.x : ev.x;
      const y = entry.axes.y === false ? entry.controller.view.world.y : ev.y;
      entry.controller.dispatch({
        type: "VIEW/SET_RANGES",
        x: { ...x },
        y: { ...y },
        emit: false,
      });
    }
    this.syncingView = false;
  }

  private onCursor(source: LinkEntry, ev: PlotEvents["cursor"]): void {
    if (this.syncingCursor) return;
    this.syncingCursor = true;
    const world = ev.world;
    for (const entry of this.entries) {
      if (entry === source) continue;
      if (entry.cursor.x === false && entry.cursor.y === false) continue;
      if (!ev.inside || !world) {
        entry.controller.dispatch({
          type: "INTERACTION/SET_CROSSHAIR",
          enabled: false,
        });
        continue;
      }
      const s = worldToScreen(entry.controller.transform, world.x, world.y);
      const plot = entry.controller.view.plot;
      const inside = containsBounds(plot, s.x, s.y);
      if (!inside) {
        entry.controller.dispatch({
          type: "INTERACTION/SET_CROSSHAIR",
          enabled: false,
        });
        continue;
      }
      entry.controller.dispatch({
        type: "INTERACTION/SET_CROSSHAIR",
        enabled: true,
        sx: s.x,
        sy: s.y,
      });
    }
    this.syncingCursor = false;
  }
}

export function createLinkGroup(): LinkGroup {
  return new LinkGroup();
}
