/**
 * Setup persistence adapter.
 *
 * The wizard talks to this interface only. Today it is backed by
 * localStorage so the setup flow is fully exercisable before the
 * Supabase workspace tables exist; the Supabase adapter replaces it in
 * Stage 3 without touching the wizard. Every read validates against
 * the zod schema — corrupt or stale state degrades to defaults instead
 * of crashing setup.
 */

import {
  defaultSetupState,
  setupStateSchema,
  type SetupState,
} from "./state";

export interface SetupStorage {
  load(): SetupState;
  save(state: SetupState): void;
  clear(): void;
}

const STORAGE_KEY = "shyftkick.setup.v1";

export class LocalSetupStorage implements SetupStorage {
  load(): SetupState {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return defaultSetupState();
      const parsed = setupStateSchema.safeParse(JSON.parse(raw));
      return parsed.success ? parsed.data : defaultSetupState();
    } catch {
      return defaultSetupState();
    }
  }

  save(state: SetupState): void {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Private windows or blocked storage: setup still works in memory.
    }
  }

  clear(): void {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore.
    }
  }
}
