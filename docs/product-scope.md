# ShyftKick restaurant intelligence — product scope v0.3

Planning baseline: September 20, 2026. Revised September 20, 2026 (v0.2): Square and Toast confirmed as the launch connector pair, the scheduled-report path promoted to a launch capability, Mason's own restaurant named as design partner, and the build estimate updated for a second connector. Revised again (v0.3): customer-supplied read-only API credentials confirmed as the launch connection model; provider-hosted OAuth flows and the Toast commercial-distribution route are deferred to post-launch conveniences and no longer gate anything. This is a proposed product specification, not a statement that integrations or features have been built. Prices, schedules, and operating targets below are planning assumptions to validate.

## 1. Product decision

Build a self-serve restaurant analysis application for operators with 1–10 locations. Customers check compatibility, purchase, connect their systems, describe their priorities, configure recipients and delivery, and activate automated reporting. Mason's customization and training services are optional.

The core customer outcome: understand what changed, see the evidence, and know the next useful action without assembling reports manually.

Confirmed direction:

- Restaurants with 1–10 locations; support location-specific and company-wide views.
- Guided setup that customers complete themselves.
- Broad POS flexibility through tested connections and validated scheduled reports.
- Sales, category, daypart, labor, and weather context.
- Email and SMS selected during setup, separately for each recipient.
- Automated delivery and optional manager follow-up.
- Preference for an upfront purchase, with customization sold separately.
- Square and Toast are the launch connector pair, alongside a validated scheduled-report path; see sections 4 and 11 for gating.
- Customers supply their own read-only API credentials during setup (guided per provider); ShyftKick does not depend on provider partner programs or hosted OAuth at launch. Most target customers run a compatible POS and can obtain read access; the wizard walks the rest through requesting it.
- The Queen Creek restaurant Mason co-operates is the design partner and first authorized account for development, reconciliation, the feasibility prototype, and ongoing dogfooding.

Working assumptions:

- U.S. launch, USD, English, customer-configured IANA timezones.
- Hosted application is the provisional delivery model because it minimizes customer setup.
- Restaurant connections are read-only. Recommendations do not change schedules, payroll, menus, or POS records.
- An initial customer has authority to connect business systems and invite colleagues.
- Ongoing infrastructure, messaging, and maintenance need funding. The commercial mechanism remains undecided.

The release should pass this test: a supported customer can activate a verified briefing without a call with Mason. Briefings should continue automatically, with guided recovery when action is needed.

## 2. Offer and differentiation

Sell the application, onboarding, analysis configuration, and ongoing automation as a repeatable product. A skill or prompt library is an internal component containing restaurant analysis methods and writing rules; it is not the entire runtime.

The product should compete on easy activation, clear evidence, relevant recommendations, location-aware delivery, and transparent capability limits. Optional consulting helps customers design custom workflows or train their teams.

ShyftKick is built by a working restaurant operator and developed inside a real restaurant. Use that as the primary positioning against analyst-service competitors: the findings and thresholds are tested nightly against a live operation before any customer sees them.

Marty's current website describes a paid review, manager alerts, follow-up, and optional ongoing service. ShyftKick should not claim that Marty only sells a skill or provides no help. Source: [Marty](https://usemarty.com/).

## 3. Customer journey and onboarding

### Before purchase

The site shows an illustrative daily briefing and manager alert, supported connection methods, what data each feature requires, pricing, and an interactive compatibility check.

Ask for POS provider and product/version where relevant, labor/scheduling provider, location count, and account access. Result states:

- **Supported:** a tested self-serve path is available, subject to account verification.
- **Supported through reports:** show available insights and delivery frequency.
- **Access required:** explain provider approval, subscription, or admin permissions needed.
- **Not yet supported:** offer a waitlist or optional separately scoped integration request.

Do not charge for unavailable functionality. Provider selection alone is not proof of access. Where feasible, validate the connection before final payment; otherwise disclose prerequisites and a defined compatibility failure/refund policy before checkout.

### Guided setup

