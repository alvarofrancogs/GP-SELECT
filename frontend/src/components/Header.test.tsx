import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { LanguageProvider } from '../i18n/LanguageProvider';
import { Header } from './Header';

const originalHitTest = Object.getOwnPropertyDescriptor(document, 'elementsFromPoint');

function Page() {
  const { pathname } = useLocation();
  return <><Header /><main id="main-content" tabIndex={-1} /><output data-testid="path">{pathname}</output></>;
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal('matchMedia', vi.fn((query: string) => ({
    matches: query === '(max-width: 767px)', media: query, addEventListener() {}, removeEventListener() {},
  })));
  Object.defineProperty(document, 'elementsFromPoint', { configurable: true, value: () => [] });
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  if (originalHitTest) Object.defineProperty(document, 'elementsFromPoint', originalHitTest);
  else Reflect.deleteProperty(document, 'elementsFromPoint');
});

it.each(['/contacto', '/CONTACTO/', '/en/contact'])('returns focus to Menu when closing from the current page: %s', (path) => {
  const { container } = render(<MemoryRouter initialEntries={[path]}><LanguageProvider><Page /></LanguageProvider></MemoryRouter>);
  const toggle = screen.getByRole('button');
  fireEvent.click(toggle);
  expect(toggle.getAttribute('aria-expanded')).toBe('true');
  const current = container.querySelector<HTMLAnchorElement>('#mobile-navigation a[aria-current="page"]')!;
  act(() => { current.focus(); });
  fireEvent.click(current);
  expect(toggle.getAttribute('aria-expanded')).toBe('false');
  expect(document.activeElement).toBe(toggle);
  act(() => { vi.advanceTimersByTime(420); });
  expect(document.activeElement).toBe(toggle);
  expect(container.querySelector('header')?.classList.contains('site-header--menu')).toBe(false);
});

it('leaves focus handoff to the page when following a different menu link', () => {
  const { container } = render(<MemoryRouter initialEntries={['/contacto']}><LanguageProvider><Page /></LanguageProvider></MemoryRouter>);
  const toggle = screen.getByRole('button');
  fireEvent.click(toggle);
  const target = within(container.querySelector<HTMLElement>('#mobile-navigation')!).getByRole('link', { name: 'Vehículos' });
  act(() => { target.focus(); });
  fireEvent.click(target);
  expect(screen.getByTestId('path').textContent).toBe('/vehiculos');
  expect(document.activeElement).not.toBe(toggle);
});
