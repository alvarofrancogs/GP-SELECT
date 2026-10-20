import { StrictMode } from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useGalleryVideo, usePreviewVideo } from './usePreviewVideo';

function Preview({ src = '/preview.mp4', name = 'card' }: { src?: string | null; name?: string }) {
  const { videoRef, active, bind } = usePreviewVideo(src);
  return <div data-testid={name} {...bind} tabIndex={0}>
    <video ref={videoRef} data-testid={`${name}-video`} />
    <output data-testid={`${name}-active`}>{String(active)}</output>
  </div>;
}

function Gallery({ active }: { active: boolean }) {
  const { videoRef } = useGalleryVideo(active);
  return <video ref={videoRef} src="/full.mp4" data-testid="gallery" />;
}

let hover: MediaQueryList;
let motion: MediaQueryList;
let observerCallback: IntersectionObserverCallback;
const observe = vi.fn();
const unobserve = vi.fn();
const disconnect = vi.fn();

function media(matches: boolean): MediaQueryList {
  return Object.assign(new EventTarget(), { matches, media: '', onchange: null }) as MediaQueryList;
}

function change(query: MediaQueryList, matches: boolean) {
  Object.assign(query, { matches });
  act(() => { query.dispatchEvent(new Event('change')); });
}

function pointer(type: 'pointerover' | 'pointerout', pointerType = 'mouse') {
  fireEvent(screen.getByTestId('card'), new PointerEvent(type, { bubbles: true, pointerType, relatedTarget: document.body }));
}

const video = () => screen.getByTestId('card-video') as HTMLVideoElement;
const isActive = () => screen.getByTestId('card-active').textContent;

function visibility(target: Element, ratio: number) {
  act(() => {
    observerCallback([{
      target, intersectionRatio: ratio, boundingClientRect: target.getBoundingClientRect(),
      intersectionRect: target.getBoundingClientRect(), isIntersecting: ratio > 0, rootBounds: null, time: 0,
    }], {} as IntersectionObserver);
  });
}

beforeEach(() => {
  hover = media(true);
  motion = media(false);
  vi.stubGlobal('matchMedia', vi.fn((query: string) => query === '(hover: hover)' ? hover : motion));
  vi.stubGlobal('PointerEvent', class extends MouseEvent {
    pointerType: string;
    constructor(type: string, options: PointerEventInit) { super(type, options); this.pointerType = options.pointerType ?? ''; }
  });
  vi.stubGlobal('IntersectionObserver', vi.fn(function (callback: IntersectionObserverCallback) {
    observerCallback = callback;
    return { observe, unobserve, disconnect };
  }));
  Object.defineProperty(navigator, 'connection', { configurable: true, get: () => ({ saveData: false }) });
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue();
  vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});
  vi.spyOn(HTMLMediaElement.prototype, 'load').mockImplementation(() => {});
  vi.clearAllMocks();
});

afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); Reflect.deleteProperty(navigator, 'connection'); });

