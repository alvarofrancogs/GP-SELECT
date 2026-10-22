import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LanguageProvider } from '../i18n/LanguageProvider';
import { es } from '../i18n/es';
import { localDay } from '../lib/appointment';
import { Appointments } from '../pages/Appointments';

vi.mock('../config/contact', async (original) => ({ ...await original<typeof import('../config/contact')>(), enquiriesEnabled: true }));

const text = es.interiors.appointments;
const field = (label: string) => screen.getByLabelText(new RegExp(`^${label}`)) as HTMLInputElement;

function fillAndSend() {
  render(<MemoryRouter initialEntries={['/citas']}><LanguageProvider><Appointments /></LanguageProvider></MemoryRouter>);
  fireEvent.change(field(text.fields.date), { target: { value: localDay() } });
  fireEvent.change(field(text.fields.time), { target: { value: '18:00' } });
  fireEvent.change(field(text.fields.name), { target: { value: 'Alex Smith' } });
  fireEvent.change(field(text.fields.phone), { target: { value: '600 000 000' } });
  fireEvent.click(screen.getByRole('button', { name: text.submit }));
}

describe('Citas form with sending on', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('sends once, confirms, and «Pedir otra cita» starts an empty request', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(null, { status: 202 })));
    fillAndSend();
    expect(screen.queryByText(text.preview)).toBeNull();
    const title = await screen.findByText(text.sentTitle);
    await waitFor(() => expect(document.activeElement).toBe(title.closest('[role="status"]')));
    expect(screen.getByText(text.sentBody)).toBeTruthy();
    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: text.another }));
    await waitFor(() => expect(document.activeElement).toBe(field(text.fields.date)));
    for (const label of [text.fields.date, text.fields.time, text.fields.name, text.fields.phone]) expect(field(label).value).toBe('');
  });

  it('keeps the data and says so when the server refuses too many requests', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(null, { status: 429 })));
    fillAndSend();
    expect((await screen.findByRole('alert')).textContent).toBe(text.rateLimited);
    expect(field(text.fields.name).value).toBe('Alex Smith');
    fireEvent.change(field(text.fields.message), { target: { value: 'Quiero ver el M4.' } });
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('marks and focuses the field the server refuses', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{"code":"invalid_date","field":"date"}', { status: 400 })));
    fillAndSend();
    await waitFor(() => expect(document.activeElement).toBe(field(text.fields.date)));
    expect(field(text.fields.date).getAttribute('aria-invalid')).toBe('true');
    expect(screen.getByText(text.errors.date)).toBeTruthy();
  });
});
