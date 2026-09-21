/**
 * Connector contract (product scope §4).
 *
 * Each connector declares what it can provide and implements a fixed
 * lifecycle. Analysis consumes only the canonical model; feature
 * availability is derived from declared + verified capabilities, never
 * from the provider's marketing.
 */

import type {
  NormalizedSale,
  ScheduledShift,
  Timecard,
} from "../model/types";

/** Connection lifecycle states (scope §4 state model). */
export type ConnectionState =
  | "not_connected"
  | "authorizing"
  | "validating"
  | "importing"
  | "ready"
  | "degraded"
  | "stale"
  | "permission_required"
  | "disconnected";

/** Allowed transitions; anything else is a bug, not a retry. */
export const CONNECTION_TRANSITIONS: Record<ConnectionState, ConnectionState[]> = {
  not_connected: ["authorizing"],
  authorizing: ["validating", "permission_required", "not_connected"],
  validating: ["importing", "permission_required", "degraded"],
  importing: ["ready", "degraded", "permission_required"],
  ready: ["stale", "degraded", "permission_required", "disconnected"],
  degraded: ["validating", "ready", "disconnected", "permission_required"],
  stale: ["importing", "ready", "degraded", "disconnected"],
  permission_required: ["authorizing", "disconnected"],
  disconnected: ["authorizing"],
};

export function canTransition(
  from: ConnectionState,
  to: ConnectionState,
): boolean {
  return CONNECTION_TRANSITIONS[from].includes(to);
}

export type DataField =
  | "daily_sales_totals"
  | "transactions_line_items"
  | "transaction_timestamps"
  | "timecards"
  | "wages"
  | "schedules"
  | "intraday_sales";

export type AuthMethod = "oauth" | "api_key" | "scheduled_report" | "manual_upload";

/** Static declaration every connector ships with. */
export interface ConnectorCapabilities {
  providerId: string;
  displayName: string;
  authMethod: AuthMethod;
  supportedFields: DataField[];
  /** Maximum historical depth the provider allows, in days; null if unknown. */
  historicalLimitDays: number | null;
  /** How often new data can be pulled, e.g. "15m", "1h", "daily". */
  refreshFrequency: string;
  requiredScopes: string[];
  /** How the provider expresses timestamps/timezones — documented per connector. */
  timezoneConvention: string;
  /** Customer-facing setup instructions markdown path. */
  setupGuide: string;
}

export interface DiscoveredLocation {
  providerLocationId: string;
  name: string;
  address?: string;
  timezone?: string;
}

export interface SyncWindow {
  /** Inclusive business-date range to fetch. */
  from: string;
  to: string;
}

export interface SyncResult {
  sales: NormalizedSale[];
  timecards: Timecard[];
  schedules: ScheduledShift[];
  /** Provider cursor for incremental sync; opaque to the engine. */
  cursor: string | null;
  /** Source records that failed normalization — surfaced, never dropped silently. */
  rejects: { sourceId: string; reason: string }[];
}

export interface HealthReport {
  state: ConnectionState;
  lastSuccessfulSync: string | null;
  detail: string;
}

/**
 * Runtime interface every connector implements. Credentials are passed
 * as an opaque secret reference resolved server-side by workers;
 * secrets never appear in this layer's logs or in model prompts.
 */
export interface Connector {
  readonly capabilities: ConnectorCapabilities;
  testConnection(secretRef: string): Promise<HealthReport>;
  discoverLocations(secretRef: string): Promise<DiscoveredLocation[]>;
  backfill(
    secretRef: string,
    providerLocationId: string,
    window: SyncWindow,
  ): Promise<SyncResult>;
  incrementalSync(
    secretRef: string,
    providerLocationId: string,
    cursor: string | null,
  ): Promise<SyncResult>;
  healthCheck(secretRef: string): Promise<HealthReport>;
  /** Revoke/disconnect. Reconnecting later preserves history and avoids duplicates. */
  disconnect(secretRef: string): Promise<void>;
}
