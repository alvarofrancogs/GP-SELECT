import { act, fireEvent, render, screen } from '@testing-library/react';
import { useRef } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { VehicleSummary } from '../types/vehicle';
import { useFeaturedRotation } from './useFeaturedRotation';

const car = (slug: string): VehicleSummary => ({
  slug, make: 'BMW', model: slug, variant: null, firstRegistrationYear: 2024, firstRegistrationMonth: null, mileageKm: null,
  priceEur: null, powerHp: null, fuelType: null, transmission: null, bodyType: null, availability: 'available',
  images: [{ src: `/${slug}.webp`, fit: 'cover', alt: null, temporary: false, width: null, height: null }],
});
const cars = [car('a'), car('b'), car('c')];

function Rotation() {
  const ref = useRef<HTMLElement>(null);
  const { index } = useFeaturedRotation(ref, cars);
  return <section ref={ref}><p>car {index}</p></section>;
}

beforeEach(() => {
  vi.useFakeTimers();
  window.matchMedia = vi.fn((query: string) => ({ matches: false, media: query, addEventListener() {}, removeEventListener() {} })) as unknown as typeof window.matchMedia;
  // The section is on screen, and every cover decodes at once.
  window.IntersectionObserver = class {
    constructor(private callback: IntersectionObserverCallback) {}
    observe() { this.callback([{ isIntersecting: true } as IntersectionObserverEntry], this as unknown as IntersectionObserver); }
    disconnect() {}
  } as unknown as typeof IntersectionObserver;
  HTMLImageElement.prototype.decode = () => Promise.resolve();
});
afterEach(() => { vi.useRealTimers(); });

describe('featured vehicle rotation', () => {
  it('moves to the next car every 7 seconds', async () => {
    render(<Rotation />);
    await act(() => vi.advanceTimersByTimeAsync(6900));
    expect(screen.getByText('car 0')).toBeTruthy();
    await act(() => vi.advanceTimersByTimeAsync(200));
    expect(screen.getByText('car 1')).toBeTruthy();
    await act(() => vi.advanceTimersByTimeAsync(7000));
    expect(screen.getByText('car 2')).toBeTruthy();
  });

  it('keeps going with the pointer resting on the section (it fills the screen)', async () => {
    window.matchMedia = vi.fn((query: string) => ({ matches: query === '(hover: hover)', media: query, addEventListener() {}, removeEventListener() {} })) as unknown as typeof window.matchMedia;
    const { container } = render(<Rotation />);
    fireEvent.pointerEnter(container.querySelector('section')!, { pointerType: 'mouse' });
    await act(() => vi.advanceTimersByTimeAsync(7100));
    expect(screen.getByText('car 1')).toBeTruthy();
  });
});
