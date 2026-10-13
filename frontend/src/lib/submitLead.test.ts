import { afterEach, describe, expect, it, vi } from 'vitest';
import { submitLead, type LeadDraft } from './submitLead';

const lead: LeadDraft = { name: 'Mary Price', phone: '', email: 'mary@example.test', vehicle: '', message: 'Looking for a family car.', intent: 'search' };

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
});
