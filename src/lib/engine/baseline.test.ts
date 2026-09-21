import { describe, expect, it } from "vitest";
import type { DailyAggregate } from "../model/types";
import { comparableBaseline, median } from "./baseline";

function day(
  businessDate: string,
  netSales: number,
  overrides: Partial<DailyAggregate> = {},
): DailyAggregate {
  return {
    locationId: "loc-1",
    businessDate,
    weekday: 5, // Friday
    netSales,
    grossSales: netSales,
    discounts: 0,
    refunds: 0,
    checkCount: 100,
    laborHours: 40,
    laborCost: 60_000,
    completeness: "complete",
    exclusions: [],
    ...overrides,
  };
}

const target = day("2026-09-18", 250_000);
const metric = (d: DailyAggregate) => d.netSales;

describe("median", () => {
  it("handles odd and even counts", () => {
    expect(median([3, 1, 2])).toBe(2);
    expect(median([4, 1, 3, 2])).toBe(2.5);
  });
});

describe("comparableBaseline", () => {
  it("requires four usable comparisons for a normal baseline", () => {
    const history = [
      day("2026-08-28", 240_000),
      day("2026-09-04", 260_000),
      day("2026-09-11", 250_000),
    ];
    const result = comparableBaseline(target, history, metric);
    expect(result.status).toBe("forming");
    expect(result.sampleSize).toBe(3);
  });

  it("is normal at four or more samples and uses the median", () => {
    const history = [
      day("2026-08-21", 200_000),
      day("2026-08-28", 240_000),
      day("2026-09-04", 260_000),
      day("2026-09-11", 300_000),
    ];
    const result = comparableBaseline(target, history, metric);
    expect(result.status).toBe("normal");
    expect(result.median).toBe(250_000);
  });

  it("caps at the eight most recent comparable days", () => {
    const history = Array.from({ length: 12 }, (_, i) =>
      day(`2026-06-${String(i + 1).padStart(2, "0")}`, 100_000 + i),
    );
    const result = comparableBaseline(target, history, metric);
    expect(result.sampleSize).toBe(8);
    // Most recent 8 of the 12 (indexes 4..11).
    expect(result.sampleDates[0]).toBe("2026-06-12");
    expect(result.sampleDates).not.toContain("2026-06-01");
  });

  it("excludes flagged, partial, mismatched-weekday, and future days", () => {
    const history = [
      day("2026-09-11", 250_000, { exclusions: ["holiday"] }),
      day("2026-09-04", 250_000, { completeness: "partial" }),
      day("2026-09-10", 250_000, { weekday: 4 }),
      day("2026-09-12", 250_000, { locationId: "loc-2" }),
      day("2026-09-25", 250_000), // after the target date
      day("2026-08-28", 240_000),
    ];
    const result = comparableBaseline(target, history, metric);
    expect(result.sampleSize).toBe(1);
    expect(result.sampleDates).toEqual(["2026-08-28"]);
  });

  it("reports insufficient with no usable history", () => {
    const result = comparableBaseline(target, [], metric);
    expect(result.status).toBe("insufficient");
    expect(result.median).toBeNull();
  });

  it("skips days where the metric itself is null", () => {
    const history = [
      day("2026-08-28", 240_000, { laborHours: null }),
      day("2026-09-04", 260_000),
    ];
    const result = comparableBaseline(
      target,
      history,
      (d) => d.laborHours,
    );
    expect(result.sampleSize).toBe(1);
  });
});
