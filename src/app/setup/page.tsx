import type { Metadata } from "next";
import { SetupWizard } from "./SetupWizard";

export const metadata: Metadata = {
  title: "Guided setup — ShyftKick",
  description:
    "Connect your systems, describe your priorities, and activate automated daily briefings.",
};

export default function SetupPage() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Guided setup</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted">
          Work through the steps in any order — progress saves as you go, and
          you can leave and resume anytime. Connections are read-only:
          ShyftKick never changes schedules, payroll, menus, or POS records.
        </p>
      </div>
      <SetupWizard />
    </main>
  );
}
