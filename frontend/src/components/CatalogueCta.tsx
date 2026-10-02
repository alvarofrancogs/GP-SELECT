import { useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { gsap } from 'gsap';
import { useLanguage } from '../i18n/useLanguage';
import '../styles/catalogue-cta.css';

// The pull is deliberately small: 90 % stable, 10 % magnetic.
const MAGNET_REACH = 72; // px around the button where it starts to notice the cursor
const MAGNET_PULL = 0.05; // fraction of the cursor offset the button follows
const MAGNET_MAX = 6; // px

// Surfaces light enough for ink type, and the dark bands inside them.
const LIGHT_SURFACES = '#servicios, #seleccion, .interior-page, .planned-page, .car-handoff__pin';
const DARK_SURFACES = '.interior-band';

/** The one global conversion: a small liquid-glass pill, fixed at the bottom centre of the public site. */
export function CatalogueCta({ onNavigate }: { onNavigate: (link: HTMLAnchorElement) => void }) {
  const { copy } = useLanguage();
  const { pathname } = useLocation();
  const linkRef = useRef<HTMLAnchorElement>(null);
  const bodyRef = useRef<HTMLSpanElement>(null);
  const hidden = pathname.startsWith('/vehiculos');

  useEffect(() => {
    const link = linkRef.current;
    const body = bodyRef.current;
    if (!link || !body) return;

    const media = gsap.matchMedia();
    // Mouse only: no magnetism on touch or coarse pointers, none with reduced motion.
    media.add('(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)', () => {
      const moveX = gsap.quickTo(body, 'x', { duration: 0.6, ease: 'power3.out' });
      const moveY = gsap.quickTo(body, 'y', { duration: 0.6, ease: 'power3.out' });
      const clamp = gsap.utils.clamp(-MAGNET_MAX, MAGNET_MAX);
      let pulled = false;

      const onMove = (event: PointerEvent) => {
        // The link itself never moves, so its box is a stable reference.
        const box = link.getBoundingClientRect();
        const dx = event.clientX - (box.left + box.width / 2);
        const dy = event.clientY - (box.top + box.height / 2);
        const near = Math.abs(dx) < box.width / 2 + MAGNET_REACH && Math.abs(dy) < box.height / 2 + MAGNET_REACH;
        if (near) {
          pulled = true;
          moveX(clamp(dx * MAGNET_PULL));
          moveY(clamp(dy * MAGNET_PULL));
          // Where the light enters the glass follows the cursor.
          link.style.setProperty('--glass-x', `${Math.min(100, Math.max(0, ((event.clientX - box.left) / box.width) * 100))}%`);
        } else if (pulled) {
          pulled = false;
          moveX(0);
          moveY(0);
        }
      };
      const onLeave = () => { pulled = false; moveX(0); moveY(0); };

      window.addEventListener('pointermove', onMove, { passive: true });
      document.documentElement.addEventListener('pointerleave', onLeave);
      return () => {
        window.removeEventListener('pointermove', onMove);
        document.documentElement.removeEventListener('pointerleave', onLeave);
        gsap.set(body, { clearProps: 'transform' });
      };
    });
    return () => media.revert();
  }, [hidden]);

  // The label follows what is under the pill: ink over paper and the bright sky, white elsewhere.
  useEffect(() => {
    const link = linkRef.current;
    if (!link) return;
    let frame = 0;
    // The surfaces do not change while the page is mounted: query them once, not on every scroll frame.
    let light: HTMLElement[] = [];
    let dark: HTMLElement[] = [];
    const collect = () => {
      light = Array.from(document.querySelectorAll<HTMLElement>(LIGHT_SURFACES));
      dark = Array.from(document.querySelectorAll<HTMLElement>(DARK_SURFACES));
    };
    const covers = (elements: HTMLElement[], y: number) => elements.some((el) => {
      const box = el.getBoundingClientRect();
      return box.top <= y && box.bottom >= y && Number(getComputedStyle(el).opacity) > 0.5;
    });
    const measure = () => {
      const y = window.innerHeight - link.offsetHeight / 2 - parseFloat(getComputedStyle(link).bottom);
      const isLight = covers(light, y) && !covers(dark, y);
      if (isLight) link.dataset.tone = 'light'; else delete link.dataset.tone;
    };
    const schedule = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(measure); };
    collect();
    schedule();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    // Pinned scenes change under a still scroll position when assets and fonts settle.
    const settle = window.setTimeout(() => { collect(); schedule(); }, 600);
    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(settle);
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
    };
  }, [hidden, pathname]);

  if (hidden) return null;

  return (
    <Link ref={linkRef} to="/vehiculos" className="catalogue-cta" onClick={(event) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      onNavigate(event.currentTarget);
    }}>
      <span ref={bodyRef} className="catalogue-cta__body">
        <span className="catalogue-cta__glass" aria-hidden="true" />
        <span className="catalogue-cta__label">{copy.common.catalogue}</span>
        <span className="catalogue-cta__orb" aria-hidden="true">
          <svg viewBox="0 0 16 19" xmlns="http://www.w3.org/2000/svg">
            <path d="M7 18C7 18.5523 7.44772 19 8 19C8.55228 19 9 18.5523 9 18H7ZM8.70711 0.292893C8.31658 -0.0976311 7.68342 -0.0976311 7.29289 0.292893L0.928932 6.65685C0.538408 7.04738 0.538408 7.68054 0.928932 8.07107C1.31946 8.46159 1.95262 8.46159 2.34315 8.07107L8 2.41421L13.6569 8.07107C14.0474 8.46159 14.6805 8.46159 15.0711 8.07107C15.4616 7.68054 15.4616 7.04738 15.0711 6.65685L8.70711 0.292893ZM9 18L9 1H7L7 18H9Z" />
          </svg>
        </span>
      </span>
    </Link>
  );
}
