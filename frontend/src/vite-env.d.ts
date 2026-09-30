/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** 'true' lets a production build send the contact form. Only once the privacy texts exist. */
  readonly VITE_ENQUIRIES_ENABLED?: string;
}
