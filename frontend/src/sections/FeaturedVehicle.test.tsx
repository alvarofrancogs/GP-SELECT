import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LanguageProvider } from '../i18n/LanguageProvider';
import type { VehicleSummary } from '../types/vehicle';
import { FeaturedVehicle } from './FeaturedVehicle';

const motion = vi.hoisted(() => ({
  index: 0,
  reduced: false,
  timeline: vi.fn(),
  fromTo: vi.fn(),
  refresh: vi.fn(),
  revert: vi.fn(),
  disconnect: vi.fn(),
}));

vi.mock('gsap', () => ({
  gsap: {
    registerPlugin: vi.fn(),
    utils: { selector: (element: Element) => (selector: string) => element.querySelectorAll(selector) },
    timeline: motion.timeline,
    matchMedia: () => ({
      add: (_query: string, callback: () => void) => { if (!motion.reduced) callback(); },
      revert: motion.revert,
    }),
  },
}));
vi.mock('../lib/scrollRefresh', () => ({
  observeResize: () => ({ disconnect: motion.disconnect }),
  refreshAfterFonts: vi.fn(),
  scheduleScrollRefresh: motion.refresh,
}));
vi.mock('../hooks/useFeaturedRotation', () => ({
  useFeaturedRotation: () => ({ index: motion.index, paused: false, togglePaused: vi.fn() }),
}));
vi.mock('../services/vehicles', () => ({ listVehicles: vi.fn() }));
import { listVehicles } from '../services/vehicles';

const first: VehicleSummary = {
  slug: 'first', make: 'BMW', model: 'M4', variant: null,
  firstRegistrationYear: 2024, firstRegistrationMonth: 1, mileageKm: 1000,
  priceEur: 60000, powerHp: null, fuelType: null, transmission: null,
  bodyType: null, availability: 'available', video: null,
  images: [{ src: '/first.webp', fit: 'cover', alt: null, temporary: false, width: 1600, height: 1000 }],
};
const second: VehicleSummary = {
  ...first, slug: 'second', make: 'Audi', model: 'RS 3', variant: 'Sportback',
  powerHp: 400, availability: 'sold', images: [{ ...first.images![0], src: '/second.webp' }],
};

function Page() {
  return <MemoryRouter><LanguageProvider><FeaturedVehicle /></LanguageProvider></MemoryRouter>;
}

beforeEach(() => {
  vi.clearAllMocks();
  motion.index = 0;
  motion.reduced = false;
  motion.timeline.mockReturnValue({ fromTo: motion.fromTo });
  vi.mocked(listVehicles).mockResolvedValue([first, second]);
});

describe('featured vehicle scene lifetime', () => {
  it('keeps the reversible entrance and its targets through rotations without refreshing on cover load', async () => {
    const { container, rerender, unmount } = render(<Page />);
    await screen.findByRole('heading', { name: 'M4' });
    const piece = container.querySelector('.featured__piece');
    const variant = container.querySelector<HTMLElement>('.featured__variant');
    const availability = container.querySelector<HTMLElement>('.featured__availability');
    const rows = Array.from(container.querySelectorAll('.featured__specs > div'));
    const timelineCount = motion.timeline.mock.calls.length;
    const refreshCount = motion.refresh.mock.calls.length;
    expect(variant?.hidden).toBe(true);
    expect(availability?.hidden).toBe(true);
    expect(motion.timeline).toHaveBeenCalledWith(expect.objectContaining({
      scrollTrigger: expect.objectContaining({ id: 'featured-piece', toggleActions: 'play none none reverse' }),
    }));
    // Invalidating on refresh dropped the start state of the staggered lines after the first: they blinked.
    const triggers = motion.timeline.mock.calls.map(([options]) => options.scrollTrigger);
    expect(triggers.map(({ id }) => id)).toEqual(['featured-enter', 'featured-piece']);
    expect(triggers.some((trigger) => trigger.invalidateOnRefresh)).toBe(false);

    motion.index = 1;
    rerender(<Page />);
    // The car on screen fades out first, then the next one comes in.
    expect(container.querySelector('.featured--swapping')).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'M4' })).toBeTruthy();
    expect(await screen.findByRole('heading', { name: 'RS 3' })).toBeTruthy();
    expect(container.querySelector('.featured--swapping')).toBeNull();
    fireEvent.load(container.querySelector('img')!);
    expect(motion.timeline).toHaveBeenCalledTimes(timelineCount);
    expect(motion.refresh).toHaveBeenCalledTimes(refreshCount);
    expect(motion.revert).not.toHaveBeenCalled();
    expect(container.querySelector('.featured__piece')).toBe(piece);
    expect(container.querySelector('.featured__variant')).toBe(variant);
    expect(variant?.hidden).toBe(false);
    expect(variant?.textContent).toBe('Sportback');
    expect(availability?.hidden).toBe(false);
    expect(Array.from(container.querySelectorAll('.featured__specs > div'))).toEqual(rows);
    expect(rows.every((row) => row.isConnected)).toBe(true);

    unmount();
    expect(motion.revert).toHaveBeenCalledTimes(2);
    expect(motion.disconnect).toHaveBeenCalledOnce();
  });

  it('renders the vehicle without an entrance timeline with reduced motion', async () => {
    motion.reduced = true;
    render(<Page />);
    await screen.findByRole('heading', { name: 'M4' });
    expect(screen.getByRole('link', { name: /BMW M4/ })).toBeTruthy();
    expect(motion.timeline).not.toHaveBeenCalled();
  });
});
