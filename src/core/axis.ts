import type {
  AxisId,
  AxisSpec,
  Range,
  Tick,
  TickSet,
  TimezoneMode,
  Viewport,
} from "./core";
import type { Model } from "./model";

export type AxisContext = {
  xSpec: AxisSpec;
  ySpec: AxisSpec;
  xStep: number;
  yStep: number;
};

type TimeUnit = "ms" | "s" | "m" | "h" | "d" | "mo" | "y";
type TimeStep = { unit: TimeUnit; step: number; ms: number };

const MS_SECOND = 1000;
const MS_MINUTE = 60 * MS_SECOND;
const MS_HOUR = 60 * MS_MINUTE;
const MS_DAY = 24 * MS_HOUR;

const TIME_STEPS: readonly TimeStep[] = [
  { unit: "ms", step: 1, ms: 1 },
  { unit: "ms", step: 2, ms: 2 },
  { unit: "ms", step: 5, ms: 5 },
  { unit: "ms", step: 10, ms: 10 },
  { unit: "ms", step: 20, ms: 20 },
  { unit: "ms", step: 50, ms: 50 },
  { unit: "ms", step: 100, ms: 100 },
  { unit: "ms", step: 200, ms: 200 },
  { unit: "ms", step: 500, ms: 500 },
  { unit: "s", step: 1, ms: MS_SECOND },
  { unit: "s", step: 2, ms: 2 * MS_SECOND },
  { unit: "s", step: 5, ms: 5 * MS_SECOND },
  { unit: "s", step: 10, ms: 10 * MS_SECOND },
  { unit: "s", step: 15, ms: 15 * MS_SECOND },
  { unit: "s", step: 30, ms: 30 * MS_SECOND },
  { unit: "m", step: 1, ms: MS_MINUTE },
  { unit: "m", step: 2, ms: 2 * MS_MINUTE },
  { unit: "m", step: 5, ms: 5 * MS_MINUTE },
  { unit: "m", step: 10, ms: 10 * MS_MINUTE },
  { unit: "m", step: 15, ms: 15 * MS_MINUTE },
  { unit: "m", step: 30, ms: 30 * MS_MINUTE },
  { unit: "h", step: 1, ms: MS_HOUR },
  { unit: "h", step: 2, ms: 2 * MS_HOUR },
  { unit: "h", step: 3, ms: 3 * MS_HOUR },
  { unit: "h", step: 6, ms: 6 * MS_HOUR },
  { unit: "h", step: 12, ms: 12 * MS_HOUR },
  { unit: "d", step: 1, ms: MS_DAY },
  { unit: "d", step: 2, ms: 2 * MS_DAY },
  { unit: "d", step: 7, ms: 7 * MS_DAY },
  { unit: "d", step: 14, ms: 14 * MS_DAY },
  { unit: "mo", step: 1, ms: 30 * MS_DAY },
  { unit: "mo", step: 3, ms: 90 * MS_DAY },
  { unit: "mo", step: 6, ms: 180 * MS_DAY },
  { unit: "y", step: 1, ms: 365 * MS_DAY },
  { unit: "y", step: 2, ms: 730 * MS_DAY },
  { unit: "y", step: 5, ms: 1825 * MS_DAY },
  { unit: "y", step: 10, ms: 3650 * MS_DAY },
];

const MONTHS_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

export function resolveAxisSpec(partial?: Partial<AxisSpec>): AxisSpec {
  return {
    mode: partial?.mode ?? "numeric",
    scale: partial?.scale ?? "linear",
    offset: partial?.offset,
    timezone: partial?.timezone ?? "local",
    formatter: partial?.formatter,
  };
}

function pickTimeStep(ms: number): TimeStep {
  for (const step of TIME_STEPS) {
    if (ms <= step.ms) return step;
  }
  return TIME_STEPS[TIME_STEPS.length - 1]!;
}

function getDatePart(
  d: Date,
  tz: TimezoneMode,
  part: "fullYear" | "month" | "date" | "hours" | "minutes" | "seconds" | "ms",
) {
  if (tz === "utc") {
    switch (part) {
      case "fullYear":
        return d.getUTCFullYear();
      case "month":
        return d.getUTCMonth();
      case "date":
        return d.getUTCDate();
      case "hours":
        return d.getUTCHours();
      case "minutes":
        return d.getUTCMinutes();
      case "seconds":
        return d.getUTCSeconds();
      case "ms":
        return d.getUTCMilliseconds();
    }
  }
  switch (part) {
    case "fullYear":
      return d.getFullYear();
    case "month":
      return d.getMonth();
    case "date":
      return d.getDate();
    case "hours":
      return d.getHours();
    case "minutes":
      return d.getMinutes();
    case "seconds":
      return d.getSeconds();
    case "ms":
      return d.getMilliseconds();
  }
}

