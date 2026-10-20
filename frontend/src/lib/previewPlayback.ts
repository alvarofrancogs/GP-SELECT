export const PREVIEW_SECONDS = 10;
// Leave one second for timeupdate delivery and the existing fade back to the cover.
export const AUTOPLAY_PREVIEW_SECONDS = 4;

export function canAutoplay(): boolean {
  const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
  return !window.matchMedia('(prefers-reduced-motion: reduce)').matches && !connection?.saveData;
}

interface Candidate {
  id: string;
  ratio: number;
  rect: DOMRect;
}

export function pickCentered(candidates: Candidate[], viewportHeight: number): string | null {
  let chosen: string | null = null;
  let distance = Infinity;
  for (const { id, ratio, rect } of candidates) {
    if (ratio < 0.6) continue;
    const next = Math.abs(rect.top + rect.height / 2 - viewportHeight / 2);
    if (next < distance) { chosen = id; distance = next; }
  }
  return chosen;
}

interface Playback {
  play: () => void;
  stop: () => void;
}

interface CenteredController {
  register: (id: string, element: HTMLElement, playback: Playback) => () => void;
}

let centeredController: CenteredController | undefined;

/** Share observation across cards; release browser resources when the last card leaves. */
export function createCenteredController(): CenteredController {
  if (centeredController) return centeredController;
  const cards = new Map<string, Playback & { element: HTMLElement; ratio: number }>();
  let observer: IntersectionObserver | undefined;
  let selected: string | null = null;
  let frame: number | undefined;

  function choose() {
    const next = pickCentered(Array.from(cards, ([id, card]) => ({
      id, ratio: card.ratio, rect: card.element.getBoundingClientRect(),
    })), window.innerHeight);
    if (next === selected) return;
    if (selected !== null) cards.get(selected)?.stop();
    selected = next;
    if (next !== null) cards.get(next)?.play();
  }

  function scroll() {
    if (frame !== undefined) return;
    frame = window.requestAnimationFrame(() => { frame = undefined; choose(); });
  }

  centeredController = {
    register(id, element, playback) {
      if (!observer) {
        observer = new IntersectionObserver((entries) => {
          for (const entry of entries) {
            for (const card of cards.values()) {
              if (card.element === entry.target) card.ratio = entry.intersectionRatio;
            }
          }
          choose();
        }, { threshold: [0, 0.6, 1] });
        window.addEventListener('scroll', scroll, { passive: true });
      }
      const card = { ...playback, element, ratio: 0 };
      cards.set(id, card);
      observer.observe(element);
      return () => {
        if (cards.get(id) !== card) return;
        observer?.unobserve(element);
        if (selected === id) { card.stop(); selected = null; }
        cards.delete(id);
        if (cards.size) { choose(); return; }
        observer?.disconnect();
        observer = undefined;
        window.removeEventListener('scroll', scroll);
        if (frame !== undefined) window.cancelAnimationFrame(frame);
        frame = undefined;
      };
    },
  };
  return centeredController;
}
