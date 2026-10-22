import { afterEach, describe, expect, it, vi } from 'vitest';
import { localDay, submitAppointment, type AppointmentDraft } from './appointment';

const draft: AppointmentDraft = { date: localDay(), time: '10:30', name: ' Alex Smith ', phone: ' +34 600 000 000 ', message: '  ' };

function answer(response: Response | Error) {
  vi.stubGlobal('fetch', vi.fn(async () => { if (response instanceof Error) throw response; return response; }));
}

describe('submitAppointment', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('sends an Appointment enquiry, without email, in the page language', async () => {
    const fetch = vi.fn(async () => new Response('{"received":true}', { status: 202 }));
    vi.stubGlobal('fetch', fetch);
    expect(await submitAppointment(draft, true, 'en')).toEqual({ ok: true, mode: 'sent' });
    const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('/api/public/enquiries');
    expect(JSON.parse(String(init.body))).toEqual({
      intent: 'Appointment', date: localDay(), time: '10:30', name: 'Alex Smith', phone: '+34 600 000 000', message: null, language: 'en',
    });
  });

  it('sends nothing while enquiries are off or a field is invalid', async () => {
    const fetch = vi.fn();
    vi.stubGlobal('fetch', fetch);
    expect(await submitAppointment(draft, false, 'es')).toEqual({ ok: true, mode: 'preview' });
    expect(await submitAppointment({ ...draft, phone: '' }, true, 'es')).toEqual({ ok: false, reason: 'invalid', fields: ['phone'] });
    expect(fetch).not.toHaveBeenCalled();
  });

  it('reads 429, a 400 on one of its fields, other failures and a lost connection', async () => {
    answer(new Response(null, { status: 429 }));
    expect(await submitAppointment(draft, true, 'es')).toEqual({ ok: false, reason: 'rate_limited', fields: [] });
    answer(new Response('{"code":"invalid_date","field":"date"}', { status: 400 }));
    expect(await submitAppointment(draft, true, 'es')).toEqual({ ok: false, reason: 'invalid', fields: ['date'] });
    answer(new Response('{"code":"invalid_email","field":"email"}', { status: 400 }));
    expect(await submitAppointment(draft, true, 'es')).toEqual({ ok: false, reason: 'failed', fields: [] });
    answer(new Response(null, { status: 503 }));
    expect(await submitAppointment(draft, true, 'es')).toEqual({ ok: false, reason: 'failed', fields: [] });
    answer(new TypeError('offline'));
    expect(await submitAppointment(draft, true, 'es')).toEqual({ ok: false, reason: 'failed', fields: [] });
  });
});
