import {
  AlertTriangle,
  CheckCircle2,
  Eye,
  Lightbulb,
  ShieldAlert,
} from "lucide-react";
import type { Briefing } from "@/lib/briefing/sample";

const toneClasses = {
  good: "text-good",
  warn: "text-warn",
  bad: "text-bad",
  neutral: "text-muted",
} as const;

export function BriefingCard({
  briefing,
  illustrative = true,
}: {
  briefing: Briefing;
  illustrative?: boolean;
}) {
  return (
    <article className="overflow-hidden rounded-xl border border-line bg-surface shadow-sm">
      <header className="border-b border-line px-5 py-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="font-semibold">
              {briefing.businessName} — {briefing.locationName}
            </h3>
            <p className="text-sm text-muted">
              Daily briefing · {briefing.weekdayName}, {briefing.businessDate}
            </p>
          </div>
          {illustrative && (
            <span className="rounded-full bg-accent-soft px-3 py-1 text-xs font-medium text-accent-ink">
              Illustrative sample
            </span>
          )}
        </div>
        <p className="mt-2 flex items-center gap-1.5 text-xs text-muted">
          <CheckCircle2 size={14} className="text-good" aria-hidden />
          {briefing.dataStatus}
        </p>
      </header>

      <div className="grid grid-cols-2 gap-px bg-line sm:grid-cols-4">
        {briefing.scorecard.map((row) => (
          <div key={row.label} className="bg-surface px-4 py-3">
            <p className="text-xs text-muted">{row.label}</p>
            <p className="text-lg font-semibold">{row.value}</p>
            {row.deltaLabel && (
              <p className={`text-xs font-medium ${toneClasses[row.tone]}`}>
                {row.deltaLabel}
              </p>
            )}
            <p className="mt-0.5 text-[11px] leading-tight text-muted">
              {row.baselineLabel}
            </p>
          </div>
        ))}
      </div>

      <div className="space-y-4 border-t border-line px-5 py-4">
        {briefing.quiet ? (
          <p className="text-sm text-muted">
            A quiet day — every tracked metric stayed within its normal range.
          </p>
        ) : (
          briefing.findings.map((finding) => (
            <div key={finding.title} className="rounded-lg border border-line p-4">
              <div className="flex items-start gap-2">
                {finding.severity === "priority" ? (
                  <AlertTriangle size={18} className="mt-0.5 shrink-0 text-bad" aria-hidden />
                ) : (
                  <Eye size={18} className="mt-0.5 shrink-0 text-warn" aria-hidden />
                )}
                <div className="space-y-2">
                  <p className="font-medium leading-snug">{finding.title}</p>
                  <ul className="space-y-1 text-sm text-muted">
                    {finding.evidence.map((line) => (
                      <li key={line} className="flex gap-2">
                        <span
                          className="mt-2 h-1 w-1 shrink-0 rounded-full bg-muted"
                          aria-hidden
                        />
                        {line}
                      </li>
                    ))}
                  </ul>
                  <p className="flex items-start gap-1.5 text-sm">
                    <Lightbulb size={15} className="mt-0.5 shrink-0 text-accent" aria-hidden />
                    {finding.suggestedAction}
                  </p>
                  <p className="flex items-start gap-1.5 text-xs text-muted">
                    <ShieldAlert size={13} className="mt-0.5 shrink-0" aria-hidden />
                    {finding.boundary}
                  </p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </article>
  );
}
