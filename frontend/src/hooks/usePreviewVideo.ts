import { useEffect, useId, useRef, useState, type FocusEvent, type PointerEvent, type RefObject } from 'react';
import { PREVIEW_SECONDS, canAutoplay, createCenteredController } from '../lib/previewPlayback';

/** Keep the cover visible until the current playback request actually starts. */
export function usePreviewVideo(src: string | null) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [active, setActive] = useState(false);
  const id = useId();
  const interaction = useRef<((kind: 'pointer' | 'focus', inside: boolean) => void) | null>(null);

  useEffect(() => {
    const element = videoRef.current;
    if (!element) return;
    const video = element;
    const hover = window.matchMedia('(hover: hover)');
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let disposed = false;
    let generation = 0;
    let requested = false;
    let hovered = false;
    let focused = false;
    let removeStart = () => {};
    let unregister: (() => void) | undefined;
    setActive(false);

    function stop() {
      generation++;
      requested = false;
      removeStart();
      removeStart = () => {};
      if (video.hasAttribute('src')) {
        video.pause();
        video.currentTime = 0;
        video.removeAttribute('src');
        video.load();
      }
      if (!disposed) setActive(false);
    }

    function start() {
      if (disposed || requested || !src || !canAutoplay()) return;
      requested = true;
      const token = ++generation;
      const current = () => !disposed && requested && generation === token;
      const failed = () => { if (current()) stop(); };
      const playing = () => { if (current() && video.getAttribute('src') === src) setActive(true); };
      const timeupdate = () => { if (current() && video.currentTime >= PREVIEW_SECONDS) video.currentTime = 0; };
      const ended = () => {
        if (!current()) return;
        video.currentTime = 0;
        void video.play().catch(failed);
      };
      video.addEventListener('playing', playing);
      video.addEventListener('timeupdate', timeupdate);
      video.addEventListener('ended', ended);
      video.addEventListener('error', failed);
      removeStart = () => {
        video.removeEventListener('playing', playing);
        video.removeEventListener('timeupdate', timeupdate);
        video.removeEventListener('ended', ended);
        video.removeEventListener('error', failed);
      };
      video.src = src;
      video.muted = true;
      video.playsInline = true;
      void video.play().catch(failed);
    }

    function syncMode() {
      unregister?.();
      unregister = undefined;
      stop();
      hovered = false;
      focused = false;
      if (!hover.matches && src && canAutoplay()) {
        unregister = createCenteredController().register(id, video, { play: start, stop });
      }
    }

    interaction.current = (kind, inside) => {
      if (!hover.matches || disposed) return;
      if (kind === 'pointer') hovered = inside;
      else focused = inside;
      if (hovered || focused) start();
      else stop();
    };
    syncMode();
    hover.addEventListener('change', syncMode);
    motion.addEventListener('change', syncMode);
    return () => {
      disposed = true;
      interaction.current = null;
      hover.removeEventListener('change', syncMode);
      motion.removeEventListener('change', syncMode);
      unregister?.();
      stop();
    };
  }, [src, id]);

  const bind = {
    onPointerEnter: (event: PointerEvent<HTMLElement>) => {
      if (event.pointerType !== 'touch') interaction.current?.('pointer', true);
    },
    onPointerLeave: (event: PointerEvent<HTMLElement>) => {
      if (event.pointerType !== 'touch') interaction.current?.('pointer', false);
    },
    onFocus: () => { interaction.current?.('focus', true); },
    onBlur: (event: FocusEvent<HTMLElement>) => {
      if (!(event.relatedTarget instanceof Node) || !event.currentTarget.contains(event.relatedTarget)) {
        interaction.current?.('focus', false);
      }
    },
  };
  return { videoRef, active, bind };
}

/** Mute the initial autoplay once, preserving native sound controls on later visits. */
export function useGalleryVideo(active: boolean) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const initialized = useRef(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const volumechange = () => { if (!video.muted) initialized.current = true; };
    video.addEventListener('volumechange', volumechange);
    return () => video.removeEventListener('volumechange', volumechange);
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (active && canAutoplay()) {
      if (!initialized.current) { video.muted = true; initialized.current = true; }
      void video.play().catch(() => {});
    } else {
      video.pause();
    }
    return () => video.pause();
  }, [active]);

  return { videoRef };
}

/** Whether at least half of the element is on screen. `onLeave` runs just before it stops counting as visible.
 * Without IntersectionObserver the element always counts as visible. */
export function useHalfVisible(ref: RefObject<HTMLElement | null>, onLeave?: () => void) {
  const [visible, setVisible] = useState(() => typeof IntersectionObserver === 'undefined');
  const leave = useRef(onLeave);
  useEffect(() => { leave.current = onLeave; });

  useEffect(() => {
    const element = ref.current;
    if (!element || typeof IntersectionObserver === 'undefined') return;
    let shown = false;
    const observer = new IntersectionObserver(([entry]) => {
      const next = entry.isIntersecting && entry.intersectionRatio >= 0.5;
      if (shown && !next) leave.current?.();
      shown = next;
      setVisible(next);
    }, { threshold: [0, 0.5] });
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref]);

  return visible;
}
