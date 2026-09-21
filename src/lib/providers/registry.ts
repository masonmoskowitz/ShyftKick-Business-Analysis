/**
 * Provider registry — the single source of truth for what the
 * compatibility checker and the setup wizard may claim (product scope
 * §3–§4). A provider appears as "supported" here only after its
 * end-to-end connection, import, and recovery tests pass; until then
 * it must carry the honest gated status.
 *
 * Statuses map to the four pre-purchase compatibility results:
 * - supported: tested self-serve path, subject to account verification
 * - supported_reports: works via validated scheduled reports
 * - access_required: provider approval, subscription, or admin
 *   permissions needed first
 * - not_supported: waitlist / separately scoped integration request
 */

export type ProviderCategory = "pos" | "labor";

export type SupportStatus =
  | "supported"
  | "supported_reports"
  | "access_required"
  | "not_supported";

export interface ProviderEntry {
  id: string;
  name: string;
  category: ProviderCategory;
  status: SupportStatus;
  /** Path a customer actually uses today. */
  connectionPath: "direct" | "reports" | "none";
  /** Customer-facing explanation shown in the compatibility result. */
  detail: string;
  /** Prerequisites the customer must have before connecting. */
  prerequisites: string[];
  /** True while our own gate (partner approval, validation) is pending. */
  pendingOurGate: boolean;
}

/**
 * Launch posture per scope v0.2: Square direct first (no external
 * distribution gate), Toast direct gated on commercial distribution
 * approval with the scheduled-report path covering Toast customers
 * meanwhile, 7shifts gated on a partner route, and scheduled reports
 * as a headline provider-agnostic path.
 *
 * NOTE: statuses here reflect the plan, not shipped connectors. Flip a
 * provider to "supported" only when the scope §12 gates pass.
 */
export const PROVIDERS: ProviderEntry[] = [
  {
    id: "square",
    name: "Square",
    category: "pos",
    status: "access_required",
    connectionPath: "direct",
    detail:
      "Square connects directly with seller-authorized OAuth. This is our first direct connector; it is in validation and opens to customers when import and reconciliation tests pass.",
    prerequisites: [
      "Square account with owner or admin access",
      "Locations active in Square Dashboard",
    ],
    pendingOurGate: true,
  },
  {
    id: "toast",
    name: "Toast",
    category: "pos",
    status: "supported_reports",
    connectionPath: "reports",
    detail:
      "Toast is supported today through scheduled report delivery. A direct read-only connection requires Toast standard API access (RMS Essentials or higher) on your account; our self-serve direct connection is pending Toast commercial approval.",
    prerequisites: [
      "Toast Web access with reporting permissions",
      "For direct API: RMS Essentials or higher subscription",
    ],
    pendingOurGate: true,
  },
  {
    id: "clover",
    name: "Clover",
    category: "pos",
    status: "supported_reports",
    connectionPath: "reports",
    detail:
      "Clover is supported through scheduled report delivery after we validate your export template against sample totals.",
    prerequisites: ["Clover Dashboard access with reporting permissions"],
    pendingOurGate: true,
  },
  {
    id: "aloha",
    name: "NCR Aloha",
    category: "pos",
    status: "supported_reports",
    connectionPath: "reports",
    detail:
      "Aloha is supported through scheduled report delivery after template validation. Direct middleware integration is a later evaluation.",
    prerequisites: ["Access to Aloha reporting exports"],
    pendingOurGate: true,
  },
  {
    id: "spoton",
    name: "SpotOn",
    category: "pos",
    status: "supported_reports",
    connectionPath: "reports",
    detail:
      "SpotOn is supported through scheduled report delivery after template validation.",
    prerequisites: ["SpotOn reporting access"],
    pendingOurGate: true,
  },
  {
    id: "micros",
    name: "Oracle Micros",
    category: "pos",
    status: "supported_reports",
    connectionPath: "reports",
    detail:
      "Micros is supported through scheduled report delivery after template validation. Direct middleware integration is a later evaluation.",
    prerequisites: ["Access to Micros reporting exports"],
    pendingOurGate: true,
  },
  {
    id: "seven_shifts",
    name: "7shifts",
    category: "labor",
    status: "access_required",
    connectionPath: "direct",
    detail:
      "7shifts labor data (schedules, timecards, wages) requires our partner connection route, which is in progress. POS timecards can serve as the labor source meanwhile if sufficient.",
    prerequisites: ["7shifts account with API access"],
    pendingOurGate: true,
  },
  {
    id: "other",
    name: "Other / not listed",
    category: "pos",
    status: "not_supported",
    connectionPath: "none",
    detail:
      "Not yet supported. If your system can email or export a daily sales report, the scheduled-report path may work — join the waitlist and we will evaluate your template, or request a separately scoped integration.",
    prerequisites: [],
    pendingOurGate: false,
  },
];

export function getProvider(id: string): ProviderEntry | undefined {
  return PROVIDERS.find((p) => p.id === id);
}

export function posProviders(): ProviderEntry[] {
  return PROVIDERS.filter((p) => p.category === "pos");
}

export function laborProviders(): ProviderEntry[] {
  return PROVIDERS.filter((p) => p.category === "labor");
}
