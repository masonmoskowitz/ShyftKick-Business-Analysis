/**
 * Compatibility evaluation (product scope §3, before purchase).
 *
 * Pure function so it can be tested and reused by the marketing site,
 * checkout gating, and the setup wizard. Provider selection alone is
 * not proof of access; the result always states remaining
 * verification. Never let checkout charge for a "not_supported" or
 * unverified path.
 */

import { getProvider, type SupportStatus } from "./registry";

export interface CompatibilityInput {
  posProviderId: string;
  laborProviderId?: string | null;
  locationCount: number;
  hasAdminAccess: boolean;
  /** Whether the customer already has (or can create) read-only API credentials. */
  hasApiAccess: boolean;
}

export interface CompatibilityResult {
  status: SupportStatus | "out_of_segment";
  headline: string;
  explanation: string;
  nextSteps: string[];
  /** True when checkout may proceed (with disclosed prerequisites). */
  purchasable: boolean;
}

export const MIN_LOCATIONS = 1;
export const MAX_LOCATIONS = 10;

export function evaluateCompatibility(
  input: CompatibilityInput,
): CompatibilityResult {
  if (
    input.locationCount < MIN_LOCATIONS ||
    input.locationCount > MAX_LOCATIONS
  ) {
    return {
      status: "out_of_segment",
      headline: "Outside our current segment",
      explanation: `ShyftKick currently serves restaurants with ${MIN_LOCATIONS}–${MAX_LOCATIONS} locations. Larger groups need a separately scoped conversation.`,
      nextSteps: ["Contact us for a scoped evaluation"],
      purchasable: false,
    };
  }

  const pos = getProvider(input.posProviderId);
  if (!pos) {
    return {
      status: "not_supported",
      headline: "We don't recognize that system",
      explanation:
        "Tell us what you run and whether it can export a daily sales report; the scheduled-report path may cover it.",
      nextSteps: ["Join the waitlist with your POS details"],
      purchasable: false,
    };
  }

  const accessStep = input.hasAdminAccess
    ? []
    : [
        "Invite the person who controls your POS account — setup supports a non-admin starting the process",
      ];

  switch (pos.status) {
    case "supported":
      // Direct path needs the customer's own read-only credentials; without
      // them (or a way to get them), the honest state is access_required.
      if (!input.hasApiAccess) {
        return {
          status: "access_required",
          headline: `${pos.name} works — you need API access first`,
          explanation: `${pos.detail} You told us you don't have API credentials yet; here's how to get them.`,
          nextSteps: [
            ...accessStep,
            ...(pos.credentialGuide ?? pos.prerequisites.map((p) => `Verify: ${p}`)),
            "Come back and re-run this check once you have credentials — we don't charge before verification",
          ],
          purchasable: false,
        };
      }
      return {
        status: "supported",
        headline: `${pos.name} is supported`,
        explanation: `${pos.detail} Final compatibility is confirmed by connecting your account during setup; the purchase is refundable if verification fails.`,
        nextSteps: [...accessStep, "Continue to checkout and guided setup"],
        purchasable: true,
      };
    case "supported_reports":
      return {
        status: "supported_reports",
        headline: `${pos.name} is supported through scheduled reports`,
        explanation: `${pos.detail} Daily reports enable daily analysis, not live alerts.`,
        nextSteps: [
          ...accessStep,
          "Review which insights daily reports enable",
          "Continue to checkout; report validation happens during setup",
        ],
        purchasable: true,
      };
    case "access_required":
      return {
        status: "access_required",
        headline: `${pos.name} needs access before purchase`,
        explanation: pos.detail,
        nextSteps: [
          ...accessStep,
          ...pos.prerequisites.map((p) => `Verify: ${p}`),
          "We'll confirm your account qualifies before charging you",
        ],
        purchasable: false,
      };
    case "not_supported":
    default:
      return {
        status: "not_supported",
        headline: `${pos.name} isn't supported yet`,
        explanation: pos.detail,
        nextSteps: ["Join the waitlist", "Or request a scoped integration"],
        purchasable: false,
      };
  }
}
