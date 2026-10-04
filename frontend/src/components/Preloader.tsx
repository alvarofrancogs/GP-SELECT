import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { gsap } from 'gsap';
import { useLanguage } from '../i18n/useLanguage';
import { sceneAssets } from '../assets/sceneAssets';
import { prefetchVehicles } from '../services/vehicles';
import '../styles/preloader.css';

// Shown once per page load. It covers the work the Home does at start-up (fonts, the hero photographs,
// the vehicle list and the scroll scenes being built) and lifts like a curtain when everything is ready.
// The logo assembles (GP from the left, SELECT from the right) while it loads.
// Whole animation <= 1.7 s: on screen 0.6 s at least, forced out at 1 s, plus a ~0.65 s exit.
// Once it has played in this tab, a reload runs it at half the time (the visitor has already seen it).
const MIN_MS = 600;
const MAX_MS = 1000;
const SEEN_KEY = 'gp-select.preloader.seen';
let shown = false;

function seenBefore() {
  try { return sessionStorage.getItem(SEEN_KEY) === '1'; } catch { return false; }
}
function markSeen() {
  try { sessionStorage.setItem(SEEN_KEY, '1'); } catch { /* Private mode: every load is the full version. */ }
}

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
  const [speed] = useState(() => seenBefore() ? 0.5 : 1);
  const root = useRef<HTMLDivElement>(null);
  const counter = useRef<HTMLSpanElement>(null);
  const bar = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!active) return;
    shown = true;
    markSeen();
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
        .to(state, { shown: 100, duration: 0.12 * speed, ease: 'power2.out', onUpdate: paint })
        .to('.preloader__logo, .preloader__meter', { opacity: 0, y: -10, duration: 0.2 * speed, ease: 'power2.in' })
        .to(root.current, { yPercent: -100, duration: 0.5 * speed, ease: 'power4.inOut' }, `<${0.05 * speed}`);
    };
    const tick = () => {
      if (leaving) return;
      const elapsed = performance.now() - start;
      const real = (done / tasks.length) * 100;
      // The number never runs ahead of what is really loaded, nor of the minimum on-screen time.
      const target = Math.min(real, (elapsed / (MIN_MS * speed)) * 100);
      state.shown += (Math.min(target, 99) - state.shown) * 0.18;
      paint();
      if (done === tasks.length && elapsed >= MIN_MS * speed) leave();
      else if (elapsed >= MAX_MS * speed) leave();
    };
    gsap.ticker.add(tick);

    return () => {
      gsap.ticker.remove(tick);
      window.removeEventListener('wheel', stop);
      window.removeEventListener('touchmove', stop);
      window.removeEventListener('keydown', stopKeys);
    };
  }, [active, pathname, speed]);

  if (!active) return null;

  return (
    <div ref={root} className={`preloader${speed < 1 ? ' preloader--quick' : ''}`} role="status" aria-live="polite" aria-label={copy.common.loading}>
      {/* The real logo in two pieces, placed as in the original artwork so they meet exactly. */}
      <div className="preloader__logo" role="img" aria-label={copy.brand}>
        <img className="preloader__gp" src="/assets/brand/logo-gp.webp" alt="" decoding="sync" />
        <img className="preloader__select" src="/assets/brand/logo-select.webp" alt="" decoding="sync" />
      </div>
      <div className="preloader__meter" aria-hidden="true">
        <span ref={counter} className="preloader__count">000</span>
        <span className="preloader__line"><span ref={bar} /></span>
      </div>
    </div>
  );
}
