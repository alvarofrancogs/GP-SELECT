import type { Locale } from '../i18n/types';

export type LeadIntent = 'search' | 'vehicle' | 'information';
export type LeadConfiguration = 'contact' | 'import';
export interface LeadDraft {
  name: string;
  phone: string;
  email: string;
  vehicle: string;
  budget: string;
  message: string;
  intent: LeadIntent;
}
export type LeadField = Exclude<keyof LeadDraft, 'intent'>;

export function validateLead(lead: LeadDraft, configuration: LeadConfiguration = 'contact'): LeadField[] {
  const invalid: LeadField[] = [];
  if (lead.name.trim().length < 2) invalid.push('name');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(lead.email.trim())) invalid.push('email');
  const phone = lead.phone.trim();
  const digits = phone.replace(/\D/g, '');
  if (phone && (!/^\+?[\d\s().-]+$/.test(phone) || digits.length < 7 || digits.length > 15)) invalid.push('phone');
  if (configuration === 'contact' && lead.intent !== 'information' && !lead.vehicle.trim()) invalid.push('vehicle');
  if (configuration === 'contact' && lead.intent === 'search' && lead.budget.trim().length > 100) invalid.push('budget');
  if (((configuration === 'import' || lead.intent === 'information') && lead.message.trim().length < 10)
    || lead.message.trim().length > 5000) invalid.push('message');
  return invalid;
}

export type LeadResult =
  | { ok: true; mode: 'preview' | 'sent' }
  | { ok: false; reason: 'invalid' | 'rate_limited' | 'failed'; fields: LeadField[] };

const leadFields: readonly LeadField[] = ['name', 'email', 'phone', 'vehicle', 'budget', 'message'];

/** The field a 400 problem refers to, when it is one of the form's. */
async function problemField(response: Response): Promise<LeadField | null> {
  try {
    const field = ((await response.json()) as { field?: string }).field;
    return leadFields.find((item) => item === field) ?? null;
  } catch {
    return null;
  }
}

/** Sends to POST /api/public/enquiries when enabled; otherwise a local preview with no network or storage.
    The page language goes with it, so the reply is in the visitor's language. */
export async function submitLead(lead: LeadDraft, enabled: boolean, language: Locale, configuration: LeadConfiguration = 'contact'): Promise<LeadResult> {
  const invalid = validateLead(lead, configuration);
  if (invalid.length) return { ok: false, reason: 'invalid', fields: invalid };
  if (!enabled) return { ok: true, mode: 'preview' };

  let response: Response;
  try {
    response = await fetch('/api/public/enquiries', {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        intent: configuration === 'import' ? 'Search' : { search: 'Search', vehicle: 'Vehicle', information: 'Information' }[lead.intent],
        name: lead.name.trim(), email: lead.email.trim(), phone: lead.phone.trim() || null,
        vehicle: lead.intent === 'information' && configuration === 'contact' ? null : lead.vehicle.trim() || null,
        budget: configuration === 'contact' && lead.intent === 'search' ? lead.budget.trim() || null : null,
        message: lead.message.trim() || null, language,
      }),
    });
  } catch {
    return { ok: false, reason: 'failed', fields: [] };
  }
  if (response.ok) return { ok: true, mode: 'sent' };
  if (response.status === 429) return { ok: false, reason: 'rate_limited', fields: [] };
  const field = response.status === 400 ? await problemField(response) : null;
  return field ? { ok: false, reason: 'invalid', fields: [field] } : { ok: false, reason: 'failed', fields: [] };
}
