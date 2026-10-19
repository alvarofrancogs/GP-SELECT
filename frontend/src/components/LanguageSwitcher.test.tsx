import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { LanguageProvider } from '../i18n/LanguageProvider';
import { LanguageSwitcher } from './LanguageSwitcher';

function Where() {
  return <output data-testid="path">{useLocation().pathname}</output>;
}

function renderAt(path: string) {
  render(<MemoryRouter initialEntries={[path]}><LanguageProvider><LanguageSwitcher /><Where /></LanguageProvider></MemoryRouter>);
}

const tap = (language: 'ES' | 'EN') => fireEvent.click(screen.getByText(language), { button: 0 });
const wait = (ms: number) => act(() => { vi.advanceTimersByTime(ms); });
const path = () => screen.getByTestId('path').textContent;
const classes = () => document.documentElement.className;

describe('LanguageSwitcher', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    window.matchMedia = vi.fn(() => ({ matches: false, addEventListener() {}, removeEventListener() {} })) as unknown as typeof window.matchMedia;
  });
  afterEach(() => {
    wait(3000);
    vi.useRealTimers();
    document.documentElement.className = '';
  });

  it('fades out, switches, fades back in', () => {
    renderAt('/');
    tap('EN');
    expect(classes()).toBe('lang-out');
    wait(170);
    expect(path()).toBe('/en');
    expect(classes()).toBe('lang-in');
    wait(300);
    expect(classes()).toBe('');
  });

  it('during the fade-out the latest tap decides, even back to the current language', () => {
    renderAt('/');
    tap('EN');
    wait(60);
    tap('ES');
    wait(170);
    expect(path()).toBe('/');
    expect(classes()).toBe('lang-in');
    wait(300);
    expect(classes()).toBe('');
  });

  it('a tap during the fade-in is not lost: it switches once the fade has ended', () => {
    renderAt('/');
    tap('EN');
    wait(200);
    expect(path()).toBe('/en');
    tap('ES');
    wait(300);
    expect(classes()).toBe('lang-out');
    wait(170);
    expect(path()).toBe('/');
    wait(300);
    expect(classes()).toBe('');
  });

  it('an earlier switch never cuts the fade of a later one', () => {
    renderAt('/');
    tap('EN');
    wait(170);
    wait(880);
    tap('ES');
    // The first switch's safety timer used to fire here (1160 ms after its tap) and drop this fade-out.
    wait(100);
    expect(classes()).toBe('lang-out');
    wait(80);
    expect(path()).toBe('/');
    expect(classes()).toBe('lang-in');
  });
});