describe('usePreviewVideo', () => {
  it('waits for playing, then releases the source and ignores late playing after leaving mid-load', () => {
    render(<Preview />);
    expect(video().hasAttribute('src')).toBe(false);
    pointer('pointerover');
    expect(video().getAttribute('src')).toBe('/preview.mp4');
    expect(video().muted).toBe(true);
    expect(video().playsInline).toBe(true);
    expect(video().play).toHaveBeenCalledTimes(1);
    expect(isActive()).toBe('false');
    pointer('pointerout');
    expect(video().pause).toHaveBeenCalled();
    expect(video().currentTime).toBe(0);
    expect(video().hasAttribute('src')).toBe(false);
    expect(video().load).toHaveBeenCalled();
    fireEvent.playing(video());
    expect(isActive()).toBe('false');
  });

  it('ignores a cancelled start listener even after a new start', () => {
    render(<Preview />);
    const listeners = vi.spyOn(video(), 'addEventListener');
    pointer('pointerover');
    const oldPlaying = listeners.mock.calls.find(([type]) => type === 'playing')![1] as EventListener;
    pointer('pointerout');
    pointer('pointerover');
    act(() => { oldPlaying(new Event('playing')); });
    expect(isActive()).toBe('false');
    fireEvent.playing(video());
    expect(isActive()).toBe('true');
  });

  it('ignores rejection of an old play request after a new start', async () => {
    let reject!: (reason: unknown) => void;
    vi.mocked(HTMLMediaElement.prototype.play).mockReturnValueOnce(new Promise<void>((_, fail) => { reject = fail; }));
    render(<Preview />);
    pointer('pointerover');
    pointer('pointerout');
    pointer('pointerover');
    await act(async () => { reject(new DOMException('Aborted', 'AbortError')); });
    expect(video().getAttribute('src')).toBe('/preview.mp4');
    expect(isActive()).toBe('false');
    fireEvent.playing(video());
    expect(isActive()).toBe('true');
  });

  it.each(['hover', 'focus'])('loops at ten seconds or a shorter end with %s and remains active until stopped', (input) => {
    render(<Preview />);
    if (input === 'hover') pointer('pointerover');
    else fireEvent.focus(screen.getByTestId('card'));
    fireEvent.playing(video());
    expect(isActive()).toBe('true');
    video().currentTime = 4.25;
    fireEvent.timeUpdate(video());
    expect(video().currentTime).toBe(4.25);
    expect(isActive()).toBe('true');
    video().currentTime = 9.9;
    fireEvent.timeUpdate(video());
    expect(video().currentTime).toBe(9.9);
    video().currentTime = 10.2;
    fireEvent.timeUpdate(video());
    expect(video().currentTime).toBe(0);
    video().currentTime = 4;
    fireEvent.ended(video());
    expect(video().currentTime).toBe(0);
    expect(video().play).toHaveBeenCalledTimes(2);
    if (input === 'hover') pointer('pointerout');
    else fireEvent.blur(screen.getByTestId('card'), { relatedTarget: document.body });
    expect(isActive()).toBe('false');
  });

  it('returns to the cover before five seconds and stays stopped while selected', () => {
    Object.assign(hover, { matches: false });
    const frames: FrameRequestCallback[] = [];
    vi.stubGlobal('requestAnimationFrame', vi.fn((callback: FrameRequestCallback) => { frames.push(callback); return frames.length; }));
    render(<Preview />);
    visibility(video(), 1);
    fireEvent.playing(video());
    video().currentTime = 3.99;
    fireEvent.timeUpdate(video());
    expect(isActive()).toBe('true');
    expect(video().hasAttribute('src')).toBe(true);
    video().currentTime = 4.25;
    fireEvent.timeUpdate(video());
    expect(isActive()).toBe('false');
    expect(video().pause).toHaveBeenCalled();
    expect(video().hasAttribute('src')).toBe(false);
    expect(video().currentTime).toBe(0);
    expect(video().load).toHaveBeenCalled();

    fireEvent.ended(video());
    fireEvent.playing(video());
    visibility(video(), 0.8);
    fireEvent.scroll(window);
    act(() => { frames[0](0); });
    expect(video().play).toHaveBeenCalledTimes(1);
    expect(isActive()).toBe('false');
    expect(video().hasAttribute('src')).toBe(false);

    visibility(video(), 0.5);
    visibility(video(), 1);
    expect(video().play).toHaveBeenCalledTimes(2);
    fireEvent.playing(video());
    expect(isActive()).toBe('true');
  });

  it('does not loop a short automatic preview when it ends', () => {
    Object.assign(hover, { matches: false });
    render(<Preview />);
    visibility(video(), 1);
    fireEvent.playing(video());
    video().currentTime = 2;
    fireEvent.ended(video());
    expect(isActive()).toBe('false');
    expect(video().hasAttribute('src')).toBe(false);
    visibility(video(), 1);
    fireEvent.ended(video());
    expect(video().play).toHaveBeenCalledTimes(1);
  });

  it('lets another card take over after the selected preview stops, then replays when selected again', () => {
    Object.assign(hover, { matches: false });
    render(<><Preview /><Preview name="other" /></>);
    const first = video();
    const other = screen.getByTestId('other-video') as HTMLVideoElement;
    vi.spyOn(first, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 0, 200, 200));
    vi.spyOn(other, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, window.innerHeight / 2 - 100, 200, 200));
    visibility(first, 1);
    fireEvent.playing(first);
    first.currentTime = 4.25;
    fireEvent.timeUpdate(first);
    expect(first.hasAttribute('src')).toBe(false);

    visibility(other, 1);
    expect(other.getAttribute('src')).toBe('/preview.mp4');
    expect(first.hasAttribute('src')).toBe(false);
    fireEvent.playing(other);
    expect(screen.getByTestId('other-active').textContent).toBe('true');

    visibility(other, 0);
    expect(other.hasAttribute('src')).toBe(false);
    expect(first.getAttribute('src')).toBe('/preview.mp4');
    fireEvent.playing(first);
    expect(isActive()).toBe('true');
    expect(HTMLMediaElement.prototype.play).toHaveBeenCalledTimes(3);
  });

  it('ignores touch pointers on hybrid devices and supports keyboard focus within the root', () => {
    render(<Preview />);
    pointer('pointerover', 'touch');
    expect(video().play).not.toHaveBeenCalled();
    fireEvent.focus(screen.getByTestId('card'));
    expect(video().play).toHaveBeenCalledTimes(1);
    pointer('pointerout', 'touch');
    expect(video().hasAttribute('src')).toBe(true);
    fireEvent.blur(screen.getByTestId('card'), { relatedTarget: video() });
    expect(video().hasAttribute('src')).toBe(true);
    fireEvent.blur(screen.getByTestId('card'), { relatedTarget: document.body });
    expect(video().hasAttribute('src')).toBe(false);
  });

  it.each(['missing source', 'reduced motion', 'data saving'])('does nothing with %s', (reason) => {
    if (reason === 'reduced motion') Object.assign(motion, { matches: true });
    if (reason === 'data saving') Object.defineProperty(navigator, 'connection', { configurable: true, get: () => ({ saveData: true }) });
    render(<Preview src={reason === 'missing source' ? null : '/preview.mp4'} />);
    pointer('pointerover');
    expect(video().play).not.toHaveBeenCalled();
    expect(video().hasAttribute('src')).toBe(false);
    expect(IntersectionObserver).not.toHaveBeenCalled();
  });

  it('falls back to the poster on playback rejection or media error', async () => {
    vi.mocked(HTMLMediaElement.prototype.play).mockRejectedValueOnce(new DOMException('Aborted', 'AbortError'));
    render(<Preview />);
    await act(async () => { pointer('pointerover'); });
    expect(isActive()).toBe('false');
    expect(video().hasAttribute('src')).toBe(false);
    pointer('pointerout');
    pointer('pointerover');
    fireEvent.playing(video());
    fireEvent.error(video());
    expect(isActive()).toBe('false');
    expect(video().hasAttribute('src')).toBe(false);
  });

  it('cleans up pending playback and listeners on unmount in StrictMode', async () => {
    let resolve!: () => void;
    vi.mocked(HTMLMediaElement.prototype.play).mockReturnValue(new Promise<void>((done) => { resolve = done; }));
    const view = render(<StrictMode><Preview /></StrictMode>);
    const element = video();
    const remove = vi.spyOn(element, 'removeEventListener');
    pointer('pointerover');
    view.unmount();
    await act(async () => { resolve(); element.dispatchEvent(new Event('playing')); element.dispatchEvent(new Event('ended')); });
    expect(element.play).toHaveBeenCalledTimes(1);
    expect(element.hasAttribute('src')).toBe(false);
    expect(remove).toHaveBeenCalledWith('playing', expect.any(Function));
    expect(remove).toHaveBeenCalledWith('timeupdate', expect.any(Function));
    expect(remove).toHaveBeenCalledWith('ended', expect.any(Function));
  });

  it('stops the old source before a prop replacement and listens for a new start', () => {
    const view = render(<Preview />);
    pointer('pointerover');
    fireEvent.playing(video());
    view.rerender(<Preview src="/replacement.mp4" />);
    expect(video().hasAttribute('src')).toBe(false);
    expect(isActive()).toBe('false');
    fireEvent.playing(video());
    expect(isActive()).toBe('false');
    pointer('pointerover');
    expect(video().getAttribute('src')).toBe('/replacement.mp4');
  });

  it('shares a controller on phones, changes input mode live and unregisters on unmount', () => {
    Object.assign(hover, { matches: false });
    const view = render(<StrictMode><Preview /><Preview name="other" /></StrictMode>);
    expect(observe).toHaveBeenCalledWith(video());
    const other = screen.getByTestId('other-video') as HTMLVideoElement;
    vi.spyOn(video(), 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 0, 200, 200));
    vi.spyOn(other, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, window.innerHeight / 2 - 100, 200, 200));
    act(() => {
      observerCallback([video(), other].map((target) => ({
        target, intersectionRatio: 1, boundingClientRect: target.getBoundingClientRect(),
        intersectionRect: target.getBoundingClientRect(), isIntersecting: true, rootBounds: null, time: 0,
      })), {} as IntersectionObserver);
    });
    expect(other.getAttribute('src')).toBe('/preview.mp4');
    expect(video().hasAttribute('src')).toBe(false);
    change(hover, true);
    expect(other.hasAttribute('src')).toBe(false);
    pointer('pointerover');
    expect(video().hasAttribute('src')).toBe(true);
    change(motion, true);
    expect(video().hasAttribute('src')).toBe(false);
    change(motion, false);
    change(hover, false);
    const before = disconnect.mock.calls.length;
    view.unmount();
    expect(disconnect).toHaveBeenCalledTimes(before + 1);
    expect(unobserve).toHaveBeenCalledWith(other);
  });
});

