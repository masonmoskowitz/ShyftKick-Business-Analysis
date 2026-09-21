"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  CircleDashed,
  Lock,
  Plus,
  Trash2,
} from "lucide-react";
import {
  SETUP_STEPS,
  defaultSetupState,
  setupProgress,
  type SetupState,
  type StepId,
} from "@/lib/setup/state";
import { LocalSetupStorage } from "@/lib/setup/storage";
import {
  laborProviders,
  posProviders,
  getProvider,
  type ProviderEntry,
} from "@/lib/providers/registry";
import { sampleBriefing } from "@/lib/briefing/sample";
import { BriefingCard } from "@/components/BriefingCard";

const STRUGGLE_OPTIONS = [
  "Labor costs are too high",
  "Sales are slipping",
  "A category or daypart is underperforming",
  "Schedules don't match actual demand",
  "Discounts, voids, or refunds look off",
  "No time to assemble reports",
];

const US_TIMEZONES = [
  "America/Phoenix",
  "America/Los_Angeles",
  "America/Denver",
  "America/Chicago",
  "America/New_York",
];

const STANDARD_DAYPARTS = [
  { name: "Breakfast", start: "07:00", end: "11:00" },
  { name: "Lunch", start: "11:00", end: "14:00" },
  { name: "Afternoon", start: "14:00", end: "17:00" },
  { name: "Dinner", start: "17:00", end: "21:00" },
  { name: "Late", start: "21:00", end: "23:00" },
];

/* ---------- small form primitives ---------- */

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium">{label}</span>
      {hint && <span className="mt-0.5 block text-xs text-muted">{hint}</span>}
      <div className="mt-1.5">{children}</div>
    </label>
  );
}

const inputClass =
  "w-full rounded-md border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-accent";

/* ---------- wizard ---------- */

