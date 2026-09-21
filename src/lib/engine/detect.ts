/**
 * Candidate-finding detection (product scope §5).
 *
 * Thresholds combine relative change, absolute impact, and sufficient
 * sample size so tiny denominators do not create dramatic alerts.
 * Detection produces candidate findings with stored evidence; it never
 * produces conclusions the data cannot support. Missing or stale data
 * becomes an operational notice, not a business finding.
 */

import type { Baseline } from "./baseline";

export interface DetectionThresholds {
  /** Minimum relative change vs baseline, e.g. 0.15 for 15%. */
  minRelativeChange: number;
  /** Minimum absolute impact in the metric's own unit (cents for money). */
  minAbsoluteImpact: number;
  /** Minimum baseline sample size to make any anomaly claim. */
  minSampleSize: number;
}

/** Conservative defaults; customer rules can override per metric (versioned). */
export const DEFAULT_THRESHOLDS: DetectionThresholds = {
  minRelativeChange: 0.15,
  minAbsoluteImpact: 5_000, // $50.00
  minSampleSize: 4,
};

export type FindingDirection = "above" | "below";

export interface CandidateFinding {
  metricKey: string;
  direction: FindingDirection;
  current: number;
  baselineMedian: number;
  relativeChange: number;
  absoluteChange: number;
  baseline: Baseline;
  thresholds: DetectionThresholds;
}

export interface DetectionResult {
  finding: CandidateFinding | null;
  /** Why no finding was raised — stored for explainability. */
  suppressedReason:
    | null
    | "no_baseline"
    | "baseline_forming"
    | "below_relative_threshold"
    | "below_absolute_threshold";
}

/**
 * Compare a current metric value against its baseline. Returns a
 * candidate finding only when every gate passes; otherwise records the
 * specific suppression reason.
 */
export function detectDeviation(
  metricKey: string,
  current: number | null,
  baseline: Baseline,
  thresholds: DetectionThresholds = DEFAULT_THRESHOLDS,
): DetectionResult {
  if (
    current === null ||
    baseline.median === null ||
    baseline.status === "insufficient"
  ) {
    return { finding: null, suppressedReason: "no_baseline" };
  }
  if (
    baseline.status === "forming" ||
    baseline.sampleSize < thresholds.minSampleSize
  ) {
    return { finding: null, suppressedReason: "baseline_forming" };
  }

  const absoluteChange = current - baseline.median;
  const relativeChange =
    baseline.median === 0 ? 0 : absoluteChange / Math.abs(baseline.median);

  if (Math.abs(relativeChange) < thresholds.minRelativeChange) {
    return { finding: null, suppressedReason: "below_relative_threshold" };
  }
  if (Math.abs(absoluteChange) < thresholds.minAbsoluteImpact) {
    return { finding: null, suppressedReason: "below_absolute_threshold" };
  }

  return {
    finding: {
      metricKey,
      direction: absoluteChange > 0 ? "above" : "below",
      current,
      baselineMedian: baseline.median,
      relativeChange,
      absoluteChange,
      baseline,
      thresholds,
    },
    suppressedReason: null,
  };
}
