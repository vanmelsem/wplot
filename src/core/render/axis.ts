import type {
  AxisId,
  AxisSpec,
  NumericNotation,
  TimeDisplay,
  TimezoneMode,
} from "../domain/config";
import type { NumericRange } from "../domain/view";

export type Tick = {
  value: number;
  major: boolean;
  index?: number;
  label?: string;
};

export type TickSet = {
  step: number;
  ticks: readonly Tick[];
};

type TimeUnit = "us" | "ms" | "s" | "m" | "h" | "d" | "mo" | "y";
type TimeStep = { unit: TimeUnit; step: number; ms: number };

const MS_MICROSECOND = 1e-3;
const MS_SECOND = 1000;
const MS_MINUTE = 60 * MS_SECOND;
const MS_HOUR = 60 * MS_MINUTE;
const MS_DAY = 24 * MS_HOUR;
const MIN_NUMERIC_TICK_STEP = 1e-6;
const MAX_NUMERIC_TICK_STEP = 1e9;
const MIN_TIME_TICK_STEP_MS = MS_MICROSECOND;
const MAX_TIME_TICK_STEP_MS = 365 * MS_DAY;

const TIME_STEPS: readonly TimeStep[] = [
  { unit: "us", step: 1, ms: 1 * MS_MICROSECOND },
  { unit: "us", step: 2, ms: 2 * MS_MICROSECOND },
  { unit: "us", step: 5, ms: 5 * MS_MICROSECOND },
  { unit: "us", step: 10, ms: 10 * MS_MICROSECOND },
  { unit: "us", step: 20, ms: 20 * MS_MICROSECOND },
  { unit: "us", step: 50, ms: 50 * MS_MICROSECOND },
  { unit: "us", step: 100, ms: 100 * MS_MICROSECOND },
  { unit: "us", step: 200, ms: 200 * MS_MICROSECOND },
  { unit: "us", step: 500, ms: 500 * MS_MICROSECOND },
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

function pickTimeStep(ms: number): TimeStep {
  for (const step of TIME_STEPS) {
    if (ms <= step.ms) return step;
  }
  return TIME_STEPS[TIME_STEPS.length - 1]!;
}

function getDatePart(
  date: Date,
  tz: TimezoneMode,
  part: "fullYear" | "month" | "date" | "hours" | "minutes" | "seconds" | "ms",
): number {
  if (tz === "utc") {
    switch (part) {
      case "fullYear":
        return date.getUTCFullYear();
      case "month":
        return date.getUTCMonth();
      case "date":
        return date.getUTCDate();
      case "hours":
        return date.getUTCHours();
      case "minutes":
        return date.getUTCMinutes();
      case "seconds":
        return date.getUTCSeconds();
      case "ms":
        return date.getUTCMilliseconds();
    }
  }
  switch (part) {
    case "fullYear":
      return date.getFullYear();
    case "month":
      return date.getMonth();
    case "date":
      return date.getDate();
    case "hours":
      return date.getHours();
    case "minutes":
      return date.getMinutes();
    case "seconds":
      return date.getSeconds();
    case "ms":
      return date.getMilliseconds();
  }
}

function setDatePart(
  date: Date,
  tz: TimezoneMode,
  part: "fullYear" | "month" | "date" | "hours" | "minutes" | "seconds" | "ms",
  value: number,
): void {
  if (tz === "utc") {
    switch (part) {
      case "fullYear":
        date.setUTCFullYear(value);
        return;
      case "month":
        date.setUTCMonth(value);
        return;
      case "date":
        date.setUTCDate(value);
        return;
      case "hours":
        date.setUTCHours(value);
        return;
      case "minutes":
        date.setUTCMinutes(value);
        return;
      case "seconds":
        date.setUTCSeconds(value);
        return;
      case "ms":
        date.setUTCMilliseconds(value);
        return;
    }
  }
  switch (part) {
    case "fullYear":
      date.setFullYear(value);
      return;
    case "month":
      date.setMonth(value);
      return;
    case "date":
      date.setDate(value);
      return;
    case "hours":
      date.setHours(value);
      return;
    case "minutes":
      date.setMinutes(value);
      return;
    case "seconds":
      date.setSeconds(value);
      return;
    case "ms":
      date.setMilliseconds(value);
      return;
  }
}

function alignTime(t: number, step: TimeStep, tz: TimezoneMode): number {
  if (step.unit === "us" || step.unit === "ms") {
    return Math.floor(t / step.ms) * step.ms;
  }
  const date = new Date(t);
  if (step.unit === "s") {
    const second = getDatePart(date, tz, "seconds");
    setDatePart(date, tz, "seconds", second - (second % step.step));
    setDatePart(date, tz, "ms", 0);
    return date.getTime();
  }
  if (step.unit === "m") {
    const minute = getDatePart(date, tz, "minutes");
    setDatePart(date, tz, "minutes", minute - (minute % step.step));
    setDatePart(date, tz, "seconds", 0);
    setDatePart(date, tz, "ms", 0);
    return date.getTime();
  }
  if (step.unit === "h") {
    const hour = getDatePart(date, tz, "hours");
    setDatePart(date, tz, "hours", hour - (hour % step.step));
    setDatePart(date, tz, "minutes", 0);
    setDatePart(date, tz, "seconds", 0);
    setDatePart(date, tz, "ms", 0);
    return date.getTime();
  }
  if (step.unit === "d") {
    const day = getDatePart(date, tz, "date");
    setDatePart(date, tz, "date", day - ((day - 1) % step.step));
    setDatePart(date, tz, "hours", 0);
    setDatePart(date, tz, "minutes", 0);
    setDatePart(date, tz, "seconds", 0);
    setDatePart(date, tz, "ms", 0);
    return date.getTime();
  }
  if (step.unit === "mo") {
    const month = getDatePart(date, tz, "month");
    setDatePart(date, tz, "month", month - (month % step.step));
    setDatePart(date, tz, "date", 1);
    setDatePart(date, tz, "hours", 0);
    setDatePart(date, tz, "minutes", 0);
    setDatePart(date, tz, "seconds", 0);
    setDatePart(date, tz, "ms", 0);
    return date.getTime();
  }
  const year = getDatePart(date, tz, "fullYear");
  setDatePart(date, tz, "fullYear", year - (year % step.step));
  setDatePart(date, tz, "month", 0);
  setDatePart(date, tz, "date", 1);
  setDatePart(date, tz, "hours", 0);
  setDatePart(date, tz, "minutes", 0);
  setDatePart(date, tz, "seconds", 0);
  setDatePart(date, tz, "ms", 0);
  return date.getTime();
}

function addTime(t: number, step: TimeStep, tz: TimezoneMode): number {
  if (
    step.unit === "us" ||
    step.unit === "ms" ||
    step.unit === "s" ||
    step.unit === "m" ||
    step.unit === "h"
  ) {
    return t + step.ms;
  }
  const date = new Date(t);
  if (step.unit === "d") {
    const day = getDatePart(date, tz, "date");
    setDatePart(date, tz, "date", day + step.step);
    return date.getTime();
  }
  if (step.unit === "mo") {
    const month = getDatePart(date, tz, "month");
    setDatePart(date, tz, "month", month + step.step);
    return date.getTime();
  }
  const year = getDatePart(date, tz, "fullYear");
  setDatePart(date, tz, "fullYear", year + step.step);
  return date.getTime();
}

function timeTickIndex(
  epochMs: number,
  step: TimeStep,
  tz: TimezoneMode,
): number {
  switch (step.unit) {
    case "us":
    case "ms":
    case "s":
    case "m":
    case "h":
      return Math.round(epochMs / step.ms);
    case "d": {
      const date = new Date(epochMs);
      const year = getDatePart(date, tz, "fullYear");
      const month = getDatePart(date, tz, "month");
      const day = getDatePart(date, tz, "date");
      const midnight =
        tz === "utc"
          ? Date.UTC(year, month, day)
          : new Date(year, month, day).getTime();
      return Math.floor(Math.floor(midnight / MS_DAY) / step.step);
    }
    case "mo": {
      const date = new Date(epochMs);
      const year = getDatePart(date, tz, "fullYear");
      const month = getDatePart(date, tz, "month");
      return Math.floor((year * 12 + month) / step.step);
    }
    case "y": {
      const date = new Date(epochMs);
      const year = getDatePart(date, tz, "fullYear");
      return Math.floor(year / step.step);
    }
  }
}

function formatTwo(value: number): string {
  return value < 10 ? `0${value}` : `${value}`;
}

function formatThree(value: number): string {
  if (value < 10) return `00${value}`;
  if (value < 100) return `0${value}`;
  return `${value}`;
}

function splitEpochMs(epochMs: number): {
  wholeMs: number;
  micros: number;
} {
  let wholeMs = Math.floor(epochMs);
  let micros = Math.round((epochMs - wholeMs) * 1000);
  if (micros >= 1000) {
    wholeMs += 1;
    micros -= 1000;
  } else if (micros < 0) {
    wholeMs -= 1;
    micros += 1000;
  }
  return { wholeMs, micros };
}

function formatTimeLabel(
  epochMs: number,
  step: TimeStep,
  tz: TimezoneMode,
  showDate: boolean,
): string {
  const { wholeMs, micros } = splitEpochMs(epochMs);
  const date = new Date(wholeMs);
  const year = getDatePart(date, tz, "fullYear");
  const month = getDatePart(date, tz, "month");
  const day = getDatePart(date, tz, "date");
  const hour = getDatePart(date, tz, "hours");
  const minute = getDatePart(date, tz, "minutes");
  const second = getDatePart(date, tz, "seconds");
  const ms = getDatePart(date, tz, "ms");

  const dateStr = `${MONTHS_SHORT[month]} ${day}`;
  if (step.unit === "y") return `${year}`;
  if (step.unit === "mo") return `${MONTHS_SHORT[month]} ${year}`;
  if (step.unit === "d") return dateStr;
  const timeStr =
    step.unit === "s"
      ? `${formatTwo(hour)}:${formatTwo(minute)}:${formatTwo(second)}`
      : step.unit === "m" || step.unit === "h"
        ? `${formatTwo(hour)}:${formatTwo(minute)}`
        : step.unit === "ms"
          ? `${formatTwo(hour)}:${formatTwo(minute)}:${formatTwo(second)}.${formatThree(ms)}`
          : `${formatTwo(hour)}:${formatTwo(minute)}:${formatTwo(second)}.${formatThree(ms)}${formatThree(micros)}`;
  if (!showDate) return timeStr;
  const isMidnight =
    hour === 0 && minute === 0 && second === 0 && ms === 0 && micros === 0;
  return isMidnight ? dateStr : timeStr;
}

function formatTimeValue(
  epochMs: number,
  stepMs: number,
  tz: TimezoneMode,
): string {
  const { wholeMs, micros } = splitEpochMs(epochMs);
  const date = new Date(wholeMs);
  const year = getDatePart(date, tz, "fullYear");
  const month = getDatePart(date, tz, "month") + 1;
  const day = getDatePart(date, tz, "date");
  const hour = getDatePart(date, tz, "hours");
  const minute = getDatePart(date, tz, "minutes");
  const second = getDatePart(date, tz, "seconds");
  const ms = getDatePart(date, tz, "ms");
  const showMicros = stepMs < 1;
  const showMs = stepMs < MS_SECOND;
  const showSec = stepMs < MS_MINUTE;
  const showTime = stepMs < MS_DAY;
  const dateStr = `${year}-${formatTwo(month)}-${formatTwo(day)}`;
  if (!showTime) return dateStr;
  const timeStr = showSec
    ? `${formatTwo(hour)}:${formatTwo(minute)}:${formatTwo(second)}${showMs ? `.${showMicros ? `${formatThree(ms)}${formatThree(micros)}` : formatThree(ms)}` : ""}`
    : `${formatTwo(hour)}:${formatTwo(minute)}`;
  return `${dateStr} ${timeStr}`;
}

function trimTrailingZeros(value: string): string {
  return value.includes(".")
    ? value.replace(/(\.\d*?[1-9])0+$/u, "$1").replace(/\.0+$/u, "")
    : value;
}

function formatEngineeringValue(value: number, precision: number): string {
  if (value === 0) return "0";
  const abs = Math.abs(value);
  const exponent = Math.floor(Math.log10(abs) / 3) * 3;
  const scaled = value / 10 ** exponent;
  const mantissa = trimTrailingZeros(scaled.toFixed(Math.max(0, precision)));
  const exponentLabel = exponent >= 0 ? `+${exponent}` : `${exponent}`;
  return `${mantissa}e${exponentLabel}`;
}

function formatDurationValue(
  valueMs: number,
  stepMs: number,
  display: TimeDisplay,
): string {
  const signed = display === "relative";
  const sign = valueMs < 0 ? "-" : signed && valueMs > 0 ? "+" : "";
  const absMs = Math.abs(valueMs);

  if (absMs < 1) {
    const micros = absMs * 1000;
    const digits = stepMs < 1e-3 ? 3 : stepMs < 1e-2 ? 2 : 1;
    return `${sign}${trimTrailingZeros(micros.toFixed(digits))}us`;
  }

  if (absMs < MS_SECOND) {
    const digits = stepMs < 1 ? 3 : stepMs < 10 ? 2 : 1;
    return `${sign}${trimTrailingZeros(absMs.toFixed(digits))}ms`;
  }

  const totalSeconds = absMs / MS_SECOND;
  const days = Math.floor(totalSeconds / (24 * 60 * 60));
  const hours = Math.floor(totalSeconds / (60 * 60)) % 24;
  const minutes = Math.floor(totalSeconds / 60) % 60;
  const seconds = Math.floor(totalSeconds) % 60;
  const fractionalMs = Math.round((totalSeconds - Math.floor(totalSeconds)) * 1000);
  const showFractionalSeconds = stepMs < MS_SECOND;
  const secondsLabel = showFractionalSeconds
    ? `${formatTwo(seconds)}.${formatThree(fractionalMs)}`
    : formatTwo(seconds);

  if (days > 0) {
    return `${sign}${days}d ${formatTwo(hours)}:${formatTwo(minutes)}:${secondsLabel}`;
  }
  if (hours > 0) {
    return `${sign}${formatTwo(hours)}:${formatTwo(minutes)}:${secondsLabel}`;
  }
  return `${sign}${formatTwo(minutes)}:${secondsLabel}`;
}

function niceStep(raw: number): number {
  if (raw <= 0 || !Number.isFinite(raw)) return 1;
  const pow10 = Math.pow(10, Math.floor(Math.log10(raw)));
  const digit = raw / pow10;
  if (digit <= 1) return 1 * pow10;
  if (digit <= 2) return 2 * pow10;
  if (digit <= 5) return 5 * pow10;
  return 10 * pow10;
}

function numericStepPrecision(stepAbs: number): number {
  if (!Number.isFinite(stepAbs) || stepAbs <= 0) return 0;
  if (stepAbs >= 1) {
    const fraction = Math.abs(stepAbs - Math.round(stepAbs));
    return fraction > 1e-9 ? Math.min(9, Math.ceil(-Math.log10(fraction))) : 0;
  }
  return Math.min(9, Math.max(0, Math.ceil(-Math.log10(stepAbs))));
}

function scaledNumericStep(step: number): {
  digits: number;
  scale: number;
  stepInt: number;
} | null {
  const stepAbs = Math.abs(step);
  if (!Number.isFinite(stepAbs) || stepAbs <= 0) return null;
  const digits = numericStepPrecision(stepAbs);
  const scale = 10 ** digits;
  const stepInt = Math.round(step * scale);
  if (!Number.isSafeInteger(stepInt) || stepInt === 0) return null;
  return { digits, scale, stepInt };
}

function cleanNumericTickValue(value: number, step: number): number {
  if (!Number.isFinite(value)) return value;
  const digits = numericStepPrecision(Math.abs(step));
  if (digits <= 0) return Math.round(value);
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function formatNumericValue(value: number, step: number, spec: AxisSpec): string {
  if (!Number.isFinite(value)) return "0";
  const stepAbs = Math.abs(step);
  if (stepAbs > 0 && Math.abs(value) < stepAbs * 0.5) value = 0;
  if (value === 0) return "0";
  const abs = Math.abs(value);
  const digits = spec.precision ?? numericStepPrecision(stepAbs);
  const notation: NumericNotation = spec.notation ?? "auto";

  if (notation === "fixed") {
    return cleanNumericTickValue(value, step).toFixed(digits);
  }
  if (notation === "scientific") {
    return value.toExponential(Math.max(0, digits));
  }
  if (notation === "engineering") {
    return formatEngineeringValue(value, digits || 3);
  }
  if (abs >= 1e6 || (abs > 0 && abs < 1e-9)) {
    return value.toExponential(spec.precision ?? 4);
  }
  return cleanNumericTickValue(value, step).toFixed(digits);
}

export function resolveAxisStep(args: {
  range: NumericRange;
  spanPx: number;
  spacingPx: number;
  spec: AxisSpec;
}): number {
  const { range, spanPx, spacingPx, spec } = args;
  const span = range.max - range.min;
  const approxCount = Math.max(2, Math.floor(spanPx / spacingPx));
  if (spec.mode === "time") {
    return pickTimeStep(span / approxCount).ms;
  }
  return niceStep(span / approxCount);
}

// Log axes carry values in linear value-space but project through a log10
// transform (see viewport.ts), so ticks must sit at decades (10^n) plus 1/2/5
// mantissas, with density backing off to bare decades over wide ranges.
function generateLogTicks(args: {
  axis: AxisId;
  range: NumericRange;
  spanPx: number;
  spacingPx: number;
  spec: AxisSpec;
  labels?: boolean;
}): TickSet {
  const { range, spanPx, spacingPx, spec, labels, axis } = args;
  const hi = range.max;
  // Log scale is only defined for positive values; clamp the low end so a view
  // that dips to or below zero still yields sane decade ticks.
  const lo = range.min > 0 ? range.min : hi > 0 ? hi / 1e6 : 1e-6;
  if (!(hi > lo) || !Number.isFinite(hi) || !Number.isFinite(lo)) {
    return { step: 0, ticks: [] };
  }

  const loExp = Math.floor(Math.log10(lo));
  const hiExp = Math.ceil(Math.log10(hi));
  const decades = Math.max(1, hiExp - loExp);
  const approxCount = Math.max(2, Math.floor(spanPx / spacingPx));

  let mantissas: readonly number[];
  let decadeStride = 1;
  if (decades <= 1) {
    mantissas = [1, 2, 3, 4, 5, 6, 7, 8, 9];
  } else if (decades <= approxCount) {
    mantissas = [1, 2, 5];
  } else {
    mantissas = [1];
    decadeStride = Math.ceil(decades / approxCount);
  }

  const loEps = lo * (1 - 1e-9);
  const hiEps = hi * (1 + 1e-9);
  const ticks: Tick[] = [];
  let i = 0;
  for (let e = loExp; e <= hiExp; e += decadeStride) {
    const base = 10 ** e;
    for (const m of mantissas) {
      const value = m * base;
      if (value < loEps || value > hiEps) continue;
      const tick: Tick = { value, major: m === 1, index: i };
      if (labels) {
        tick.label = formatAxisValue({ axis, value, step: value, spec });
      }
      ticks.push(tick);
      i += 1;
    }
  }
  return { step: 10 ** loExp, ticks };
}

export function generateTicks(args: {
  axis: AxisId;
  range: NumericRange;
  spanPx: number;
  spacingPx: number;
  spec: AxisSpec;
  labels?: boolean;
}): TickSet {
  const { range, spanPx, spacingPx, spec, labels } = args;
  if (spec.scale === "log" && spec.mode !== "time") {
    return generateLogTicks(args);
  }
  if (spec.mode === "time") {
    const offset = spec.offset ?? 0;
    const tz = spec.timezone ?? "local";
    const minEpoch = range.min + offset;
    const maxEpoch = range.max + offset;
    const span = maxEpoch - minEpoch;
    const approxCount = Math.max(2, Math.floor(spanPx / spacingPx));
    const step = pickTimeStep(span / approxCount);
    const ticks: Tick[] = [];
    if (!Number.isFinite(span) || span <= 0) return { step: step.ms, ticks };
    const showDate =
      span >= MS_DAY ||
      Math.floor(minEpoch / MS_DAY) !== Math.floor(maxEpoch / MS_DAY);
    let t = alignTime(minEpoch, step, tz);
    const limit = maxEpoch + step.ms * 0.5;
    for (let i = 0; t <= limit; i += 1) {
      const value = t - offset;
      const tick: Tick = {
        value,
        major: i % 5 === 0,
        index: timeTickIndex(t, step, tz),
      };
      if (labels) tick.label = formatAxisValue({ axis: args.axis, value, step: step.ms, spec });
      ticks.push(tick);
      t = addTime(t, step, tz);
    }
    return { step: step.ms, ticks };
  }

  const span = range.max - range.min;
  const approxCount = Math.max(2, Math.floor(spanPx / spacingPx));
  const step = niceStep(span / approxCount);
  const ticks: Tick[] = [];
  if (!Number.isFinite(step) || step === 0) return { step: 0, ticks: [] };
  const epsilon = Math.abs(step) * 1e-6;
  const scaled = scaledNumericStep(step);
  if (scaled) {
    const minScaled = Math.ceil((range.min - epsilon) * scaled.scale);
    const maxScaled = Math.floor((range.max + epsilon) * scaled.scale);
    const startIndex = Math.ceil(minScaled / scaled.stepInt);
    const endIndex = Math.floor(maxScaled / scaled.stepInt);
    for (let idx = startIndex, i = 0; idx <= endIndex; idx += 1, i += 1) {
      const scaledValue = idx * scaled.stepInt;
      if (!Number.isSafeInteger(scaledValue)) break;
      const value = scaledValue / scaled.scale;
      const tick: Tick = { value, major: i % 5 === 0, index: idx };
      if (labels) tick.label = formatAxisValue({ axis: args.axis, value, step, spec });
      ticks.push(tick);
    }
    return { step, ticks };
  }

  const startIndex = Math.ceil((range.min - epsilon) / step);
  const endIndex = Math.floor((range.max + epsilon) / step);
  for (let idx = startIndex, i = 0; idx <= endIndex; idx += 1, i += 1) {
    const value = cleanNumericTickValue(idx * step, step);
    const tick: Tick = { value, major: i % 5 === 0, index: idx };
    if (labels) tick.label = formatAxisValue({ axis: args.axis, value, step, spec });
    ticks.push(tick);
  }
  return { step, ticks };
}

export function clampRangeByTickStep(args: {
  range: NumericRange;
  prevRange?: NumericRange;
  pivot: number;
  spanPx: number;
  spacingPx: number;
  spec: AxisSpec;
}): NumericRange {
  const { range, prevRange, pivot, spanPx, spacingPx, spec } = args;
  // Log axes snap through the log transform, not a linear nice-step.
  if (spec.scale === "log") return range;
  const span = range.max - range.min;
  if (!Number.isFinite(span) || span <= 0) return range;
  if (!Number.isFinite(pivot)) return range;
  if (!Number.isFinite(spanPx) || spanPx <= 0) return range;
  if (!Number.isFinite(spacingPx) || spacingPx <= 0) return range;

  const approxCount = Math.max(2, Math.floor(spanPx / spacingPx));
  const minSpan =
    spec.mode === "time"
      ? MIN_TIME_TICK_STEP_MS * approxCount
      : MIN_NUMERIC_TICK_STEP * approxCount;
  let maxSpan =
    spec.mode === "time"
      ? MAX_TIME_TICK_STEP_MS * approxCount
      : MAX_NUMERIC_TICK_STEP * approxCount;
  if (minSpan > maxSpan) maxSpan = minSpan;

  if (prevRange) {
    const prevSpan = prevRange.max - prevRange.min;
    if (prevSpan >= maxSpan && span >= maxSpan) return prevRange;
    if (prevSpan <= minSpan && span <= minSpan) return prevRange;
  }

  let targetSpan = span;
  if (span < minSpan) targetSpan = minSpan;
  if (span > maxSpan) targetSpan = maxSpan;
  if (targetSpan === span) return range;

  const scale = targetSpan / span;
  return {
    min: pivot + (range.min - pivot) * scale,
    max: pivot + (range.max - pivot) * scale,
  };
}

export function formatAxisValue(args: {
  axis: AxisId;
  value: number;
  step: number;
  spec: AxisSpec;
}): string {
  const { axis, value, step, spec } = args;
  if (spec.formatter) {
    return spec.formatter({
      axis,
      value,
      step,
      mode: spec.mode,
      scale: spec.scale,
    });
  }
  if (spec.mode === "time") {
    const stepMs = step || MS_SECOND;
    const display = spec.timeDisplay ?? "absolute";
    if (display !== "absolute") {
      return formatDurationValue(value, stepMs, display);
    }
    return formatTimeValue(
      value + (spec.offset ?? 0),
      stepMs,
      spec.timezone ?? "local",
    );
  }
  return formatNumericValue(value, step, spec);
}
