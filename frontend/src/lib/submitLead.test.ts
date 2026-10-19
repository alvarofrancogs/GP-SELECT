import { afterEach, describe, expect, it, vi } from 'vitest';
import { submitLead, validateLead, type LeadDraft } from './submitLead';

const lead: LeadDraft = { name: 'Mary Price', phone: '', email: 'mary@example.test', vehicle: 'BMW M3', budget: '', message: 'Looking for a family car.', intent: 'search' };

describe('submitLead', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('sends the page language so the reply goes out in it', async () => {
    const fetch = vi.fn(async () => new Response('{"received":true}', { status: 202 }));
    vi.stubGlobal('fetch', fetch);
    expect(await submitLead(lead, true, 'en')).toEqual({ ok: true, mode: 'sent' });
    const body = JSON.parse(String((fetch.mock.calls[0] as unknown as [string, RequestInit])[1].body));
    expect(body).toMatchObject({ intent: 'Search', language: 'en', phone: null });
  });

  it('sends nothing while enquiries are off', async () => {
    const fetch = vi.fn();
    vi.stubGlobal('fetch', fetch);
    expect(await submitLead(lead, false, 'es')).toEqual({ ok: true, mode: 'preview' });
    expect(fetch).not.toHaveBeenCalled();
  });

  it.each(['search', 'vehicle'] as const)('accepts an empty or short optional message for contact/%s', (intent) => {
    for (const message of ['', 'Hi']) expect(validateLead({ ...lead, intent, message })).toEqual([]);
    expect(validateLead({ ...lead, intent, vehicle: '' })).toEqual(['vehicle']);
  });

  it('requires a ten-character enquiry for information, ignoring hidden vehicle and budget', () => {
    const information = { ...lead, intent: 'information' as const, vehicle: '', budget: 'x'.repeat(101) };
    expect(validateLead({ ...information, message: '123456789' })).toEqual(['message']);
    expect(validateLead({ ...information, message: '1234567890' })).toEqual([]);
  });

  it('keeps import/search vehicle optional and its message required', () => {
    expect(validateLead({ ...lead, vehicle: '', budget: 'x'.repeat(101) }, 'import')).toEqual([]);
    expect(validateLead({ ...lead, vehicle: '', message: 'short' }, 'import')).toEqual(['message']);
  });

  it('accepts free-text budget up to the API limit and ignores it in other variants', () => {
    expect(validateLead({ ...lead, budget: 'EUR 40,000–50,000' })).toEqual([]);
    expect(validateLead({ ...lead, budget: 'x'.repeat(100) })).toEqual([]);
    expect(validateLead({ ...lead, budget: 'x'.repeat(101) })).toEqual(['budget']);
    expect(validateLead({ ...lead, intent: 'vehicle', budget: 'x'.repeat(101) })).toEqual([]);
  });

  it.each([
    ['contact', 'search', 'Search', 'BMW M3', '40–50k EUR'],
    ['contact', 'vehicle', 'Vehicle', 'BMW M3', null],
    ['contact', 'information', 'Information', null, null],
    ['import', 'search', 'Search', 'BMW M3', null],
  ] as const)('sends only the active fields for %s/%s', async (configuration, intent, apiIntent, vehicle, budget) => {
    const fetch = vi.fn(async () => new Response(null, { status: 202 }));
    vi.stubGlobal('fetch', fetch);
    await submitLead({ ...lead, intent, budget: ' 40–50k EUR ', message: intent === 'information' || configuration === 'import' ? lead.message : ' ' }, true, 'es', configuration);
    const body = JSON.parse(String((fetch.mock.calls[0] as unknown as [string, RequestInit])[1].body));
    expect(body).toEqual({ intent: apiIntent, name: lead.name, email: lead.email, phone: null, vehicle, budget,
      message: intent === 'information' || configuration === 'import' ? lead.message : null, language: 'es' });
  });

  it('sends null for an empty optional import vehicle', async () => {
    const fetch = vi.fn(async () => new Response(null, { status: 202 }));
    vi.stubGlobal('fetch', fetch);
    await submitLead({ ...lead, vehicle: ' ' }, true, 'en', 'import');
    expect(JSON.parse(String((fetch.mock.calls[0] as unknown as [string, RequestInit])[1].body)).vehicle).toBeNull();
  });

  it('maps a server budget error to the field and preserves rate limiting', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ field: 'budget' }), { status: 400 })));
    expect(await submitLead(lead, true, 'es')).toEqual({ ok: false, reason: 'invalid', fields: ['budget'] });
    vi.stubGlobal('fetch', vi.fn(async () => new Response(null, { status: 429 })));
    expect(await submitLead(lead, true, 'es')).toEqual({ ok: false, reason: 'rate_limited', fields: [] });
  });
});
