import type { Layout, Range } from "./core";
import type { PlotConfigUpdate } from "./model";
import type { SeriesId, ItemId } from "./adapters";
import type { Hit } from "./engine";

export type Action =
  | { type: "VIEW/SET_RANGES"; x: Range; y: Range; emit?: boolean }
  | { type: "VIEW/SET_LAYOUT"; layout: Layout; emit?: boolean }
  | { type: "VIEW/PAN_BY_PX"; dx: number; dy: number; emit?: boolean }
  | {
      type: "VIEW/ZOOM_AT";
      deltaY: number;
      sx: number;
      sy: number;
      axis: "x" | "y" | "xy";
      emit?: boolean;
    }
  | { type: "VIEW/RESET"; emit?: boolean }
  | { type: "INTERACTION/SET_CURSOR"; active: boolean; x?: number; y?: number }
  | { type: "INTERACTION/SET_HOVER"; hover: null | Hit }
  | {
      type: "INTERACTION/SET_SELECTION";
      selection: null | {
        start: [number, number];
        current: [number, number];
        axis: "x" | "xy";
      };
    }
  | {
      type: "INTERACTION/SET_CROSSHAIR";
      enabled: boolean;
      sx?: number;
      sy?: number;
    }
  | { type: "MODEL/SET_CONFIG"; patch: PlotConfigUpdate }
  | { type: "MODEL/SET_SERIES_VISIBLE"; id: SeriesId; on: boolean }
  | {
      type: "MODEL/UPDATE_ITEM";
      id: ItemId;
      patch: Partial<{
        data: unknown;
        style: Record<string, unknown>;
        visible: boolean;
      }>;
    };
