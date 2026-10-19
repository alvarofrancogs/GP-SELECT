import { ScrollTrigger } from 'gsap/ScrollTrigger';

let timer = 0;

// The language fade (LanguageSwitcher.tsx). A refresh takes every pin out of the page and puts it back,
// which restarted the fade-in: the new lettering showed, vanished and faded in a second time.
const languageFading = () => document.documentElement.matches('.lang-out, .lang-in');

/**
 * One shared, debounced ScrollTrigger.refresh(). Every scene asks for a refresh when fonts or layout
 * settle; a refresh recalculates every pin, so they must be coalesced into a single one.
 * It is a safe refresh: while the visitor scrolls, it waits for the scroll to end. A refresh scrolls
 * to the top and back, which on phones stopped the finger's momentum and moved the scenes.
 */
export function scheduleScrollRefresh() {
  window.clearTimeout(timer);
  timer = window.setTimeout(() => {
    if (languageFading()) scheduleScrollRefresh();
    else ScrollTrigger.refresh(true);
  }, 120);
}

/** Fonts that are already loaded do not change layout: only ask for a refresh while they still load. */
export function refreshAfterFonts() {
  if (document.fonts.status === 'loaded') return;
  void document.fonts.ready.then(scheduleScrollRefresh);
}

/** ResizeObserver reports the initial size right away; only later changes need a refresh. */
export function observeResize(element: Element) {
  let first = true;
  const observer = new ResizeObserver(() => {
    if (first) { first = false; return; }
    scheduleScrollRefresh();
  });
  observer.observe(element);
  return observer;
}
