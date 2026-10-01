import { useLayoutEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import type { InventoryPreviewStatus, InventoryPreviewVehicle } from '../types/inventory';

gsap.registerPlugin(ScrollTrigger);

export function useInventoryScene(vehicles: InventoryPreviewVehicle[], status: InventoryPreviewStatus, locale: string) {
  const sectionRef = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const media = gsap.matchMedia();
    media.add({
      motion: '(prefers-reduced-motion: no-preference) and (min-height: 600px)',
      columns: '(min-width: 768px)',
    }, (context) => {
      if (!context.conditions?.motion) return;
      const select = gsap.utils.selector(section);
      const entrance = gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: {
          id: 'inventory-enter', trigger: section,
          start: 'top 85%', end: 'top 25%', scrub: 0.4,
          invalidateOnRefresh: true,
        },
      });
      entrance.fromTo(select('h2 > span'),
        { opacity: 0.2, x: -18 },
        { opacity: 1, x: 0, duration: 0.65, stagger: 0.12 }, 0);
      entrance.fromTo(select('.inventory-preview__intro-aside'),
        { opacity: 0.65 }, { opacity: 1, duration: 0.5 }, 0.27);

      // Each card follows its own geometry, including the stacked mobile layout.
      // One timeline owns both image reveal and parallax; badges stay outside it.
      select('.vehicle-preview').forEach((card: HTMLElement, index: number) => {
        const image = card.querySelector('img');
        if (!image) return;
        const timeline = gsap.timeline({
          defaults: { ease: 'none' },
          scrollTrigger: {
            id: `inventory-card-${index}`, trigger: card,
            start: 'top 95%', end: 'bottom top', scrub: 0.4,
            invalidateOnRefresh: true,
          },
        });
        const delay = context.conditions?.columns ? Math.max(0, index - 1) * 0.045 : 0;
        timeline.fromTo(image,
          { yPercent: 3, scale: 1.08 },
          { yPercent: -3, scale: 1.08, duration: 1 }, 0);
        timeline.fromTo(image,
          { '--inventory-reveal': '-15%' },
          { '--inventory-reveal': '115%', duration: 0.38, delay }, 0);
        timeline.fromTo(card.querySelector('.vehicle-preview__content'),
          { opacity: 0.75, y: 12 },
          { opacity: 1, y: 0, duration: 0.35, delay }, 0);
      });

      // Sober exit: the cards recede; the final CTA's dark surface meets the cream with a clean edge.
      const exit = gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: {
          id: 'inventory-exit', trigger: section,
          start: 'bottom 85%', end: 'bottom top', scrub: 0.4,
          invalidateOnRefresh: true,
        },
      });
      exit.fromTo(section.firstElementChild, { opacity: 1 }, { opacity: 0.5, duration: 1 }, 0);
    }, section);

    let disposed = false;
    let frame = 0;
    const refresh = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        if (!disposed) ScrollTrigger.refresh();
      });
    };
    // API states, translated text, fonts and loaded images can move the final CTA.
    const observer = new ResizeObserver(refresh);
    observer.observe(section);
    section.addEventListener('load', refresh, true);
    void document.fonts.ready.then(() => { if (!disposed) refresh(); });
    refresh();

    return () => {
      disposed = true;
      observer.disconnect();
      section.removeEventListener('load', refresh, true);
      cancelAnimationFrame(frame);
      media.revert();
    };
  }, [vehicles, status, locale]);

  return sectionRef;
}
