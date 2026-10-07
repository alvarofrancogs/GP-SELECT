import { useLayoutEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { refreshAfterFonts, scheduleScrollRefresh } from '../lib/scrollRefresh';

gsap.registerPlugin(ScrollTrigger);

// Pin length in viewport heights; afterwards the scene leaves with the page.
const DISTANCE = 4.9;
// Gap between the headlines, as a multiple of the car width, plus a margin per side.
const GAP_FACTOR = 1.3;
const GAP_MARGIN = 24;
// The car fills the middle three quarters of its box; the rest is room for its shadow.
const CAR_SHARE = 0.75;
// Share of the box height above the car's nose.
const NOSE_INSET = 0.055;
// The car comes in closer to the camera and shrinks to its parked size as it flies off. Unlike
// a jet's narrow nose, a car is wide all along, so side by side it starts exactly as wide as the
// lane the headlines are fitted around (GAP_FACTOR) and never covers them, in every language
// (stacked: below the lettering). Measuring the words instead made its size change with the language.
const CAR_FROM = { sideBySide: GAP_FACTOR, stacked: 1.25 };
// Photograph mask height (% of the box): whole at the start, gone at the end.
const CURTAIN_FROM = 240;
// The scene in viewport heights of scroll, after Jesko Jets' jet: it rises with the scroll,
// shrinks with an accelerating ease, parks, and a soft curtain turns the photograph into the plan.
const AT = {
  shown: 0.68, // Process has handed over the frame
  rise: 0.7,
  shrink: [0.7, 3.1],
  curtain: [3.1, 4.15],
  weather: [1.5, 4.15],
  ink: 3.5,
};

const STACKED = '(max-width: 1023px)';

/** Shrinks a word from its CSS size (the hero's) only when it does not fit its room. */
function fitWord(word: HTMLElement, room: number) {
  word.style.fontSize = '';
  const width = word.getBoundingClientRect().width;
  if (width > room) {
    word.style.fontSize = `${Math.floor(parseFloat(getComputedStyle(word).fontSize) * room / width)}px`;
  }
}

/** Each headline word takes the largest size of the hero recipe that fits its lane beside the car. */
function fitHeadlines(section: HTMLElement) {
  const car = section.querySelector<HTMLElement>('[data-car]');
  if (!car) return;
  const stacked = window.matchMedia(STACKED).matches;
  const center = section.clientWidth / 2;
  const half = (car.offsetWidth * CAR_SHARE * GAP_FACTOR) / 2 + GAP_MARGIN;
  let side = Infinity;

  section.querySelectorAll<HTMLElement>('[data-headline]').forEach((headline) => {
    const box = headline.getBoundingClientRect();
    const layout = headline.closest<HTMLElement>('[data-layout]')?.dataset.layout;
    const [left, right] = headline.querySelectorAll<HTMLElement>('[data-word]');
    // Lanes measured from the section edges, so a stacked headline gets the whole side.
    const leftLane = center - half - box.left;
    const rightLane = box.right - (center + half);
    if (stacked) {
      fitWord(left, box.width);
      fitWord(right, box.width);
      return;
    }
    if (layout === 'split') side = Math.min(side, leftLane);
    fitWord(left, layout === 'right' ? rightLane : leftLane);
    fitWord(right, layout === 'left' ? leftLane : rightLane);
  });
  // Supporting lines never cross into the car's lane.
  section.style.setProperty('--handoff-side', stacked ? 'none' : `${Math.floor(side)}px`);
}

export function useCarHandoffScene(locale: string) {
  const sectionRef = useRef<HTMLElement>(null);
  const pinRef = useRef<HTMLDivElement>(null);

  // New copy is fitted in the same commit, before the language crossfade takes its snapshot:
  // waiting for the next refresh left the new words at the old ones' size and then made them jump.
  useLayoutEffect(() => {
    if (sectionRef.current) fitHeadlines(sectionRef.current);
  }, [locale]);

  useLayoutEffect(() => {
    const section = sectionRef.current;
    const pin = pinRef.current;
    if (!section || !pin) return;

    const fit = () => fitHeadlines(section);
    ScrollTrigger.addEventListener('refreshInit', fit);
    fit();

    const media = gsap.matchMedia();
    media.add({
      // Re-run when the layout switches between stacked and side by side.
      desktop: '(min-width: 1024px)',
      reduced: '(prefers-reduced-motion: reduce)',
      enoughHeight: '(min-height: 600px)',
    }, (context) => {
      const { desktop, reduced, enoughHeight } = context.conditions!;
      section.dataset.motion = reduced || !enoughHeight ? 'static' : 'scroll';
      if (reduced || !enoughHeight) {
        // Two still frames: dark lettering over the bright one, white over the overcast one,
        // switched when a frame reaches the middle of the header.
        const headerLine = () => `${(document.querySelector('.site-header')?.clientHeight ?? 0) / 2}px`;
        section.querySelectorAll<HTMLElement>('.car-handoff__panel').forEach((panel, index) => {
          ScrollTrigger.create({
            trigger: panel,
            start: () => `top ${headerLine()}`,
            end: () => `bottom ${headerLine()}`,
            onToggle: ({ isActive }) => {
              if (isActive) section.dataset.headerTone = index === 0 ? 'light' : 'dark';
              else if (section.dataset.headerTone === (index === 0 ? 'light' : 'dark')) section.dataset.headerTone = '';
            },
          });
        });
        return;
      }

      const select = gsap.utils.selector(section);
      const car = select('[data-car]')[0] as HTMLElement;
      const photo = select('[data-car-photo]')[0] as HTMLElement;
      const lines = (state: string) => select(`[data-text="${state}"] [data-line]`);
      const vh = () => pin.clientHeight;
      // Half the header: the point where Services starts covering it.
      let headerHalf = 0;
      const measureHeader = () => { headerHalf = (document.querySelector('.site-header')?.clientHeight ?? 0) / 2; };
      ScrollTrigger.addEventListener('refreshInit', measureHeader);
      measureHeader();
      const carFrom = desktop ? CAR_FROM.sideBySide : CAR_FROM.stacked;
      // The nose starts just below the frame, with the car at its start scale around its centre.
      const startY = () => vh() - car.offsetTop
        - (car.offsetHeight * (1 - carFrom)) / 2 - car.offsetHeight * carFrom * NOSE_INSET;

      const trigger = {
        trigger: section,
        start: 'top top',
        end: () => `+=${vh() * DISTANCE}`,
        invalidateOnRefresh: true,
      };

      // Scene timeline, in viewport heights: weather, light, lettering and CTA.
      const scene = gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: {
          ...trigger,
          id: 'scene-car-handoff',
          pin,
          pinSpacing: true,
          anticipatePin: 1,
          scrub: 0.5,
          onUpdate: ({ progress }) => { section.dataset.progress = progress.toFixed(4); },
        },
      });
      scene.to({}, { duration: DISTANCE }, 0);

      const enter = (targets: gsap.TweenTarget, at: number) => scene.fromTo(targets,
        { autoAlpha: 0, yPercent: 30, filter: 'blur(10px)' },
        { autoAlpha: 1, yPercent: 0, filter: 'blur(0px)', duration: 0.27, stagger: 0.054, ease: 'power3.out' }, at);
      const leave = (targets: gsap.TweenTarget, at: number) => scene.to(targets,
        { autoAlpha: 0, yPercent: -20, filter: 'blur(8px)', duration: 0.18, stagger: 0.036 }, at);

      enter(lines('a'), 0.55);
      // Once the car has parked, the first headline drops out of the frame behind it, a little
      // faster than the scroll, as if the car flew on and left it behind (Jesko's «Fly in / Luxury»).
      // Stacked above the car, it leaves through the top instead, as Jesko's mobile layout does,
      // fading before it reaches the header.
      const stacked = () => window.matchMedia(STACKED).matches;
      scene.fromTo(select('[data-text="a"]'), { y: 0, autoAlpha: 1 }, {
        y: () => (stacked() ? -0.1 : 1) * vh(),
        autoAlpha: () => (stacked() ? 0 : 1),
        duration: 0.85,
      }, 1.85);
      enter(lines('b'), 2.6);
      leave(lines('b'), 3.25);
      enter(lines('interlude'), 3.6);
      leave(lines('interlude'), 4.0);
      // Weather closes in progressively: bright → overcast, and one light dims world and car together.
      const [weatherFrom, weatherTo] = AT.weather;
      scene.fromTo(select('[data-handoff-overcast]'), { opacity: 0 }, { opacity: 1, duration: weatherTo - weatherFrom }, weatherFrom);
      scene.fromTo(select('[data-handoff-grade]'), { backgroundColor: '#ffffff' },
        { backgroundColor: '#b9bfc9', duration: weatherTo - weatherFrom }, weatherFrom);
      // Ink over the bright sky, white over the overcast one: switched while no lettering is shown.
      scene.fromTo(section, { '--handoff-ink': '#101112' }, { '--handoff-ink': '#fffcf7', duration: 0.05 }, AT.ink);
      enter(lines('c'), 4.25);

      // Car timeline: same range, heavier scrub for some inertia. The world never moves, only the car.
      const cars = gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: { ...trigger, id: 'scene-car-handoff-cars', scrub: 1 },
      });
      cars.to({}, { duration: DISTANCE }, 0);
      // It rises at the speed of the scroll until it reaches its box, as if the page carried it…
      cars.fromTo(car, { y: startY }, { y: 0, duration: () => startY() / vh() }, AT.rise);
      // …while it shrinks slowly, then faster, as it flies away from the camera.
      const [shrinkFrom, shrinkTo] = AT.shrink;
      cars.fromTo(car, { scale: carFrom }, { scale: 1, duration: shrinkTo - shrinkFrom, ease: 'power3.in' }, shrinkFrom);
      // Curtain: the photograph's mask shrinks towards the nose and uncovers the cutaway little by little.
      // The mask height is a CSS variable tweened by GSAP (not written by hand), so it is restored
      // correctly whenever ScrollTrigger refreshes: a hand-written onUpdate left the photograph back
      // on screen after a refresh once the curtain had finished.
      const [curtainFrom, curtainTo] = AT.curtain;
      cars.fromTo(photo, { '--curtain': `${CURTAIN_FROM}%` }, {
        '--curtain': '0%',
        duration: curtainTo - curtainFrom,
        ease: 'power1.inOut',
      }, curtainFrom);

      // Header tone over the whole section, including the stretch where it leaves with the page.
      ScrollTrigger.create({
        trigger: section,
        start: 'top top',
        end: 'bottom top',
        invalidateOnRefresh: true,
        onUpdate: ({ start, end, scroll }) => {
          const at = (scroll() - start) / vh();
          const covered = end - scroll() <= headerHalf;
          const tone = at < AT.shown || covered ? '' : at < AT.ink ? 'light' : 'dark';
          if (section.dataset.headerTone !== tone) section.dataset.headerTone = tone;
        },
        onToggle: ({ isActive }) => { if (!isActive) section.dataset.headerTone = ''; },
      });

      return () => {
        ScrollTrigger.removeEventListener('refreshInit', measureHeader);
        photo.style.removeProperty('--curtain');
      };
    }, section);

    refreshAfterFonts();
    section.addEventListener('load', scheduleScrollRefresh, true);
    const observer = new MutationObserver(scheduleScrollRefresh);
    observer.observe(section, { characterData: true, subtree: true });
    scheduleScrollRefresh();

    return () => {
      observer.disconnect();
      section.removeEventListener('load', scheduleScrollRefresh, true);
      ScrollTrigger.removeEventListener('refreshInit', fit);
      media.revert();
      delete section.dataset.motion;
      delete section.dataset.progress;
      delete section.dataset.headerTone;
    };
  }, []);

  return { sectionRef, pinRef };
}
