/**
 * Deterministic metric calculations (product scope §5).
 *
 * Rules that are load-bearing for trust:
 * - Metrics with a zero denominator are `null` (undefined by rule),
 *   never 0, Infinity, or NaN. A null metric disables dependent
 *   findings; it is not a value.
 * - Net sales follows one documented definition. Provider mapping
 *   must reconcile to it before activation.
 * - The language model never computes any of these numbers; it only
 *   narrates values produced here.
 */

import type { Cents, NormalizedSale } from "../model/types";

/**
 * Net sales definition (documented, provider-aligned):
 * gross item sales − discounts − refunds. Excludes tax, tips,
 * service charges, and gift card loads. Voided checks contribute
 * nothing.
 */
export function netSales(sale: NormalizedSale): Cents {
  if (sale.voided) return 0;
  return sale.grossSales - sale.discounts - sale.refunds;
}

export function sumNetSales(sales: NormalizedSale[]): Cents {
  return sales.reduce((total, sale) => total + netSales(sale), 0);
}

/** Comparable check count: voided checks are excluded from the denominator. */
export function checkCount(sales: NormalizedSale[]): number {
  return sales.filter((s) => !s.voided).length;
}

/** Average check in cents; null when there are no comparable checks. */
export function averageCheck(net: Cents, checks: number): Cents | null {
  if (checks <= 0) return null;
  return Math.round(net / checks);
}

/** Sales per labor hour in cents; null (undefined) when hours are zero or unknown. */
export function salesPerLaborHour(
  net: Cents,
  laborHours: number | null,
): Cents | null {
  if (laborHours === null || laborHours <= 0) return null;
  return Math.round(net / laborHours);
}

/**
 * Direct labor percentage (0–1 fraction); null when sales are zero or
 * labor cost is unknown, rather than a misleading percentage.
 * Covers direct wages only — salary, benefits, payroll taxes, and other
 * burdens are excluded and must be identified as such in output.
 */
export function laborPercentage(
  laborCost: Cents | null,
  net: Cents,
): number | null {
  if (laborCost === null || net <= 0) return null;
  return laborCost / net;
}

/** Discount rate as a fraction of gross; null when gross is zero. */
export function discountRate(discounts: Cents, gross: Cents): number | null {
  if (gross <= 0) return null;
  return discounts / gross;
}

/**
 * Worked hours from a closed timecard, minus unpaid breaks.
 * Open timecards (no clockOut) return null and must be excluded from
 * final claims (scope §5).
 */
export function workedHours(
  clockIn: string,
  clockOut: string | undefined,
  unpaidBreakMinutes: number,
): number | null {
  if (!clockOut) return null;
  const ms = new Date(clockOut).getTime() - new Date(clockIn).getTime();
  if (Number.isNaN(ms) || ms < 0) return null;
  const hours = ms / 3_600_000 - unpaidBreakMinutes / 60;
  return hours < 0 ? 0 : hours;
}

/** Direct wage cost for a closed timecard with a known wage; otherwise null. */
export function timecardCost(
  hours: number | null,
  hourlyWage: Cents | undefined,
): Cents | null {
  if (hours === null || hourlyWage === undefined) return null;
  return Math.round(hours * hourlyWage);
}

/** Format cents as USD for deterministic report output. */
export function formatCents(cents: Cents): string {
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(cents);
  const dollars = Math.floor(abs / 100);
  const remainder = String(abs % 100).padStart(2, "0");
  return `${sign}$${dollars.toLocaleString("en-US")}.${remainder}`;
}
