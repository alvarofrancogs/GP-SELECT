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
  const selectedService = copy.items.find((item) => item.id === activeService);

  useLayoutEffect(() => {
    const section = sectionRef.current;
    const media = mediaRef.current;
    if (!section || !media) return;

    const matchMedia = gsap.matchMedia();
    matchMedia.add('(prefers-reduced-motion: no-preference)', () => {
      gsap.fromTo(media, { yPercent: -2 }, {
        yPercent: 2,
        ease: 'none',
        scrollTrigger: {
          id: 'services-media',
          trigger: section,
          start: 'top bottom',
          end: 'bottom top',
          scrub: true,
          invalidateOnRefresh: true,
        },
      });
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
            <AssetSlot asset={servicesAssets[activeService ?? 'overview']} label={selectedService?.image ?? copy.image} />
          </div>
        </div>
        <div className="services-cta">
          <Button to="/vehiculos" variant="light">{copy.cta}</Button>
        </div>
      </div>
    </section>
  );
}
