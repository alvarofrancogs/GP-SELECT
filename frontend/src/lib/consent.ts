import { useSyncExternalStore } from 'react';

export type Consent = 'granted' | 'denied';

/** The visitor's choice about analytics cookies, kept in the browser so the notice is not asked again. */
const KEY = 'gp-select.consent.v1';

interface ConsentState {
  choice: Consent | null;
  /** The notice was reopened from the footer to change the choice. */
  editing: boolean;
}

function readChoice(): Consent | null {
  try {
    const value = localStorage.getItem(KEY);
    return value === 'granted' || value === 'denied' ? value : null;
  } catch { return null; }
}

let state: ConsentState = { choice: readChoice(), editing: false };
const listeners = new Set<() => void>();

function update(next: ConsentState) {
  state = next;
  listeners.forEach((listener) => listener());
}

export function setConsent(choice: Consent) {
  try { localStorage.setItem(KEY, choice); } catch { /* Private mode: the choice lasts until the page closes. */ }
  update({ choice, editing: false });
}

export function reopenConsent() {
  update({ ...state, editing: true });
}

export function useConsent() {
  return useSyncExternalStore(
    (listener) => { listeners.add(listener); return () => { listeners.delete(listener); }; },
    () => state,
  );
}
