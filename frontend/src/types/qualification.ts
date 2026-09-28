export type QualificationContext =
  | { intent: 'vehicle'; source: string; vehicleSlug: string }
  | { intent: 'import'; source: string; make?: string; model?: string }
  | { intent: 'search' | 'information'; source: string };

// Future step configuration can select a subset depending on the CTA context.
// No personal data is included in URLs or persisted in this phase.
export interface QualificationDraft {
  name?: string;
  phone?: string;
  email?: string;
  vehicleSlug?: string;
  make?: string;
  model?: string;
  budgetEur?: number;
  purchaseType?: 'stock' | 'import' | 'search';
  originCountry?: string;
  preferences?: string;
  financingInterest?: boolean;
  tradeInVehicle?: string;
  comments?: string;
  privacyConsent?: boolean;
}