| Step | Questions or actions | Saved result and completion check |
|---|---|---|
| Account | Verify email; create business workspace | Customer identity and organization |
| Business | Concept, location addresses, service model, hours, timezone, business-day cutoff | Location profile; confirm detected values |
| POS | Choose provider; follow approved authorization flow | Credentials stored server-side; connection and permissions tested |
| Locations | Select included sites and name them | Provider IDs mapped to locations; no duplicate imports |
| Labor | Use POS timecards if sufficient; otherwise connect labor/scheduling provider | Explicit source of truth for actual hours, schedules, and wages |
| Priorities | Rank up to three struggles; describe one recurring example | Suggested checks mapped to available data |
| Rules | Confirm targets, dayparts, minimum roles, prep/closing needs, promotions | Versioned business rules; defaults clearly labeled |
| People | Invite owner, regional managers, GMs, and recipients; assign locations | Role and location permissions |
| Delivery | Select email/SMS, report types, time, quiet hours, reminders, and escalation | Recipient-specific routing rules and consent state |
| Validation | Import history; compare sample totals with provider report or owner-confirmed source totals | Reconciliation result, missing-data explanation, capability status |
| Preview | Show personalized report and send requested test messages | Customer verifies content and destinations |
| Activation | Display enabled checks, cadence, costs/limits, and pending features | Customer activates automation |

Setup is resumable, idempotent, and supports one working location while another awaits access. A non-admin can invite the person who controls the POS account. Pending SMS approval does not block email activation.

Target 15–30 minutes of customer effort for a supported cloud connection, excluding history import and external approvals. Measure this; do not advertise it until proven.

### Pain points become structured configuration

Example input: “Our lunch labor is too high and beverage sales keep slipping.”

The application proposes lunch sales per labor hour, actual labor percentage if wages are available, and beverage units/sales/mix against comparable weekdays. The customer confirms the location, lunch hours, and staffing constraints.

Free text can suggest settings. It must not silently enable arbitrary code, change recipients, or grant new access. Advanced custom metrics require explicit supported definitions or a separately scoped service.

## 4. Integration strategy

Every connector converts source data into one shared internal model. Analysis uses that model rather than separate prompts for each POS.

### Connection paths

1. **Direct API:** secure entry of customer-owned read-only credentials (the launch model), followed by permission checks, historical import, incremental updates, and reconciliation. Credentials are stored server-side in managed secret storage, never client-side. Provider-hosted OAuth is a later one-click convenience, not a launch dependency. The setup wizard includes per-provider instructions for creating or requesting credentials, since many operators will not have them on hand.
2. **Integration service:** evaluate middleware for additional POS coverage; verify economics, installation needs, history, labor fields, and freshness before committing.
3. **Scheduled report delivery:** provider-specific instructions for supported CSV/report templates, delivered to a dedicated ingestion address or supported file destination. Validate column mapping, units, totals, location, and date. Detect schema changes. Daily reports enable daily analysis, not live alerts. This path is a headline launch capability, not a fallback: it is provider-agnostic, it is the concrete form of the broad-POS-flexibility promise, and it covers Toast customers while commercial distribution approval is pending.
4. **Manual upload:** useful for compatibility tests and recovery; visibly labeled as requiring customer action.

Unrecognized reports enter validation rather than production automation. AI may propose mappings, but sample reconciliation and deterministic validation establish whether the mapping is usable. Avoid relying on unattended browser scraping for the core product.

### Candidate providers and launch dependencies

| Provider | Evidence and intended approach | Gate before public availability |
|---|---|---|
| Square | Launch connector; build first — customer-created API access token (read-only scopes); Orders and Labor APIs are candidates | Demonstrate complete data and reconciliation in real restaurant accounts; verify required permissions and relevant product entitlements |
| Toast (customer credentials) | Read-only standard API credentials are obtainable by the restaurant itself on RMS Essentials or higher; customers enter them during setup. If the design-partner restaurant runs Toast on an eligible plan, build and validate against its credentials, otherwise obtain an eligible test account | Demonstrate complete data and reconciliation on a real eligible account; confirm required scopes and actual data availability |
| Toast (commercial distribution) | Partner/commercial route controlled by Toast — would enable one-click OAuth instead of credential entry | Deferred: not a launch dependency under the credential-entry model; revisit post-launch as a convenience upgrade |
| 7shifts | Customer-supplied API token at launch (plans with API access); distributed OAuth is partner-gated and deferred | Validate that customer tokens provide the required schedule, timecard, and wage fields end to end |
| Omnivore | Candidate middleware for supported systems such as Aloha, Brink, and Micros — post-v1 evaluation only; not a launch dependency now that the scheduled-report path is a launch capability | Obtain pricing and confirm licensing, installation, historical depth, field coverage, and unattended customer setup |
| Other providers | Provider-specific feasibility investigation | Publish as supported only after end-to-end connection, import, and recovery tests |

