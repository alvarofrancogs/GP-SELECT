import { GA_MEASUREMENT_ID } from '../config/analytics';

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

const DISABLE_KEY = `ga-disable-${GA_MEASUREMENT_ID}`;
let loaded = false;

/** Loads Google Analytics, once the visitor has accepted. Nothing from Google is requested before that, and
    never in development. Page views follow the router through GA's enhanced measurement (history changes). */
export function startAnalytics() {
  if (!import.meta.env.PROD) return;
  (window as unknown as Record<string, unknown>)[DISABLE_KEY] = false;
  if (loaded) return;
  loaded = true;
  window.dataLayer = window.dataLayer ?? [];
  window.gtag = function gtag() {
    // gtag.js reads the arguments object itself, not an array.
    // eslint-disable-next-line prefer-rest-params
    window.dataLayer!.push(arguments);
  };
  window.gtag('js', new Date());
  window.gtag('config', GA_MEASUREMENT_ID, { allow_google_signals: false, allow_ad_personalization_signals: false });
  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
  document.head.append(script);
}

/** Stops measuring and removes the analytics cookies, for a visitor who rejects or withdraws consent. */
export function stopAnalytics() {
  (window as unknown as Record<string, unknown>)[DISABLE_KEY] = true;
  const expired = 'expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
  const names = document.cookie.split(';').map((cookie) => cookie.split('=')[0].trim()).filter((name) => name === '_ga' || name.startsWith('_ga_'));
  for (const name of names) {
    // GA writes its cookies on the host or on the parent domain.
    for (const domain of ['', `; domain=${location.hostname}`, `; domain=.${location.hostname}`]) document.cookie = `${name}=; ${expired}${domain}`;
  }
}

/** A conversion, such as a sent enquiry. Parameters never carry personal data. */
export function trackEvent(name: string, params: Record<string, string> = {}) {
  if (loaded) window.gtag?.('event', name, params);
}
