import type { Metadata } from "next";
import { CompatibilityChecker } from "./CompatibilityChecker";

export const metadata: Metadata = {
  title: "Compatibility check — ShyftKick",
  description:
    "Check whether your POS and labor systems are supported before you buy.",
};

export default function CompatibilityPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-2xl font-semibold">Will ShyftKick work with your systems?</h1>
      <p className="mt-2 text-sm text-muted">
        Answer three questions and get an honest answer — including when the
        answer is &ldquo;not yet.&rdquo; We never charge for functionality
        your account can&apos;t reach, and provider selection alone is not
        proof of access: final verification happens when you connect, with a
        defined refund policy if compatibility fails.
      </p>
      <div className="mt-6">
        <CompatibilityChecker />
      </div>
    </main>
  );
}
