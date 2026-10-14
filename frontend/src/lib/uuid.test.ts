import { afterEach, describe, expect, it, vi } from 'vitest';
import { uuid } from './uuid';

const V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe('uuid', () => {
  afterEach(() => { vi.unstubAllGlobals(); });

  it('uses crypto.randomUUID when the page is a secure context', () => {
    expect(uuid()).toMatch(V4);
  });

  it('still returns distinct v4 UUIDs without crypto.randomUUID (http on a local IP)', () => {
    vi.stubGlobal('crypto', { getRandomValues: crypto.getRandomValues.bind(crypto) });
    const ids = new Set(Array.from({ length: 50 }, uuid));
    expect(ids.size).toBe(50);
    ids.forEach((id) => expect(id).toMatch(V4));
  });
});
