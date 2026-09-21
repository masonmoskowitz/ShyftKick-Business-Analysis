/**
 * Canonical internal data model.
 *
 * Every connector converts source data into these shapes; the analysis
 * engine consumes only this model, never provider-specific payloads
 * (product scope §4). All monetary values are integer cents (USD).
 * All timestamps are ISO 8601 with offset; business-date assignment is
 * computed by the engine, never trusted from the source.
 */

/** Integer cents. Never use floats for money. */
export type Cents = number;

/** ISO 8601 date, e.g. "2026-09-20". */
export type ISODate = string;

/** ISO 8601 timestamp with offset. */
export type ISOTimestamp = string;

/** IANA timezone name, e.g. "America/Phoenix". */
export type TimeZone = string;

export interface Organization {
  id: string;
  name: string;
  timezoneDefault: TimeZone;
}

export interface Location {
  id: string;
  organizationId: string;
  name: string;
  address?: string;
  timezone: TimeZone;
  /** Local time at which the business day rolls over, e.g. "03:00". */
  businessDayCutoff: string;
  /** Provider location IDs, keyed by provider id, to prevent duplicate imports. */
  providerLocationIds: Record<string, string>;
}

/** One normalized sales transaction (check/order). */
export interface NormalizedSale {
  /** Stable internal id. */
  id: string;
  /** Source system record id — used for dedupe with uniqueness constraints. */
  sourceId: string;
  providerId: string;
  locationId: string;
  /** Timestamp that drives daypart/business-date allocation (recorded which one). */
  closedAt: ISOTimestamp;
  businessDate: ISODate;
  grossSales: Cents;
  discounts: Cents;
  refunds: Cents;
  tax: Cents;
  tips: Cents;
  serviceCharges: Cents;
  /** Gift card loads are excluded from net sales; redemptions are tender, not sales. */
  giftCardLoads: Cents;
  voided: boolean;
  channel?: string;
  lines: SaleLine[];
}

export interface SaleLine {
  sourceId: string;
  /** Category after cross-location mapping (scope §5: map before aggregating). */
  category: string;
  itemName: string;
  quantity: number;
  grossAmount: Cents;
  discountAmount: Cents;
}

export interface Timecard {
  id: string;
  sourceId: string;
  providerId: string;
  locationId: string;
  employeeRef: string;
  role?: string;
  clockIn: ISOTimestamp;
  /** Missing while the shift is open; open timecards are excluded from final claims. */
  clockOut?: ISOTimestamp;
  /** Unpaid break minutes already deducted by the source, if known. */
  unpaidBreakMinutes: number;
  /** Effective hourly wage in cents, when wage data is available. */
  hourlyWage?: Cents;
}

export interface ScheduledShift {
  id: string;
  sourceId: string;
  providerId: string;
  locationId: string;
  employeeRef?: string;
  role?: string;
  start: ISOTimestamp;
  end: ISOTimestamp;
}

/** Daily aggregate per location — the engine's main input. */
export interface DailyAggregate {
  locationId: string;
  businessDate: ISODate;
  /** Day-of-week for comparable-day baselines (0 = Sunday, local to the location). */
  weekday: number;
  netSales: Cents;
  grossSales: Cents;
  discounts: Cents;
  refunds: Cents;
  checkCount: number;
  laborHours: number | null;
  laborCost: Cents | null;
  /** Data completeness for the day; incomplete days never masquerade as complete. */
  completeness: "complete" | "partial" | "missing";
  /** Flags that exclude a day from baselines (scope §5 comparison rules). */
  exclusions: DayExclusion[];
}

export type DayExclusion =
  | "closure"
  | "holiday"
  | "promotion"
  | "abnormal_hours"
  | "data_gap";

export interface DaypartAggregate {
  locationId: string;
  businessDate: ISODate;
  daypart: string;
  netSales: Cents;
  checkCount: number;
  laborHours: number | null;
}

export interface CategoryAggregate {
  locationId: string;
  businessDate: ISODate;
  category: string;
  netSales: Cents;
  units: number;
}
