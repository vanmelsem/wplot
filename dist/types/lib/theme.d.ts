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
export declare function themeToConfig(theme: PlotTheme): PlotConfigUpdate;
/** wplot's built-in near-black scientific theme (matches the default config). */
export declare const darkTheme: PlotTheme;
/** A clean light theme for print / light-mode embeds. */
export declare const lightTheme: PlotTheme;
