export type LeadIntent = 'vehicle' | 'search';
export interface LeadDraft {
  name: string;
  phone: string;
  email: string;
  vehicle: string;
  message: string;
  intent: LeadIntent;
}
export type LeadField = Exclude<keyof LeadDraft, 'intent'>;

export function validateLead(lead: LeadDraft): LeadField[] {
  const invalid: LeadField[] = [];
  if (lead.name.trim().length < 2) invalid.push('name');
  const phone = lead.phone.trim();
  const digits = phone.replace(/\D/g, '');
  if (phone && (!/^\+?[\d\s().-]+$/.test(phone) || digits.length < 7 || digits.length > 15)) invalid.push('phone');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(lead.email.trim())) invalid.push('email');
  if (lead.intent === 'vehicle' && lead.vehicle.trim().length < 2) invalid.push('vehicle');
  if (lead.message.trim().length < 10) invalid.push('message');
  return invalid;
}

type LeadResult = { ok: true; mode: 'preview' } | { ok: false };

/** Local preview only. No network, logging or persistence of personal data. */
export function submitLead(lead: LeadDraft): Promise<LeadResult> {
  return Promise.resolve(validateLead(lead).length ? { ok: false } : { ok: true, mode: 'preview' });
}