Sources: [Square authorization](https://developer.squareup.com/docs/oauth-api/overview), [Square labor](https://developer.squareup.com/reference/square/labor-api), [Toast credentials](https://doc.toasttab.com/doc/devguide/devApiAccessCredentials.html), [Toast account types](https://doc.toasttab.com/doc/devguide/apiClientAccounts.html), [7shifts authentication](https://developers.7shifts.com/docs/authentication), [Omnivore](https://www.olo.com/omnivoreapi), [Omnivore licensing](https://omnivoreapi.zendesk.com/hc/en-us/articles/13852109377435-POS-Licensing-Requirements).

### Connector contract

Each connector declares authentication method, supported data fields, historical limits, refresh frequency, provider IDs, required scopes, timezone conventions, quota behavior, and setup instructions. It implements connection testing, location discovery, backfill, incremental sync, correction handling, health checks, and revocation/disconnection.

Use a state model: not connected → authorizing → validating → importing → ready; alternate states are degraded, stale, permission required, and disconnected. Reconnecting preserves history and avoids duplicates.

### Feature availability is data-driven

| Data available | Features enabled |
|---|---|
| Daily sales totals | Daily sales comparisons |
| Transactions and line items | Average check, units, categories, product mix |
| Transaction timestamps | Daypart and interval sales |
| Actual timecards | Worked hours and sales per labor hour |
| Timecards plus effective wage data | Estimated direct labor cost and labor percentage |
| Published schedules | Planned-versus-actual hours and forward coverage checks |
| Fresh intraday sales and actual staffing | Eligible during-shift alerts after separate validation |
| Appropriate invoices, recipes, or inventory | Future food-cost functionality |

Missing fields disable only dependent findings. A company summary identifies excluded locations and uses comparable locations for comparisons.

## 5. Analysis specification

Code calculates metrics, comparisons, and candidate findings. The language model explains verified findings using the restaurant's configuration. It does not invent figures, infer missing wages, or decide recipients.

### Initial metric set

- Net sales under a documented provider-aligned definition; show handling of discounts, refunds, tax, tips, service charges, and gift cards.
- Comparable transaction/check count and average check using a consistent denominator.
- Category/item sales, units, and mix; map categories consistently across locations before aggregating.
- Daypart sales and channel performance where source labels are reliable.
- Actual paid/worked hours, with explicit handling of breaks, open timecards, and edits.
- Sales per labor hour; undefined when hours are zero.
- Estimated direct wage cost, based on effective dated wages where available; identify excluded salary, benefits, payroll taxes, or other burdens.
- Direct labor percentage; undefined when sales are zero rather than reporting a misleading percentage.
- Scheduled versus actual hours; estimated overtime exposure only where customer rules and sufficient week-to-date data are available. This is an operational estimate, not a payroll calculation.
- Discounts, voids, and refunds as review signals, with no unsupported employee misconduct conclusions.

Choose one source of truth for each metric. If a scheduler also imports POS sales, do not count those sales again.

### Comparison rules

Attempt 8–12 weeks of history, subject to provider access. Initial default: compare the latest complete business day with the median of up to eight comparable weekdays; require at least four usable comparisons for a normal baseline. Below that, label the baseline as forming and restrict anomaly claims.

Exclude or flag closures, holidays, promotions, abnormal hours, and data gaps. A short history cannot support reliable annual seasonality claims. Use year-over-year comparisons only with suitable data and a documented calendar alignment.

Define business dates explicitly, including shifts and sales after midnight. Respect each location's timezone and daylight-saving behavior. Record which transaction timestamp drives daypart allocation. Schedule analysis after the source's expected closing and update window.

### Finding types

| Finding | Required evidence | Recommendation boundary |
|---|---|---|
| Sales declined | Complete sales and comparable baseline | Identify contributing dayparts, categories, volume, or check changes where data exists |
| Category weakness | Stable mapping, units/sales, comparable periods | Suggest review of availability, menu changes, or promotions; do not assume a stockout |
| Low labor productivity | Actual interval hours and sales | Flag review against restaurant-specific staffing needs, including prep/closing work |
| Schedule variance | Actual timecards and published schedule | Show the interval and role where variance occurred; exclude unclosed shifts from final claims |
| Unusual discounts/refunds | Relevant transactions and baseline | Ask for review; report facts without accusations |
| Weather context | Location/time-matched weather and business data | Describe overlap and possible contribution; do not claim causation |

Weather history should distinguish observations, modeled/reanalysis data, and forecasts. Store which was used. Commercial weather service costs belong in operating costs; Open-Meteo's pricing page distinguishes its commercial service. Source: [Open-Meteo pricing](https://open-meteo.com/en/pricing).

### Evidence and quality

Each finding stores metric values, baseline, date range, location, source records/aggregates, freshness, rule version, priority, assigned owner, suggested action, and uncertainties. Thresholds combine relative change, absolute impact, and sufficient sample size so tiny denominators do not create dramatic alerts.

Missing or stale data produces an operational notice rather than a business conclusion. Suppress unsupported recommendations. Present estimated opportunities separately from verified outcomes. Changes after an action are associations unless a defensible method supports stronger attribution.

### Briefing format

Show business date and data status, a compact scorecard, up to three priority findings, evidence, suggested actions, and an optional outlook. Provide links to full detail. A quiet day receives a short factual briefing. Managers receive only their authorized locations; owners may receive an aggregate and location exceptions.

## 6. Notifications and manager follow-up

Email and SMS are launch channels. Each recipient selects one or both, confirms contact details, and has explicit location access. Owners configure organizational routing; recipients manage channel consent and preferences. Adding a phone number is not equivalent to the recipient opting in.

Notification settings include daily summaries, finding categories, minimum priority, local delivery time, quiet hours, digest/immediate mode where supported, maximum alert frequency, reminder timing, and an optional escalation recipient. Set conservative default limits, such as one briefing and at most two issue texts per recipient per day; let an authorized customer change them. Required operational notices are separately defined and still respect messaging consent.

SMS setup includes provider-appropriate sender registration, opt-in records, opt-out processing, contact verification, test delivery, and pending/failed status. Twilio documents API-driven registration for software vendors sending on behalf of customers; the final sender architecture must match the actual business use case. Email can be activated while SMS approval is pending. Source: [Twilio onboarding](https://www.twilio.com/docs/messaging/compliance/a2p-10dlc/onboarding-isv).

Email sends from an authenticated ShyftKick domain by default. A customer-branded sending domain can be a later option. Configure bounce/complaint handling and delivery status.

Each issue has a stable identity to prevent duplicate messages across job retries, channels, and repeated detections. Recurring unresolved issues update the existing item rather than repeatedly creating new tasks. Delivery records distinguish queued, provider accepted, delivered where confirmed, failed, and opted out; delivery is not proof that someone read the message.

### Manager action flow

1. A rule identifies a supported finding and routes it using saved customer settings.
2. The manager receives a concise message with a secure link to the evidence.
3. The manager acknowledges, records action taken, snoozes with a reason, or marks it not applicable.
4. A reminder follows only if configured and still relevant.
5. An unresolved action may escalate to a designated person.
6. A subsequent comparable data period checks whether the metric changed.

Track workflow state separately from outcome: new, acknowledged, action recorded, dismissed, or overdue; and outcome pending, improved, unchanged, worsened, or insufficient data. A manager's acknowledgement does not prove savings.

Launch uses links for replies and action updates. Free-form two-way SMS analysis is a later feature, with sender verification, authorization, conversation context, costs, and ambiguity handling scoped separately. Avoid including individual wages or sensitive detail in message previews.

Live alerts are a later capability gate: require validated intraday sales, reliable current staffing, freshness thresholds, and restaurant-specific constraints. Recommendations remain subject to manager judgment. Daily imports must never trigger claims about current conditions.

## 7. Application surfaces and permissions

Customer screens:

- Compatibility checker and checkout.
- Setup wizard with saved progress and explanations.
- Today: latest briefing, data status, and active actions.
- Report history with date/location filters and evidence detail.
- Actions with owners, due dates, responses, and outcome checks.
- Connections with freshness, missing permissions, and guided reconnection.
- People, roles, location access, and notification preferences.
- Business rules, priorities, operating context, and category mappings.
- Billing, usage, plan limits, data export, and account closure.

Roles: owner/billing administrator; organization administrator; regional manager; location manager; read-only recipient. Restrict wage details independently where necessary. Authorize every report, download, and action on the server; hiding a navigation item is insufficient.

Mason's operator console provides connector status, job failures, delivery problems, spending, and support diagnostics. Customer-data access for support should be limited, explicit, and audited. Normal reporting does not require Mason's review.

## 8. Technical architecture

Proposed architecture, subject to a small feasibility spike:

- A TypeScript web application hosted on Vercel for customer setup, reports, and settings.
- Supabase for authentication, Postgres, access policies, and object storage.
- A durable scheduler/worker system for backfills, polling, retries, analysis, and delivery. Choose its implementation after measuring job duration and hosting constraints; do not rely on a browser tab or a single long web request.
- Deterministic metric and finding engine with versioned rules.
- A replaceable language-model adapter receiving minimized, validated aggregates and contextual facts.
- Resend or equivalent for email; Twilio or equivalent for SMS.
- A commercially suitable weather API and a payment provider for checkout and operating charges.

Daily pipeline: fetch → normalize → reconcile → assess completeness → calculate → detect → generate narrative → validate output → store report → route notifications → record delivery.

Language-model output has a constrained schema and references known finding IDs. Validate every reported number against computed facts. On generation failure, retry within a limit or deliver a deterministic report. Retrieved reports, item names, and manager notes are untrusted data; they cannot change tool permissions or routing. Secrets never enter model prompts.

Use organization and location identifiers throughout. Encrypt credentials using managed secret storage, restrict access to workers, redact logs, and support credential revocation. Exclude customer payment details and unnecessary customer/employee identifiers from imports.

### Core records

Organizations; locations; memberships and location grants; connections and secret references; connector capabilities; sync runs and cursors; source record identifiers; normalized sales and line items; timecards, wages, and schedules; daily/interval aggregates; weather; context events; rules and versions; findings and evidence; reports; actions and responses; recipient preferences and consent; deliveries; usage, billing entitlements, and audit events.

Use stable source IDs and uniqueness constraints to prevent duplicates. Preserve metric lineage and configuration versions so historical reports can be explained. Store corrections without silently rewriting an already-sent message; label revised reports when material source changes occur.

## 9. Reliability, privacy, and cost controls

These are product requirements needed to make self-service credible:

- Retry transient failures with backoff; respect provider limits; isolate jobs by customer.
- Refresh tokens automatically where supported; guide reconnection on revoked or expired access.
- Validate report completeness and mark missing locations rather than presenting partial totals as complete.
- Use an outbox/idempotency mechanism for sending; recover crashes without duplicate texts.
- Verify inbound provider webhooks and guard against repeated events.
- Support unsubscribe, revoked access, staff removal, and changed location assignments immediately.
- Avoid public report URLs; use scoped, expiring links plus authentication appropriate to the content.
- Enforce tenant separation in database access, jobs, storage, and model requests.
- Offer customer export and deletion; document backup expiry, third-party retention, and account closure behavior.
- Provisional retention: raw staging data for 30 days, normalized business history for 24 months, with a defined shorter path for unnecessary personal identifiers. Confirm costs and customer needs before fixing this policy.
- Track language-model, SMS, connector, email, storage, and job usage per organization. Set spending caps and disclose what happens at the limit.
- Provide incident and backup/restore procedures. Product defects remain ShyftKick's responsibility, not a required customization purchase.

## 10. Commercial model

The user's preference is an upfront purchase and optional customization. Hosted delivery is a recommendation, not a finalized billing decision.

| Model | Fit | Tradeoff |
|---|---|---|
| Upfront license plus recurring operating charge | Closest provisional fit for hosted self-service | Recurring charge must explicitly fund hosting, automation, messaging, connector upkeep, and basic product support |
| Subscription with optional activation charge | Straightforward funding for a hosted platform | Less aligned with the original one-time purchase preference |
| Customer-run licensed software | Closest to a strict one-time software sale | Customer must fund and operate service accounts; deployment, updates, and support become more complex |

Do not promise perpetual hosted service for a fixed payment without a sustainable funding plan. Usage-only charges still need enough margin or a minimum fee to cover maintenance and low-volume accounts. Do not describe a fee that also funds maintenance as pure third-party cost reimbursement.

### Pricing experiments, not launch commitments

For the hosted license model, test an upfront range of $750–$1,500 for 1–3 locations and $1,500–$3,000 for 4–10 locations. One candidate operating structure is $79 per organization plus $29 per active location per month, with explicit included allowances and separately priced excess usage. This would be $108/month for one location and $369/month for ten; provider access fees and exceptional middleware charges would be disclosed separately.

Those numbers are willingness-to-pay hypotheses, not vendor quotes or validated margins. Final allowances must follow pilot measurements. Mason's own restaurant validates data quality and finding usefulness; it cannot validate willingness to pay. During the build, run three to five pricing conversations with outside operators using the illustrative briefing from section 3, and treat the numbers above as unvalidated until then. Optional training can be sold as a fixed session; customization can be a scoped project or a retainer with a defined time allowance. Normal bug fixes and maintaining advertised integrations belong in the base product's operating responsibility.

Calculate monthly contribution as recurring revenue minus infrastructure, model usage, messaging/carrier/sender fees, email, weather, integration services, payment fees, and support/maintenance allocation. Track upfront revenue separately. Model both one and ten locations, high SMS usage, large transaction volume, backfill spikes, and a support-heavy month.

Checkout must state location limits, supported data capabilities, recurring charges, included usage, upgrades, cancellation, refund treatment for compatibility failure, and what happens to access/history after cancellation. An upfront license does not imply transferable source-code ownership or free hosted operation; define exactly what is purchased.

## 11. Release boundaries

### Feasibility prototype

One POS connection using Mason's own restaurant as the authorized account (fall back to a provider sandbox or a second friendly operator only for data the design partner cannot supply), deterministic sales/labor calculations where data permits, sample briefing, and a measured data reconciliation. A disposable prototype proves access and quality before extensive UI work.

### Paid pilot

One fully working direct connector, labor source where needed, 1–10 location data structure, guided setup, priorities/rules, email and SMS setup, historical import, daily reports, manager actions through links, reconnection, and usage tracking. Run the product daily on the design-partner restaurant throughout the pilot as a continuous dogfood account. Conduct observed onboarding with outside operators to find friction; assistance during research does not count as successful self-serve activation.

### Public v1

Public v1 ships the Square direct connector, the Toast direct connector, and one validated scheduled-report path — all authenticated with customer-supplied read-only credentials, so no partner approval can block the date. The compatibility checker asks whether the customer has (or can obtain) API access and routes those who don't to per-provider instructions or the scheduled-report path. Include a scheduling connection only when its access route is ready. If fewer connections are ready, limit sales to the verified compatibility list rather than advertising broader availability.

Public v1 includes the full onboarding journey, daily sales/category/daypart analysis, labor analysis conditional on data, weather context, per-location and company summaries, email/SMS delivery, action reminders and escalation, report history, billing/usage, and guided failure recovery.

Later releases can add validated intraday alerts, more connectors, richer scheduled exports, free-form SMS questions, forecasting, inventory/invoice data, and food-cost analysis. Autonomous staffing changes, payroll decisions, and general-purpose agents modifying business systems require a separate product scope.

## 12. Build sequence and acceptance gates

| Stage | Deliverable | Gate before proceeding |
|---|---|---|
| 1. Access and economics | Real sample data, endpoint/access map, provider dependency list, operating cost model. Day-one action: obtain the design-partner restaurant's read-only API credentials and begin importing its data | Required data is obtainable; deployment model and provider path are credible |
| 2. Data engine | Connector contract, canonical model, calculations, reconciliation, historical import | Source totals agree under documented definitions; corrections, missing records, and midnight boundaries behave correctly |
| 3. Self-serve setup | Compatibility, auth, wizard, people, rules, preview | Unassisted owner can reach a valid preview on a supported account |
| 4. Daily operation | Jobs, analysis, email/SMS, actions, retries, status | End-to-end daily cycle works with failure injection and no duplicate notifications |
| 5. Commerce and hardening | Checkout, entitlements, spending limits, isolation, export/deletion, monitoring | Billing lifecycle, tenant access, opt-outs, and recovery pass verification |
| 6. Pilot and launch | Observed outside customers (the design-partner restaurant does not count toward self-serve targets), Toast distribution status resolved or fallback listing in place, help content | Launch criteria met; only verified capabilities appear on the site |

Planning range: roughly 15–24 focused engineering weeks for a solo builder to reach a constrained paid v1 with both launch connectors, including pilot iteration, assuming timely access and a familiar stack. The second direct connector accounts for roughly three to four of those weeks. Toast partner approval runs in parallel as external wait time — record it separately and never count it as build effort or let it block Square-path progress. This is a rough effort estimate, not a delivery promise. Partner reviews and broad legacy-POS coverage can extend the calendar substantially. Re-estimate after Stage 1.

### Meaningful verification cases

- Reconcile sample source reports covering refunds, discounts, tax/tips, voids, gift cards, open checks, and late edits under the selected definitions.
- Test cross-midnight business days, differing timezones, daylight-saving transitions, partial closures, and open/edited timecards.
- Duplicate imports, expired/revoked credentials, rate limits, malformed scheduled reports, missing wages, zero sales, and incomplete locations.
- Tenant/location authorization, removal of a manager, malicious text inside imported fields, and expired report links.
- Message retry after a crash, opt-out, bounced email, quiet hours, failed SMS registration, and cancellation of a stale reminder.
- Model output with invented numbers, missing evidence, or unsupported certainty must be rejected or fall back to a factual template.
- Duplicate checkout webhooks, changed location count, usage limits, failed recurring payment, cancellation, and export/deletion.

### Proposed launch targets

- At least 8 of 10 supported onboarding attempts complete without staff intervention; the design-partner restaurant is excluded from this measurement. Exclude external approval wait time from effort measurement, but record it separately.
- Reconciliation is exact to currency precision where definitions match; every remaining difference is explained and accepted before activation.
- Over a 14-day pilot, at least 95% of complete-data briefings arrive inside the configured delivery window; all other runs show a clear delayed/partial status rather than silent failure.
- No duplicate sends in retry tests; opt-outs and role restrictions work in every tested path.
- Every material claim has source evidence; no unsupported numeric claims in the evaluated reports.
- Owners rate most delivered findings useful or appropriately quiet; capture actions taken and false-positive reasons.
- Measured costs and support time fit the chosen price at both ends of the location range.

The pilot is necessary evidence, not proof of long-term reliability. Continue measuring connector health, activation, delivery, finding usefulness, recurring costs, and support burden after launch.

## 13. Decisions still needed

| Decision | Provisional recommendation | Must be settled before |
|---|---|---|
| Hosted versus customer-run | Hosted for simple setup | Architecture and billing implementation |
| Purchase/operating model | Upfront license plus transparent operating charge | Checkout and public pricing |
| First providers | Decided: Square and Toast are the launch pair, with Square built first and the scheduled-report path available at launch | Connector development |
| Connection model | Decided: customer-supplied read-only API credentials at launch; provider OAuth and the Toast partner route deferred as post-launch conveniences | — (settled) |
| 7shifts distribution | Customer-supplied API token at launch; confirm the token's field coverage during Stage 1 | Public scheduling integration |
| SMS sender arrangement | Match provider onboarding to actual tenant/use-case structure | Production texting |
| Initial service segment | Narrow pilot to similar operating models while supporting 1–10 locations | Default analysis thresholds |
| License and support scope | Product operation included in operating charge; optional work clearly separate | Terms and sale |

The next concrete milestone is a feasibility package containing one authorized restaurant's data map, a reconciled example briefing, its exact setup flow, and a cost estimate. That package determines the first build backlog and prevents the self-serve promise from depending on untested assumptions.
