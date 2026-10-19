import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LanguageProvider } from '../i18n/LanguageProvider';
import { es } from '../i18n/es';
import { Contact } from './Contact';
import { listVehicles } from '../services/vehicles';
import { vehicleLabel } from '../lib/vehicleFormat';
import type { VehicleSummary } from '../types/vehicle';

vi.mock('../config/contact', async (original) => ({ ...await original<typeof import('../config/contact')>(), enquiriesEnabled: true }));
vi.mock('../services/vehicles', () => ({ lastVehicles: () => null, listVehicles: vi.fn() }));
const car: VehicleSummary = {
  slug: 'bmw-m4', make: 'BMW', model: 'M4', variant: 'Competition', firstRegistrationYear: 2021, firstRegistrationMonth: null,
  mileageKm: null, priceEur: 80000, powerHp: null, fuelType: null, transmission: null, bodyType: null,
  availability: 'reserved', images: null, video: null,
};
const text = es.interiors.contact;
const input = (label: string) => screen.getByLabelText(new RegExp(`^${label}`)) as HTMLInputElement;
const fill = (label: string, value: string) => fireEvent.change(input(label), { target: { value } });
const selectPath = (name: string) => fireEvent.click(screen.getByRole('radio', { name }));
function renderContact(query = '') {
  return render(<MemoryRouter initialEntries={[`/contacto${query}`]}><LanguageProvider><Contact /></LanguageProvider></MemoryRouter>);
}
function fillCommon() { fill(text.fields.name, 'Alex Smith'); fill(text.fields.email, 'alex@example.test'); }
const send = () => fireEvent.click(screen.getByRole('button', { name: text.submit }));

