/**
 * Guided setup state (product scope §3).
 *
 * The wizard is resumable and idempotent: all progress serializes to
 * this validated shape, persists through a storage adapter, and can be
 * re-entered at any step. Completion predicates — not visited flags —
 * decide step status, so a reloaded or partially imported state always
 * reports honestly.
 */

import { z } from "zod";
import { getProvider } from "../providers/registry";

export const SETUP_STATE_VERSION = 2;

/** True when the chosen POS uses the direct path and isn't verified yet. */
export function posVerificationPending(state: SetupState): boolean {
  const provider = getProvider(state.pos.providerId);
  if (!provider || provider.connectionPath !== "direct") return false;
  return state.pos.connectionState !== "ready";
}

const timeZoneSchema = z
  .string()
  .refine(
    (tz) => {
      try {
        new Intl.DateTimeFormat("en-US", { timeZone: tz });
        return true;
      } catch {
        return false;
      }
    },
    { message: "Must be a valid IANA timezone" },
  );

export const accountSchema = z.object({
  email: z.string().email().or(z.literal("")),
  businessName: z.string(),
  emailVerified: z.boolean(),
});

export const businessSchema = z.object({
  concept: z.string(),
  serviceModel: z.enum(["", "counter", "table", "quick_service", "mixed"]),
  timezone: timeZoneSchema.or(z.literal("")),
  businessDayCutoff: z.string().regex(/^([01]?\d|2[0-3]):([0-5]\d)$/).or(z.literal("")),
});

export const posSchema = z.object({
  providerId: z.string(),
  /**
   * Whether the customer submitted credential fields. The credential
   * values themselves go to server-side secret storage — they are never
   * part of this state and never touch localStorage.
   */
  credentialsProvided: z.boolean(),
  /** Mirror of the connector state machine; the wizard renders it, never sets "ready" itself. */
  connectionState: z.enum([
    "not_connected",
    "authorizing",
    "validating",
    "importing",
    "ready",
    "permission_required",
  ]),
});

export const locationSchema = z.object({
  id: z.string(),
  name: z.string(),
  address: z.string(),
  included: z.boolean(),
  /** Present when the location was discovered from the verified connection. */
  providerLocationId: z.string().optional(),
  timezone: z.string().optional(),
});

export const laborSchema = z.object({
  source: z.enum(["", "pos_timecards", "labor_provider"]),
  laborProviderId: z.string(),
  credentialsProvided: z.boolean(),
  connectionState: z.enum([
    "not_connected",
    "authorizing",
    "validating",
    "importing",
    "ready",
    "permission_required",
  ]),
});

export const prioritySchema = z.object({
  struggles: z.array(z.string()).max(3),
  example: z.string(),
});

export const rulesSchema = z.object({
  laborTargetPct: z.number().min(0).max(100).nullable(),
  dayparts: z.array(z.object({ name: z.string(), start: z.string(), end: z.string() })),
  notes: z.string(),
});

export const personSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  role: z.enum(["owner", "org_admin", "regional", "location_manager", "recipient"]),
  locationIds: z.array(z.string()),
});

export const deliverySchema = z.object({
  recipients: z.array(
    z.object({
      personId: z.string(),
      email: z.boolean(),
      sms: z.boolean(),
      /** Adding a phone number is not consent; recipients opt in themselves. */
      smsConsent: z.enum(["not_requested", "pending", "confirmed", "declined"]),
      deliveryTime: z.string(),
    }),
  ),
});

export const setupStateSchema = z.object({
  version: z.literal(SETUP_STATE_VERSION),
  account: accountSchema,
  business: businessSchema,
  pos: posSchema,
  locations: z.array(locationSchema),
  labor: laborSchema,
  priorities: prioritySchema,
  rules: rulesSchema,
  people: z.array(personSchema),
  delivery: deliverySchema,
  validationConfirmed: z.boolean(),
  previewConfirmed: z.boolean(),
  activated: z.boolean(),
});

export type SetupState = z.infer<typeof setupStateSchema>;

export function defaultSetupState(): SetupState {
  return {
    version: SETUP_STATE_VERSION,
    account: { email: "", businessName: "", emailVerified: false },
    business: { concept: "", serviceModel: "", timezone: "", businessDayCutoff: "03:00" },
    pos: { providerId: "", credentialsProvided: false, connectionState: "not_connected" },
    locations: [],
    labor: {
      source: "",
      laborProviderId: "",
      credentialsProvided: false,
      connectionState: "not_connected",
    },
    priorities: { struggles: [], example: "" },
    rules: { laborTargetPct: null, dayparts: [], notes: "" },
    people: [],
    delivery: { recipients: [] },
    validationConfirmed: false,
    previewConfirmed: false,
    activated: false,
  };
}

