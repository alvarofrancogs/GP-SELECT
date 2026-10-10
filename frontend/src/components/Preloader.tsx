import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { gsap } from 'gsap';
import { useLanguage } from '../i18n/useLanguage';
import { matchPage } from '../i18n/routes';
import { sceneAssets } from '../assets/sceneAssets';
import { prefetchVehicles } from '../services/vehicles';
import '../styles/preloader.css';

// Shown once per page load. It covers the work the Home does at start-up (fonts, the hero photographs,
// the vehicle list and the scroll scenes being built) and lifts like a curtain when everything is ready.
// The logo assembles (GP from the left, SELECT from the right) while it loads.
// Whole animation <= 2 s: on screen 0.7 s at least, forced out at 1.2 s, plus a 0.65 s exit.
// Once it has played in this tab, a reload runs it at half the time (the visitor has already seen it).
const MIN_MS = 700;
const MAX_MS = 1200;
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

  useEffect(() => {
    if (!active) return;
    shown = true;
    markSeen();
    const start = performance.now();
    const onHome = matchPage(pathname)?.page === 'home';
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

    let leaving = false;
    const leave = () => {
      if (leaving || !root.current) return;
      leaving = true;
      gsap.timeline({ onComplete: () => setActive(false) })
        .to('.preloader__logo', { opacity: 0, y: -10, duration: 0.25 * speed, ease: 'power2.in' })
        .to(root.current, { yPercent: -100, duration: 0.6 * speed, ease: 'power4.inOut' }, `<${0.05 * speed}`);
    };
    const tick = () => {
      if (leaving) return;
      const elapsed = performance.now() - start;
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
    </div>
  );
}
