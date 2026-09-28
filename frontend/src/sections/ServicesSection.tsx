import { useId, useLayoutEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { servicesAssets } from '../assets/servicesAssets';
import { AssetSlot } from '../components/AssetSlot';
import { Button } from '../components/Button';
import { servicesCopy, type ServiceId } from '../i18n/servicesCopy';
import { useLanguage } from '../i18n/useLanguage';

gsap.registerPlugin(ScrollTrigger);

export function ServicesSection() {
  const { locale } = useLanguage();
  const copy = servicesCopy[locale];
  const [activeService, setActiveService] = useState<ServiceId | null>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const mediaRef = useRef<HTMLDivElement>(null);
  const instanceId = useId();

  useLayoutEffect(() => {
    const section = sectionRef.current;
    const media = mediaRef.current;
    if (!section || !media) return;

    const matchMedia = gsap.matchMedia();
    matchMedia.add('(prefers-reduced-motion: no-preference) and (min-height: 600px)', () => {
      const select = gsap.utils.selector(section);
      // Natural flow is the curtain: no extra pin or fixed accordion height.
      const entrance = gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: {
          id: 'services-enter',
          trigger: section,
          start: 'top bottom',
          end: 'top top',
          scrub: 0.4,
          invalidateOnRefresh: true,
        },
      });
      entrance.to({}, { duration: 1 }, 0);
      entrance.fromTo(select('.services-eyebrow'),
        { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 0.3 }, 0.08);
      entrance.fromTo(select('.services-title > span'),
        { opacity: 0, y: 28, filter: 'blur(8px)' },
        { opacity: 1, y: 0, filter: 'blur(0px)', duration: 0.32, stagger: 0.08 }, 0.22);
      entrance.fromTo(select('.services-description, .service-item'),
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.24, stagger: 0.055 }, 0.4);
      entrance.fromTo(select('.services-visual'),
        { '--services-reveal': '-15%' },
        { '--services-reveal': '115%', duration: 0.65 }, 0.1);

      // One timeline owns the media transform throughout entry, reading and exit.
      const travel = gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: {
          id: 'services-travel', trigger: section,
          start: 'top bottom', end: 'bottom top', scrub: 0.4,
          invalidateOnRefresh: true,
        },
      });
      travel.fromTo(media, { yPercent: -2 }, { yPercent: 2, duration: 1 }, 0);

      const exit = gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: {
          id: 'services-exit', trigger: section,
          start: 'bottom 85%', end: 'bottom top', scrub: 0.4,
          invalidateOnRefresh: true,
        },
      });
      // Keep the paper opaque; only the departing composition recedes.
      exit.fromTo(select('.services-grid'),
        { opacity: 1 }, { opacity: 0.55, duration: 1 }, 0);
      // Inventory owns its incoming heading; this timeline only owns Services.
    }, section);

    let frame = 0;
    // An expanded answer changes section height and all following trigger offsets.
    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => ScrollTrigger.refresh());
    });
    observer.observe(section);

    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
      matchMedia.revert();
    };
  }, []);

  return (
    <section id="servicios" ref={sectionRef} className="services-section" aria-labelledby={`${instanceId}-title`}>
      <div className="services-grid">
        <div className="services-content">
          <p className="services-eyebrow">{copy.eyebrow}<span aria-hidden="true" /></p>
          <h2 id={`${instanceId}-title`} className="services-title">
            <span>{copy.title}</span>
            <span className="services-title__fine">{copy.titleFine}</span>
          </h2>
          <p className="services-description">{copy.description}</p>
          <div className="services-accordion">
            {copy.items.map((item) => {
              const expanded = activeService === item.id;
              const buttonId = `${instanceId}-${item.id}-button`;
              const panelId = `${instanceId}-${item.id}-panel`;

              return (
                <div className="service-item" key={item.id}>
                  <h3>
                    <button id={buttonId} type="button" className="service-toggle" aria-expanded={expanded}
                      aria-controls={panelId} onClick={() => setActiveService(expanded ? null : item.id)}>
                      <span>{item.title}</span>
                      <span className="service-toggle__icon" aria-hidden="true">{expanded ? '−' : '+'}</span>
                    </button>
                  </h3>
                  <div id={panelId} className="service-answer" role="region" aria-labelledby={buttonId} hidden={!expanded}>
                    <p>{item.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <div className="services-visual">
          <div ref={mediaRef} className="services-media" data-service-asset={activeService ?? 'overview'}>
            <div className="services-media__layer services-media__overview" aria-hidden={activeService !== null}>
              <AssetSlot asset={servicesAssets.overview} label={copy.image} />
            </div>
            {copy.items.map((item) => (
              <div key={item.id} className="services-media__layer" data-active={activeService === item.id}
                aria-hidden={activeService !== item.id}>
                <AssetSlot asset={servicesAssets[item.id]} label={item.image} />
              </div>
            ))}
          </div>
        </div>
        <div className="services-cta">
          <Button to="/vehiculos" variant="light">{copy.cta}</Button>
        </div>
      </div>
    </section>
  );
}