export type StepId =
  | "account"
  | "business"
  | "pos"
  | "locations"
  | "labor"
  | "priorities"
  | "rules"
  | "people"
  | "delivery"
  | "validation"
  | "preview"
  | "activation";

export interface StepDefinition {
  id: StepId;
  title: string;
  summary: string;
  /** Completion is derived from state so a resumed session reports honestly. */
  isComplete(state: SetupState): boolean;
  /** Steps that can't be meaningfully done yet list their blockers. */
  blockers?(state: SetupState): string[];
}

export const SETUP_STEPS: StepDefinition[] = [
  {
    id: "account",
    title: "Account",
    summary: "Verify your email and name the business workspace.",
    isComplete: (s) => s.account.email !== "" && s.account.businessName !== "",
  },
  {
    id: "business",
    title: "Business",
    summary: "Concept, service model, timezone, and business-day cutoff.",
    isComplete: (s) =>
      s.business.concept !== "" &&
      s.business.serviceModel !== "" &&
      s.business.timezone !== "" &&
      s.business.businessDayCutoff !== "",
  },
  {
    id: "pos",
    title: "POS connection",
    summary:
      "Choose your provider and enter your read-only API credentials — or set up scheduled reports.",
    // Direct providers require verified credentials; report-path
    // providers validate against samples in the Validation step.
    isComplete: (s) => {
      const provider = getProvider(s.pos.providerId);
      if (!provider || provider.connectionPath === "none") return false;
      if (provider.connectionPath === "reports") return true;
      return s.pos.connectionState === "ready";
    },
  },
  {
    id: "locations",
    title: "Locations",
    summary: "Select and name the sites this workspace covers.",
    isComplete: (s) => s.locations.some((l) => l.included && l.name !== ""),
    blockers: (s) =>
      posVerificationPending(s)
        ? [
            "Verify your POS connection first — your locations are discovered from it",
          ]
        : [],
  },
  {
    id: "labor",
    title: "Labor source",
    summary: "Pick the source of truth for hours, schedules, and wages.",
    isComplete: (s) => {
      if (s.labor.source === "pos_timecards") return true;
      if (s.labor.source !== "labor_provider" || s.labor.laborProviderId === "")
        return false;
      const provider = getProvider(s.labor.laborProviderId);
      // Providers with live verification must verify; evaluation-only
      // providers complete on selection and verify during setup review.
      return provider?.credentialFields
        ? s.labor.connectionState === "ready"
        : true;
    },
  },
  {
    id: "priorities",
    title: "Priorities",
    summary: "Rank up to three struggles and describe one recurring example.",
    isComplete: (s) => s.priorities.struggles.length > 0,
  },
  {
    id: "rules",
    title: "Business rules",
    summary: "Targets, dayparts, and operating context. Defaults are labeled.",
    isComplete: (s) => s.rules.dayparts.length > 0,
  },
  {
    id: "people",
    title: "People",
    summary: "Invite owners, managers, and recipients with location access.",
    isComplete: (s) => s.people.length > 0,
  },
  {
    id: "delivery",
    title: "Delivery",
    summary: "Email/SMS per recipient, timing, quiet hours, and consent.",
    isComplete: (s) =>
      s.delivery.recipients.length > 0 &&
      s.delivery.recipients.every((r) => r.email || (r.sms && r.smsConsent === "confirmed")),
  },
  {
    id: "validation",
    title: "Validation",
    summary: "Import history and reconcile sample totals against your reports.",
    isComplete: (s) => s.validationConfirmed,
    blockers: (s) =>
      posVerificationPending(s)
        ? ["Requires a verified POS connection before history can be imported"]
        : [],
  },
  {
    id: "preview",
    title: "Preview",
    summary: "See your personalized briefing and send test messages.",
    isComplete: (s) => s.previewConfirmed,
  },
  {
    id: "activation",
    title: "Activation",
    summary: "Review enabled checks, cadence, and costs — then go live.",
    isComplete: (s) => s.activated,
    blockers: (s) => {
      const incomplete = SETUP_STEPS.filter(
        (step) => step.id !== "activation" && !step.isComplete(s),
      );
      return incomplete.map((step) => `Complete "${step.title}" first`);
    },
  },
];

export function stepById(id: StepId): StepDefinition {
  const step = SETUP_STEPS.find((s) => s.id === id);
  if (!step) throw new Error(`Unknown step: ${id}`);
  return step;
}

export function setupProgress(state: SetupState): {
  complete: number;
  total: number;
} {
  const total = SETUP_STEPS.length;
  const complete = SETUP_STEPS.filter((s) => s.isComplete(state)).length;
  return { complete, total };
}
