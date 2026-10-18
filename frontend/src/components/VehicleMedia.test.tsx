import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
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

let loaded = true;
const playingNow = new Set<HTMLMediaElement>();
beforeEach(() => {
  playingNow.clear();
  loaded = true;
  Object.defineProperty(HTMLMediaElement.prototype, 'readyState', { configurable: true, get(this: HTMLMediaElement) { return loaded || !this.closest('dialog') ? 4 : 0; } });
  HTMLMediaElement.prototype.load = vi.fn();
  window.matchMedia = vi.fn((query: string) => ({ matches: false, media: query, addEventListener() {}, removeEventListener() {},
    addListener() {}, removeListener() {}, onchange: null, dispatchEvent: () => false })) as typeof window.matchMedia;
  vi.stubGlobal('IntersectionObserver', vi.fn(function () { return { observe() {}, unobserve() {}, disconnect() {} }; }));
  HTMLMediaElement.prototype.pause = vi.fn(function (this: HTMLMediaElement) { playingNow.delete(this); });
  HTMLMediaElement.prototype.play = vi.fn(async function (this: HTMLMediaElement) { playingNow.add(this); });
  Object.defineProperty(HTMLMediaElement.prototype, 'paused', { configurable: true, get(this: HTMLMediaElement) { return !playingNow.has(this); } });
  HTMLDialogElement.prototype.showModal = function () { this.open = true; };
  HTMLDialogElement.prototype.close = function () { this.open = false; this.dispatchEvent(new Event('close')); };
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

  const inline = () => document.querySelector('.vehicle-gallery__slide video') as HTMLVideoElement;
  const enlarged = () => document.querySelector('.vehicle-gallery__dialog > video') as HTMLVideoElement;
  const open = () => fireEvent.click(screen.getByRole('button', { name: new RegExp(es.vehicles.enlarge) }));
  const close = () => fireEvent.click(screen.getByRole('button', { name: new RegExp(es.vehicles.close) }));

  it('does not force the inline video to play after the dialog when it was paused', () => {
    gallery('/m4.mp4');
    inline().currentTime = 4;
    inline().pause();
    open();
    expect(enlarged().currentTime).toBe(4);
    expect(playingNow.has(enlarged())).toBe(false);
    vi.mocked(HTMLMediaElement.prototype.play).mockClear();
    close();
    expect(HTMLMediaElement.prototype.play).not.toHaveBeenCalled();
    expect(playingNow.has(inline())).toBe(false);
  });
  it('hands playback to the dialog and back when the inline video was playing', () => {
    gallery('/m4.mp4');
    expect(playingNow.has(inline())).toBe(true);
    open();
    expect(playingNow.has(inline())).toBe(false);
    expect(playingNow.has(enlarged())).toBe(true);
    close();
    expect(playingNow.has(inline())).toBe(true);
    expect(playingNow.has(enlarged())).toBe(false);
  });
  it('keeps the inline video quiet while the dialog is open after leaving and returning to the video', () => {
    gallery('/m4.mp4');
    open();
    const next = () => fireEvent.click(screen.getAllByRole('button', { name: es.vehicles.next })[1]);
    const previous = () => fireEvent.click(screen.getAllByRole('button', { name: es.vehicles.previous })[1]);
    next();
    previous();
    expect(playingNow.has(inline())).toBe(false);
    expect(playingNow.has(enlarged())).toBe(false);
  });
  it('applies the dialog seek once its metadata has loaded', () => {
    gallery('/m4.mp4');
    loaded = false;
    inline().currentTime = 4.1;
    open();
    expect(enlarged().currentTime).not.toBe(4.1);
    expect(playingNow.has(enlarged())).toBe(false);
    fireEvent(enlarged(), new Event('loadedmetadata'));
    expect(enlarged().currentTime).toBe(4.1);
    expect(playingNow.has(enlarged())).toBe(true);
  });
});
