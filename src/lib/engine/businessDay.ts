/**
 * Business-date assignment (product scope §5).
 *
 * Business dates are defined explicitly: a transaction that closes
 * after midnight but before the location's cutoff belongs to the
 * previous calendar day. Each location's IANA timezone and its
 * daylight-saving behavior are respected by delegating local-time
 * conversion to Intl.
 */

import type { ISODate, ISOTimestamp, TimeZone } from "../model/types";

interface LocalParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
}

function localParts(timestamp: ISOTimestamp, timeZone: TimeZone): LocalParts {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid timestamp: ${timestamp}`);
  }
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts: Record<string, string> = {};
  for (const part of formatter.formatToParts(date)) {
    parts[part.type] = part.value;
  }
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    // Intl can render midnight as "24" with hour12: false in some engines.
    hour: Number(parts.hour) % 24,
    minute: Number(parts.minute),
  };
}

function toISODate(year: number, month: number, day: number): ISODate {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function previousDate(year: number, month: number, day: number): ISODate {
  // UTC arithmetic on a date-only value has no DST edge cases.
  const utc = new Date(Date.UTC(year, month - 1, day));
  utc.setUTCDate(utc.getUTCDate() - 1);
  return toISODate(utc.getUTCFullYear(), utc.getUTCMonth() + 1, utc.getUTCDate());
}

/** Parse a "HH:MM" cutoff into minutes after local midnight. */
export function parseCutoff(cutoff: string): number {
  const match = /^([01]?\d|2[0-3]):([0-5]\d)$/.exec(cutoff);
  if (!match) {
    throw new Error(`Invalid business-day cutoff: ${cutoff} (expected HH:MM)`);
  }
  return Number(match[1]) * 60 + Number(match[2]);
}

/**
 * Assign the business date for a transaction timestamp at a location.
 * Local times strictly before the cutoff belong to the previous
 * business day. A cutoff of "00:00" means calendar days.
 */
export function assignBusinessDate(
  timestamp: ISOTimestamp,
  timeZone: TimeZone,
  cutoff: string,
): ISODate {
  const cutoffMinutes = parseCutoff(cutoff);
  const local = localParts(timestamp, timeZone);
  const minutesSinceMidnight = local.hour * 60 + local.minute;
  if (minutesSinceMidnight < cutoffMinutes) {
    return previousDate(local.year, local.month, local.day);
  }
  return toISODate(local.year, local.month, local.day);
}

/** Local weekday (0 = Sunday) of a business date — for comparable-day baselines. */
export function weekdayOfBusinessDate(businessDate: ISODate): number {
  const [year, month, day] = businessDate.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}
