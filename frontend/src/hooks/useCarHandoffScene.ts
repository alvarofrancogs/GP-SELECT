import { useLayoutEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

// Pin length in viewport heights. Services covers the last one as a paper curtain,
// so every state is complete and still before progress 1 - 1 / distance.
const DISTANCE = { desktop: 4.5, mobile: 3.5 };
// Gap between the headlines, as a multiple of the car width, plus a margin per side.
const GAP_FACTOR = 1.3;
const GAP_MARGIN = 24;
// Share of the car box visible above the viewport edge when it starts.
const NOSE_PEEK = 0.12;

const STACKED = '(max-width: 1023px)';

/** Shrinks a word from its CSS size (the hero's) only when it does not fit its room. */
function fitWord(word: HTMLElement, room: number) {
  word.style.fontSize = '';
  const width = word.getBoundingClientRect().width;
  if (width > room) {
    word.style.fontSize = `${Math.floor(parseFloat(getComputedStyle(word).fontSize) * room / width)}px`;
  }
}

/** Each headline word takes the largest size of the hero recipe that fits its side. */
function fitHeadlines(section: HTMLElement) {
  const car = section.querySelector<HTMLElement>('[data-car]');
  if (!car) return;
  const stacked = window.matchMedia(STACKED).matches;
  const center = section.clientWidth / 2;
  const half = (car.offsetWidth * GAP_FACTOR) / 2 + GAP_MARGIN;
  let side = Infinity;

  section.querySelectorAll<HTMLElement>('[data-headline]').forEach((headline) => {
    const box = headline.getBoundingClientRect();
    const [left, right] = headline.querySelectorAll<HTMLElement>('[data-word]');
    const leftRoom = stacked ? box.width : center - half - box.left;
    side = Math.min(side, leftRoom);
    fitWord(left, leftRoom);
    fitWord(right, stacked ? box.width : box.right - (center + half));
  });
  // The supporting line never crosses into the car's lane.
  section.style.setProperty('--handoff-side', stacked ? 'none' : `${Math.floor(side)}px`);
}

/** Largest start scale that keeps the car inside the measured gap between headlines. */
function startScale(section: HTMLElement, car: HTMLElement) {
  if (window.matchMedia(STACKED).matches) {
    return Math.min(1.3, (section.clientWidth * 0.9) / car.offsetWidth);
  }
  let gap = Infinity;
  section.querySelectorAll<HTMLElement>('[data-headline]').forEach((headline) => {
    const [left, right] = headline.querySelectorAll<HTMLElement>('[data-word]');
    gap = Math.min(gap, right.getBoundingClientRect().left - left.getBoundingClientRect().right);
  });
  return Math.max(1, Math.min(1.3, (gap - GAP_MARGIN * 2) / car.offsetWidth));
}

export function useCarHandoffScene() {
  const sectionRef = useRef<HTMLElement>(null);
  const pinRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const section = sectionRef.current;
    const pin = pinRef.current;
    if (!section || !pin) return;

    let disposed = false;
    let frame = 0;
    const refresh = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        if (!disposed) ScrollTrigger.refresh();
      });
    };
    const fit = () => fitHeadlines(section);
    ScrollTrigger.addEventListener('refreshInit', fit);
    fit();

    const media = gsap.matchMedia();
    media.add({
      desktop: '(min-width: 1024px)',
      reduced: '(prefers-reduced-motion: reduce)',
      enoughHeight: '(min-height: 600px)',
    }, (context) => {
      const { desktop, reduced, enoughHeight } = context.conditions!;
      section.dataset.motion = reduced || !enoughHeight ? 'static' : 'scroll';
      if (reduced || !enoughHeight) return;

      const select = gsap.utils.selector(section);
      const [carA, carB] = select('[data-car]') as HTMLElement[];
      const night = select('[data-handoff-night]');
      const lines = (state: string) => select(`[data-text="${state}"] [data-line]`);
      const distance = desktop ? DISTANCE.desktop : DISTANCE.mobile;
      const height = () => pin.clientHeight;
      // Measured once per refresh (after the headlines are fitted), shared by scale and y.
      let carStart = 1;
      const measure = () => { carStart = startScale(section, carA); };
      // Half the header: the point where Services (the curtain) starts covering it.
      let headerHalf = 0;
      const measureHeader = () => { headerHalf = (document.querySelector('.site-header')?.clientHeight ?? 0) / 2; };
      ScrollTrigger.addEventListener('refreshInit', measure);
      ScrollTrigger.addEventListener('refreshInit', measureHeader);
      measure();
      measureHeader();
      // Only the nose shows at the bottom edge, then the car climbs to its parked box.
      const startY = () => height() - carA.offsetTop - carA.offsetHeight * NOSE_PEEK * carStart;

      const trigger = {
        trigger: section,
        start: 'top top',
        end: () => `+=${window.innerHeight * distance}`,
        invalidateOnRefresh: true,
      };

      // Scene timeline: background, curtain, lettering and CTA.
      const scene = gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: {
          ...trigger,
          id: 'scene-car-handoff',
          pin,
          pinSpacing: true,
          anticipatePin: 1,
          scrub: 0.5,
          onUpdate: ({ progress, end, scroll }) => {
            section.dataset.progress = progress.toFixed(4);
            // The header reads this once the frame has taken over from Process,
            // until Services covers it.
            const covered = end - scroll() <= headerHalf;
            section.dataset.headerTone = progress < 0.15 || covered ? '' : progress < 0.34 ? 'light' : 'dark';
          },
        },
      });
      scene.to({}, { duration: 1 }, 0);

      const enter = (targets: gsap.TweenTarget, at: number) => scene.fromTo(targets,
        { autoAlpha: 0, yPercent: 30, filter: 'blur(10px)' },
        { autoAlpha: 1, yPercent: 0, filter: 'blur(0px)', duration: 0.07, stagger: 0.012, ease: 'power3.out' }, at);
      const leave = (targets: gsap.TweenTarget, at: number) => scene.to(targets,
        { autoAlpha: 0, yPercent: -20, filter: 'blur(8px)', duration: 0.05, stagger: 0.008 }, at);

      scene.fromTo(select('[data-handoff-cta]'), { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.07 }, 0.12);
      enter(lines('a'), 0.12);
      leave(lines('a'), 0.3);
      scene.fromTo(select('[data-handoff-shade]'), { opacity: 0 }, { opacity: 0.35, duration: 0.26 }, 0.04);
      scene.to(select('[data-handoff-shade]'), { opacity: 0.7, duration: 0.16 }, 0.3);
      // Night falls from the top, behind the car, with a soft lower edge: it covers
      // the header at 0.34, the headlines at ~0.4 and the centre at 0.42.
      scene.fromTo(night, { y: () => -height() * 1.25 }, { y: 0, duration: 0.2 }, 0.3);
      scene.fromTo(select('[data-handoff-map]'), { yPercent: -8, scale: 1.06 }, { yPercent: 0, scale: 1, duration: 0.38 }, 0.3);
      // Same elements, one colour variable: ink over the sky, white over the night.
      scene.fromTo(section, { '--handoff-ink': '#101112' }, { '--handoff-ink': '#fffcf7', duration: 0.04 }, 0.39);
      enter(lines('b'), 0.43);
      leave(lines('b'), 0.51);
      enter(lines('c'), 0.57);

      // Car timeline: same range, heavier scrub for a floating inertia.
      const cars = gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: { ...trigger, id: 'scene-car-handoff-cars', scrub: 1 },
      });
      cars.to({}, { duration: 1 }, 0);
      // B waits invisible on top of A (a set at time 0 would not render before the pin starts).
      gsap.set(carB, { autoAlpha: 0 });
      // One continuous forward drive for the shared box: nose at the bottom edge,
      // then always climbing until it parks, while the BMW dissolves into the RS Q3.
      cars.fromTo([carA, carB],
        { y: startY, scale: () => carStart },
        { y: 0, scale: 1, duration: 0.7, ease: 'power1.out' }, 0);
      cars.to(carB, { autoAlpha: 1, duration: 0.16 }, 0.4);
      cars.to(carA, { autoAlpha: 0, duration: 0.08 }, 0.52);

      return () => {
        ScrollTrigger.removeEventListener('refreshInit', measure);
        ScrollTrigger.removeEventListener('refreshInit', measureHeader);
      };
    }, section);

    void document.fonts.ready.then(() => { if (!disposed) refresh(); });
    section.addEventListener('load', refresh, true);
    const observer = new MutationObserver(refresh);
    observer.observe(section, { characterData: true, subtree: true });
    refresh();

    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      section.removeEventListener('load', refresh, true);
      ScrollTrigger.removeEventListener('refreshInit', fit);
      media.revert();
      delete section.dataset.motion;
      delete section.dataset.progress;
      delete section.dataset.headerTone;
    };
  }, []);

  return { sectionRef, pinRef };
}
