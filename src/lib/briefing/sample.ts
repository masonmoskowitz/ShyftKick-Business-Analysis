/**
 * Illustrative sample briefing (product scope §3: the site shows an
 * illustrative daily briefing).
 *
 * The numbers below are fictional seed data, but they flow through the
 * REAL engine — baselines, detection gates, and formatting — so the
 * sample can never drift from what the product actually produces. It
 * is always labeled illustrative wherever it renders.
 */

import type { DailyAggregate } from "../model/types";
import { comparableBaseline, type Baseline } from "../engine/baseline";
import { detectDeviation } from "../engine/detect";
import { formatCents, laborPercentage, salesPerLaborHour } from "../engine/metrics";

export interface ScorecardRow {
  label: string;
  value: string;
  baselineLabel: string;
  deltaLabel: string | null;
  tone: "good" | "warn" | "bad" | "neutral";
}

export interface BriefingFinding {
  title: string;
  severity: "priority" | "watch";
  evidence: string[];
  suggestedAction: string;
  boundary: string;
}

export interface Briefing {
  businessName: string;
  locationName: string;
  businessDate: string;
  weekdayName: string;
  dataStatus: string;
  scorecard: ScorecardRow[];
  findings: BriefingFinding[];
  quiet: boolean;
}

function fridayAggregate(
  businessDate: string,
  netSales: number,
  laborHours: number,
  laborCost: number,
  checkCount: number,
): DailyAggregate {
  return {
    locationId: "loc-qc",
    businessDate,
    weekday: 5,
    netSales,
    grossSales: netSales,
    discounts: Math.round(netSales * 0.03),
    refunds: 0,
    checkCount,
    laborHours,
    laborCost,
    completeness: "complete",
    exclusions: [],
  };
}

/** Eight prior Fridays of fictional history for one location. */
const HISTORY: DailyAggregate[] = [
  fridayAggregate("2026-07-24", 412_500, 61.5, 104_800, 236),
  fridayAggregate("2026-07-31", 428_900, 63.0, 106_900, 247),
  fridayAggregate("2026-08-07", 405_200, 60.0, 102_300, 231),
  fridayAggregate("2026-08-14", 431_800, 62.5, 106_100, 249),
  fridayAggregate("2026-08-21", 418_600, 61.0, 104_200, 240),
  fridayAggregate("2026-08-28", 425_300, 62.0, 105_500, 244),
  fridayAggregate("2026-09-04", 409_700, 60.5, 103_000, 233),
  fridayAggregate("2026-09-11", 421_400, 61.5, 104_600, 241),
];

/** The latest complete business day — lunch slipped, dinner held. */
const CURRENT = fridayAggregate("2026-09-18", 356_900, 62.0, 105_400, 205);

/** Fictional lunch-daypart series (11:00–14:00) for the same Fridays. */
const LUNCH_HISTORY = [128_400, 133_100, 125_900, 134_600, 130_200, 132_500, 127_300, 131_000];
const LUNCH_CURRENT = 92_700;

/** Fictional beverage-category units for the same Fridays. */
const BEVERAGE_UNITS_HISTORY = [184, 191, 178, 194, 186, 189, 180, 187];
const BEVERAGE_UNITS_CURRENT = 132;

function seriesBaseline(values: number[]): Baseline {
  const dates = HISTORY.map((d) => d.businessDate);
  const days: DailyAggregate[] = values.map((value, i) => ({
    ...HISTORY[i],
    businessDate: dates[i],
    netSales: value,
  }));
  return comparableBaseline(CURRENT, days, (d) => d.netSales);
}

function pct(fraction: number): string {
  return `${(fraction * 100).toFixed(1)}%`;
}

function deltaPct(current: number, baseline: number): string {
  const change = (current - baseline) / Math.abs(baseline);
  const sign = change > 0 ? "+" : "";
  return `${sign}${(change * 100).toFixed(0)}% vs baseline`;
}

