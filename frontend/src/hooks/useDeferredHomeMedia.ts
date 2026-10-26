import { useEffect, useState, type RefObject } from 'react';

/** Native lazy loading sees pinned/overlapping scenes as nearby before their pins are built.
    Keep URLs out of the DOM until the hero has painted and its curtain is gone. A nearby scene
    can also start as soon as the curtain leaves (restored scroll or reduced motion). */
export function useDeferredHomeMedia(sectionRef: RefObject<HTMLElement | null>) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;
    let disposed = false;
    let painted = false;
    let nearby = false;
    let frame = 0;
    const release = () => {
      if (disposed || document.querySelector('.preloader') || (!painted && !nearby)) return;
      setReady(true);
      observer.disconnect();
      proximity?.disconnect();
    };
    const observer = new MutationObserver(release);
    const layout = section.closest('.site-layout');
    if (layout) observer.observe(layout, { childList: true });
    const proximity = typeof IntersectionObserver === 'undefined' ? null : new IntersectionObserver(([entry]) => {
      nearby = entry.isIntersecting;
      release();
    }, { rootMargin: '150% 0px' });
    proximity?.observe(section);

    const images = Array.from(document.querySelectorAll<HTMLImageElement>('#hero img'));
    void Promise.all(images.map((image) => image.decode().catch(() => undefined))).then(() => {
      if (disposed) return;
      frame = requestAnimationFrame(() => {
        frame = requestAnimationFrame(() => { painted = true; release(); });
      });
    });
    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      proximity?.disconnect();
    };
  }, [sectionRef]);

  return ready;
}