describe('contact paths', () => {
  beforeEach(() => {
    vi.mocked(listVehicles).mockResolvedValue([car, { ...car, slug: 'sold', model: 'M5', availability: 'sold' }]);
    vi.stubGlobal('fetch', vi.fn(async () => new Response(null, { status: 202 })));
  });
  afterEach(() => vi.unstubAllGlobals());

  it.each([
    ['', text.searchPath], ['?intent=information', text.informationPath], ['?intent=vehicle', text.vehiclePath],
    ['?intent=import', text.searchPath], ['?intent=unknown', text.searchPath],
    ['?intent=information&vehiculo=old', text.vehiclePath], ['?vehicle=old', text.vehiclePath],
  ])('resolves %s and keeps all three radios visible', async (query, expected) => {
    renderContact(query);
    expect(screen.getAllByRole('radio')).toHaveLength(3);
    expect((screen.getByRole('radio', { name: expected }) as HTMLInputElement).checked).toBe(true);
    await waitFor(() => expect(listVehicles).toHaveBeenCalled());
  });

  it('restores each path draft and sends only the active enquiry', async () => {
    renderContact();
    fillCommon();
    fill(text.fields.desiredVehicle, 'Porsche 911');
    fill(text.fields.budget, '60–80k EUR');
    fill(text.fields.comments, 'Blue');
    selectPath(text.vehiclePath);
    const selector = await screen.findByRole('combobox');
    await waitFor(() => expect((selector as HTMLButtonElement).disabled).toBe(false));
    fireEvent.click(selector);
    const option = screen.getByRole('option', { name: `${vehicleLabel(car)} · ${es.vehicles.reserved}` });
    expect(screen.queryByRole('option', { name: /M5/ })).toBeNull();
    fireEvent.click(option);
    fill(text.fields.message, 'Hi');
    selectPath(text.informationPath);
    expect(screen.queryByRole('combobox')).toBeNull();
    expect(screen.queryByLabelText(new RegExp(text.fields.budget))).toBeNull();
    fill(text.fields.enquiry, 'What does the service include?');
    selectPath(text.searchPath);
    expect(input(text.fields.desiredVehicle).value).toBe('Porsche 911');
    expect(input(text.fields.budget).value).toBe('60–80k EUR');
    expect(input(text.fields.comments).value).toBe('Blue');
    selectPath(text.vehiclePath);
    expect(screen.getByRole('combobox').textContent).toContain(vehicleLabel(car));
    expect(input(text.fields.message).value).toBe('Hi');
    selectPath(text.informationPath);
    expect(input(text.fields.enquiry).value).toBe('What does the service include?');
    expect(input(text.fields.name).value).toBe('Alex Smith');
    send();
    await screen.findByText(text.sentTitle);
    const fetch = vi.mocked(globalThis.fetch);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(JSON.parse(String(fetch.mock.calls[0][1]?.body))).toEqual({ intent: 'Information', name: 'Alex Smith', email: 'alex@example.test', phone: null, vehicle: null, budget: null, message: 'What does the service include?', language: 'es' });
  });

  it('requires make/model for search, accepts short comments, and focuses the first error', async () => {
    renderContact();
    send();
    expect(document.activeElement).toBe(input(text.fields.name));
    fillCommon(); send();
    expect(document.activeElement).toBe(input(text.fields.desiredVehicle));
    fill(text.fields.desiredVehicle, 'BMW M3'); fill(text.fields.comments, 'Hi'); send();
    await screen.findByText(text.sentTitle);
    expect(JSON.parse(String(vi.mocked(fetch).mock.calls[0][1]?.body)).message).toBe('Hi');
  });

  it('requires ten characters only in information and preserves values on rate limiting', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(null, { status: 429 })));
    renderContact('?intent=information'); fillCommon(); fill(text.fields.enquiry, '123456789'); send();
    expect(document.activeElement).toBe(input(text.fields.enquiry));
    expect(fetch).not.toHaveBeenCalled();
    fill(text.fields.enquiry, '1234567890'); send();
    await screen.findByRole('alert');
    expect(screen.getByRole('alert').textContent).toBe(text.rateLimited);
    expect(input(text.fields.enquiry).value).toBe('1234567890');
  });

  it('matches the detail label, never auto-selects another car, and offers the search path', async () => {
    renderContact(`?vehiculo=${encodeURIComponent(vehicleLabel(car))}`);
    const selector = await screen.findByRole('combobox');
    await waitFor(() => expect(selector.textContent).toContain(vehicleLabel(car)));
    fillCommon(); send();
    await screen.findByText(text.sentTitle);
    expect(JSON.parse(String(vi.mocked(fetch).mock.calls[0][1]?.body))).toMatchObject({ intent: 'Vehicle', vehicle: vehicleLabel(car), message: null, budget: null });
  });

  it('keeps obsolete vehicle links unselected and focuses the selector on submit', async () => {
    renderContact('?vehiculo=outdated');
    await screen.findByText(text.stockUnmatched);
    expect(screen.getByRole('combobox').textContent).toBe(text.stockPlaceholder);
    fillCommon(); send();
    expect(document.activeElement).toBe(screen.getByRole('combobox'));
    expect(fetch).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: text.stockAlternative }));
    expect(document.activeElement).toBe(screen.getByRole('radio', { name: text.searchPath }));
    expect(input(text.fields.name).value).toBe('Alex Smith');
  });

  it('announces empty stock and retries a failed load', async () => {
    vi.mocked(listVehicles).mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce([]);
    renderContact('?intent=vehicle');
    await screen.findByText(text.stockError);
    fireEvent.click(screen.getByRole('button', { name: es.vehicles.retry }));
    await screen.findByText(text.stockEmpty);
    expect(screen.getByRole('combobox').textContent).toBe(text.stockPlaceholder);
  });

  it('blocks intent changes and duplicate submissions until the request settles', async () => {
    let resolve!: (response: Response) => void;
    vi.stubGlobal('fetch', vi.fn(() => new Promise<Response>((done) => { resolve = done; })));
    renderContact(); fillCommon(); fill(text.fields.desiredVehicle, 'BMW M3'); send();
    for (const radio of screen.getAllByRole('radio')) expect((radio as HTMLInputElement).disabled || radio.closest('fieldset')?.disabled).toBe(true);
    fireEvent.submit(document.querySelector('form')!);
    expect(fetch).toHaveBeenCalledTimes(1);
    await act(async () => resolve(new Response(null, { status: 202 })));
    await screen.findByText(text.sentTitle);
  });
});
