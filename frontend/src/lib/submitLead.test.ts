import { afterEach, describe, expect, it, vi } from 'vitest';
import { submitLead, validateLead, type LeadDraft } from './submitLead';

const lead: LeadDraft = { name: 'Mary Price', phone: '', email: 'mary@example.test', vehicle: 'BMW M3', budget: '', message: 'Looking for a family car.', intent: 'search' };
const importLead: LeadDraft = { ...lead, delivery: ' Murcia, Spain ', make: ' BMW ', model: ' M4 CS ', message: '' };

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

  it('requires delivery, make and model for import, with optional details', () => {
    expect(validateLead(importLead, 'import')).toEqual([]);
    expect(validateLead({ ...importLead, message: 'Hi' }, 'import')).toEqual([]);
    expect(validateLead({ ...importLead, delivery: ' ', make: '', model: '' }, 'import')).toEqual(['delivery', 'make', 'model']);
  });

  it.each([['delivery', 120], ['year', 40], ['mileage', 60], ['timeframe', 60], ['budget', 100], ['message', 5000]] as const)('enforces the import %s API limit', (field, limit) => {
    expect(validateLead({ ...importLead, [field]: 'x'.repeat(limit) }, 'import')).toEqual([]);
    expect(validateLead({ ...importLead, [field]: 'x'.repeat(limit + 1) }, 'import')).toEqual([field]);
  });

  it('enforces the combined vehicle limit', () => {
    expect(validateLead({ ...importLead, make: 'x'.repeat(100), model: 'x'.repeat(100) }, 'import')).toEqual(['make']);
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
  ] as const)('sends only the active fields for %s/%s', async (configuration, intent, apiIntent, vehicle, budget) => {
    const fetch = vi.fn(async () => new Response(null, { status: 202 }));
    vi.stubGlobal('fetch', fetch);
    await submitLead({ ...lead, intent, budget: ' 40–50k EUR ', message: intent === 'information' ? lead.message : ' ' }, true, 'es', configuration);
    const body = JSON.parse(String((fetch.mock.calls[0] as unknown as [string, RequestInit])[1].body));
    expect(body).toEqual({ intent: apiIntent, name: lead.name, email: lead.email, phone: null, vehicle, budget,
      message: intent === 'information' ? lead.message : null, language: 'es' });
  });

  it('sends the composed import vehicle and null optional fields', async () => {
    const fetch = vi.fn(async () => new Response(null, { status: 202 }));
    vi.stubGlobal('fetch', fetch);
    await submitLead({ ...importLead, year: ' ', mileage: '', timeframe: ' ', message: ' ' }, true, 'en', 'import');
    expect(JSON.parse(String((fetch.mock.calls[0] as unknown as [string, RequestInit])[1].body))).toEqual({
      intent: 'Search', name: lead.name, email: lead.email, phone: null, vehicle: 'BMW M4 CS', delivery: 'Murcia, Spain',
      budget: null, year: null, mileage: null, timeframe: null, message: null, language: 'en',
    });
  });

  it('trims and transmits all optional import details', async () => {
    const fetch = vi.fn(async () => new Response(null, { status: 202 }));
    vi.stubGlobal('fetch', fetch);
    await submitLead({ ...importLead, year: ' 2021+ ', mileage: ' 50,000 km ', timeframe: ' 3 months ', budget: ' 80,000 EUR ', message: ' Blue ' }, true, 'es', 'import');
    expect(JSON.parse(String((fetch.mock.calls[0] as unknown as [string, RequestInit])[1].body))).toMatchObject({
      year: '2021+', mileage: '50,000 km', timeframe: '3 months', budget: '80,000 EUR', message: 'Blue',
    });
  });

  it.each(['delivery', 'year', 'mileage', 'timeframe', 'vehicle', 'budget', 'message'])('maps the import API error %s to its visible field', async (field) => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ field }), { status: 400 })));
    expect(await submitLead(importLead, true, 'es', 'import')).toEqual({ ok: false, reason: 'invalid', fields: [field === 'vehicle' ? 'make' : field] });
  });

  it('maps a server budget error to the field and preserves rate limiting', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ field: 'budget' }), { status: 400 })));
    expect(await submitLead(lead, true, 'es')).toEqual({ ok: false, reason: 'invalid', fields: ['budget'] });
    vi.stubGlobal('fetch', vi.fn(async () => new Response(null, { status: 429 })));
    expect(await submitLead(lead, true, 'es')).toEqual({ ok: false, reason: 'rate_limited', fields: [] });
  });
});
