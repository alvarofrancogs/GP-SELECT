import { describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LanguageProvider } from '../i18n/LanguageProvider';
import { VehicleDetailView } from './VehicleDetail';
import type { VehicleDetail } from '../types/vehicle';

const vehicle: VehicleDetail = {
  slug: 'bmw-m4', make: 'BMW', model: 'M4', variant: null, firstRegistrationYear: 2023, firstRegistrationMonth: null,
  mileageKm: 12500, priceEur: 86900, powerHp: 510, fuelType: 'Gasolina', transmission: 'Automático', bodyType: 'Coupé',
  availability: 'available', images: null, video: null, drivetrain: null, exteriorColour: null, interiorColour: null, provenance: null,
  description: 'Unidad revisada en origen.', history: 'Libro de mantenimiento completo.', equipment: ['Asientos M Carbon'],
  customSpecifications: [{ label: 'Garantía', value: '12 meses' }],
};

function renderAt(path: string) {
  window.matchMedia ??= vi.fn(() => ({ matches: false, addEventListener() {}, removeEventListener() {} })) as unknown as typeof window.matchMedia;
  return render(<MemoryRouter initialEntries={[path]}><LanguageProvider>
    <VehicleDetailView vehicle={vehicle} back={null} />
  </LanguageProvider></MemoryRouter>).container;
}

const langOf = (container: HTMLElement, text: string) =>
  [...container.querySelectorAll<HTMLElement>('p, li, dd, dt')].find((el) => el.textContent === text)?.closest('[lang]')?.getAttribute('lang') ?? null;

describe('vehicle free text language', () => {
  it('marks the Admin’s Spanish text on English pages', () => {
    const page = renderAt('/en/vehicles/bmw-m4');
    for (const text of ['Unidad revisada en origen.', 'Libro de mantenimiento completo.', 'Asientos M Carbon', 'Garantía', '12 meses'])
      expect(langOf(page, text), text).toBe('es');
  });

  it('adds nothing on Spanish pages', () => {
    const page = renderAt('/vehiculos/bmw-m4');
    expect(page.querySelector('[lang]')).toBeNull();
  });
});
