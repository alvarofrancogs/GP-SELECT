import { useEffect, useState, type RefObject } from 'react';
import type { VehicleSummary } from '../types/vehicle';

const INTERVAL = 7_000;

/** Count only visible, uninterrupted reading time; decode the next cover before replacing the piece.
    Keyboard focus inside holds the car; the pointer does not: the section fills the screen, so a resting mouse froze
    the rotation for good, and the focus a click leaves on «Pause» kept it frozen after resuming. */
export function useFeaturedRotation(sectionRef: RefObject<HTMLElement | null>, vehicles: VehicleSummary[], mediaReady = true) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section || vehicles.length < 2 || !mediaReady) return;
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const nextIndex = (index + 1) % vehicles.length;
    const nextPhoto = vehicles[nextIndex].images?.[0]?.src;
    let image: HTMLImageElement | undefined;
    let disposed = false;
    let ready = !nextPhoto;
    let inView = false;
    const keyboardFocus = () => section.querySelector(':focus-visible') !== null;
    let focused = keyboardFocus();
    let remaining = INTERVAL;
    let started = 0;
    let timer: number | undefined;

    function stop() {
      if (timer === undefined) return;
      window.clearTimeout(timer);
      timer = undefined;
      remaining = Math.max(0, remaining - (performance.now() - started));
    }

    function sync() {
      stop();
      if (disposed || paused || motion.matches || document.hidden || !inView || focused) return;
      if (remaining === 0 && !ready) return;
      started = performance.now();
      timer = window.setTimeout(() => {
        timer = undefined;
        remaining = 0;
        if (ready) setIndex(nextIndex);
      }, remaining);
    }

    // A failed cover must not stall the cycle; the normal image fallback handles it.
    if (nextPhoto) {
      image = new Image();
      image.fetchPriority = 'low';
      image.src = nextPhoto;
      void image.decode().catch(() => {}).then(() => { ready = true; sync(); });
    }

    const observer = new IntersectionObserver(([entry]) => { inView = entry.isIntersecting; sync(); });
    const focusIn = () => { focused = keyboardFocus(); sync(); };
    // Focus moving to another element inside fires focusin again right after.
    const focusOut = () => { focused = false; sync(); };
    observer.observe(section);
    section.addEventListener('focusin', focusIn);
    section.addEventListener('focusout', focusOut);
    document.addEventListener('visibilitychange', sync);
    motion.addEventListener('change', sync);

    return () => {
      disposed = true;
      stop();
      observer.disconnect();
      section.removeEventListener('focusin', focusIn);
      section.removeEventListener('focusout', focusOut);
      document.removeEventListener('visibilitychange', sync);
      motion.removeEventListener('change', sync);
    };
  }, [sectionRef, vehicles, index, paused, mediaReady]);

  return { index, paused, togglePaused: () => setPaused((value) => !value) };
}
