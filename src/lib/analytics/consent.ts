// Minimal, extensible consent mechanism. Analytics does not load until the user has
// granted consent. Choice is persisted in localStorage and broadcast via a custom
// event so the GA provider can react without a full reload.
export type ConsentValue = "granted" | "denied";
export const CONSENT_STORAGE_KEY = "keyd_analytics_consent";
export const CONSENT_EVENT = "keyd-consent-change";

export function getConsent(): ConsentValue | null {
  if (typeof window === "undefined") return null;
  const v = window.localStorage.getItem(CONSENT_STORAGE_KEY);
  return v === "granted" || v === "denied" ? v : null;
}

export function hasAnalyticsConsent(): boolean {
  return getConsent() === "granted";
}

export function setConsent(value: ConsentValue): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(CONSENT_STORAGE_KEY, value);
  window.dispatchEvent(new CustomEvent(CONSENT_EVENT, { detail: value }));
}
