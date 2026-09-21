import { describe, expect, it } from "vitest";
import type { Baseline } from "./baseline";
import { DEFAULT_THRESHOLDS, detectDeviation } from "./detect";

function baseline(overrides: Partial<Baseline> = {}): Baseline {
  return {
    median: 100_000,
    sampleSize: 6,
    status: "normal",
    sampleDates: [],
    ...overrides,
  };
}

describe("detectDeviation", () => {
  it("raises a finding when relative and absolute gates both pass", () => {
    const result = detectDeviation("net_sales", 70_000, baseline());
    expect(result.finding).not.toBeNull();
    expect(result.finding?.direction).toBe("below");
    expect(result.finding?.relativeChange).toBeCloseTo(-0.3);
    expect(result.finding?.absoluteChange).toBe(-30_000);
  });

  it("suppresses when the metric is null or the baseline is missing", () => {
    expect(detectDeviation("splh", null, baseline()).suppressedReason).toBe(
      "no_baseline",
    );
    expect(
      detectDeviation("net_sales", 70_000, baseline({ median: null, status: "insufficient" }))
        .suppressedReason,
    ).toBe("no_baseline");
  });

  it("restricts anomaly claims while the baseline is forming", () => {
    const result = detectDeviation(
      "net_sales",
      50_000,
      baseline({ status: "forming", sampleSize: 2 }),
    );
    expect(result.finding).toBeNull();
    expect(result.suppressedReason).toBe("baseline_forming");
  });

  it("suppresses small relative changes", () => {
    const result = detectDeviation("net_sales", 95_000, baseline());
    expect(result.suppressedReason).toBe("below_relative_threshold");
  });

  it("suppresses dramatic-looking changes on tiny denominators", () => {
    // 50% swing but only $30 of impact — the absolute gate blocks it.
    const result = detectDeviation(
      "net_sales",
      3_000,
      baseline({ median: 6_000 }),
    );
    expect(result.finding).toBeNull();
    expect(result.suppressedReason).toBe("below_absolute_threshold");
  });

  it("records the thresholds used as evidence", () => {
    const result = detectDeviation("net_sales", 70_000, baseline());
    expect(result.finding?.thresholds).toEqual(DEFAULT_THRESHOLDS);
  });
});
