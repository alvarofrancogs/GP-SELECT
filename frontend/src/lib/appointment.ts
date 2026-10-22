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
  if (!draft.name.trim() || draft.name.trim().length > appointmentLimits.name) invalid.push('name');
  const phone = draft.phone.trim();
  if (phone.replace(/\D/g, '').length < 6 || phone.length > appointmentLimits.phone || !/^[+\d\s().-]+$/.test(phone)) invalid.push('phone');
  if (draft.message.trim().length > appointmentLimits.message) invalid.push('message');
  return invalid;
}

/** Sending arrives with the email provider (the contact form waits for the same one). Until then the request
    is only prepared on this page: nothing leaves the browser or is stored, and the page says so. */
export async function submitAppointment(): Promise<{ ok: true; mode: 'preview' }> {
  return { ok: true, mode: 'preview' };
}
