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

export type LeadResult =
  | { ok: true; mode: 'preview' | 'sent' }
  | { ok: false; reason: 'invalid' | 'rate_limited' | 'failed'; fields: LeadField[] };

const leadFields: readonly LeadField[] = ['name', 'phone', 'email', 'vehicle', 'message'];

/** The field a 400 problem refers to, when it is one of the form's. */
async function problemField(response: Response): Promise<LeadField | null> {
  try {
    const field = ((await response.json()) as { field?: string }).field;
    return leadFields.find((item) => item === field) ?? null;
  } catch {
    return null;
  }
}

/** Sends to POST /api/public/enquiries when enabled; otherwise a local preview with no network or storage. */
export async function submitLead(lead: LeadDraft, enabled: boolean): Promise<LeadResult> {
  const invalid = validateLead(lead);
  if (invalid.length) return { ok: false, reason: 'invalid', fields: invalid };
  if (!enabled) return { ok: true, mode: 'preview' };

  let response: Response;
  try {
    response = await fetch('/api/public/enquiries', {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        intent: lead.intent === 'vehicle' ? 'Vehicle' : 'Search',
        name: lead.name, email: lead.email, phone: lead.phone || null, vehicle: lead.vehicle || null, message: lead.message,
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
