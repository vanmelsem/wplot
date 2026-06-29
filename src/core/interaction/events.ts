import type { PlotConfig } from "../domain/config";
import type { RgbaColor, SeriesId } from "../domain/series";
import type { ViewValue } from "../domain/view";
import type { PickingHit } from "../scene/contracts";
import type { RenderBounds } from "../render/layout";

export type HitInfo = PickingHit & {
  seriesName?: string;
  color?: RgbaColor;
  datum?: unknown;
};

export type SeriesHit = {
  kind: "series-point";
  seriesId: SeriesId;
  index: number;
};

export type SeriesHitInfo = HitInfo & SeriesHit;

export type CursorEvent = {
  inside: boolean;
  px?: { x: number; y: number };
  value?: { x: number; y: number };
  hit?: HitInfo;
  seriesHits?: SeriesHitInfo[];
  formatted?: { x: string; y: string };
  plotBounds?: RenderBounds;
};

export type HoverEvent = {
  px: { x: number; y: number };
  value: { x: number; y: number };
  hit?: HitInfo;
  seriesHits?: SeriesHitInfo[];
};

export type ClickEvent = {
  px: { x: number; y: number };
  value: { x: number; y: number };
  button: "left" | "right";
  hit?: HitInfo;
};

export type SelectionState = null | {
  start: [number, number];
  current: [number, number];
  axis: "x" | "y" | "xy";
};

export type PlotEventMap = {
  cursor: CursorEvent;
  hover: HoverEvent;
  click: ClickEvent;
  view: ViewValue;
  config: PlotConfig;
};

type Handler<T> = (event: T) => void;

export class Emitter<TEvents extends Record<string, unknown>> {
  private readonly map = new Map<keyof TEvents, Set<Handler<any>>>();

  subscribe<K extends keyof TEvents>(
    type: K,
    cb: Handler<TEvents[K]>,
  ): () => void {
    let bucket = this.map.get(type);
    if (!bucket) {
      bucket = new Set();
      this.map.set(type, bucket);
    }
    bucket.add(cb as Handler<any>);
    return () => {
      bucket?.delete(cb as Handler<any>);
      if (bucket && bucket.size === 0) this.map.delete(type);
    };
  }

  emit<K extends keyof TEvents>(type: K, event: TEvents[K]): void {
    const bucket = this.map.get(type);
    if (!bucket) return;
    for (const handler of bucket) handler(event);
  }

  hasSubscribers<K extends keyof TEvents>(type: K): boolean {
    return (this.map.get(type)?.size ?? 0) > 0;
  }

  clear(): void {
    this.map.clear();
  }
}
