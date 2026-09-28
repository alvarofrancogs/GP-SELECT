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
      const timeline = gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: {
          id: 'scene-europe',
          trigger: section,
          pin,
          start: 'top top',
          end: () => `+=${window.innerHeight * (desktop ? 1.5 : 1)}`,
          scrub: true,
          pinSpacing: true,
          anticipatePin: 1,
          invalidateOnRefresh: true,
          onUpdate: (trigger) => {
            section.dataset.progress = trigger.progress.toFixed(4);
          },
        },
      });

      timeline.to({ progress: 0 }, { progress: 1, duration: 1 }, 0);
      timeline.fromTo(select('[data-europe-vehicle]'),
        { yPercent: 12, scale: 0.98 },
        { yPercent: 0, scale: 1, duration: 0.3 }, 0,
      );
      timeline.to(select('[data-europe-vehicle]'), { yPercent: -12, scale: 1.02, duration: 0.35 }, 0.65);
      timeline.fromTo(select('[data-europe-map]'),
        { yPercent: 4, clipPath: 'inset(0% 0% 12% 0%)' },
        { yPercent: 0, clipPath: 'inset(0% 0% 0% 0%)', duration: 0.3 }, 0,
      );
      timeline.to(select('[data-europe-map]'), { yPercent: -3, duration: 0.35 }, 0.65);
      timeline.fromTo(select('[data-europe-heading]'),
        { y: 10, filter: 'blur(1px)' },
        { y: 0, filter: 'blur(0px)', duration: 0.24 }, 0,
      );
      timeline.fromTo(select('[data-europe-country]'),
        { opacity: 0.55 },
        { opacity: 1, duration: 0.12, stagger: 0.07 }, 0.22,
      );
    }, section);

    void document.fonts.ready.then(() => {
      if (!disposed) refresh();
    });
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
