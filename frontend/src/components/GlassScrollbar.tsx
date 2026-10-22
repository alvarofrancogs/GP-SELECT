import { useEffect, useRef } from 'react';
import { scrollToY } from '../lib/scrollToTop';
import '../styles/glass-scrollbar.css';

const MIN_THUMB = 56; // px: still easy to grab on very long pages
const IDLE = 1300; // ms without scrolling or hovering before the bar fades

/** A glass scrollbar for mouse users. The native scroll still moves the page (keyboard, wheel, assistive
    tech and the scrubbed scenes all keep working); this bar mirrors it, can be dragged, and a click on the
    track glides there. Touch screens keep their own scrollbar (glass-scrollbar.css). */
export function GlassScrollbar() {
  const trackRef = useRef<HTMLDivElement>(null);
  const thumbRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const track = trackRef.current;
    const thumb = thumbRef.current;
    if (!track || !thumb) return;

    let frame = 0;
    let idle = 0;
    let hovered = false;
    let drag: { pointer: number; startY: number; startScroll: number } | null = null;
    let thumbHeight = MIN_THUMB;

    const range = () => document.documentElement.scrollHeight - window.innerHeight;
    const travel = () => track.clientHeight - thumbHeight;

    const render = () => {
      const max = range();
      track.toggleAttribute('data-empty', max <= 1);
      thumbHeight = Math.max(MIN_THUMB, track.clientHeight * (window.innerHeight / (max + window.innerHeight)));
      thumb.style.height = `${thumbHeight}px`;
      const ratio = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
      thumb.style.transform = `translate3d(0, ${ratio * travel()}px, 0)`;
    };
    const schedule = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(render); };

    // Visible while the page moves, while hovered or dragged; fades a moment after that.
    const wake = () => {
      track.setAttribute('data-visible', '');
      window.clearTimeout(idle);
      if (!hovered && !drag) idle = window.setTimeout(() => track.removeAttribute('data-visible'), IDLE);
    };
    const onScroll = () => { schedule(); wake(); };

    const onEnter = () => { hovered = true; wake(); };
    const onLeave = () => { hovered = false; wake(); };
    // Where the light enters the glass follows the cursor along the thumb.
    const onHover = (event: PointerEvent) => {
      const box = thumb.getBoundingClientRect();
      thumb.style.setProperty('--glass-y', `${Math.min(100, Math.max(0, ((event.clientY - box.top) / box.height) * 100))}%`);
    };

    const onThumbDown = (event: PointerEvent) => {
      if (event.button !== 0) return;
      event.preventDefault();
      event.stopPropagation();
      drag = { pointer: event.pointerId, startY: event.clientY, startScroll: window.scrollY };
      thumb.setPointerCapture(event.pointerId);
      track.setAttribute('data-dragging', '');
      wake();
    };
    const onThumbMove = (event: PointerEvent) => {
      if (!drag || event.pointerId !== drag.pointer) return;
      const scale = travel() > 0 ? range() / travel() : 0;
      window.scrollTo({ top: drag.startScroll + (event.clientY - drag.startY) * scale, behavior: 'instant' });
    };
    const onThumbUp = (event: PointerEvent) => {
      if (!drag || event.pointerId !== drag.pointer) return;
      drag = null;
      track.removeAttribute('data-dragging');
      wake();
    };
    // A click on the track glides there, the thumb centred on the pointer.
    const onTrackDown = (event: PointerEvent) => {
      if (event.button !== 0 || event.target === thumb) return;
      const box = track.getBoundingClientRect();
      const ratio = travel() > 0 ? (event.clientY - box.top - thumbHeight / 2) / travel() : 0;
      scrollToY(Math.min(1, Math.max(0, ratio)) * range());
    };

    render();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', schedule);
    // Pins, images and route changes alter the page height without a scroll or a resize.
    const resized = new ResizeObserver(schedule);
    resized.observe(document.body);
    track.addEventListener('pointerenter', onEnter);
    track.addEventListener('pointerleave', onLeave);
    track.addEventListener('pointerdown', onTrackDown);
    thumb.addEventListener('pointermove', onHover);
    thumb.addEventListener('pointerdown', onThumbDown);
    thumb.addEventListener('pointermove', onThumbMove);
    thumb.addEventListener('pointerup', onThumbUp);
    thumb.addEventListener('pointercancel', onThumbUp);
    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(idle);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', schedule);
      resized.disconnect();
      track.removeEventListener('pointerenter', onEnter);
      track.removeEventListener('pointerleave', onLeave);
      track.removeEventListener('pointerdown', onTrackDown);
      thumb.removeEventListener('pointermove', onHover);
      thumb.removeEventListener('pointerdown', onThumbDown);
      thumb.removeEventListener('pointermove', onThumbMove);
      thumb.removeEventListener('pointerup', onThumbUp);
      thumb.removeEventListener('pointercancel', onThumbUp);
    };
  }, []);

  // Decorative for assistive tech: the page keeps its native, accessible scroll.
  return (
    <div ref={trackRef} className="glass-scrollbar" aria-hidden="true">
      <div ref={thumbRef} className="glass-scrollbar__thumb" />
    </div>
  );
}
