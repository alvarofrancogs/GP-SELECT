/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Public origin, e.g. https://example.com. Omit until the domain is confirmed. */
  readonly VITE_SITE_URL?: string;
  /** 'true' lets a production build send the contact form. Only once the privacy texts exist. */
  readonly VITE_ENQUIRIES_ENABLED?: string;
}
