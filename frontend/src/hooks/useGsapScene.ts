import { useLayoutEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export type SceneKind = 'hero' | 'process' | 'vehicle';

const scrollDistance: Record<SceneKind, { desktop: number; mobile: number }> = {
  hero: { desktop: 2, mobile: 1 },
  process: { desktop: 3, mobile: 2 },
  vehicle: { desktop: 2, mobile: 1 },
};

/** Each scene owns its trigger; only the children of its pinned frame move. */
export function useGsapScene(kind: SceneKind, id: string) {
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

    const matchMedia = gsap.matchMedia();
    matchMedia.add(
      {
        desktop: '(min-width: 1024px)',
        mobile: '(max-width: 1023px)',
        reducedMotion: '(prefers-reduced-motion: reduce)',
        enoughHeight: '(min-height: 600px)',
      },
      (context) => {
        const { desktop, reducedMotion, enoughHeight } = context.conditions!;
        const select = gsap.utils.selector(section);
        const backgrounds = select('[data-scene-background]');
        const media = select('[data-scene-media]');
        const titles = select('[data-scene-title]');
        const ui = select('[data-scene-ui]');
        const handoff = select('[data-scene-handoff]');
        const words = select('[data-process-word]');

        section.dataset.motion = reducedMotion || !enoughHeight ? 'static' : 'scroll';
        section.dataset.progress = '0';

        // Short landscape viewports also use the readable, unpinned layout.
        if (reducedMotion || !enoughHeight) {
          if (words.length) gsap.set(words, { opacity: 1, filter: 'none' });
          return;
        }

        const distance = scrollDistance[kind][desktop ? 'desktop' : 'mobile'];
        const timeline = gsap.timeline({
          defaults: { ease: 'none' },
          scrollTrigger: {
            id: `scene-${id}`,
            trigger: section,
            pin,
            start: 'top top',
            end: () => `+=${window.innerHeight * distance}`,
            scrub: true,
            pinSpacing: true,
            anticipatePin: 1,
            invalidateOnRefresh: true,
            onUpdate: (trigger) => {
              section.dataset.progress = trigger.progress.toFixed(4);
            },
          },
        });

        // All timings below are fractions of a single, reversible scene.
        timeline.to({ progress: 0 }, { progress: 1, duration: 1 }, 0);

        if (backgrounds.length && kind !== 'process') {
          timeline.to(backgrounds, { yPercent: -2, duration: 1 }, 0);
        }

        if (kind === 'hero') {
          if (media.length) {
            timeline.to(media, { yPercent: -24, scale: 1.02, duration: 0.58 }, 0.08);
          }
          titles.forEach((title, index) => {
            timeline.to(title, {
              yPercent: index === 0 ? -32 : -18,
              opacity: 0,
              filter: 'blur(3px)',
              duration: 0.3,
            }, 0.36 + index * 0.04);
          });
          if (ui.length) timeline.to(ui, { autoAlpha: 0, y: -12, duration: 0.16 }, 0.58);
        }

        if (kind === 'process' && words.length) {
          gsap.set(words, { opacity: 0.26, filter: 'blur(0.4px)' });
          gsap.set(words[0], { opacity: 1, filter: 'blur(0px)' });
          // The four-word composition is prescribed by the brief, not a PNG.
          words.forEach((word, index) => {
            if (index > 0) {
              timeline.to(word, { opacity: 1, filter: 'blur(0px)', duration: 0.09 }, index * 0.19);
            }
            if (index < words.length - 1) {
              timeline.to(word, { opacity: 0.26, filter: 'blur(0.4px)', duration: 0.09 }, (index + 1) * 0.19);
            }
          });
          timeline.to(words, { yPercent: -12, duration: 0.2 }, 0.8);
        }

        if (kind === 'vehicle') {
          if (media.length) {
            timeline.fromTo(media,
              { yPercent: 30, scale: 0.98, filter: 'blur(2px)' },
              { yPercent: 0, scale: 1, filter: 'blur(0px)', duration: 0.34 },
              0,
            );
            timeline.to(media, { yPercent: -28, scale: 1.02, duration: 0.36 }, 0.64);
          }
          titles.forEach((title, index) => {
            timeline.fromTo(title,
              { yPercent: 12, filter: 'blur(2px)' },
              { yPercent: 0, filter: 'blur(0px)', duration: 0.24 },
              index * 0.05,
            );
          });
        }

        if (handoff.length && kind !== 'vehicle') {
          gsap.set(handoff, { opacity: 1, clipPath: 'inset(100% 0% 0% 0%)' });
          timeline.to(handoff, {
            clipPath: 'inset(0% 0% 0% 0%)',
            duration: kind === 'hero' ? 0.24 : 0.16,
            ease: 'power1.inOut',
          }, kind === 'hero' ? 0.76 : 0.84);
        }
      },
      section,
    );

    // Fonts, replacement assets and translations may change the layout.
    void document.fonts.ready.then(() => {
      if (!disposed) refresh();
    });
    section.addEventListener('load', refresh, true);
    const observer = new MutationObserver(refresh);
    // Ignore child-list changes: ScrollTrigger temporarily reparents the pin on refresh.
    observer.observe(section, { characterData: true, subtree: true });
    refresh();

    return () => {
      disposed = true;
      cancelAnimationFrame(refreshFrame);
      observer.disconnect();
      section.removeEventListener('load', refresh, true);
      matchMedia.revert();
      delete section.dataset.motion;
      delete section.dataset.progress;
    };
  }, [id, kind]);

  return { sectionRef, pinRef };
}
