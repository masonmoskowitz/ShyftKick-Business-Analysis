/**
 * Provider registry — the single source of truth for what the
 * compatibility checker and the setup wizard may claim (product scope
 * §3–§4).
 *
 * Launch connection model (scope v0.3): customers supply their own
 * read-only API credentials during setup; ShyftKick depends on no
 * provider partner program or hosted OAuth. Each direct provider
 * declares the credential fields the wizard collects and a guide for
 * obtaining them. Credentials are stored server-side in managed secret
 * storage — never in the browser.
 *
 * Statuses map to the four pre-purchase compatibility results:
 * - supported: direct credential-entry path, subject to account
 *   verification (customers without credentials yet are routed to the
 *   guide and shown as access_required)
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

export interface CredentialField {
  key: string;
  label: string;
  /** Secret values render masked and are never persisted client-side. */
  secret: boolean;
  placeholder?: string;
}

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
  /** Credential fields the setup wizard collects (direct path only). */
  credentialFields?: CredentialField[];
  /** Step-by-step instructions for obtaining read-only credentials. */
  credentialGuide?: string[];
}

export const PROVIDERS: ProviderEntry[] = [
  {
    id: "square",
    name: "Square",
    category: "pos",
    status: "supported",
    connectionPath: "direct",
    detail:
      "Square connects with a read-only API access token from your own Square account. We test the connection and permissions, then reconcile imported totals against your Square reports before anything activates.",
    prerequisites: [
      "Square account with owner or admin access",
      "An API access token (takes about five minutes to create)",
    ],
    credentialFields: [
      {
        key: "accessToken",
        label: "Square access token",
        secret: true,
        placeholder: "EAAA…",
      },
    ],
    credentialGuide: [
      "Sign in at developer.squareup.com with your Square account",
      "Create an application (name it anything, e.g. “ShyftKick”)",
      "Open the application and copy the production Access Token",
      "Paste it here — ShyftKick only requests read scopes and never writes to your account",
    ],
  },
  {
    id: "toast",
    name: "Toast",
    category: "pos",
    status: "supported",
    connectionPath: "direct",
    detail:
      "Toast connects with your own standard API access credentials (read-only), available on RMS Essentials or higher. If API access isn't enabled on your account yet, your Toast representative can enable it. Scheduled report delivery is also available meanwhile.",
    prerequisites: [
      "Toast RMS Essentials or higher",
      "Standard API access credentials (client ID and secret)",
    ],
    credentialFields: [
      { key: "clientId", label: "Toast client ID", secret: false },
      { key: "clientSecret", label: "Toast client secret", secret: true },
    ],
    credentialGuide: [
      "Confirm your subscription includes API access (RMS Essentials or higher)",
      "Request standard API access credentials through Toast Web or your Toast representative",
      "Toast issues a read-only client ID and secret",
      "Enter both here — locations on your account are discovered automatically",
    ],
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
  },
  {
    id: "aloha",
    name: "NCR Aloha",
    category: "pos",
    status: "supported_reports",
    connectionPath: "reports",
    detail:
      "Aloha is supported through scheduled report delivery after template validation.",
    prerequisites: ["Access to Aloha reporting exports"],
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
  },
  {
    id: "micros",
    name: "Oracle Micros",
    category: "pos",
    status: "supported_reports",
    connectionPath: "reports",
    detail:
      "Micros is supported through scheduled report delivery after template validation.",
    prerequisites: ["Access to Micros reporting exports"],
  },
  {
    id: "seven_shifts",
    name: "7shifts",
    category: "labor",
    status: "supported",
    connectionPath: "direct",
    detail:
      "7shifts labor data (schedules, timecards, wages) connects with your own API access token. POS timecards can serve as the labor source instead if they're sufficient.",
    prerequisites: ["7shifts plan with API access"],
    credentialFields: [
      { key: "accessToken", label: "7shifts access token", secret: true },
    ],
    credentialGuide: [
      "In 7shifts, open Company Settings → Developer Tools (plan with API access required)",
      "Generate an access token",
      "Paste it here — ShyftKick reads schedules, timecards, and wages; it never edits them",
    ],
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
