import { gsap } from 'gsap';

const INTERRUPTS = ['wheel', 'touchstart', 'keydown'] as const;
let active: gsap.core.Tween | null = null;

/** A quick scroll back to the top. */
export function scrollToTop() {
  scrollToY(0);
}

/** A quick glide to a scroll position. It moves the native scroll, so the scrubbed scenes follow it;
    any wheel, touch or key from the user takes control back immediately. */
export function scrollToY(top: number) {
  active?.kill();
  const start = window.scrollY;
  if (Math.abs(top - start) < 1) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    window.scrollTo({ top, behavior: 'instant' });
    return;
  }

  const position = { y: start };
  const stop = () => active?.kill();
  const release = () => {
    INTERRUPTS.forEach((type) => window.removeEventListener(type, stop));
    active = null;
  };
  // Fast, but long distances get a little more time so the scenes stay readable: 0.45 s to 0.95 s.
  const duration = Math.min(0.95, 0.45 + (Math.abs(top - start) / window.innerHeight) * 0.04);
  active = gsap.to(position, {
    y: top,
    duration,
    ease: 'power3.inOut',
    onUpdate: () => window.scrollTo({ top: position.y, behavior: 'instant' }),
    onComplete: release,
    onInterrupt: release,
  });
  INTERRUPTS.forEach((type) => window.addEventListener(type, stop, { passive: true }));
}
