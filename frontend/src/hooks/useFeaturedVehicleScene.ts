import { useLayoutEffect, type RefObject } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { observeResize, refreshAfterFonts, scheduleScrollRefresh } from '../lib/scrollRefresh';

gsap.registerPlugin(ScrollTrigger);

/** Entrance for the featured vehicle: the heading follows the scroll; the piece plays one composed reveal. */
export function useFeaturedVehicleScene(sectionRef: RefObject<HTMLElement | null>, vehicleKey: string, locale: string) {
  useLayoutEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const media = gsap.matchMedia();
    media.add('(prefers-reduced-motion: no-preference) and (min-height: 600px)', () => {
      const select = gsap.utils.selector(section);
      const entrance = gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: {
          id: 'featured-enter', trigger: section,
          start: 'top 85%', end: 'top 25%', scrub: 0.4,
          invalidateOnRefresh: true,
        },
      });
      entrance.fromTo(select('h2 > span'),
        { opacity: 0.2, x: -18 }, { opacity: 1, x: 0, duration: 0.65, stagger: 0.12 }, 0);
    }, section);

    const observer = observeResize(section);
    section.addEventListener('load', scheduleScrollRefresh, true);
    refreshAfterFonts();
    scheduleScrollRefresh();
    return () => {
      observer.disconnect();
      section.removeEventListener('load', scheduleScrollRefresh, true);
      media.revert();
    };
  }, [sectionRef, locale]);

  useLayoutEffect(() => {
    const section = sectionRef.current;
    if (!section) return;
    const media = gsap.matchMedia();
    media.add('(prefers-reduced-motion: no-preference) and (min-height: 600px)', () => {

      const piece = section.querySelector('.featured__piece');
      const frame = piece?.querySelector('.featured__media');
      const image = piece?.querySelector('.featured__image');
      if (!piece || !frame || !image) return;

      // One composed entrance, played when the piece comes into view and reversed on the way back up:
      // the frame opens upward like a shutter while the photograph settles from a slight over-scale,
      // then the data follows line by line.
      const lines = piece.querySelectorAll('.featured__make, .featured__identity h3, .featured__variant, .featured__availability, .featured__specs > div, .featured__link');
      const reveal = gsap.timeline({
        paused: true,
        scrollTrigger: {
          id: 'featured-piece', trigger: piece,
          start: 'top 78%', toggleActions: 'play none none reverse',
          invalidateOnRefresh: true,
        },
      });
      reveal.fromTo(frame, { clipPath: 'inset(100% 0% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.1, ease: 'power3.inOut' }, 0);
      reveal.fromTo(image, { scale: 1.2 }, { scale: 1, duration: 1.5, ease: 'power3.out' }, 0);
      reveal.fromTo(lines, { opacity: 0, y: 22 }, { opacity: 1, y: 0, duration: 0.7, ease: 'power3.out', stagger: 0.07 }, 0.35);
    }, section);

    scheduleScrollRefresh();
    return () => media.revert();
  }, [sectionRef, vehicleKey, locale]);
}
