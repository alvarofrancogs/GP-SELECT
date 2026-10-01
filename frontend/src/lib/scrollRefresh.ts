import { ScrollTrigger } from 'gsap/ScrollTrigger';

let timer = 0;

/**
 * One shared, debounced ScrollTrigger.refresh(). Every scene asks for a refresh when fonts, images
 * or layout settle; a refresh recalculates every pin, so they must be coalesced into a single one.
 */
export function scheduleScrollRefresh() {
  window.clearTimeout(timer);
  timer = window.setTimeout(() => ScrollTrigger.refresh(), 120);
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