function setDatePart(
  d: Date,
  tz: TimezoneMode,
  part: "fullYear" | "month" | "date" | "hours" | "minutes" | "seconds" | "ms",
  value: number,
) {
  if (tz === "utc") {
    switch (part) {
      case "fullYear":
        d.setUTCFullYear(value);
        return;
      case "month":
        d.setUTCMonth(value);
        return;
      case "date":
        d.setUTCDate(value);
        return;
      case "hours":
        d.setUTCHours(value);
        return;
      case "minutes":
        d.setUTCMinutes(value);
        return;
      case "seconds":
        d.setUTCSeconds(value);
        return;
      case "ms":
        d.setUTCMilliseconds(value);
        return;
    }
  }
  switch (part) {
    case "fullYear":
      d.setFullYear(value);
      return;
    case "month":
      d.setMonth(value);
      return;
    case "date":
      d.setDate(value);
      return;
    case "hours":
      d.setHours(value);
      return;
    case "minutes":
      d.setMinutes(value);
      return;
    case "seconds":
      d.setSeconds(value);
      return;
    case "ms":
      d.setMilliseconds(value);
      return;
  }
}

function alignTime(t: number, step: TimeStep, tz: TimezoneMode): number {
  if (step.unit === "ms") {
    return Math.floor(t / step.ms) * step.ms;
  }
  const d = new Date(t);
  if (step.unit === "s") {
    const s = getDatePart(d, tz, "seconds");
    setDatePart(d, tz, "seconds", s - (s % step.step));
    setDatePart(d, tz, "ms", 0);
    return d.getTime();
  }
  if (step.unit === "m") {
    const m = getDatePart(d, tz, "minutes");
    setDatePart(d, tz, "minutes", m - (m % step.step));
    setDatePart(d, tz, "seconds", 0);
    setDatePart(d, tz, "ms", 0);
    return d.getTime();
  }
  if (step.unit === "h") {
    const h = getDatePart(d, tz, "hours");
    setDatePart(d, tz, "hours", h - (h % step.step));
    setDatePart(d, tz, "minutes", 0);
    setDatePart(d, tz, "seconds", 0);
    setDatePart(d, tz, "ms", 0);
    return d.getTime();
  }
  if (step.unit === "d") {
    const day = getDatePart(d, tz, "date");
    setDatePart(d, tz, "date", day - ((day - 1) % step.step));
    setDatePart(d, tz, "hours", 0);
    setDatePart(d, tz, "minutes", 0);
    setDatePart(d, tz, "seconds", 0);
    setDatePart(d, tz, "ms", 0);
    return d.getTime();
  }
  if (step.unit === "mo") {
    const month = getDatePart(d, tz, "month");
    setDatePart(d, tz, "month", month - (month % step.step));
    setDatePart(d, tz, "date", 1);
    setDatePart(d, tz, "hours", 0);
    setDatePart(d, tz, "minutes", 0);
    setDatePart(d, tz, "seconds", 0);
    setDatePart(d, tz, "ms", 0);
    return d.getTime();
  }
  const year = getDatePart(d, tz, "fullYear");
  setDatePart(d, tz, "fullYear", year - (year % step.step));
  setDatePart(d, tz, "month", 0);
  setDatePart(d, tz, "date", 1);
  setDatePart(d, tz, "hours", 0);
  setDatePart(d, tz, "minutes", 0);
  setDatePart(d, tz, "seconds", 0);
  setDatePart(d, tz, "ms", 0);
  return d.getTime();
}

function addTime(t: number, step: TimeStep, tz: TimezoneMode): number {
  if (
    step.unit === "ms" ||
    step.unit === "s" ||
    step.unit === "m" ||
    step.unit === "h"
  ) {
    return t + step.ms;
  }
  const d = new Date(t);
  if (step.unit === "d") {
    const day = getDatePart(d, tz, "date");
    setDatePart(d, tz, "date", day + step.step);
    return d.getTime();
  }
  if (step.unit === "mo") {
    const month = getDatePart(d, tz, "month");
    setDatePart(d, tz, "month", month + step.step);
    return d.getTime();
  }
  const year = getDatePart(d, tz, "fullYear");
  setDatePart(d, tz, "fullYear", year + step.step);
  return d.getTime();
}

