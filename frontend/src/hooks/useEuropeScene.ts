import { useLayoutEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export function useEuropeScene() {
  const sectionRef = useRef<HTMLElement>(null);
  const pinRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const section = sectionRef.current;
    const pin = pinRef.current;
    if (!section || !pin) return;

    let disposed = false;
    let refreshFrame = 0;
    const refresh = () => {
      cancelAnimationFrame(refreshFrame);
      refreshFrame = requestAnimationFrame(() => {
        if (!disposed) ScrollTrigger.refresh();
      });
    };
    const media = gsap.matchMedia();
    media.add({
      desktop: '(min-width: 1024px)',
      mobile: '(max-width: 1023px)',
      reduced: '(prefers-reduced-motion: reduce)',
      enoughHeight: '(min-height: 600px)',
    }, (context) => {
      const { desktop, reduced, enoughHeight } = context.conditions!;
      section.dataset.motion = reduced || !enoughHeight ? 'static' : 'scroll';
      section.dataset.progress = '0';
      if (reduced || !enoughHeight) return;

      const select = gsap.utils.selector(section);
      const vehicle = select('[data-europe-vehicle]');
      const heading = select('[data-europe-heading]');
      const map = select('[data-europe-map]');
      const countries = select('[data-europe-country]');
      const entrance = gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: {
          id: 'europe-enter', trigger: section,
          start: 'top bottom', end: 'top top', scrub: 0.5,
          invalidateOnRefresh: true,
        },
      });
      entrance.fromTo(section, { '--curtain-opacity': 0 }, { '--curtain-opacity': 1, duration: 1 }, 0);
      entrance.fromTo(select('[data-europe-line]'),
        { yPercent: 110, filter: 'blur(10px)' },
        { yPercent: 0, filter: 'blur(0px)', duration: 0.5, stagger: 0.12 }, 0.2);
      entrance.fromTo(select('.europe-eyebrow, .europe-description'),
        { opacity: 0 }, { opacity: 1, duration: 0.45 }, 0.45);

      const timeline = gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: {
          id: 'scene-europe', trigger: section, pin,
          start: 'top top',
          end: () => `+=${window.innerHeight * (desktop ? 2.5 : 2)}`,
          scrub: 0.8, pinSpacing: true, anticipatePin: 1,
          invalidateOnRefresh: true,
          onUpdate: (trigger) => { section.dataset.progress = trigger.progress.toFixed(4); },
        },
      });
      // Media contract: --vehicle-progress is normalized 0–1, independent of the renderer.
      timeline.fromTo(vehicle, { '--vehicle-progress': 0 }, { '--vehicle-progress': 1, duration: 1 }, 0);
      timeline.fromTo(vehicle,
        { yPercent: 72, scale: 0.9 },
        { yPercent: -105, scale: 1.06, duration: 1 }, 0);
      timeline.fromTo(map,
        { yPercent: 9, scale: 1.06, '--map-reveal': '20%' },
        { yPercent: -12, scale: 1, '--map-reveal': '120%', duration: 1 }, 0);
      timeline.fromTo(heading, { y: 18 }, { y: -48, duration: 1 }, 0);
      timeline.fromTo(countries,
        { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.16, stagger: 0.045 }, 0.08);
      timeline.to([...heading, ...select('.europe-countries, .europe-cta')],
        { autoAlpha: 0, duration: 0.18 }, 0.58);
      timeline.to(vehicle, { opacity: 0, duration: 0.2 }, 0.8);
      timeline.to(map, { opacity: 0.15, duration: 0.28 }, 0.72);
      // Services' paper curtain covers the last viewport (progress 0.6 on desktop):
      // lettering is gone by then, and the car and map fade underneath it.
    }, section);

    void document.fonts.ready.then(() => { if (!disposed) refresh(); });
    section.addEventListener('load', refresh, true);
    const observer = new MutationObserver(refresh);
    observer.observe(section, { characterData: true, subtree: true });
    refresh();
    return () => {
      disposed = true;
      cancelAnimationFrame(refreshFrame);
      observer.disconnect();
      section.removeEventListener('load', refresh, true);
      media.revert();
      delete section.dataset.motion;
      delete section.dataset.progress;
    };
  }, []);

  return { sectionRef, pinRef };
}
