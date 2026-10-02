import { useLayoutEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';

/** Reveal one batch and keep keyboard navigation at its first new item. */
export function useProgressiveList<T extends HTMLElement>(size: number, resetKey: string, itemSelector: string, focusSelector?: string) {
  const containerRef = useRef<T>(null);
  const [page, setPage] = useState({ key: resetKey, count: size, from: 0 });
  const count = page.key === resetKey ? page.count : size;
  if (page.key !== resetKey) setPage({ key: resetKey, count: size, from: 0 });

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container || page.key !== resetKey || page.from === 0) return;
    const items = Array.from(container.querySelectorAll<HTMLElement>(itemSelector)).slice(page.from);
    const first = focusSelector ? items[0]?.querySelector<HTMLElement>(focusSelector) : items[0];
    first?.focus({ preventScroll: true });
    first?.scrollIntoView({ block: 'start', behavior: 'instant' });

    const media = gsap.matchMedia();
    media.add('(prefers-reduced-motion: no-preference)', () => {
      gsap.fromTo(items, { opacity: 0, y: 12 }, {
        opacity: 1, y: 0, duration: 0.3, stagger: 0.035, ease: 'power2.out', clearProps: 'opacity,transform',
      });
    });
    return () => media.revert();
  }, [page, resetKey, itemSelector, focusSelector]);

  function revealMore() {
    setPage({ key: resetKey, count: count + size, from: count });
  }

  return { containerRef, count, revealMore };
}
