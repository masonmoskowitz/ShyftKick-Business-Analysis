import { describe, expect, it } from "vitest";
import {
  assignBusinessDate,
  parseCutoff,
  weekdayOfBusinessDate,
} from "./businessDay";

describe("parseCutoff", () => {
  it("parses HH:MM", () => {
    expect(parseCutoff("03:00")).toBe(180);
    expect(parseCutoff("00:00")).toBe(0);
    expect(parseCutoff("23:59")).toBe(1439);
  });

  it("rejects invalid values", () => {
    expect(() => parseCutoff("24:00")).toThrow();
    expect(() => parseCutoff("3pm")).toThrow();
    expect(() => parseCutoff("")).toThrow();
  });
});

describe("assignBusinessDate", () => {
  const phoenix = "America/Phoenix"; // no DST

  it("sales after midnight before the cutoff belong to the previous day", () => {
    expect(
      assignBusinessDate("2026-09-20T01:30:00-07:00", phoenix, "03:00"),
    ).toBe("2026-09-19");
  });

  it("sales at or after the cutoff belong to the calendar day", () => {
    expect(
      assignBusinessDate("2026-09-20T03:00:00-07:00", phoenix, "03:00"),
    ).toBe("2026-09-20");
    expect(
      assignBusinessDate("2026-09-20T19:00:00-07:00", phoenix, "03:00"),
    ).toBe("2026-09-20");
  });

  it("a 00:00 cutoff means calendar days", () => {
    expect(
      assignBusinessDate("2026-09-20T00:30:00-07:00", phoenix, "00:00"),
    ).toBe("2026-09-20");
  });

  it("respects the location timezone, not the server timezone", () => {
    // 01:00 Eastern is 22:00 the previous day in Phoenix; the Eastern
    // location assigns it to its own previous business day.
    expect(
      assignBusinessDate(
        "2026-09-20T01:00:00-04:00",
        "America/New_York",
        "03:00",
      ),
    ).toBe("2026-09-19");
    expect(
      assignBusinessDate("2026-09-20T01:00:00-04:00", phoenix, "03:00"),
    ).toBe("2026-09-19"); // 22:00 local on the 19th, after cutoff
  });

  it("handles the fall-back DST transition without shifting dates", () => {
    // Nov 1, 2026: US clocks fall back at 02:00 local. 01:30 EST
    // (second occurrence) is still before an 03:00 cutoff.
    expect(
      assignBusinessDate(
        "2026-11-01T01:30:00-05:00",
        "America/New_York",
        "03:00",
      ),
    ).toBe("2026-10-31");
    expect(
      assignBusinessDate(
        "2026-11-01T12:00:00-05:00",
        "America/New_York",
        "03:00",
      ),
    ).toBe("2026-11-01");
  });

  it("handles month and year boundaries", () => {
    expect(
      assignBusinessDate("2026-10-01T00:30:00-07:00", phoenix, "03:00"),
    ).toBe("2026-09-30");
    expect(
      assignBusinessDate("2027-01-01T01:00:00-07:00", phoenix, "02:00"),
    ).toBe("2026-12-31");
  });

  it("rejects invalid timestamps", () => {
    expect(() => assignBusinessDate("not-a-date", phoenix, "03:00")).toThrow();
  });
});

describe("weekdayOfBusinessDate", () => {
  it("returns the calendar weekday of the business date", () => {
    expect(weekdayOfBusinessDate("2026-09-20")).toBe(0); // Sunday
    expect(weekdayOfBusinessDate("2026-09-18")).toBe(5); // Friday
  });
});
