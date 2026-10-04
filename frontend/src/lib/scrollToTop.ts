import { gsap } from 'gsap';

const INTERRUPTS = ['wheel', 'touchstart', 'keydown'] as const;
let active: gsap.core.Tween | null = null;

/** A quick scroll back to the top. It moves the native scroll, so the scrubbed scenes rewind with it;
    any wheel, touch or key from the user takes control back immediately. */
export function scrollToTop() {
  active?.kill();
  const start = window.scrollY;
  if (start <= 0) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    window.scrollTo({ top: 0, behavior: 'instant' });
    return;
  }

  const position = { y: start };
  const stop = () => active?.kill();
  const release = () => {
    INTERRUPTS.forEach((type) => window.removeEventListener(type, stop));
    active = null;
  };
  // Fast, but long pages get a little more time so the rewind stays readable: 0.45 s to 0.95 s.
  const duration = Math.min(0.95, 0.45 + (start / window.innerHeight) * 0.04);
  active = gsap.to(position, {
    y: 0,
    duration,
    ease: 'power3.inOut',
    onUpdate: () => window.scrollTo({ top: position.y, behavior: 'instant' }),
    onComplete: release,
    onInterrupt: release,
  });
  INTERRUPTS.forEach((type) => window.addEventListener(type, stop, { passive: true }));
}
