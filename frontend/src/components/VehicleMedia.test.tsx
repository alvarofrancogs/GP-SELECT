import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LanguageProvider } from '../i18n/LanguageProvider';
import { es } from '../i18n/es';
import { VehicleCard } from './VehicleCard';
import { VehicleGallery } from './VehicleGallery';
import type { VehicleImage, VehicleSummary } from '../types/vehicle';

const image = (n: number): VehicleImage => ({ src: `/p${n}.jpg`, fit: 'cover', alt: `foto ${n}` } as VehicleImage);
const images = [image(0), image(1), image(2)];
const vehicle = (video: string | null): VehicleSummary => ({
  slug: 'bmw-m4', make: 'BMW', model: 'M4', variant: null, firstRegistrationYear: 2021, firstRegistrationMonth: null,
  mileageKm: 12000, priceEur: 80000, powerHp: 510, fuelType: 'Gasolina', transmission: 'Automático', bodyType: 'Coupé',
  availability: 'available', images, video,
});

beforeEach(() => {
  window.matchMedia = vi.fn((query: string) => ({ matches: false, media: query, addEventListener() {}, removeEventListener() {},
    addListener() {}, removeListener() {}, onchange: null, dispatchEvent: () => false })) as typeof window.matchMedia;
  vi.stubGlobal('IntersectionObserver', vi.fn(function () { return { observe() {}, unobserve() {}, disconnect() {} }; }));
  HTMLMediaElement.prototype.pause = vi.fn();
  HTMLMediaElement.prototype.play = vi.fn(async () => {});
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

const card = (video: string | null) => render(<MemoryRouter><LanguageProvider><VehicleCard vehicle={vehicle(video)} /></LanguageProvider></MemoryRouter>);
const gallery = (video: string | null) => render(<MemoryRouter><LanguageProvider><VehicleGallery images={images} name="BMW M4" video={video} /></LanguageProvider></MemoryRouter>);

describe('VehicleCard preview video', () => {
  it('renders no video without one', () => {
    card(null);
    expect(document.querySelector('video')).toBeNull();
  });
  it('renders a muted, hidden, source-less video over the poster', () => {
    card('/m4.mp4');
    const video = document.querySelector('video')!;
    expect(video.muted).toBe(true);
    expect(video.getAttribute('aria-hidden')).toBe('true');
    expect(video.hasAttribute('src')).toBe(false);
    expect(video.classList.contains('is-active')).toBe(false);
  });
});

describe('VehicleGallery with a video', () => {
  it('opens on the video with the poster, counted as item 1', () => {
    gallery('/m4.mp4');
    const video = document.querySelector('.vehicle-gallery__slide video') as HTMLVideoElement;
    expect(video.controls).toBe(true);
    expect(video.getAttribute('poster')).toBe('/p0.jpg');
    expect(video.getAttribute('src')).toBe('/m4.mp4');
    expect(document.querySelectorAll('.vehicle-gallery__slide')).toHaveLength(3);
    expect(screen.getAllByText('1 / 3').length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: es.vehicles.video })).toBeTruthy();
    expect(screen.getByRole('button', { name: `${es.vehicles.image} 2` })).toBeTruthy();
  });
  it('is unchanged without a video', () => {
    gallery(null);
    expect(document.querySelector('video')).toBeNull();
    expect(screen.getByRole('button', { name: `${es.vehicles.image} 1` })).toBeTruthy();
  });
});
