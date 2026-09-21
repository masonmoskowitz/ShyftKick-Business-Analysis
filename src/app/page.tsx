import Link from "next/link";
import {
  ArrowRight,
  CalendarCheck,
  FileText,
  LockKeyhole,
  MessageSquareText,
  PlugZap,
  Scale,
} from "lucide-react";
import { BriefingCard } from "@/components/BriefingCard";
import { sampleBriefing } from "@/lib/briefing/sample";
import { posProviders } from "@/lib/providers/registry";

const statusLabels = {
  supported: "Supported",
  supported_reports: "Via scheduled reports",
  access_required: "Access required",
  not_supported: "Waitlist",
} as const;

export default function Home() {
  return (
    <main>
      {/* Hero */}
      <section className="mx-auto max-w-6xl px-4 pb-10 pt-14">
        <div className="max-w-2xl">
          <p className="text-sm font-medium text-accent">
            For restaurants with 1–10 locations
          </p>
          <h1 className="mt-2 text-4xl font-semibold leading-tight">
            Know what changed, see the evidence, act before it compounds.
          </h1>
          <p className="mt-4 text-lg text-muted">
            ShyftKick connects read-only to your POS and labor systems, then
            delivers a daily briefing to the right people: what moved against
            your own baselines, the numbers behind it, and the next useful
            action. No dashboards to remember to open. No reports to assemble.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/compatibility"
              className="flex items-center gap-1.5 rounded-md bg-accent px-5 py-2.5 font-medium text-white hover:opacity-90"
            >
              Check your compatibility <ArrowRight size={17} aria-hidden />
            </Link>
            <Link
              href="/setup"
              className="flex items-center gap-1.5 rounded-md border border-line px-5 py-2.5 font-medium hover:bg-surface"
            >
              See the guided setup
            </Link>
          </div>
        </div>
      </section>

      {/* Sample briefing */}
      <section className="border-y border-line bg-surface/60">
        <div className="mx-auto grid max-w-6xl items-start gap-8 px-4 py-12 lg:grid-cols-[1fr_1.2fr]">
          <div className="max-w-md">
            <h2 className="text-2xl font-semibold">
              This lands in the GM&apos;s inbox at 7 AM
            </h2>
            <p className="mt-3 text-muted">
              Every number is computed deterministically from your data and
              compared against your own comparable days — the median of up to
              eight matching weekdays, never a guess. Below four comparable
              days, the briefing says the baseline is still forming instead of
              raising false alarms.
            </p>
            <ul className="mt-5 space-y-3 text-sm">
              <li className="flex gap-2.5">
                <Scale size={17} className="mt-0.5 shrink-0 text-accent" aria-hidden />
                Findings state their evidence and their limits. A dip in
                beverage units asks for a floor check — it never accuses.
              </li>
              <li className="flex gap-2.5">
                <MessageSquareText size={17} className="mt-0.5 shrink-0 text-accent" aria-hidden />
                Managers acknowledge, record action, or snooze from a secure
                link. Unresolved issues can escalate; resolved ones are
                re-checked against the next comparable day.
              </li>
              <li className="flex gap-2.5">
                <CalendarCheck size={17} className="mt-0.5 shrink-0 text-accent" aria-hidden />
                Quiet day? You get a short factual note, not manufactured
                drama.
              </li>
            </ul>
          </div>
          <BriefingCard briefing={sampleBriefing()} />
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-6xl px-4 py-12">
        <h2 className="text-2xl font-semibold">Live in an afternoon, not a quarter</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {[
            {
              icon: PlugZap,
              title: "1. Check and connect",
              body: "Confirm compatibility before paying a dollar, then enter your POS's read-only API credentials — most systems issue them in minutes — or set up scheduled report delivery instead.",
            },
            {
              icon: FileText,
              title: "2. Configure and verify",
              body: "Describe your priorities in plain English; we map them to checks your data can support. History imports, and totals reconcile against your own reports before anything activates.",
            },
            {
              icon: MessageSquareText,
              title: "3. Activate",
              body: "Pick who gets email or SMS, when, and for which locations. Briefings then run automatically — with guided recovery when a connection needs attention.",
            },
          ].map((step) => (
            <div key={step.title} className="rounded-xl border border-line bg-surface p-5">
              <step.icon size={22} className="text-accent" aria-hidden />
              <h3 className="mt-3 font-semibold">{step.title}</h3>
              <p className="mt-1.5 text-sm text-muted">{step.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Connections */}
      <section className="border-t border-line bg-surface/60">
        <div className="mx-auto max-w-6xl px-4 py-12">
          <h2 className="text-2xl font-semibold">Honest about what connects today</h2>
          <p className="mt-2 max-w-2xl text-sm text-muted">
            A system appears as supported only after our end-to-end connection,
            import, and recovery tests pass on real accounts. Everything else
            shows its true status — including what&apos;s pending on our side.
          </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {posProviders()
              .filter((p) => p.id !== "other")
              .map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between rounded-lg border border-line bg-surface px-4 py-3"
                >
                  <span className="font-medium">{p.name}</span>
                  <span className="rounded-full bg-canvas px-2.5 py-1 text-xs text-muted">
                    {statusLabels[p.status]}
                  </span>
                </div>
              ))}
          </div>
          <p className="mt-4 text-sm text-muted">
            Something else?{" "}
            <Link href="/compatibility" className="font-medium text-accent hover:underline">
              Run the compatibility check
            </Link>{" "}
            — if it can export a daily sales report, there may be a path.
          </p>
        </div>
      </section>

      {/* Trust */}
      <section className="mx-auto max-w-6xl px-4 py-12">
        <div className="grid gap-6 rounded-xl border border-line bg-surface p-6 sm:grid-cols-3">
          <div>
            <LockKeyhole size={20} className="text-accent" aria-hidden />
            <h3 className="mt-2 font-semibold">Read-only, always</h3>
            <p className="mt-1 text-sm text-muted">
              ShyftKick never changes schedules, payroll, menus, or POS
              records. Recommendations stay subject to your managers&apos;
              judgment.
            </p>
          </div>
          <div>
            <Scale size={20} className="text-accent" aria-hidden />
            <h3 className="mt-2 font-semibold">No invented numbers</h3>
            <p className="mt-1 text-sm text-muted">
              Code computes every metric; language models only explain verified
              findings. Missing data disables a finding — it never becomes a
              guess.
            </p>
          </div>
          <div>
            <CalendarCheck size={20} className="text-accent" aria-hidden />
            <h3 className="mt-2 font-semibold">Built inside a restaurant</h3>
            <p className="mt-1 text-sm text-muted">
              ShyftKick is built by a working operator and tested nightly
              against a live restaurant before any customer sees a feature.
            </p>
          </div>
        </div>
        <div className="mt-8 text-center">
          <Link
            href="/compatibility"
            className="inline-flex items-center gap-1.5 rounded-md bg-accent px-6 py-3 font-medium text-white hover:opacity-90"
          >
            Start with the compatibility check <ArrowRight size={17} aria-hidden />
          </Link>
        </div>
      </section>
    </main>
  );
}