function timeTickIndex(
  epochMs: number,
  step: TimeStep,
  tz: TimezoneMode,
): number {
  switch (step.unit) {
    case "ms":
    case "s":
    case "m":
    case "h":
      return Math.round(epochMs / step.ms);
    case "d": {
      const d = new Date(epochMs);
      const year = getDatePart(d, tz, "fullYear");
      const month = getDatePart(d, tz, "month");
      const date = getDatePart(d, tz, "date");
      const midnight =
        tz === "utc"
          ? Date.UTC(year, month, date)
          : new Date(year, month, date).getTime();
      const day = Math.floor(midnight / MS_DAY);
      return Math.floor(day / step.step);
    }
    case "mo": {
      const d = new Date(epochMs);
      const year = getDatePart(d, tz, "fullYear");
      const month = getDatePart(d, tz, "month");
      const idx = year * 12 + month;
      return Math.floor(idx / step.step);
    }
    case "y": {
      const d = new Date(epochMs);
      const year = getDatePart(d, tz, "fullYear");
      return Math.floor(year / step.step);
    }
  }
  return Math.round(epochMs / step.ms);
}

function formatTwo(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

function formatThree(n: number): string {
  if (n < 10) return `00${n}`;
  if (n < 100) return `0${n}`;
  return `${n}`;
}

function formatTimeLabel(
  epochMs: number,
  step: TimeStep,
  tz: TimezoneMode,
  showDate: boolean,
): string {
  const d = new Date(epochMs);
  const year = getDatePart(d, tz, "fullYear");
  const month = getDatePart(d, tz, "month");
  const date = getDatePart(d, tz, "date");
  const hour = getDatePart(d, tz, "hours");
  const minute = getDatePart(d, tz, "minutes");
  const second = getDatePart(d, tz, "seconds");
  const ms = getDatePart(d, tz, "ms");

  const dateStr = `${MONTHS_SHORT[month]} ${date}`;
  if (step.unit === "y") return `${year}`;
  if (step.unit === "mo") return `${MONTHS_SHORT[month]} ${year}`;
  if (step.unit === "d") return dateStr;
  const timeStr =
    step.unit === "s"
      ? `${formatTwo(hour)}:${formatTwo(minute)}:${formatTwo(second)}`
      : step.unit === "m" || step.unit === "h"
        ? `${formatTwo(hour)}:${formatTwo(minute)}`
        : `${formatTwo(hour)}:${formatTwo(minute)}:${formatTwo(second)}.${formatThree(ms)}`;
  if (!showDate) return timeStr;
  const isMidnight = hour === 0 && minute === 0 && second === 0 && ms === 0;
  return isMidnight ? dateStr : timeStr;
}

function formatTimeValue(
  epochMs: number,
  stepMs: number,
  tz: TimezoneMode,
): string {
  const d = new Date(epochMs);
  const year = getDatePart(d, tz, "fullYear");
  const month = getDatePart(d, tz, "month") + 1;
  const date = getDatePart(d, tz, "date");
  const hour = getDatePart(d, tz, "hours");
  const minute = getDatePart(d, tz, "minutes");
  const second = getDatePart(d, tz, "seconds");
  const ms = getDatePart(d, tz, "ms");
  const showMs = stepMs < MS_SECOND;
  const showSec = stepMs < MS_MINUTE;
  const showTime = stepMs < MS_DAY;
  const dateStr = `${year}-${formatTwo(month)}-${formatTwo(date)}`;
  if (!showTime) return dateStr;
  const timeStr = showSec
    ? `${formatTwo(hour)}:${formatTwo(minute)}:${formatTwo(second)}${showMs ? `.${formatThree(ms)}` : ""}`
    : `${formatTwo(hour)}:${formatTwo(minute)}`;
  return `${dateStr} ${timeStr}`;
}

function niceStep(raw: number): number {
  if (raw <= 0 || !Number.isFinite(raw)) return 1;
  const pow10 = Math.pow(10, Math.floor(Math.log10(raw)));
  const d = raw / pow10;
  if (d <= 1) return 1 * pow10;
  if (d <= 2) return 2 * pow10;
  if (d <= 5) return 5 * pow10;
  return 10 * pow10;
}

function formatNumericValue(value: number, step: number): string {
  if (!Number.isFinite(value)) return "0";
  const stepAbs = Math.abs(step);
  if (stepAbs > 0 && Math.abs(value) < stepAbs * 0.5) value = 0;
  if (value === 0) return "0";
  const abs = Math.abs(value);
  const digits = Math.max(0, -Math.floor(Math.log10(stepAbs || 1)) + 1);
  if (abs >= 1e6 || abs < 1e-4) {
    return value.toExponential(4);
  }
  let out = value.toFixed(Math.min(6, digits));
  if (out.includes(".")) out = out.replace(/\.?0+$/, "");
  return out;
}

export function generateTicks(args: {
  axis: AxisId;
  range: Range;
  pixelSpan: number;
  spacingPx: number;
  spec: AxisSpec;
  labels?: boolean;
}): TickSet {
  const { range, pixelSpan, spacingPx, spec, labels } = args;
  if (spec.mode === "time") {
    const offset = spec.offset ?? 0;
    const tz = spec.timezone ?? "local";
    const minEpoch = range.min + offset;
    const maxEpoch = range.max + offset;
    const span = maxEpoch - minEpoch;
    const approxCount = Math.max(2, Math.floor(pixelSpan / spacingPx));
    const step = pickTimeStep(span / approxCount);
    const ticks: Tick[] = [];
    if (!Number.isFinite(span) || span <= 0) return { step: step.ms, ticks };
    const showDate =
      span >= MS_DAY ||
      Math.floor(minEpoch / MS_DAY) !== Math.floor(maxEpoch / MS_DAY);
    let t = alignTime(minEpoch, step, tz);
    const limit = maxEpoch + step.ms * 0.5;
    for (let i = 0; t <= limit; i++) {
      const value = t - offset;
      const tick: Tick = {
        value,
        major: i % 5 === 0,
        index: timeTickIndex(t, step, tz),
      };
      if (labels) tick.label = formatTimeLabel(t, step, tz, showDate);
      ticks.push(tick);
      t = addTime(t, step, tz);
    }
    return { step: step.ms, ticks };
  }
  const span = range.max - range.min;
  const approxCount = Math.max(2, Math.floor(pixelSpan / spacingPx));
  const step = niceStep(span / approxCount);
  const start = Math.ceil(range.min / step) * step;
  const ticks: Tick[] = [];
  if (!Number.isFinite(step) || step === 0) return { step: 0, ticks: [] };
  for (let v = start, i = 0; v <= range.max + step * 0.5; v += step, i++) {
    const idx = Math.round(v / step);
    const t: Tick = { value: v, major: i % 5 === 0, index: idx };
    if (labels)
      t.label = formatAxisValue({ axis: args.axis, value: v, step, spec });
    ticks.push(t);
  }
  return { step, ticks };
}

export function formatAxisValue(args: {
  axis: AxisId;
  value: number;
  step: number;
  spec: AxisSpec;
}): string {
  const { axis, value, step, spec } = args;
  if (spec.formatter)
    return spec.formatter({
      axis,
      value,
      step,
      mode: spec.mode,
      scale: spec.scale,
    });
  if (spec.mode === "time") {
    const tz = spec.timezone ?? "local";
    const offset = spec.offset ?? 0;
    return formatTimeValue(value + offset, step || MS_SECOND, tz);
  }
  return formatNumericValue(value, step);
}

export function getAxisSpec(model: Model, axis: AxisId): AxisSpec {
  const cfg =
    axis === "x" ? model.config.axisMode?.x : model.config.axisMode?.y;
  const formatter =
    cfg?.formatter ??
    (model.config.tickFormatter
      ? (args: any) =>
          model.config.tickFormatter!(args.value, args.step, args.axis)
      : undefined);
  return resolveAxisSpec({ ...cfg, formatter });
}

export function buildAxisContext(model: Model, view: Viewport): AxisContext {
  const xSpec = getAxisSpec(model, "x");
  const ySpec = getAxisSpec(model, "y");
  const xStep =
    generateTicks({
      axis: "x",
      range: view.world.x,
      pixelSpan: view.plot.size.width,
      spacingPx: model.config.gridSpacing[0],
      spec: xSpec,
      labels: false,
    }).step || 1;
  const yStep =
    generateTicks({
      axis: "y",
      range: view.world.y,
      pixelSpan: view.plot.size.height,
      spacingPx: model.config.gridSpacing[1],
      spec: ySpec,
      labels: false,
    }).step || 1;
  return { xSpec, ySpec, xStep, yStep };
}

export function formatWorld(ctx: AxisContext, world: { x: number; y: number }) {
  return {
    x: formatAxisValue({
      axis: "x",
      value: world.x,
      step: ctx.xStep,
      spec: ctx.xSpec,
    }),
    y: formatAxisValue({
      axis: "y",
      value: world.y,
      step: ctx.yStep,
      spec: ctx.ySpec,
    }),
  };
}
