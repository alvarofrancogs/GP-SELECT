import { useEffect, useState, type RefObject } from 'react';
import type { VehicleSummary } from '../types/vehicle';

const INTERVAL = 10_000;

/** Count only visible, uninterrupted reading time; decode the next cover before replacing the piece. */
export function useFeaturedRotation(sectionRef: RefObject<HTMLElement | null>, vehicles: VehicleSummary[]) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section || vehicles.length < 2) return;
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const nextIndex = (index + 1) % vehicles.length;
    const nextPhoto = vehicles[nextIndex].images?.[0]?.src;
    let image: HTMLImageElement | undefined;
    let disposed = false;
    let ready = !nextPhoto;
    let inView = false;
    let hovered = window.matchMedia('(hover: hover)').matches && section.matches(':hover');
    let focused = section.contains(document.activeElement);
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
      if (disposed || paused || motion.matches || document.hidden || !inView || hovered || focused) return;
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
      image.src = nextPhoto;
      void image.decode().catch(() => {}).then(() => { ready = true; sync(); });
    }

    const observer = new IntersectionObserver(([entry]) => { inView = entry.isIntersecting; sync(); });
    const enter = (event: PointerEvent) => { if (event.pointerType !== 'touch') { hovered = true; sync(); } };
    const leave = () => { hovered = false; sync(); };
    const focusIn = () => { focused = true; sync(); };
    const focusOut = (event: FocusEvent) => { focused = event.relatedTarget instanceof Node && section.contains(event.relatedTarget); sync(); };
    observer.observe(section);
    section.addEventListener('pointerenter', enter);
    section.addEventListener('pointerleave', leave);
    section.addEventListener('pointercancel', leave);
    section.addEventListener('focusin', focusIn);
    section.addEventListener('focusout', focusOut);
    document.addEventListener('visibilitychange', sync);
    motion.addEventListener('change', sync);

    return () => {
      disposed = true;
      stop();
      observer.disconnect();
      section.removeEventListener('pointerenter', enter);
      section.removeEventListener('pointerleave', leave);
      section.removeEventListener('pointercancel', leave);
      section.removeEventListener('focusin', focusIn);
      section.removeEventListener('focusout', focusOut);
      document.removeEventListener('visibilitychange', sync);
      motion.removeEventListener('change', sync);
    };
  }, [sectionRef, vehicles, index, paused]);

  return { index, paused, togglePaused: () => setPaused((value) => !value) };
}
