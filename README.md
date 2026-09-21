# ShyftKick — Restaurant Intelligence

Self-serve restaurant analysis for operators with 1–10 locations.
Customers check compatibility, purchase, connect their systems read-only,
describe their priorities, configure recipients, and activate automated
daily briefings: **what changed, the evidence, and the next useful action.**

The full product specification lives in
[`docs/product-scope.md`](docs/product-scope.md) (v0.2). It is the source
of truth for scope decisions, analysis rules, and release gates — read it
before changing behavior.

## Product principles (enforced in code)

- **Deterministic numbers.** Code computes every metric, baseline, and
  candidate finding. The language model only narrates verified findings;
  its output is schema-constrained and every number it reports is
  validated against computed facts.
- **Undefined beats misleading.** Zero-denominator metrics return `null`
  (labor % with zero sales, SPLH with zero hours) and disable dependent
  findings rather than fabricating a value.
- **Honest availability.** The provider registry and compatibility
  checker only claim what has passed end-to-end tests. Nobody is charged
  for functionality their account can't reach.
- **Read-only connections.** ShyftKick never modifies schedules, payroll,
  menus, or POS records.
- **Tenant isolation, consent, idempotency.** RLS on every table, SMS
  consent belongs to the recipient, and every outbound message carries an
  idempotency key so retries never double-send.

## Repository layout

```
docs/product-scope.md         Product spec v0.2 (source of truth)
src/lib/model/                Canonical data model (integer cents, ISO dates)
src/lib/engine/               Deterministic metrics, baselines, business-day
                              assignment, deviation detection — fully unit-tested
src/lib/connectors/           Connector contract + connection state machine
src/lib/providers/            Provider registry + compatibility evaluator
src/lib/setup/                Resumable 12-step setup state (zod-validated)
                              with a swappable persistence adapter
src/lib/briefing/             Sample briefing generated through the real engine
src/app/                      Landing, compatibility checker, guided setup wizard
supabase/migrations/          Core schema: tenancy, connections, normalized data,
                              aggregates, findings, reports, actions, deliveries,
                              usage, audit — RLS enabled
```

## Development

```bash
npm install
npm run dev        # http://localhost:3000
npm test           # vitest — engine + compatibility suites
npm run build      # production build (Vercel-compatible)
```

No environment variables are needed for the current stage: setup-wizard
progress persists locally through a storage adapter, and the Supabase
adapter replaces it in Stage 3 (`cp .env.example .env.local` when wiring
begins).

## Build sequence status (scope §12)

| Stage | Status |
|---|---|
| 1. Access and economics | **In progress** — Toast partner application + design-partner data import are the day-one actions |
| 2. Data engine | **Started** — canonical model, metric engine, baselines, detection gates, and connector contract are in place with tests; live credential verification with location discovery works for Square, Toast, Clover, and 7shifts (`/api/connections/verify`); historical import and reconciliation next |
| 3. Self-serve setup | **Started** — compatibility checker and the full 12-step resumable wizard exist, with a hard gate: direct-path customers cannot proceed past the POS step until their credentials verify live against the provider; auth and server persistence next |
| 4. Daily operation | Not started (jobs, delivery, actions) |
| 5. Commerce and hardening | Not started (checkout, entitlements, spending caps) |
| 6. Pilot and launch | Not started |

Launch connector pair: **Square** and **Toast**, both authenticated with
**customer-supplied read-only API credentials** entered during setup
(scope v0.3) — no provider partner program or hosted OAuth gates launch.
The wizard carries per-provider instructions for creating or requesting
credentials; scheduled report delivery covers systems without a direct
path.

## Deploy

Standard Next.js on Vercel. The scheduler/worker system for imports and
delivery is a Stage 4 decision (never a browser tab or a single long web
request — see scope §8).
