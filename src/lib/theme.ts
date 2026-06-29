import type { Color } from "../core/shared/geometry";
import type { PlotConfigUpdate } from "../core/domain/config";

/**
 * A small set of semantic colors that fully describe a plot's chrome. One theme
 * expands to the dozen-odd low-level config fields (grid, crosshair, axis text,
 * axis lines, backgrounds, border) so callers theme in one place instead of
 * threading colors through `config.update` by hand. Every field is optional;
 * omitted ones leave the current config untouched.
 */
export type PlotTheme = {
  /** Plot + axis-gutter background. */
  background?: Color;
  /** Axis tick-label text. */
  text?: Color;
  /** Gridlines. */
  grid?: Color;
  /** Crosshair lines. */
  crosshair?: Color;
  /** Axis baseline / tick marks. */
  axisLine?: Color;
  /** Outer plot border. */
  border?: Color;
};

/** Expand a {@link PlotTheme} into a {@link PlotConfigUpdate}. */
export function themeToConfig(theme: PlotTheme): PlotConfigUpdate {
  const update: PlotConfigUpdate = {};
  if (theme.background) update.background = theme.background;
  if (theme.grid) update.gridColor = theme.grid;
  if (theme.crosshair) update.crosshairColor = theme.crosshair;
  if (theme.border) update.borderColor = theme.border;

  // Axis gutters: both x and y scales share the background, text and line color.
  const scale: { background?: Color; textColor?: Color; lineColor?: Color } = {};
  if (theme.background) scale.background = theme.background;
  if (theme.text) scale.textColor = theme.text;
  if (theme.axisLine) scale.lineColor = theme.axisLine;
  if (Object.keys(scale).length > 0) {
    update.layout = { xScale: { ...scale }, yScale: { ...scale } };
  }
  return update;
}

/** wplot's built-in near-black scientific theme (matches the default config). */
export const darkTheme: PlotTheme = {
  background: [0.058824, 0.058824, 0.058824, 1],
  text: [1, 1, 1, 0.55],
  grid: [1, 1, 1, 0.05],
  crosshair: [0.55, 0.58, 0.63, 0.96],
  axisLine: [1, 1, 1, 0.1],
  border: [1, 1, 1, 0],
};

/** A clean light theme for print / light-mode embeds. */
export const lightTheme: PlotTheme = {
  background: [1, 1, 1, 1],
  text: [0, 0, 0, 0.65],
  grid: [0, 0, 0, 0.08],
  crosshair: [0.1, 0.2, 0.35, 0.9],
  axisLine: [0, 0, 0, 0.18],
  border: [0, 0, 0, 0],
};