export function SetupWizard() {
  const storage = useRef(new LocalSetupStorage());
  const [state, setState] = useState<SetupState>(defaultSetupState);
  const [loaded, setLoaded] = useState(false);
  const [activeId, setActiveId] = useState<StepId>("account");

  useEffect(() => {
    setState(storage.current.load());
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (loaded) storage.current.save(state);
  }, [state, loaded]);

  const update = (patch: Partial<SetupState>) =>
    setState((prev) => ({ ...prev, ...patch }));

  const activeIndex = SETUP_STEPS.findIndex((s) => s.id === activeId);
  const activeStep = SETUP_STEPS[activeIndex];
  const progress = useMemo(() => setupProgress(state), [state]);
  const blockers = activeStep.blockers?.(state) ?? [];

  return (
    <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
      <aside>
        <p className="mb-2 text-xs font-medium text-muted">
          {progress.complete} of {progress.total} steps complete
        </p>
        <ol className="flex gap-1 overflow-x-auto pb-2 lg:flex-col lg:overflow-visible">
          {SETUP_STEPS.map((step, i) => {
            const complete = step.isComplete(state);
            const active = step.id === activeId;
            return (
              <li key={step.id} className="shrink-0">
                <button
                  type="button"
                  onClick={() => setActiveId(step.id)}
                  className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm ${
                    active
                      ? "bg-accent-soft font-medium text-accent-ink"
                      : "text-muted hover:bg-surface hover:text-ink"
                  }`}
                >
                  {complete ? (
                    <Check size={15} className="shrink-0 text-good" aria-hidden />
                  ) : (
                    <CircleDashed size={15} className="shrink-0" aria-hidden />
                  )}
                  <span className="whitespace-nowrap">
                    {i + 1}. {step.title}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </aside>

      <section className="rounded-xl border border-line bg-surface p-6">
        <header className="mb-5">
          <h2 className="text-lg font-semibold">{activeStep.title}</h2>
          <p className="mt-0.5 text-sm text-muted">{activeStep.summary}</p>
        </header>

        {blockers.length > 0 && activeStep.id !== "activation" ? (
          <BlockedNotice blockers={blockers} />
        ) : (
          <StepBody id={activeId} state={state} update={update} />
        )}

        <footer className="mt-6 flex items-center justify-between border-t border-line pt-4">
          <button
            type="button"
            disabled={activeIndex === 0}
            onClick={() => setActiveId(SETUP_STEPS[activeIndex - 1].id)}
            className="flex items-center gap-1 rounded-md px-3 py-2 text-sm text-muted enabled:hover:text-ink disabled:opacity-40"
          >
            <ChevronLeft size={16} aria-hidden /> Back
          </button>
          {activeIndex < SETUP_STEPS.length - 1 && (
            <button
              type="button"
              onClick={() => setActiveId(SETUP_STEPS[activeIndex + 1].id)}
              className="flex items-center gap-1 rounded-md bg-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90"
            >
              Continue <ChevronRight size={16} aria-hidden />
            </button>
          )}
        </footer>
      </section>
    </div>
  );
}

function BlockedNotice({ blockers }: { blockers: string[] }) {
  return (
    <div className="rounded-lg border border-line bg-canvas p-4">
      <p className="flex items-center gap-2 text-sm font-medium">
        <Lock size={15} aria-hidden /> This step isn&apos;t available yet
      </p>
      <ul className="mt-2 space-y-1 text-sm text-muted">
        {blockers.map((b) => (
          <li key={b}>{b}</li>
        ))}
      </ul>
    </div>
  );
}

/* ---------- step bodies ---------- */

function StepBody({
  id,
  state,
  update,
}: {
  id: StepId;
  state: SetupState;
  update: (patch: Partial<SetupState>) => void;
}) {
  switch (id) {
    case "account":
      return (
        <div className="max-w-md space-y-4">
          <Field label="Work email" hint="We'll verify this address before activation.">
            <input
              type="email"
              className={inputClass}
              value={state.account.email}
              onChange={(e) =>
                update({ account: { ...state.account, email: e.target.value } })
              }
              placeholder="you@yourrestaurant.com"
            />
          </Field>
          <Field label="Business name">
            <input
              className={inputClass}
              value={state.account.businessName}
              onChange={(e) =>
                update({
                  account: { ...state.account, businessName: e.target.value },
                })
              }
              placeholder="Copper Fork Kitchen"
            />
          </Field>
        </div>
      );

    case "business":
      return (
        <div className="max-w-md space-y-4">
          <Field label="Concept" hint="e.g. fast casual, full service, coffee">
            <input
              className={inputClass}
              value={state.business.concept}
              onChange={(e) =>
                update({ business: { ...state.business, concept: e.target.value } })
              }
            />
          </Field>
          <Field label="Service model">
            <select
              className={inputClass}
              value={state.business.serviceModel}
              onChange={(e) =>
                update({
                  business: {
                    ...state.business,
                    serviceModel: e.target
                      .value as SetupState["business"]["serviceModel"],
                  },
                })
              }
            >
              <option value="">Choose…</option>
              <option value="counter">Counter service</option>
              <option value="table">Table service</option>
              <option value="quick_service">Quick service / drive-thru</option>
              <option value="mixed">Mixed</option>
            </select>
          </Field>
          <Field label="Timezone" hint="Each location can override this later.">
            <select
              className={inputClass}
              value={state.business.timezone}
              onChange={(e) =>
                update({ business: { ...state.business, timezone: e.target.value } })
              }
            >
              <option value="">Choose…</option>
              {US_TIMEZONES.map((tz) => (
                <option key={tz} value={tz}>
                  {tz}
                </option>
              ))}
            </select>
          </Field>
          <Field
            label="Business-day cutoff"
            hint="Sales before this local time count toward the previous day. Default 03:00."
          >
            <input
              className={inputClass}
              value={state.business.businessDayCutoff}
              onChange={(e) =>
                update({
                  business: { ...state.business, businessDayCutoff: e.target.value },
                })
              }
              placeholder="03:00"
            />
          </Field>
        </div>
      );

    case "pos": {
      const provider = getProvider(state.pos.providerId);
      return (
        <div className="max-w-xl space-y-4">
          <Field label="POS provider">
            <select
              className={inputClass}
              value={state.pos.providerId}
              onChange={(e) =>
                update({
                  pos: {
                    providerId: e.target.value,
                    credentialsProvided: false,
                    connectionState: "not_connected",
                  },
                })
              }
            >
              <option value="">Choose…</option>
              {posProviders().map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </Field>
          {provider && (
            <div className="rounded-lg border border-line bg-canvas p-4 text-sm">
              <p className="font-medium">{provider.name}</p>
              <p className="mt-1 text-muted">{provider.detail}</p>
              {provider.connectionPath === "direct" && provider.credentialFields ? (
                <CredentialEntry
                  key={provider.id}
                  provider={provider}
                  state={state}
                  update={update}
                />
              ) : provider.connectionPath === "reports" ? (
                <p className="mt-3 text-muted">
                  During setup you get provider-specific instructions to
                  schedule a daily report export to your dedicated ShyftKick
                  ingestion address. Column mapping, units, totals, location,
                  and dates are validated on your first samples before
                  anything activates.
                </p>
              ) : null}
              <p className="mt-3 text-xs text-muted">
                Connection status:{" "}
                <span className="font-medium text-ink">
                  {state.pos.connectionState.replace(/_/g, " ")}
                </span>
              </p>
              {process.env.NODE_ENV !== "production" &&
                state.pos.connectionState !== "ready" && (
                  <button
                    type="button"
                    onClick={() =>
                      update({ pos: { ...state.pos, connectionState: "ready" } })
                    }
                    className="mt-2 rounded-md border border-line px-3 py-1.5 text-xs hover:bg-surface"
                  >
                    Mark connection ready (dev preview only)
                  </button>
                )}
            </div>
          )}
        </div>
      );
    }

    case "locations":
      return (
        <div className="max-w-xl space-y-3">
          {state.locations.map((loc, i) => (
            <div key={loc.id} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={loc.included}
                onChange={(e) => {
                  const locations = [...state.locations];
                  locations[i] = { ...loc, included: e.target.checked };
                  update({ locations });
                }}
                aria-label={`Include ${loc.name || "location"}`}
              />
              <input
                className={inputClass}
                value={loc.name}
                placeholder="Location name"
                onChange={(e) => {
                  const locations = [...state.locations];
                  locations[i] = { ...loc, name: e.target.value };
                  update({ locations });
                }}
              />
              <input
                className={inputClass}
                value={loc.address}
                placeholder="Address"
                onChange={(e) => {
                  const locations = [...state.locations];
                  locations[i] = { ...loc, address: e.target.value };
                  update({ locations });
                }}
              />
              <button
                type="button"
                onClick={() =>
                  update({
                    locations: state.locations.filter((l) => l.id !== loc.id),
                  })
                }
                className="rounded-md p-2 text-muted hover:text-bad"
                aria-label="Remove location"
              >
                <Trash2 size={16} aria-hidden />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() =>
              update({
                locations: [
                  ...state.locations,
                  {
                    id: crypto.randomUUID(),
                    name: "",
                    address: "",
                    included: true,
                  },
                ],
              })
            }
            className="flex items-center gap-1 rounded-md border border-line px-3 py-2 text-sm hover:bg-canvas"
          >
            <Plus size={15} aria-hidden /> Add location
          </button>
          <p className="text-xs text-muted">
            Once your POS connection is ready, discovered provider locations
            appear here to map — preventing duplicate imports.
          </p>
        </div>
      );

    case "labor":
      return (
        <div className="max-w-md space-y-4">
          <Field
            label="Source of truth for hours and wages"
            hint="If a scheduler also imports POS sales, we never count those sales twice."
          >
            <select
              className={inputClass}
              value={state.labor.source}
              onChange={(e) =>
                update({
                  labor: {
                    ...state.labor,
                    source: e.target.value as SetupState["labor"]["source"],
                  },
                })
              }
            >
              <option value="">Choose…</option>
              <option value="pos_timecards">POS timecards are sufficient</option>
              <option value="labor_provider">
                Connect a labor/scheduling provider
              </option>
            </select>
          </Field>
          {state.labor.source === "labor_provider" && (
            <Field label="Labor provider">
              <select
                className={inputClass}
                value={state.labor.laborProviderId}
                onChange={(e) =>
                  update({
                    labor: { ...state.labor, laborProviderId: e.target.value },
                  })
                }
              >
                <option value="">Choose…</option>
                {laborProviders().map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </Field>
          )}
        </div>
      );

    case "priorities":
      return (
        <div className="max-w-xl space-y-4">
          <div>
            <p className="text-sm font-medium">
              What are you struggling with? (pick up to 3)
            </p>
            <div className="mt-2 space-y-2">
              {STRUGGLE_OPTIONS.map((option) => {
                const selected = state.priorities.struggles.includes(option);
                const atLimit = state.priorities.struggles.length >= 3;
                return (
                  <label
                    key={option}
                    className={`flex items-center gap-2 text-sm ${
                      !selected && atLimit ? "opacity-50" : ""
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selected}
                      disabled={!selected && atLimit}
                      onChange={(e) =>
                        update({
                          priorities: {
                            ...state.priorities,
                            struggles: e.target.checked
                              ? [...state.priorities.struggles, option]
                              : state.priorities.struggles.filter(
                                  (s) => s !== option,
                                ),
                          },
                        })
                      }
                    />
                    {option}
                  </label>
                );
              })}
            </div>
          </div>
          <Field
            label="Describe one recurring example"
            hint="Free text suggests checks mapped to your available data. It never silently enables code, changes recipients, or grants access."
          >
            <textarea
              className={`${inputClass} min-h-24`}
              value={state.priorities.example}
              onChange={(e) =>
                update({
                  priorities: { ...state.priorities, example: e.target.value },
                })
              }
              placeholder="Our lunch labor is too high and beverage sales keep slipping…"
            />
          </Field>
        </div>
      );

    case "rules":
      return (
        <div className="max-w-xl space-y-4">
          <Field
            label="Direct labor target (%)"
            hint="Optional. Used for flagging, never for payroll decisions."
          >
            <input
              type="number"
              min={0}
              max={100}
              className={inputClass}
              value={state.rules.laborTargetPct ?? ""}
              onChange={(e) =>
                update({
                  rules: {
                    ...state.rules,
                    laborTargetPct:
                      e.target.value === "" ? null : Number(e.target.value),
                  },
                })
              }
            />
          </Field>
          <div>
            <p className="text-sm font-medium">Dayparts</p>
            {state.rules.dayparts.length === 0 ? (
              <button
                type="button"
                onClick={() =>
                  update({ rules: { ...state.rules, dayparts: STANDARD_DAYPARTS } })
                }
                className="mt-2 flex items-center gap-1 rounded-md border border-line px-3 py-2 text-sm hover:bg-canvas"
              >
                <Plus size={15} aria-hidden /> Start from standard dayparts
              </button>
            ) : (
              <div className="mt-2 space-y-2">
                {state.rules.dayparts.map((dp, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input
                      className={inputClass}
                      value={dp.name}
                      onChange={(e) => {
                        const dayparts = [...state.rules.dayparts];
                        dayparts[i] = { ...dp, name: e.target.value };
                        update({ rules: { ...state.rules, dayparts } });
                      }}
                    />
                    <input
                      className={`${inputClass} w-24`}
                      value={dp.start}
                      onChange={(e) => {
                        const dayparts = [...state.rules.dayparts];
                        dayparts[i] = { ...dp, start: e.target.value };
                        update({ rules: { ...state.rules, dayparts } });
                      }}
                    />
                    <input
                      className={`${inputClass} w-24`}
                      value={dp.end}
                      onChange={(e) => {
                        const dayparts = [...state.rules.dayparts];
                        dayparts[i] = { ...dp, end: e.target.value };
                        update({ rules: { ...state.rules, dayparts } });
                      }}
                    />
                    <button
                      type="button"
                      onClick={() =>
                        update({
                          rules: {
                            ...state.rules,
                            dayparts: state.rules.dayparts.filter(
                              (_, j) => j !== i,
                            ),
                          },
                        })
                      }
                      className="rounded-md p-2 text-muted hover:text-bad"
                      aria-label="Remove daypart"
                    >
                      <Trash2 size={16} aria-hidden />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <p className="mt-1 text-xs text-muted">
              Defaults are labeled as defaults in every report until you
              confirm them. Rules are versioned — historical reports keep the
              rules they were generated with.
            </p>
          </div>
          <Field label="Operating notes" hint="Prep needs, closing work, promotions, minimum coverage.">
            <textarea
              className={`${inputClass} min-h-20`}
              value={state.rules.notes}
              onChange={(e) =>
                update({ rules: { ...state.rules, notes: e.target.value } })
              }
            />
          </Field>
        </div>
      );

    case "people":
      return (
        <PeopleStep
          state={state}
          update={update}
        />
      );

    case "delivery":
      return (
        <DeliveryStep state={state} update={update} />
      );

    case "validation":
      return (
        <div className="max-w-xl space-y-4 text-sm">
          <p>
            We import your history (targeting 8–12 weeks where your provider
            allows) and compare sample totals against a provider report or a
            source you confirm. Reconciliation is exact to the penny where
            definitions match; every remaining difference is explained and
            accepted by you — before activation, not after.
          </p>
          <label className="flex items-start gap-2">
            <input
              type="checkbox"
              className="mt-1"
              checked={state.validationConfirmed}
              onChange={(e) => update({ validationConfirmed: e.target.checked })}
            />
            <span>
              Sample totals reconcile with my own reports, and I accept the
              documented differences.
            </span>
          </label>
        </div>
      );

    case "preview":
      return (
        <div className="space-y-4">
          <BriefingCard
            briefing={sampleBriefing(
              state.account.businessName || "Your Restaurant",
            )}
          />
          <p className="text-xs text-muted">
            Test email and SMS sends activate with the delivery system (Stage
            4); recipients then verify their own contact details.
          </p>
          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              className="mt-1"
              checked={state.previewConfirmed}
              onChange={(e) => update({ previewConfirmed: e.target.checked })}
            />
            <span>The content and destinations look right.</span>
          </label>
        </div>
      );

    case "activation": {
      const incomplete = SETUP_STEPS.filter(
        (s) => s.id !== "activation" && !s.isComplete(state),
      );
      return (
        <div className="max-w-xl space-y-4">
          <ul className="space-y-1.5 text-sm">
            {SETUP_STEPS.filter((s) => s.id !== "activation").map((s) => (
              <li key={s.id} className="flex items-center gap-2">
                {s.isComplete(state) ? (
                  <Check size={15} className="text-good" aria-hidden />
                ) : (
                  <CircleDashed size={15} className="text-muted" aria-hidden />
                )}
                <span className={s.isComplete(state) ? "" : "text-muted"}>
                  {s.title}
                </span>
              </li>
            ))}
          </ul>
          {state.activated ? (
            <div className="rounded-lg border border-line bg-good-soft p-4 text-sm">
              <p className="font-medium">Automation is active.</p>
              <p className="mt-1 text-muted">
                Briefings run automatically after each business day closes.
                When something needs your attention — a stale connection, a
                revoked permission — you get a guided recovery notice, not
                silence.
              </p>
            </div>
          ) : (
            <button
              type="button"
              disabled={incomplete.length > 0}
              onClick={() => update({ activated: true })}
              className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-40"
            >
              Activate automated briefings
            </button>
          )}
        </div>
      );
    }
  }
}

/* ---------- credential entry ---------- */

function CredentialEntry({
  provider,
  state,
  update,
}: {
  provider: ProviderEntry;
  state: SetupState;
  update: (patch: Partial<SetupState>) => void;
}) {
  // Credential values live only in this component's memory. They are
  // submitted to encrypted server-side secret storage — never written to
  // setup state, localStorage, or logs.
  const [values, setValues] = useState<Record<string, string>>({});
  const fields = provider.credentialFields ?? [];
  const allFilled = fields.every((f) => (values[f.key] ?? "").trim() !== "");

  if (state.pos.credentialsProvided) {
    return (
      <div className="mt-3 rounded-md border border-line bg-surface p-3">
        <p className="flex items-center gap-1.5 font-medium">
          <Check size={15} className="text-good" aria-hidden /> Credentials
          received
        </p>
        <p className="mt-1 text-xs text-muted">
          Held securely for verification. They are never shown again here.
        </p>
        <button
          type="button"
          onClick={() =>
            update({
              pos: {
                ...state.pos,
                credentialsProvided: false,
                connectionState: "not_connected",
              },
            })
          }
          className="mt-2 rounded-md border border-line px-3 py-1.5 text-xs hover:bg-canvas"
        >
          Replace credentials
        </button>
      </div>
    );
  }

  return (
    <div className="mt-3 space-y-3">
      {provider.credentialGuide && (
        <ol className="list-decimal space-y-0.5 pl-5 text-muted">
          {provider.credentialGuide.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      )}
      {fields.map((field) => (
        <Field key={field.key} label={field.label}>
          <input
            type={field.secret ? "password" : "text"}
            autoComplete="off"
            className={inputClass}
            placeholder={field.placeholder}
            value={values[field.key] ?? ""}
            onChange={(e) =>
              setValues((prev) => ({ ...prev, [field.key]: e.target.value }))
            }
          />
        </Field>
      ))}
      <button
        type="button"
        disabled={!allFilled}
        onClick={() => {
          setValues({});
          update({
            pos: {
              ...state.pos,
              credentialsProvided: true,
              connectionState: "validating",
            },
          });
        }}
        className="rounded-md bg-accent px-4 py-2 text-xs font-medium text-white hover:opacity-90 disabled:opacity-40"
      >
        Submit credentials for verification
      </button>
      <p className="text-xs text-muted">
        Read-only access only. Credentials go to encrypted server-side
        storage and never touch your browser&apos;s saved data; the
        connection and permission test runs before any import.
      </p>
    </div>
  );
}

/* ---------- people & delivery ---------- */

function PeopleStep({
  state,
  update,
}: {
  state: SetupState;
  update: (patch: Partial<SetupState>) => void;
}) {
  return (
    <div className="max-w-2xl space-y-3">
      {state.people.map((person, i) => (
        <div key={person.id} className="grid grid-cols-[1fr_1fr_auto_auto] items-center gap-2">
          <input
            className={inputClass}
            value={person.name}
            placeholder="Name"
            onChange={(e) => {
              const people = [...state.people];
              people[i] = { ...person, name: e.target.value };
              update({ people });
            }}
          />
          <input
            className={inputClass}
            value={person.email}
            placeholder="Email"
            onChange={(e) => {
              const people = [...state.people];
              people[i] = { ...person, email: e.target.value };
              update({ people });
            }}
          />
          <select
            className={inputClass}
            value={person.role}
            onChange={(e) => {
              const people = [...state.people];
              people[i] = {
                ...person,
                role: e.target.value as SetupState["people"][number]["role"],
              };
              update({ people });
            }}
          >
            <option value="owner">Owner / billing</option>
            <option value="org_admin">Org admin</option>
            <option value="regional">Regional manager</option>
            <option value="location_manager">Location manager</option>
            <option value="recipient">Read-only recipient</option>
          </select>
          <button
            type="button"
            onClick={() =>
              update({ people: state.people.filter((p) => p.id !== person.id) })
            }
            className="rounded-md p-2 text-muted hover:text-bad"
            aria-label="Remove person"
          >
            <Trash2 size={16} aria-hidden />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() =>
          update({
            people: [
              ...state.people,
              {
                id: crypto.randomUUID(),
                name: "",
                email: "",
                role: "location_manager",
                locationIds: [],
              },
            ],
          })
        }
        className="flex items-center gap-1 rounded-md border border-line px-3 py-2 text-sm hover:bg-canvas"
      >
        <Plus size={15} aria-hidden /> Add person
      </button>
      <p className="text-xs text-muted">
        Managers only ever receive their authorized locations. Every report
        and action is authorized on the server — not just hidden in the menu.
      </p>
    </div>
  );
}

function DeliveryStep({
  state,
  update,
}: {
  state: SetupState;
  update: (patch: Partial<SetupState>) => void;
}) {
  // Recipients derive from People; keep rows in sync by personId.
  useEffect(() => {
    const existing = new Map(
      state.delivery.recipients.map((r) => [r.personId, r]),
    );
    const next = state.people.map(
      (p) =>
        existing.get(p.id) ?? {
          personId: p.id,
          email: true,
          sms: false,
          smsConsent: "not_requested" as const,
          deliveryTime: "07:00",
        },
    );
    if (
      next.length !== state.delivery.recipients.length ||
      next.some((r, i) => r.personId !== state.delivery.recipients[i]?.personId)
    ) {
      update({ delivery: { recipients: next } });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.people]);

  if (state.people.length === 0) {
    return (
      <p className="text-sm text-muted">
        Add people first — each recipient then chooses channels and timing
        here.
      </p>
    );
  }

  return (
    <div className="max-w-2xl space-y-3">
      {state.delivery.recipients.map((recipient, i) => {
        const person = state.people.find((p) => p.id === recipient.personId);
        if (!person) return null;
        return (
          <div
            key={recipient.personId}
            className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border border-line p-3 text-sm"
          >
            <span className="min-w-32 font-medium">
              {person.name || person.email || "Unnamed"}
            </span>
            <label className="flex items-center gap-1.5">
              <input
                type="checkbox"
                checked={recipient.email}
                onChange={(e) => {
                  const recipients = [...state.delivery.recipients];
                  recipients[i] = { ...recipient, email: e.target.checked };
                  update({ delivery: { recipients } });
                }}
              />
              Email
            </label>
            <label className="flex items-center gap-1.5">
              <input
                type="checkbox"
                checked={recipient.sms}
                onChange={(e) => {
                  const recipients = [...state.delivery.recipients];
                  recipients[i] = {
                    ...recipient,
                    sms: e.target.checked,
                    smsConsent: e.target.checked ? "pending" : "not_requested",
                  };
                  update({ delivery: { recipients } });
                }}
              />
              SMS
            </label>
            {recipient.sms && (
              <span className="rounded-full bg-warn-soft px-2 py-0.5 text-xs text-warn">
                consent {recipient.smsConsent} — the recipient confirms, not you
              </span>
            )}
            <label className="flex items-center gap-1.5">
              Deliver at
              <input
                className={`${inputClass} w-24`}
                value={recipient.deliveryTime}
                onChange={(e) => {
                  const recipients = [...state.delivery.recipients];
                  recipients[i] = { ...recipient, deliveryTime: e.target.value };
                  update({ delivery: { recipients } });
                }}
              />
            </label>
          </div>
        );
      })}
      <p className="text-xs text-muted">
        Conservative defaults: one briefing and at most two issue texts per
        recipient per day. Email can activate while SMS registration is
        pending.
      </p>
    </div>
  );
}