describe('useGalleryVideo', () => {
  it('pauses an initially inactive slide without starting playback', () => {
    render(<Gallery active={false} />);
    expect(HTMLMediaElement.prototype.play).not.toHaveBeenCalled();
    expect(HTMLMediaElement.prototype.pause).toHaveBeenCalled();
  });

  it('autoplays muted, pauses when inactive and keeps the user sound preference on reactivation', () => {
    const view = render(<StrictMode><Gallery active /></StrictMode>);
    const element = screen.getByTestId('gallery') as HTMLVideoElement;
    expect(element.muted).toBe(true);
    expect(element.play).toHaveBeenCalled();
    element.muted = false;
    fireEvent.volumeChange(element);
    view.rerender(<StrictMode><Gallery active={false} /></StrictMode>);
    expect(element.pause).toHaveBeenCalled();
    const calls = vi.mocked(element.play).mock.calls.length;
    view.rerender(<StrictMode><Gallery active /></StrictMode>);
    expect(element.play).toHaveBeenCalledTimes(calls + 1);
    expect(element.muted).toBe(false);
    view.unmount();
    expect(element.pause).toHaveBeenCalled();
  });

  it.each(['reduced motion', 'data saving'])('does not autoplay with %s', (reason) => {
    if (reason === 'reduced motion') Object.assign(motion, { matches: true });
    else Object.defineProperty(navigator, 'connection', { configurable: true, get: () => ({ saveData: true }) });
    render(<Gallery active />);
    expect(HTMLMediaElement.prototype.play).not.toHaveBeenCalled();
  });

  it('keeps sound enabled after a manual unmute while autoplay was blocked', () => {
    Object.assign(motion, { matches: true });
    const view = render(<Gallery active />);
    const element = screen.getByTestId('gallery') as HTMLVideoElement;
    element.muted = false;
    fireEvent.volumeChange(element);
    view.rerender(<Gallery active={false} />);
    Object.assign(motion, { matches: false });
    view.rerender(<Gallery active />);
    expect(element.muted).toBe(false);
  });
});
