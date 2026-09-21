/**
 * Comparable-day baselines (product scope §5, comparison rules).
 *
 * Default comparison: the latest complete business day against the
 * median of up to eight comparable weekdays. At least four usable
 * comparisons are required for a "normal" baseline; below that the
 * baseline is "forming" and anomaly claims are restricted.
 */

import type { DailyAggregate } from "../model/types";

export const MAX_BASELINE_SAMPLES = 8;
export const MIN_NORMAL_SAMPLES = 4;

export type BaselineStatus = "normal" | "forming" | "insufficient";

export interface Baseline {
  /** Median of the usable comparable values; null when no samples exist. */
  median: number | null;
  sampleSize: number;
  status: BaselineStatus;
  /** Business dates used, most recent first — stored as finding evidence. */
  sampleDates: string[];
}

/** Median of a non-empty numeric array. */
export function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

/**
 * A day is usable for a baseline only when it is complete and has no
 * exclusion flags (closures, holidays, promotions, abnormal hours,
 * data gaps).
 */
export function isUsableForBaseline(day: DailyAggregate): boolean {
  return day.completeness === "complete" && day.exclusions.length === 0;
}

/**
 * Build a baseline for `target` from prior days with the same weekday
 * at the same location. `history` may be in any order and may include
 * unusable days; the most recent usable comparable days win, up to
 * MAX_BASELINE_SAMPLES.
 */
export function comparableBaseline(
  target: DailyAggregate,
  history: DailyAggregate[],
  metric: (day: DailyAggregate) => number | null,
): Baseline {
  const comparables = history
    .filter(
      (day) =>
        day.locationId === target.locationId &&
        day.weekday === target.weekday &&
        day.businessDate < target.businessDate &&
        isUsableForBaseline(day),
    )
    .sort((a, b) => (a.businessDate < b.businessDate ? 1 : -1))
    .slice(0, MAX_BASELINE_SAMPLES);

  const usable = comparables
    .map((day) => ({ date: day.businessDate, value: metric(day) }))
    .filter((entry): entry is { date: string; value: number } => entry.value !== null);

  if (usable.length === 0) {
    return { median: null, sampleSize: 0, status: "insufficient", sampleDates: [] };
  }

  return {
    median: median(usable.map((entry) => entry.value)),
    sampleSize: usable.length,
    status: usable.length >= MIN_NORMAL_SAMPLES ? "normal" : "forming",
    sampleDates: usable.map((entry) => entry.date),
  };
}
