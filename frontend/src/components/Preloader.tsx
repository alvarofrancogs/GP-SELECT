import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { gsap } from 'gsap';
import { useLanguage } from '../i18n/useLanguage';
import { sceneAssets } from '../assets/sceneAssets';
import { prefetchVehicles } from '../services/vehicles';
import '../styles/preloader.css';

// Shown once per page load. It covers the work the Home does at start-up (fonts, the hero photographs,
// the vehicle list and the scroll scenes being built) and lifts like a curtain when everything is ready.
// Whole animation <= 2 s: on screen 0.7 s at least, forced out at 1.2 s, plus a 0.75 s exit.
const MIN_MS = 700;
const MAX_MS = 1200;
let shown = false;

/** Downloads and decodes the image so the browser has it ready when the hero first paints. */
function loadImage(src: string) {
  const image = new Image();
  image.src = src;
  return image.decode().catch(() => undefined);
}

export function Preloader() {
  const { copy } = useLanguage();
  const { pathname } = useLocation();
  const reduced = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const [active, setActive] = useState(() => !shown && !reduced);
  const root = useRef<HTMLDivElement>(null);
  const counter = useRef<HTMLSpanElement>(null);
  const bar = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!active) return;
    shown = true;
    const start = performance.now();
    const onHome = pathname === '/';
    const tasks = [
      document.fonts.ready,
      prefetchVehicles(),
      ...(onHome ? [loadImage(sceneAssets.heroBackground.src), loadImage(sceneAssets.heroCar.src)] : []),
    ];
    let done = 0;
    tasks.forEach((task) => void Promise.resolve(task).finally(() => { done += 1; }));

    // Hold the page still while the screen is up, without changing the scrollbar (that would resize the layout).
    const stop = (event: Event) => event.preventDefault();
    const stopKeys = (event: KeyboardEvent) => { if ([' ', 'PageDown', 'PageUp', 'End', 'Home', 'ArrowDown', 'ArrowUp'].includes(event.key)) event.preventDefault(); };
    window.addEventListener('wheel', stop, { passive: false });
    window.addEventListener('touchmove', stop, { passive: false });
    window.addEventListener('keydown', stopKeys);

    const state = { shown: 0 };
    let leaving = false;
    const paint = () => {
      const value = Math.round(state.shown);
      if (counter.current) counter.current.textContent = String(value).padStart(3, '0');
      if (bar.current) bar.current.style.transform = `scaleX(${state.shown / 100})`;
    };
    const leave = () => {
      if (leaving || !root.current) return;
      leaving = true;
      gsap.timeline({ onComplete: () => setActive(false) })
        .to(state, { shown: 100, duration: 0.15, ease: 'power2.out', onUpdate: paint })
        .to('.preloader__brand, .preloader__meter', { opacity: 0, y: -10, duration: 0.25, ease: 'power2.in' })
        .to(root.current, { yPercent: -100, duration: 0.6, ease: 'power4.inOut' }, '<0.05');
    };
    const tick = () => {
      if (leaving) return;
      const elapsed = performance.now() - start;
      const real = (done / tasks.length) * 100;
      // The number never runs ahead of what is really loaded, nor of the minimum on-screen time.
      const target = Math.min(real, (elapsed / MIN_MS) * 100);
      state.shown += (Math.min(target, 99) - state.shown) * 0.18;
      paint();
      if (done === tasks.length && elapsed >= MIN_MS) leave();
      else if (elapsed >= MAX_MS) leave();
    };
    gsap.ticker.add(tick);

    return () => {
      gsap.ticker.remove(tick);
      window.removeEventListener('wheel', stop);
      window.removeEventListener('touchmove', stop);
      window.removeEventListener('keydown', stopKeys);
    };
  }, [active, pathname]);

  if (!active) return null;

  return (
    <div ref={root} className="preloader" role="status" aria-live="polite" aria-label={copy.common.loading}>
      <p className="preloader__brand">{copy.brand}</p>
      <div className="preloader__meter" aria-hidden="true">
        <span ref={counter} className="preloader__count">000</span>
        <span className="preloader__line"><span ref={bar} /></span>
      </div>
    </div>
  );
}
