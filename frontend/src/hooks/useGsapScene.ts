import { useLayoutEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { refreshAfterFonts, scheduleScrollRefresh } from '../lib/scrollRefresh';

gsap.registerPlugin(ScrollTrigger);

export type SceneKind = 'hero' | 'process';

const scrollDistance: Record<SceneKind, { desktop: number; mobile: number }> = {
  hero: { desktop: 2.5, mobile: 2 },
  process: { desktop: 3, mobile: 2.5 },
};

// Scrub smoothing in seconds: the car scene carries more inertia than lettering.
const scrubLag: Record<SceneKind, number> = { hero: 0.7, process: 0.5 };

// Hero car: the side-on Porsche drives off to the left. Travel is the whole story; the scale
// only adds a touch of depth and must never read as a camera zoom.
const HERO_TRAVEL = { desktop: 0.34, mobile: 0.3 }; // of the viewport width
const HERO_DEPTH = 1.06;

// Over the sky the default (difference) header reads well; ink takes over before the
// dark handoff turns the sky mid-grey, and white once that dark layer dominates.
// `dark` is the handoff layer's opacity at which the sky has turned mid-grey (it used to be reached at 0.72 of the pin).
const HERO_TONE = { light: 0.45, dark: 0.44 };
// The hero is fully darkened by the time Process starts to rise over it (scroll distance, in viewports).
const HERO_DARKEN_BY = 1.45;
// Process lands instead of stopping dead: its lettering rises this much lower (in viewports) and, once
// pinned, keeps rising and slows to rest over twice that scroll. power1.out starts at twice its average
// speed, so the lettering leaves the scroll at the scroll's own speed, with no hard stop.
const PROCESS_LANDING = 0.08;

/** Header tone over the hero, from the visible (scrubbed) state of its layers:
    `progress` of the car/titles timeline and `darkness` (opacity) of the dark handoff layer. */
function heroHeaderTone(progress: number, darkness: number, processTop: number, headerHalf: number) {
  // The opaque Process curtain already sits under the header.
  if (processTop <= headerHalf) return '';
  if (darkness >= HERO_TONE.dark) return 'dark';
  return progress >= HERO_TONE.light ? 'light' : '';
}

/** Each scene owns its trigger; only the children of its pinned frame move. */
export function useGsapScene(kind: SceneKind, id: string) {
  const sectionRef = useRef<HTMLElement>(null);
  const pinRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const section = sectionRef.current;
    const pin = pinRef.current;
    if (!section || !pin) return;

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
            // Process starts with its words already placed: pre-pinning would make them jump.
            anticipatePin: kind === 'process' ? 0 : 1,
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
            const travel = HERO_TRAVEL[desktop ? 'desktop' : 'mobile'];
            timeline.to(media, { x: () => -window.innerWidth * travel, duration: 1 }, 0);
            timeline.to(media, { scale: HERO_DEPTH, duration: 1 }, 0);
            // The car stays in frame to the end; the Process curtain covers it.
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
          // The sky is almost dark before the Process curtain reaches it: no bright photo under a dark page.
          // One timeline, without scrub lag, owns the dark layer's opacity over the whole pin (positions in
          // viewports of scroll). A second, lagging timeline on the same property used to leave it at 0.88
          // after a fast return to the top.
          const darken = handoff.length ? gsap.timeline({
            defaults: { ease: 'none' },
            scrollTrigger: {
              trigger: section, start: 'top top', scrub: true, invalidateOnRefresh: true,
              end: () => `+=${window.innerHeight * distance}`,
            },
          }) : null;
          if (darken) {
            const fullyDarkFrom = Math.max(distance * 0.6, HERO_DARKEN_BY);
            darken.to({}, { duration: distance }, 0);
            darken.fromTo(handoff, { opacity: 0 }, { opacity: 0.88, duration: HERO_DARKEN_BY * 2 / 3 }, HERO_DARKEN_BY / 3);
            darken.to(handoff, { opacity: 1, duration: distance - fullyDarkFrom }, fullyDarkFrom);
          }

          // Process rises over the last viewport as an opaque curtain (scenes.css), so the
          // hero only darkens underneath it. The header follows what is actually visible:
          // the scrubbed layers, and Process once it reaches the header.
          const process = document.getElementById('criterio');
          const header = document.querySelector<HTMLElement>('.site-header');
          const publishTone = () => {
            const processTop = process?.getBoundingClientRect().top ?? Infinity;
            const headerHalf = (header?.clientHeight ?? 0) / 2;
            const tone = heroHeaderTone(timeline.progress(), Number(gsap.getProperty(handoff[0] ?? section, 'opacity')), processTop, headerHalf);
            if (section.dataset.headerTone !== tone) section.dataset.headerTone = tone;
          };
          timeline.eventCallback('onUpdate', publishTone);
          darken?.eventCallback('onUpdate', publishTone);
          publishTone();
          // Pins revert during refresh, and a finished timeline will not update again.
          ScrollTrigger.addEventListener('refresh', publishTone);
          return () => ScrollTrigger.removeEventListener('refresh', publishTone);
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
          // This timeline follows the scroll without lag: the landing must match the scroll's
          // speed, and the incoming frame must be opaque by the time Process unpins, whatever
          // the scroll speed.
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
          handoffTimeline.fromTo([list, ...ui], { y: () => window.innerHeight * PROCESS_LANDING }, {
            y: 0,
            ease: 'power1.out',
            duration: (PROCESS_LANDING * 2) / distance,
          }, 0);
          handoffTimeline.to([list, ...ui], { opacity: 0, duration: revealAt - lettersOut }, lettersOut);
          // The incoming frame shows up under a veil of Process's own dark, then the veil lifts like a
          // curtain with a soft edge. A plain crossfade from dark to the bright sky went through a
          // whole screen of flat grey on the way.
          const incoming = document.querySelector('[data-handoff-target="process"]');
          if (incoming) {
            const veil = incoming.querySelector('[data-handoff-veil]');
            handoffTimeline.fromTo(incoming, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.01 }, revealAt);
            if (veil) {
              handoffTimeline.fromTo(veil, { yPercent: 0 }, { yPercent: -100, duration: 1 - revealAt - 0.01, ease: 'power1.inOut' }, revealAt + 0.01);
            }
          }
        }
      },
      section,
    );

    // Fonts, replacement assets and translations may change the layout.
    refreshAfterFonts();
    section.addEventListener('load', scheduleScrollRefresh, true);
    const observer = new MutationObserver(scheduleScrollRefresh);
    // Ignore child-list changes: ScrollTrigger temporarily reparents the pin on refresh.
    observer.observe(section, { characterData: true, subtree: true });
    scheduleScrollRefresh();

    return () => {
      observer.disconnect();
      section.removeEventListener('load', scheduleScrollRefresh, true);
      matchMedia.revert();
      delete section.dataset.motion;
      delete section.dataset.progress;
      delete section.dataset.headerTone;
    };
  }, [id, kind]);

  return { sectionRef, pinRef };
}
