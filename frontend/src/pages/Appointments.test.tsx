import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LanguageProvider } from '../i18n/LanguageProvider';
import { es } from '../i18n/es';
import { en } from '../i18n/en';
import { localDay, validateAppointment, type AppointmentDraft } from '../lib/appointment';
import { Appointments } from './Appointments';

// Preview mode, as in a build without the enquiries switch; the real send is in AppointmentForm.send.test.tsx.
vi.mock('../config/contact', async (original) => ({ ...await original<typeof import('../config/contact')>(), enquiriesEnabled: false }));

const text = es.interiors.appointments;
const now = new Date(2026, 9, 22, 10, 0); // 22-10-2026, local time
const valid: AppointmentDraft = { date: '2026-10-23', time: '11:30', name: 'Alex Smith', phone: '+34 600 000 000', message: '' };

describe('validateAppointment', () => {
  it('accepts a complete request with an empty message', () => {
    expect(validateAppointment(valid, now)).toEqual([]);
  });

  it('accepts today and up to a year ahead, not a past day or later', () => {
    expect(validateAppointment({ ...valid, date: localDay(now) }, now)).toEqual([]);
    expect(validateAppointment({ ...valid, date: '2027-10-22' }, now)).toEqual([]);
    expect(validateAppointment({ ...valid, date: '2026-10-21' }, now)).toEqual(['date']);
    expect(validateAppointment({ ...valid, date: '2027-10-23' }, now)).toEqual(['date']);
    expect(validateAppointment({ ...valid, date: '22/10/2026' }, now)).toEqual(['date']);
  });

  it('needs a real time, a name and a phone with 7 to 15 digits, as the server does', () => {
    expect(validateAppointment({ ...valid, time: '24:00' }, now)).toEqual(['time']);
    expect(validateAppointment({ ...valid, name: '   ' }, now)).toEqual(['name']);
    expect(validateAppointment({ ...valid, name: ' A ' }, now)).toEqual(['name']);
    expect(validateAppointment({ ...valid, phone: '600 000' }, now)).toEqual(['phone']);
    expect(validateAppointment({ ...valid, phone: '+1234567890123456' }, now)).toEqual(['phone']);
    expect(validateAppointment({ ...valid, phone: 'call me' }, now)).toEqual(['phone']);
    expect(validateAppointment({ ...valid, phone: '(+34) 968-00.00.00' }, now)).toEqual(['phone']);
    expect(validateAppointment({ ...valid, phone: '+34 (968) 00-00-00' }, now)).toEqual([]);
  });

  it('lists every failing field in form order', () => {
    expect(validateAppointment({ date: '', time: '', name: '', phone: '', message: 'x'.repeat(2001) }, now))
      .toEqual(['date', 'time', 'name', 'phone', 'message']);
  });
});

function renderPage(path = '/citas') {
  return render(<MemoryRouter initialEntries={[path]}><LanguageProvider><Appointments /></LanguageProvider></MemoryRouter>);
}
const field = (label: string) => screen.getByLabelText(new RegExp(`^${label}`)) as HTMLInputElement;

describe('Citas page', () => {
  it('flags every missing field on submit and focuses the first one', async () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: text.submit }));
    await waitFor(() => expect(document.activeElement).toBe(field(text.fields.date)));
    for (const [label, error] of [[text.fields.date, text.errors.date], [text.fields.time, text.errors.time],
      [text.fields.name, text.errors.name], [text.fields.phone, text.errors.phone]]) {
      expect(field(label).getAttribute('aria-invalid')).toBe('true');
      const described = (field(label).getAttribute('aria-describedby') ?? '').split(' ').map((id) => document.getElementById(id)?.textContent);
      expect(described).toContain(error);
    }
    expect(field(text.fields.message).getAttribute('aria-invalid')).toBe('false');
  });

  it('prepares a valid request and says it has not been sent', async () => {
    renderPage();
    fireEvent.change(field(text.fields.date), { target: { value: localDay() } });
    fireEvent.change(field(text.fields.time), { target: { value: '18:00' } });
    fireEvent.change(field(text.fields.name), { target: { value: 'Alex Smith' } });
    fireEvent.change(field(text.fields.phone), { target: { value: '600 000 000' } });
    fireEvent.click(screen.getByRole('button', { name: text.submit }));
    const title = await screen.findByText(text.successTitle);
    await waitFor(() => expect(document.activeElement).toBe(title.closest('[role="status"]')));
    expect(title.closest('[role="status"]')?.hasAttribute('hidden')).toBe(false);
    expect(screen.getByText(text.successBody)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: text.edit }));
    expect(field(text.fields.name).value).toBe('Alex Smith');
  });

  it('uses phone and name autocomplete, native pickers and the English copy', () => {
    renderPage('/en/appointments');
    const copy = en.interiors.appointments;
    expect(screen.getByRole('heading', { level: 1 }).textContent).toContain(copy.title);
    expect(field(copy.fields.date).getAttribute('type')).toBe('date');
    expect(field(copy.fields.time).getAttribute('type')).toBe('time');
    expect(field(copy.fields.phone).getAttribute('autocomplete')).toBe('tel');
    expect(field(copy.fields.name).getAttribute('autocomplete')).toBe('name');
    expect(field(copy.fields.date).getAttribute('min')).toBe(localDay());
  });
});
