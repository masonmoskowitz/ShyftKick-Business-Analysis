"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, CircleAlert, CircleCheck, CircleHelp, FileText } from "lucide-react";
import {
  evaluateCompatibility,
  type CompatibilityResult,
} from "@/lib/providers/compatibility";
import { posProviders } from "@/lib/providers/registry";

const inputClass =
  "w-full rounded-md border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-accent";

const statusMeta: Record<
  CompatibilityResult["status"],
  { icon: typeof CircleCheck; className: string }
> = {
  supported: { icon: CircleCheck, className: "text-good" },
  supported_reports: { icon: FileText, className: "text-good" },
  access_required: { icon: CircleAlert, className: "text-warn" },
  not_supported: { icon: CircleHelp, className: "text-muted" },
  out_of_segment: { icon: CircleAlert, className: "text-warn" },
};

export function CompatibilityChecker() {
  const [posId, setPosId] = useState("");
  const [locationCount, setLocationCount] = useState(1);
  const [hasAdminAccess, setHasAdminAccess] = useState(true);
  const [result, setResult] = useState<CompatibilityResult | null>(null);

  return (
    <div className="space-y-5">
      <div className="grid gap-4 rounded-xl border border-line bg-surface p-5 sm:grid-cols-3">
        <label className="block text-sm">
          <span className="font-medium">POS system</span>
          <select
            className={`${inputClass} mt-1.5`}
            value={posId}
            onChange={(e) => {
              setPosId(e.target.value);
              setResult(null);
            }}
          >
            <option value="">Choose…</option>
            {posProviders().map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="font-medium">Locations</span>
          <input
            type="number"
            min={1}
            className={`${inputClass} mt-1.5`}
            value={locationCount}
            onChange={(e) => {
              setLocationCount(Number(e.target.value));
              setResult(null);
            }}
          />
        </label>
        <label className="flex items-end gap-2 pb-2 text-sm">
          <input
            type="checkbox"
            checked={hasAdminAccess}
            onChange={(e) => setHasAdminAccess(e.target.checked)}
          />
          I control the POS account
        </label>
        <div className="sm:col-span-3">
          <button
            type="button"
            disabled={posId === ""}
            onClick={() =>
              setResult(
                evaluateCompatibility({
                  posProviderId: posId,
                  locationCount,
                  hasAdminAccess,
                }),
              )
            }
            className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-40"
          >
            Check compatibility
          </button>
        </div>
      </div>

      {result && (
        <div className="rounded-xl border border-line bg-surface p-5">
          {(() => {
            const meta = statusMeta[result.status];
            const Icon = meta.icon;
            return (
              <p className={`flex items-center gap-2 font-semibold ${meta.className}`}>
                <Icon size={20} aria-hidden /> {result.headline}
              </p>
            );
          })()}
          <p className="mt-2 text-sm text-muted">{result.explanation}</p>
          <ul className="mt-3 space-y-1 text-sm">
            {result.nextSteps.map((step) => (
              <li key={step} className="flex gap-2">
                <ArrowRight size={15} className="mt-0.5 shrink-0 text-accent" aria-hidden />
                {step}
              </li>
            ))}
          </ul>
          {result.purchasable && (
            <Link
              href="/setup"
              className="mt-4 inline-flex items-center gap-1 rounded-md bg-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90"
            >
              Start guided setup <ArrowRight size={15} aria-hidden />
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
