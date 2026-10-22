import { useLayoutEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { refreshAfterFonts, scheduleScrollRefresh } from '../lib/scrollRefresh';
import { TOUCH_MOTION, blur } from '../lib/touchMotion';

gsap.registerPlugin(ScrollTrigger);

export type SceneKind = 'hero' | 'process';

// Scroll per scene, in viewports: 15 % shorter since 17-10-2026 (it took too much scrolling), and on phones
// shorter again after the user tried it on an iPhone the same day. The hero grew back a little on 22-10-2026
// so its car could take 20 % more scroll (the user wanted it "harder") without finishing in the dark.
const scrollDistance: Record<SceneKind, { desktop: number; mobile: number }> = {
  hero: { desktop: 2.28, mobile: 1.29 },
  process: { desktop: 2.55, mobile: 1.6 },
};

// Scrub smoothing in seconds: the car scene carries more inertia than lettering.
const scrubLag: Record<SceneKind, number> = { hero: 0.7, process: 0.5 };
// A finger's own momentum already smooths the scroll: with the full lag, the lettering kept drifting after it.
const TOUCH_LAG = 0.5;

// Rolling entrance: the rear quarter starts outside the right edge, then the whole car
// centres over a stationary floor. Translation and wheel rotation share this exact interval.
// The roll takes 0.92 viewports of scroll on desktop and 0.225 on phones/tablets, where Process starts
// rising at 0.29 viewports (0.22 of their pin): the car is in by 0.18.
const HERO_ROLL = { desktop: { start: 0.0466, duration: 0.4026 }, mobile: { start: 0.0097, duration: 0.1744 } };
// Scrub smoothing for the car alone, in seconds. Firm on purpose: the user found any glide "soft", so the
// car stays close to the scroll and stops with it (just enough smoothing to hide wheel notches).
const HERO_ROLL_LAG = 0.25;

// Change ink and its contrast backing together: the wall's bright and dark patches
// have no shared AA crossover. Fading a dark backing in under black ink would make it worse.
const HERO_TONE = { light: 0.45, dark: 0.29 };
const HERO_HEADER_SUPPORT = { opacity: 0.28, end: 0.52 };

function heroHeaderSupport(darkness: number) {
  if (darkness < HERO_TONE.dark) return 0;
  return HERO_HEADER_SUPPORT.opacity * Math.max(0,
    (HERO_HEADER_SUPPORT.end - darkness) / (HERO_HEADER_SUPPORT.end - HERO_TONE.dark));
}
// The hero is fully darkened by the time Process starts to rise over it (scroll distance, in viewports).
// Process rises over the hero's last viewport, so this moves with the scene's length (the same share of it on phones).
const HERO_DARKEN_BY = { desktop: 1.23, mobile: 0.84 };
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
        touch: TOUCH_MOTION,
      },
      (context) => {
        const { desktop, reducedMotion, enoughHeight, touch } = context.conditions!;
        const select = gsap.utils.selector(section);
        const media = select('[data-scene-media]');
        const wheels = select('[data-hero-wheel]');
        const titles = select('[data-scene-title]');
        const ui = select('[data-scene-ui]');
        const handoff = select('[data-scene-handoff]');
        const words = select('[data-process-word]');

        section.dataset.motion = reducedMotion || !enoughHeight ? 'static' : 'scroll';
        section.dataset.progress = '0';
        if (kind === 'hero') {
          delete section.dataset.headerTone;
          delete section.dataset.headerSupport;
        }

        // Short landscape viewports also use the readable, unpinned layout.
        if (reducedMotion || !enoughHeight) {
          if (words.length) gsap.set(words, { opacity: 1, filter: 'none' });
          return;
        }

        const distance = scrollDistance[kind][desktop ? 'desktop' : 'mobile'];
        // The pin's own height (the large viewport, scenes.css), not innerHeight: on phones innerHeight changes
        // with the URL bar while the CSS overlaps do not, and the scenes came apart.
        const stage = () => pin.offsetHeight;
        const timeline = gsap.timeline({
          defaults: { ease: 'none' },
          scrollTrigger: {
            id: `scene-${id}`,
            trigger: section,
            pin,
            start: 'top top',
            end: () => `+=${stage() * distance}`,
            scrub: scrubLag[kind] * (touch ? TOUCH_LAG : 1),
            pinSpacing: true,
            // Process starts with its words already placed: pre-pinning would make them jump.
            anticipatePin: kind === 'process' ? 0 : 1,
            // While fixed, the scene's layers may reach below the pin (scenes.css, phone toolbars).
            toggleClass: { targets: pin, className: 'is-pinned' },
            invalidateOnRefresh: true,
            onUpdate: (trigger) => {
              section.dataset.progress = trigger.progress.toFixed(4);
            },
          },
        });

        // All timings below are fractions of a single, reversible scene.
        timeline.to({ progress: 0 }, { progress: 1, duration: 1 }, 0);

        if (kind === 'hero') {
          if (media.length) {
            // Read layout only when GSAP initialises/refreshes, never integrate frame deltas.
            // CSS supplies the initial left; a centred finish also fits narrow/mobile viewports.
            const travel = () => {
              const layout = getComputedStyle(media[0]);
              return (pin.clientWidth - parseFloat(layout.width)) / 2 - parseFloat(layout.left);
            };
            // The car has its own, heavier scrub: it trails the scroll and settles, so it feels weighty.
            // Car and wheels stay on that one timeline, so the tires never slip.
            const roll = HERO_ROLL[desktop ? 'desktop' : 'mobile'];
            const rolling = gsap.timeline({
              defaults: { ease: 'none' },
              scrollTrigger: {
                trigger: section, start: 'top top', invalidateOnRefresh: true,
                end: () => `+=${stage() * distance}`,
                scrub: HERO_ROLL_LAG * (touch ? TOUCH_LAG : 1),
              },
            });
            rolling.to({}, { duration: 1 }, 0);
            rolling.to(media, { x: travel, duration: roll.duration }, roll.start);
            wheels.forEach((wheel) => {
              rolling.to(wheel, {
                rotation: () => travel() / (Math.PI * parseFloat(getComputedStyle(wheel).width)) * 360,
                duration: roll.duration,
              }, roll.start);
            });
          }
          titles.forEach((title, index) => {
            timeline.to(title, {
              x: () => window.innerWidth * (index === 0 ? -0.18 : 0.12),
              yPercent: index === 0 ? -65 : -38,
              opacity: 0,
              ...blur(touch, 12),
              duration: 0.34,
            }, 0.12 + index * 0.04);
          });
          if (ui.length) timeline.to(ui, { autoAlpha: 0, y: -24, duration: 0.2 }, 0.15);
          // The garage is almost dark before the Process curtain reaches it: no bright photo under a dark page.
          // One timeline, without scrub lag, owns the dark layer's opacity over the whole pin (positions in
          // viewports of scroll). A second, lagging timeline on the same property used to leave it at 0.88
          // after a fast return to the top.
          const darken = handoff.length ? gsap.timeline({
            defaults: { ease: 'none' },
            scrollTrigger: {
              trigger: section, start: 'top top', scrub: true, invalidateOnRefresh: true,
              end: () => `+=${stage() * distance}`,
            },
          }) : null;
          if (darken) {
            const darkenBy = HERO_DARKEN_BY[desktop ? 'desktop' : 'mobile'];
            const fullyDarkFrom = Math.max(distance * 0.6, darkenBy);
            darken.to({}, { duration: distance }, 0);
            darken.fromTo(handoff, { opacity: 0 }, { opacity: 0.88, duration: darkenBy * 2 / 3 }, darkenBy / 3);
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
            const darkness = Number(gsap.getProperty(handoff[0] ?? section, 'opacity'));
            const tone = heroHeaderTone(timeline.progress(), darkness, processTop, headerHalf);
            const support = (tone === 'dark' ? heroHeaderSupport(darkness) : 0).toFixed(4);
            // Both writes reach the header in one MutationObserver batch, before the next paint.
            if (section.dataset.headerSupport !== support) section.dataset.headerSupport = support;
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
          gsap.set(words, { opacity: 0.26, ...blur(touch, 0.4) });
          gsap.set(words[0], { opacity: 1, ...blur(touch, 0) });
          // Animate the whole row so its number, word and detail share one envelope.
          // Equal dominant intervals: 0–18%, 18–36%, 36–54%, 54–72%.
          // Each continuous crossfade is centred on the boundary between steps.
          words.forEach((word, index) => {
            if (index > 0) {
              timeline.to(word, { opacity: 1, ...blur(touch, 0), duration: 0.16 }, index * 0.18 - 0.08);
            }
            if (index < words.length - 1) {
              timeline.to(word, { opacity: 0.26, ...blur(touch, 0.4), duration: 0.16 }, (index + 1) * 0.18 - 0.08);
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
              end: () => `+=${stage() * distance}`,
              scrub: true,
              invalidateOnRefresh: true,
            },
          });
          handoffTimeline.to({}, { duration: 1 }, 0);
          const list = words[0].parentElement;
          handoffTimeline.fromTo([list, ...ui], { y: () => stage() * PROCESS_LANDING }, {
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
            // Opacity keeps the scene readable by assistive technology before the handoff.
            handoffTimeline.fromTo(incoming, { opacity: 0 }, { opacity: 1, duration: 0.01 }, revealAt);
            if (veil) {
              handoffTimeline.fromTo(veil, { yPercent: 0 }, { yPercent: -100, duration: 1 - revealAt - 0.01, ease: 'power1.inOut' }, revealAt + 0.01);
            }
          }
        }
      },
      section,
    );

    // Fonts and translations may change the layout. Images do not: their boxes are sized by CSS, and a
    // refresh for each late image interrupted the scroll on phones.
    refreshAfterFonts();
    const observer = new MutationObserver(scheduleScrollRefresh);
    // Ignore child-list changes: ScrollTrigger temporarily reparents the pin on refresh.
    observer.observe(section, { characterData: true, subtree: true });
    scheduleScrollRefresh();

    return () => {
      observer.disconnect();
      matchMedia.revert();
      delete section.dataset.motion;
      delete section.dataset.progress;
      delete section.dataset.headerTone;
      delete section.dataset.headerSupport;
    };
  }, [id, kind]);

  return { sectionRef, pinRef };
}
