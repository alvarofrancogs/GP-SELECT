export { contactConfig } from './contactChannels';

// Show the editorial contact layout locally without inventing business channels.
export const showContactPreview = import.meta.env.DEV;

// The form sends to the API only when enabled: always in development, in production only when built with
// VITE_ENQUIRIES_ENABLED=true (and the API with Enquiries__Enabled=true). LEGAL/PRIVACY DECISION REQUIRED BEFORE PUBLIC RELEASE.
export const enquiriesEnabled = import.meta.env.DEV || import.meta.env.VITE_ENQUIRIES_ENABLED === 'true';
