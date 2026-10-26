import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const { startAnalytics, stopAnalytics } = vi.hoisted(() => ({ startAnalytics: vi.fn(), stopAnalytics: vi.fn() }));
vi.mock('../lib/analytics', () => ({ startAnalytics, stopAnalytics, trackEvent: vi.fn() }));

// The choice lives in module state, so every test loads a fresh copy of the modules.
async function renderBanner(path = '/') {
  const { ConsentBanner } = await import('./ConsentBanner');
  const { LanguageProvider } = await import('../i18n/LanguageProvider');
  const consent = await import('../lib/consent');
  render(<MemoryRouter initialEntries={[path]}><LanguageProvider><ConsentBanner /></LanguageProvider></MemoryRouter>);
  return consent;
}

describe('ConsentBanner', () => {
  beforeEach(() => {
    vi.resetModules();
    localStorage.clear();
    startAnalytics.mockClear();
    stopAnalytics.mockClear();
  });

  it('asks first and loads nothing until the visitor accepts', async () => {
    await renderBanner();
    expect(screen.getByRole('region', { name: 'Cookies de análisis' })).toBeTruthy();
    expect(startAnalytics).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Aceptar' }));
    expect(startAnalytics).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem('gp-select.consent.v1')).toBe('granted');
    expect(screen.queryByRole('region')).toBeNull();
  });

  it('rejects with the same prominence and stops measuring', async () => {
    await renderBanner();
    fireEvent.click(screen.getByRole('button', { name: 'Rechazar' }));
    expect(startAnalytics).not.toHaveBeenCalled();
    expect(stopAnalytics).toHaveBeenCalled();
    expect(localStorage.getItem('gp-select.consent.v1')).toBe('denied');
    expect(screen.queryByRole('region')).toBeNull();
  });

  it('does not ask again once the choice is saved, and applies it', async () => {
    localStorage.setItem('gp-select.consent.v1', 'granted');
    await renderBanner();
    expect(screen.queryByRole('region')).toBeNull();
    expect(startAnalytics).toHaveBeenCalledTimes(1);
  });

  it('reopens to change the choice and withdraws consent', async () => {
    localStorage.setItem('gp-select.consent.v1', 'granted');
    const { reopenConsent } = await renderBanner();
    expect(screen.queryByRole('region')).toBeNull();
    act(() => reopenConsent());
    fireEvent.click(screen.getByRole('button', { name: 'Rechazar' }));
    expect(stopAnalytics).toHaveBeenCalled();
    expect(localStorage.getItem('gp-select.consent.v1')).toBe('denied');
    expect(screen.queryByRole('region')).toBeNull();
  });

  it('speaks English under /en and links the cookie policy', async () => {
    await renderBanner('/en');
    expect(screen.getByRole('region', { name: 'Analytics cookies' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'More information about cookies' }).getAttribute('href')).toBe('/en/cookies');
  });
});
