import type { Locale } from '../i18n/types';

/** The appointment request (Citas page). Day and time come from native pickers as `YYYY-MM-DD` and `HH:MM`. */
export interface AppointmentDraft { date: string; time: string; name: string; phone: string; message: string }
export type AppointmentField = keyof AppointmentDraft;

export const appointmentFields: AppointmentField[] = ['date', 'time', 'name', 'phone', 'message'];
export const appointmentLimits = { name: 120, phone: 30, message: 2000 } as const;
// How far ahead a day can be requested.
const MAX_DAYS_AHEAD = 365;

/** Today in the visitor's own calendar, as the date input writes it. */
export function localDay(now = new Date()): string {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

export function lastBookableDay(now = new Date()): string {
  const last = new Date(now);
  last.setDate(last.getDate() + MAX_DAYS_AHEAD);
  return localDay(last);
}

/** Fields that fail, in form order. Values are trimmed first: autofill and text expansion add spaces. */
export function validateAppointment(draft: AppointmentDraft, now = new Date()): AppointmentField[] {
  const date = draft.date.trim();
  const time = draft.time.trim();
  const invalid: AppointmentField[] = [];
  // ISO dates compare correctly as text.
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date < localDay(now) || date > lastBookableDay(now)) invalid.push('date');
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) invalid.push('time');
  // Name and phone follow the server's rules (Enquiry in the API).
  const name = draft.name.trim();
  if (name.length < 2 || name.length > appointmentLimits.name) invalid.push('name');
  const phone = draft.phone.trim();
  const digits = phone.replace(/\D/g, '').length;
  if (digits < 7 || digits > 15 || phone.length > appointmentLimits.phone || !/^\+?[\d\s().-]+$/.test(phone)) invalid.push('phone');
  if (draft.message.trim().length > appointmentLimits.message) invalid.push('message');
  return invalid;
}

export type AppointmentResult =
  | { ok: true; mode: 'preview' | 'sent' }
  | { ok: false; reason: 'invalid' | 'rate_limited' | 'failed'; fields: AppointmentField[] };

/** The field a 400 problem refers to, when it is one of the form's. */
async function problemField(response: Response): Promise<AppointmentField | null> {
  try {
    const field = ((await response.json()) as { field?: string }).field;
    return appointmentFields.find((item) => item === field) ?? null;
  } catch {
    return null;
  }
}

/** Sends the request as an Appointment enquiry to POST /api/public/enquiries when enabled (the contact form's switch);
    otherwise a local preview with no network or storage. GP SELECT confirms by phone, so no email goes with it. */
export async function submitAppointment(draft: AppointmentDraft, enabled: boolean, language: Locale): Promise<AppointmentResult> {
  const invalid = validateAppointment(draft);
  if (invalid.length) return { ok: false, reason: 'invalid', fields: invalid };
  if (!enabled) return { ok: true, mode: 'preview' };

  let response: Response;
  try {
    response = await fetch('/api/public/enquiries', {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        intent: 'Appointment', date: draft.date.trim(), time: draft.time.trim(), name: draft.name.trim(),
        phone: draft.phone.trim(), message: draft.message.trim() || null, language,
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
