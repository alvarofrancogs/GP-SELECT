import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { gsap } from 'gsap';
import { useLanguage } from '../i18n/useLanguage';
import { matchPage } from '../i18n/routes';
import { sceneAssets, type SceneAsset } from '../assets/sceneAssets';
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
// GSAP's power2.in and power4.inOut, for the compositor-run exit.
const POWER2_IN = 'cubic-bezier(.32, 0, .67, 0)';
const POWER4_IN_OUT = 'cubic-bezier(.83, 0, .17, 1)';
let shown = false;

function seenBefore() {
  try { return sessionStorage.getItem(SEEN_KEY) === '1'; } catch { return false; }
}
function markSeen() {
  try { sessionStorage.setItem(SEEN_KEY, '1'); } catch { /* Private mode: every load is the full version. */ }
}

/** Downloads and decodes the image so the browser has it ready when the hero first paints.
    The same srcset and sizes as the page, so it picks the same file and nothing downloads twice. */
function loadImage({ src, srcSet, sizes }: SceneAsset) {
  const image = new Image();
  if (srcSet && sizes) {
    image.sizes = sizes;
    image.srcset = srcSet;
  }
  image.src = src;
  return image.decode().catch(() => undefined);
}

export function Preloader() {
  const { copy } = useLanguage();
  const { pathname } = useLocation();
  const reduced = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const [active, setActive] = useState(() => !shown && !reduced);
  const [speed] = useState(() => seenBefore() ? 0.5 : 1);
  // The page it was opened on: a redirect while it is up must not start it again.
  const [onHome] = useState(() => matchPage(pathname)?.page === 'home');
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!active) return;
    shown = true;
    markSeen();
    const start = performance.now();
    // Only the Home needs the vehicle list at start-up (its featured vehicle). The catalogue arrives with its
    // list in the page, and Contact or a vehicle page never needs the whole inventory.
    const tasks = [
      document.fonts.ready,
      ...(onHome ? [prefetchVehicles(), loadImage(sceneAssets.heroBackground), loadImage(sceneAssets.heroCar)] : []),
    ];
    let done = 0;
    tasks.forEach((task) => void Promise.resolve(task).finally(() => { done += 1; }));

    // Hold the page still while the screen is up, without changing the scrollbar (that would resize the layout).
    const stop = (event: Event) => event.preventDefault();
    const stopKeys = (event: KeyboardEvent) => { if ([' ', 'PageDown', 'PageUp', 'End', 'Home', 'ArrowDown', 'ArrowUp'].includes(event.key)) event.preventDefault(); };
    window.addEventListener('wheel', stop, { passive: false });
    window.addEventListener('touchmove', stop, { passive: false });
    window.addEventListener('keydown', stopKeys);
    // What it covers is out of reach too: Tab cannot land on links nobody can see yet.
    const behind = Array.from(root.current?.parentElement?.children ?? [])
      .filter((element): element is HTMLElement => element instanceof HTMLElement && element !== root.current);
    behind.forEach((element) => { element.inert = true; });

    let leaving = false;
    let exit: Animation[] = [];
    // The exit runs on the compositor (transform and opacity only): the Home is still finishing its start-up work
    // underneath, and a script-driven tween stuttered with every long task.
    const leave = () => {
      const screen = root.current;
      const logo = screen?.querySelector('.preloader__logo');
      if (leaving || !screen || !logo) return;
      leaving = true;
      if (!screen.animate) { setActive(false); return; }
      exit = [
        logo.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateY(-10px)' }],
          { duration: 250 * speed, easing: POWER2_IN, fill: 'forwards' }),
        screen.animate([{ transform: 'none' }, { transform: 'translateY(-100%)' }],
          { duration: 600 * speed, delay: 50 * speed, easing: POWER4_IN_OUT, fill: 'forwards' }),
      ];
      exit[1].finished.then(() => setActive(false), () => { /* Cancelled on unmount. */ });
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
      exit.forEach((animation) => animation.cancel());
      window.removeEventListener('wheel', stop);
      window.removeEventListener('touchmove', stop);
      window.removeEventListener('keydown', stopKeys);
      behind.forEach((element) => { element.inert = false; });
    };
  }, [active, onHome, speed]);

  if (!active) return null;

  return (
    <div ref={root} className={`preloader${speed < 1 ? ' preloader--quick' : ''}`} role="status" aria-live="polite" aria-label={copy.common.loading}>
      {/* The real logo in two pieces, placed as in the original artwork so they meet exactly. Each piece comes
          into focus by crossfading from a blurred copy (preloader.css). */}
      <div className="preloader__logo" role="img" aria-label={copy.brand}>
        <span className="preloader__piece preloader__gp">
          <img src="/assets/brand/logo-gp.webp" alt="" decoding="sync" />
          <img className="preloader__soft" src="/assets/brand/logo-gp.webp" alt="" decoding="sync" />
        </span>
        <span className="preloader__piece preloader__select">
          <img src="/assets/brand/logo-select.webp" alt="" decoding="sync" />
          <img className="preloader__soft" src="/assets/brand/logo-select.webp" alt="" decoding="sync" />
        </span>
      </div>
    </div>
  );
}
