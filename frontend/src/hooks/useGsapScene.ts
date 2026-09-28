import { useLayoutEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export type SceneKind = 'hero' | 'process' | 'vehicle';

const scrollDistance: Record<SceneKind, { desktop: number; mobile: number }> = {
  hero: { desktop: 2.5, mobile: 2 },
  process: { desktop: 3, mobile: 2.5 },
  vehicle: { desktop: 2.5, mobile: 2 },
};

// Scrub smoothing in seconds: car scenes carry more inertia than lettering.
const scrubLag: Record<SceneKind, number> = { hero: 0.7, process: 0.5, vehicle: 0.8 };

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
            scrub: scrubLag[kind],
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
          timeline.to(backgrounds, { yPercent: kind === 'hero' ? -3 : -2, duration: 1 }, 0);
        }

        if (kind === 'hero') {
          if (media.length) {
            // Linear travel, with a separate zoom for the camera's approach.
            timeline.to(media, { xPercent: -54, yPercent: -18, duration: 1 }, 0);
            timeline.to(media, { scale: 1.65, duration: 1, ease: 'power1.in' }, 0);
            timeline.to(media, { opacity: 0, filter: 'blur(9px)', duration: 0.22 }, 0.78);
          }
          titles.forEach((title, index) => {
            timeline.to(title, {
              x: () => window.innerWidth * (index === 0 ? -0.18 : 0.12),
              yPercent: index === 0 ? -65 : -38,
              opacity: 0,
              filter: 'blur(12px)',
              duration: 0.34,
            }, 0.12 + index * 0.04);
          });
          if (ui.length) timeline.to(ui, { autoAlpha: 0, y: -24, duration: 0.2 }, 0.15);
          if (handoff.length) timeline.to(handoff, { opacity: 1, duration: 0.5 }, 0.5);

          // Performance exposes this wrapper to Hero; its own timeline still owns the content.
          const incoming = document.querySelector('[data-handoff-target="hero"]');
          if (incoming) {
            timeline.fromTo(incoming, { opacity: 0 }, { opacity: 1, duration: 0.3 }, 0.7);
          }
        }

        if (kind === 'process' && words.length) {
          gsap.set(words, { opacity: 0.26, filter: 'blur(0.4px)' });
          gsap.set(words[0], { opacity: 1, filter: 'blur(0px)' });
          // Animate the whole row so its number, word and detail share one envelope.
          // Equal dominant intervals: 0–18%, 18–36%, 36–54%, 54–72%.
          // Each continuous crossfade is centred on the boundary between steps.
          words.forEach((word, index) => {
            if (index > 0) {
              timeline.to(word, { opacity: 1, filter: 'blur(0px)', duration: 0.16 }, index * 0.18 - 0.08);
            }
            if (index < words.length - 1) {
              timeline.to(word, { opacity: 0.26, filter: 'blur(0.4px)', duration: 0.16 }, (index + 1) * 0.18 - 0.08);
            }
          });
          timeline.to(words, { y: -18, duration: 1 }, 0);

          // CSS overlaps the pins by 75vh. Vehicle owns its motion; Process only
          // reveals its frame, just as Hero reveals Process's separate frame.
          const overlap = 0.75 / distance;
          const incoming = document.querySelector('[data-handoff-target="process"]');
          if (incoming) {
            timeline.fromTo(incoming, { autoAlpha: 0 }, { autoAlpha: 1, duration: overlap }, 1 - overlap);
          }
          timeline.to([...words, ...ui], { opacity: 0, duration: 0.16 }, 0.72);
        }

        if (kind === 'vehicle') {
          if (media.length) {
            timeline.fromTo(media,
              { yPercent: -115, scale: 0.9 },
              { yPercent: -6, scale: 1, duration: 0.42 },
              0,
            );
            // A slow camera drift at arrival, never a stationary hold.
            timeline.to(media, { yPercent: 9, scale: 1.025, duration: 0.26 }, 0.42);
            timeline.to(media, { yPercent: 140, scale: 1.08, duration: 0.32 }, 0.68);
            timeline.to(media, { opacity: 0, filter: 'blur(6px)', duration: 0.2 }, 0.8);
          }
          timeline.fromTo(select('[data-vehicle-lights]'),
            { opacity: 0 }, { opacity: 1, duration: 0.22 }, 0.38,
          );
          titles.forEach((title, index) => {
            timeline.fromTo(title,
              { x: 0, y: 16 },
              { x: () => window.innerWidth * (index === 0 ? -0.025 : 0.025), y: -12, duration: 1 },
              0,
            );
          });
          // The sky and car arrive first. At 24% of Vehicle, Process text has
          // finished fading on both desktop and mobile (88% of its own pin).
          timeline.fromTo([...titles, ...ui],
            { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.16 }, 0.24,
          );
          // Europe's dark curtain rises during the last viewport of this pin.
          // Retire the lettering before the incoming title becomes dominant.
          timeline.to([...titles, ...ui], { autoAlpha: 0, duration: 0.18 }, 0.6);
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
