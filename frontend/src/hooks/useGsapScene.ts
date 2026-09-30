import { useLayoutEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export type SceneKind = 'hero' | 'process';

const scrollDistance: Record<SceneKind, { desktop: number; mobile: number }> = {
  hero: { desktop: 2.5, mobile: 2 },
  process: { desktop: 3, mobile: 2.5 },
};

// Scrub smoothing in seconds: the car scene carries more inertia than lettering.
const scrubLag: Record<SceneKind, number> = { hero: 0.7, process: 0.5 };

// Hero car approach. The mask in scenes.css fades the car from 88% of its box.
const HERO_ZOOM = 1.65;
const HERO_MASK_START = 0.88;

/**
 * Largest leftward travel (px) that keeps the faded right edge of the hero car
 * outside the viewport for the whole approach (zoom grows with power1.in).
 */
function heroCarTravel(media: HTMLElement) {
  const left = media.offsetLeft;
  const width = media.offsetWidth;
  const originX = left + parseFloat(getComputedStyle(media).transformOrigin);
  let travel = Infinity;
  for (let step = 1; step <= 20; step++) {
    const progress = step / 20;
    const scale = 1 + (HERO_ZOOM - 1) * progress * progress;
    const edge = originX + scale * (left + width * HERO_MASK_START - originX);
    travel = Math.min(travel, (edge - window.innerWidth) / progress);
  }
  return Math.max(0, travel);
}

// Over the sky the default (difference) header reads well; ink takes over before the
// dark handoff turns the sky mid-grey, and white once that dark layer dominates.
const HERO_TONE = { light: 0.45, dark: 0.72 };

/** Header tone over the hero, from the visible (scrubbed) state of its layers. */
function heroHeaderTone(visual: number, processTop: number, headerHalf: number) {
  // The opaque Process curtain already sits under the header.
  if (processTop <= headerHalf) return '';
  if (visual < HERO_TONE.light) return '';
  return visual < HERO_TONE.dark ? 'light' : 'dark';
}

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
            const car = media[0] as HTMLElement;
            timeline.to(media, { x: () => -heroCarTravel(car), yPercent: -18, duration: 1 }, 0);
            timeline.to(media, { scale: HERO_ZOOM, duration: 1, ease: 'power1.in' }, 0);
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

          // Process rises over the last viewport as an opaque curtain (scenes.css), so the
          // hero only darkens underneath it. The header follows what is actually visible:
          // the scrubbed layers, and Process once it reaches the header.
          const process = document.getElementById('criterio');
          const header = document.querySelector<HTMLElement>('.site-header');
          const publishTone = () => {
            const processTop = process?.getBoundingClientRect().top ?? Infinity;
            const headerHalf = (header?.clientHeight ?? 0) / 2;
            section.dataset.headerTone = heroHeaderTone(timeline.progress(), processTop, headerHalf);
          };
          timeline.eventCallback('onUpdate', publishTone);
          publishTone();
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

          // CSS overlaps the pins by 75vh. The next scene owns its motion; Process only
          // reveals its frame once its own lettering has left, so the two never overlap.
          // This handoff follows the scroll without lag: the incoming frame must be opaque
          // by the time Process unpins, whatever the scroll speed.
          const lettersOut = 0.72;
          const revealAt = 0.82;
          const handoffTimeline = gsap.timeline({
            defaults: { ease: 'none' },
            scrollTrigger: {
              trigger: section,
              start: 'top top',
              end: () => `+=${window.innerHeight * distance}`,
              scrub: true,
              invalidateOnRefresh: true,
            },
          });
          handoffTimeline.to({}, { duration: 1 }, 0);
          const list = words[0].parentElement;
          handoffTimeline.to([list, ...ui], { opacity: 0, duration: revealAt - lettersOut }, lettersOut);
          const incoming = document.querySelector('[data-handoff-target="process"]');
          if (incoming) {
            handoffTimeline.fromTo(incoming, { autoAlpha: 0 }, { autoAlpha: 1, duration: 1 - revealAt }, revealAt);
          }
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
      delete section.dataset.headerTone;
    };
  }, [id, kind]);

  return { sectionRef, pinRef };
}
