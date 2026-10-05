import { useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import type { VehicleImage } from '../types/vehicle';
import { useLanguage } from '../i18n/useLanguage';

export function VehicleGallery({ images, name }: { images: VehicleImage[]; name: string }) {
  const { copy } = useLanguage();
  const text = copy.vehicles;
  const [active, setActive] = useState(0);
  const [failed, setFailed] = useState<Set<string>>(new Set());
  const fail = (src: string) => setFailed((previous) => new Set(previous).add(src));
  const strip = useRef<HTMLDivElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const current = images[active];
  // Hidden slides are stacked in view, so native lazy loading would fetch every photo at full size.
  // A slide gets its photo once it is next to the visible one, and keeps it.
  const around = (index: number) => [index - 1, index, index + 1].map((i) => (i + images.length) % images.length);
  const [reached, setReached] = useState(() => new Set(around(0)));

  function show(index: number) {
    setActive(index);
    setReached((previous) => around(index).every((i) => previous.has(i)) ? previous : new Set([...previous, ...around(index)]));
  }
  function select(index: number) {
    const next = (index + images.length) % images.length;
    show(next);
    if (window.matchMedia('(max-width: 767px)').matches && strip.current) {
      // The strip uses native scrolling; paging never moves the document vertically.
      strip.current.scrollTo({ left: next * strip.current.clientWidth, behavior: 'instant' });
    }
  }
  function onKeyDown(event: KeyboardEvent) {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    select(active + (event.key === 'ArrowRight' ? 1 : -1));
  }
  if (!current) return <div className="vehicle-media-empty type-ui">{text.noImage}</div>;
  return <section className="vehicle-gallery" aria-label={text.gallery} onKeyDown={onKeyDown}>
    <div className="vehicle-gallery__stage" ref={strip} tabIndex={0} aria-label={text.gallery}
      onScroll={(event) => {
        if (!window.matchMedia('(max-width: 767px)').matches) return;
        const element = event.currentTarget;
        const index = Math.round(element.scrollLeft / element.clientWidth);
        if (index >= 0 && index < images.length) show(index);
      }}>
      {images.map((image, index) => {
        const ready = reached.has(index);
        return <figure key={`${image.src}-${index}`} className={`vehicle-gallery__slide${index === active ? ' is-active' : ''}`}>
          {failed.has(image.src) ? <div className="vehicle-media-empty type-ui">{text.noImage}</div> : <img src={ready ? image.src : undefined}
            srcSet={ready && image.smallSrc ? `${image.smallSrc} 800w, ${image.src} 2400w` : undefined}
            sizes={image.smallSrc ? '(max-width: 767px) 100vw, 66vw' : undefined} onError={() => fail(image.src)}
            alt={!ready || image.temporary ? '' : image.alt ?? `${name} · ${index + 1}`}
            style={{ objectFit: image.fit }} data-fit={image.fit}
            width={image.width ?? 1500} height={image.height ?? 1000} loading={index === 0 ? 'eager' : 'lazy'}
            fetchPriority={index === 0 ? 'high' : 'auto'} decoding="async" />}
        </figure>;
      })}
    </div>
    <div className="vehicle-gallery__caption type-ui">
      <p>{current.temporary ? copy.common.temporaryAsset : name}</p>
      <button type="button" className="editorial-link" onClick={() => dialog.current?.showModal()}>{text.enlarge}<span aria-hidden="true">→</span></button>
    </div>
    <div className="vehicle-gallery__controls type-ui">
      <button type="button" disabled={images.length < 2} aria-label={text.previous} onClick={() => select(active - 1)}>←</button>
      <p className="type-numeric" aria-live="polite" aria-atomic="true">{active + 1} / {images.length}</p>
      <button type="button" disabled={images.length < 2} aria-label={text.next} onClick={() => select(active + 1)}>→</button>
    </div>
    {images.length > 1 ? <div className="vehicle-gallery__thumbnails">{images.map((image, index) =>
      <button type="button" key={`${image.src}-${index}`} aria-current={active === index ? 'true' : undefined}
        aria-label={`${text.image} ${index + 1}`} onClick={() => select(index)}>
        <img src={image.smallSrc ?? image.src} alt="" style={{ objectFit: image.fit }} width={image.width ?? 150} height={image.height ?? 100} loading="lazy" onError={() => fail(image.src)} />
      </button>)}</div> : null}
    <dialog className="vehicle-gallery__dialog" ref={dialog} aria-label={`${text.gallery} · ${name}`}>
      <div className="vehicle-gallery__dialog-top type-ui"><p>{name}</p><button type="button" className="editorial-link" autoFocus onClick={() => dialog.current?.close()}>{text.close} ×</button></div>
      <img src={current.src} alt={current.temporary ? copy.common.temporaryAsset : current.alt ?? name}
        style={{ objectFit: current.fit }}
        width={current.width ?? 1500} height={current.height ?? 1000} loading="lazy" />
      {current.temporary ? <p className="type-ui">{copy.common.temporaryAsset}</p> : null}
      <div className="vehicle-gallery__controls type-ui"><button type="button" aria-label={text.previous} disabled={images.length < 2} onClick={() => select(active - 1)}>←</button><p className="type-numeric" aria-live="polite">{active + 1} / {images.length}</p><button type="button" aria-label={text.next} disabled={images.length < 2} onClick={() => select(active + 1)}>→</button></div>
    </dialog>
  </section>;
}
