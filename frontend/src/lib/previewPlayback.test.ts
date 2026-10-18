import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PREVIEW_SECONDS, canAutoplay, createCenteredController, pickCentered } from './previewPlayback';

const rect = (top: number) => new DOMRect(0, top, 200, 200);
const entry = (target: Element, intersectionRatio: number): IntersectionObserverEntry => ({
  target, intersectionRatio, boundingClientRect: target.getBoundingClientRect(), intersectionRect: rect(0),
  isIntersecting: intersectionRatio > 0, rootBounds: null, time: 0,
});

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); Reflect.deleteProperty(navigator, 'connection'); });

describe('preview policy', () => {
  it('uses the first ten seconds', () => { expect(PREVIEW_SECONDS).toBe(10); });

  it('chooses the nearest centre among cards at least 60% visible', () => {
    expect(pickCentered([
      { id: 'upper', ratio: 1, rect: rect(100) },
      { id: 'near', ratio: 0.6, rect: rect(350) },
      { id: 'hidden', ratio: 0.5, rect: rect(400) },
    ], 1000)).toBe('near');
    expect(pickCentered([], 1000)).toBeNull();
    expect(pickCentered([{ id: 'hidden', ratio: 0.5, rect: rect(400) }], 1000)).toBeNull();
  });

  it('respects reduced motion and data saving', () => {
    const media = vi.fn(() => ({ matches: false }));
    vi.stubGlobal('matchMedia', media);
    Object.defineProperty(navigator, 'connection', { configurable: true, get: () => ({ saveData: false }) });
    expect(canAutoplay()).toBe(true);
    media.mockReturnValue({ matches: true });
    expect(canAutoplay()).toBe(false);
    expect(media).toHaveBeenCalledWith('(prefers-reduced-motion: reduce)');
    media.mockReturnValue({ matches: false });
    Object.defineProperty(navigator, 'connection', { configurable: true, get: () => ({ saveData: true }) });
    expect(canAutoplay()).toBe(false);
  });
});

describe('shared centred controller', () => {
  let notify: IntersectionObserverCallback;
  const observe = vi.fn();
  const unobserve = vi.fn();
  const disconnect = vi.fn();
  const observer = vi.fn(function (callback: IntersectionObserverCallback) {
    notify = callback;
    return { observe, unobserve, disconnect };
  });
  const removers: (() => void)[] = [];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('IntersectionObserver', observer);
  });

  afterEach(() => { removers.splice(0).forEach((remove) => remove()); });

  it('creates one observer lazily and stops the previous choice before playing the next', () => {
    const controller = createCenteredController();
    expect(createCenteredController()).toBe(controller);
    expect(observer).not.toHaveBeenCalled();
    const first = document.createElement('div');
    const second = document.createElement('div');
    vi.spyOn(first, 'getBoundingClientRect').mockReturnValue(rect(100));
    vi.spyOn(second, 'getBoundingClientRect').mockReturnValue(rect(window.innerHeight / 2 - 100));
    const playFirst = vi.fn();
    const stopFirst = vi.fn();
    const playSecond = vi.fn();
    const stopSecond = vi.fn();
    removers.push(controller.register('first', first, { play: playFirst, stop: stopFirst }));
    removers.push(controller.register('second', second, { play: playSecond, stop: stopSecond }));
    expect(observer).toHaveBeenCalledTimes(1);
    expect(observer).toHaveBeenCalledWith(expect.any(Function), { threshold: [0, 0.6, 1] });
    notify([entry(first, 0.8)], {} as IntersectionObserver);
    expect(playFirst).toHaveBeenCalledTimes(1);
    notify([entry(second, 0.6)], {} as IntersectionObserver);
    expect(stopFirst).toHaveBeenCalledTimes(1);
    expect(playSecond).toHaveBeenCalledTimes(1);
    expect(stopFirst.mock.invocationCallOrder[0]).toBeLessThan(playSecond.mock.invocationCallOrder[0]);
    notify([entry(second, 0.5)], {} as IntersectionObserver);
    expect(stopSecond).toHaveBeenCalledTimes(1);
    expect(playFirst).toHaveBeenCalledTimes(2);
    removers.pop()!();
    expect(disconnect).not.toHaveBeenCalled();
    removers.pop()!();
    expect(disconnect).toHaveBeenCalledTimes(1);
    expect(unobserve).toHaveBeenCalledWith(first);
  });

  it('rechecks live bounds on passive scroll, throttles frames and cancels pending work on disposal', () => {
    const add = vi.spyOn(window, 'addEventListener');
    const remove = vi.spyOn(window, 'removeEventListener');
    const frames: FrameRequestCallback[] = [];
    vi.stubGlobal('requestAnimationFrame', vi.fn((callback: FrameRequestCallback) => { frames.push(callback); return frames.length; }));
    const cancel = vi.fn();
    vi.stubGlobal('cancelAnimationFrame', cancel);
    const controller = createCenteredController();
    const first = document.createElement('div');
    const second = document.createElement('div');
    const bounds = vi.spyOn(first, 'getBoundingClientRect').mockReturnValue(rect(window.innerHeight / 2 - 100));
    vi.spyOn(second, 'getBoundingClientRect').mockReturnValue(rect(100));
    const stop = vi.fn();
    const play = vi.fn();
    removers.push(controller.register('first', first, { play: vi.fn(), stop }));
    removers.push(controller.register('second', second, { play, stop: vi.fn() }));
    notify([first, second].map((target) => entry(target, 1)), {} as IntersectionObserver);
    bounds.mockReturnValue(rect(-100));
    window.dispatchEvent(new Event('scroll'));
    window.dispatchEvent(new Event('scroll'));
    expect(frames).toHaveLength(1);
    expect(add).toHaveBeenCalledWith('scroll', expect.any(Function), { passive: true });
    frames[0](0);
    expect(stop).toHaveBeenCalledTimes(1);
    expect(play).toHaveBeenCalledTimes(1);
    window.dispatchEvent(new Event('scroll'));
    removers.splice(0).forEach((unregister) => unregister());
    expect(cancel).toHaveBeenCalledWith(2);
    expect(remove).toHaveBeenCalledWith('scroll', expect.any(Function));
    const unregister = controller.register('again', first, { play: vi.fn(), stop: vi.fn() });
    removers.push(unregister);
    expect(observer).toHaveBeenCalledTimes(2);
  });
});
