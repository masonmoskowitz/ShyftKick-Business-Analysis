import { describe, expect, it } from "vitest";
import type { NormalizedSale } from "../model/types";
import {
  averageCheck,
  checkCount,
  discountRate,
  formatCents,
  laborPercentage,
  netSales,
  salesPerLaborHour,
  sumNetSales,
  timecardCost,
  workedHours,
} from "./metrics";

function sale(overrides: Partial<NormalizedSale> = {}): NormalizedSale {
  return {
    id: "s1",
    sourceId: "src-1",
    providerId: "square",
    locationId: "loc-1",
    closedAt: "2026-09-19T19:30:00-07:00",
    businessDate: "2026-09-19",
    grossSales: 10_000,
    discounts: 500,
    refunds: 250,
    tax: 810,
    tips: 1_500,
    serviceCharges: 0,
    giftCardLoads: 0,
    voided: false,
    lines: [],
    ...overrides,
  };
}

describe("netSales", () => {
  it("subtracts discounts and refunds; excludes tax, tips, service charges, gift cards", () => {
    expect(netSales(sale())).toBe(9_250);
  });

  it("voided checks contribute nothing", () => {
    expect(netSales(sale({ voided: true }))).toBe(0);
  });

  it("sums across sales", () => {
    expect(sumNetSales([sale(), sale({ voided: true }), sale()])).toBe(18_500);
  });
});

describe("checkCount", () => {
  it("excludes voided checks from the denominator", () => {
    expect(checkCount([sale(), sale({ voided: true })])).toBe(1);
  });
});

describe("zero-denominator rules (scope §5)", () => {
  it("average check is null with zero checks, never NaN", () => {
    expect(averageCheck(9_250, 0)).toBeNull();
  });

  it("sales per labor hour is null with zero or unknown hours", () => {
    expect(salesPerLaborHour(9_250, 0)).toBeNull();
    expect(salesPerLaborHour(9_250, null)).toBeNull();
    expect(salesPerLaborHour(9_250, 8)).toBe(1_156);
  });

  it("labor percentage is null when sales are zero, not a misleading number", () => {
    expect(laborPercentage(20_000, 0)).toBeNull();
    expect(laborPercentage(null, 50_000)).toBeNull();
    expect(laborPercentage(15_000, 50_000)).toBeCloseTo(0.3);
  });

  it("discount rate is null with zero gross", () => {
    expect(discountRate(500, 0)).toBeNull();
  });
});

describe("workedHours", () => {
  it("open timecards return null and are excluded from final claims", () => {
    expect(workedHours("2026-09-19T09:00:00-07:00", undefined, 0)).toBeNull();
  });

  it("deducts unpaid breaks", () => {
    expect(
      workedHours("2026-09-19T09:00:00-07:00", "2026-09-19T17:30:00-07:00", 30),
    ).toBe(8);
  });

  it("rejects negative spans from edited timecards", () => {
    expect(
      workedHours("2026-09-19T17:00:00-07:00", "2026-09-19T09:00:00-07:00", 0),
    ).toBeNull();
  });

  it("never returns negative hours when breaks exceed the span", () => {
    expect(
      workedHours("2026-09-19T09:00:00-07:00", "2026-09-19T09:15:00-07:00", 60),
    ).toBe(0);
  });
});

describe("timecardCost", () => {
  it("is null without hours or wage", () => {
    expect(timecardCost(null, 1_800)).toBeNull();
    expect(timecardCost(8, undefined)).toBeNull();
  });

  it("multiplies hours by effective wage", () => {
    expect(timecardCost(8, 1_800)).toBe(14_400);
  });
});

describe("formatCents", () => {
  it("formats to currency precision", () => {
    expect(formatCents(9_250)).toBe("$92.50");
    expect(formatCents(1_234_505)).toBe("$12,345.05");
    expect(formatCents(-501)).toBe("-$5.01");
  });
});
