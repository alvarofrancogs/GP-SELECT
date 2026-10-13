import { describe, expect, it } from 'vitest';
import { findPendingCopy } from './pendingCopy';

describe('findPendingCopy', () => {
  it('finds markers at any depth', () => {
    expect(findPendingCopy({ es: { faq: [{ body: 'Listo' }, { body: '[P] Plazo' }] }, en: 'Ready' })).toEqual(['es.faq.1.body']);
  });

  it('finds none in the published copy', () => {
    expect(findPendingCopy()).toEqual([]);
  });
});