export function sampleBriefing(businessName = "Copper Fork Kitchen"): Briefing {
  const salesBaseline = comparableBaseline(CURRENT, HISTORY, (d) => d.netSales);
  const salesResult = detectDeviation("net_sales", CURRENT.netSales, salesBaseline);

  const lunchBaseline = seriesBaseline(LUNCH_HISTORY);
  const lunchResult = detectDeviation("lunch_net_sales", LUNCH_CURRENT, lunchBaseline);

  const bevBaseline = seriesBaseline(BEVERAGE_UNITS_HISTORY);
  const bevResult = detectDeviation("beverage_units", BEVERAGE_UNITS_CURRENT, bevBaseline, {
    minRelativeChange: 0.15,
    minAbsoluteImpact: 20,
    minSampleSize: 4,
  });

  const splh = salesPerLaborHour(CURRENT.netSales, CURRENT.laborHours);
  const splhBaselineValues = HISTORY.map(
    (d) => salesPerLaborHour(d.netSales, d.laborHours) as number,
  );
  const splhBaselineMedian = splhBaselineValues.sort((a, b) => a - b)[4];
  const laborPct = laborPercentage(CURRENT.laborCost, CURRENT.netSales);

  const scorecard: ScorecardRow[] = [
    {
      label: "Net sales",
      value: formatCents(CURRENT.netSales),
      baselineLabel: `median ${formatCents(salesBaseline.median ?? 0)} (${salesBaseline.sampleSize} Fridays)`,
      deltaLabel: salesBaseline.median
        ? deltaPct(CURRENT.netSales, salesBaseline.median)
        : null,
      tone: salesResult.finding ? "bad" : "neutral",
    },
    {
      label: "Checks",
      value: String(CURRENT.checkCount),
      baselineLabel: "median 241",
      deltaLabel: deltaPct(CURRENT.checkCount, 241),
      tone: "warn",
    },
    {
      label: "Sales / labor hour",
      value: splh === null ? "—" : formatCents(splh),
      baselineLabel: `median ${formatCents(splhBaselineMedian)}`,
      deltaLabel: splh === null ? null : deltaPct(splh, splhBaselineMedian),
      tone: "warn",
    },
    {
      label: "Direct labor %",
      value: laborPct === null ? "—" : pct(laborPct),
      baselineLabel: "wages only; excludes salary and payroll taxes",
      deltaLabel: null,
      tone: "neutral",
    },
  ];

  const findings: BriefingFinding[] = [];

  if (lunchResult.finding) {
    findings.push({
      title: `Lunch sales fell ${pct(Math.abs(lunchResult.finding.relativeChange))} below the Friday baseline`,
      severity: "priority",
      evidence: [
        `Lunch (11:00–14:00) net sales ${formatCents(LUNCH_CURRENT)} vs median ${formatCents(lunchBaseline.median ?? 0)} across ${lunchBaseline.sampleSize} comparable Fridays`,
        `Dinner held within normal range — the decline is concentrated in lunch`,
        `Check count down 36 vs baseline; average check roughly flat`,
      ],
      suggestedAction:
        "Review lunch staffing and any nearby lunch-traffic changes with the GM; confirm whether the patio closure affected seating.",
      boundary:
        "Traffic decline is measured; the cause is not. This is a review prompt, not a conclusion.",
    });
  }

  if (bevResult.finding) {
    findings.push({
      title: `Beverage units are ${pct(Math.abs(bevResult.finding.relativeChange))} below baseline`,
      severity: "priority",
      evidence: [
        `${BEVERAGE_UNITS_CURRENT} beverage units vs median ${bevBaseline.median} across ${bevBaseline.sampleSize} comparable Fridays`,
        `Category mapping is stable across the comparison window`,
      ],
      suggestedAction:
        "Check beverage availability and whether servers are offering drinks at greeting; review against the last menu change.",
      boundary:
        "Data cannot distinguish a stockout from an offering change — verify on the floor.",
    });
  }

  if (salesResult.finding) {
    findings.push({
      title: "Total day landed below baseline — driven by the lunch daypart",
      severity: "watch",
      evidence: [
        `Net sales ${formatCents(CURRENT.netSales)} vs median ${formatCents(salesBaseline.median ?? 0)}`,
        `Daypart attribution: lunch accounts for the majority of the shortfall`,
      ],
      suggestedAction: "No separate action — resolves with the lunch finding above.",
      boundary: "Same underlying evidence as the lunch finding; not double-counted.",
    });
  }

  return {
    businessName,
    locationName: "Queen Creek",
    businessDate: CURRENT.businessDate,
    weekdayName: "Friday",
    dataStatus: "Complete — POS import reconciled at 5:12 AM",
    scorecard,
    findings: findings.slice(0, 3),
    quiet: findings.length === 0,
  };
}
