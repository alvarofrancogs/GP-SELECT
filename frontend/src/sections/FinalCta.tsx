import { useLayoutEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { AssetSlot } from '../components/AssetSlot';
import { Button } from '../components/Button';
import { finalCtaCopy } from '../i18n/finalCtaCopy';
import { useLanguage } from '../i18n/useLanguage';
import { qualificationUrl } from '../lib/qualification';
import '../styles/final-cta.css';

gsap.registerPlugin(ScrollTrigger);

const vehicleAsset = { src: '/assets/temp/hero-car.svg', temporary: true };

export function FinalCta() {
  const { locale } = useLanguage();
  const copy = finalCtaCopy[locale];
  const sectionRef = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    const section = sectionRef.current;
    if (!section) return;
    const media = gsap.matchMedia();
    media.add('(prefers-reduced-motion: no-preference) and (min-height: 600px)', () => {
      const select = gsap.utils.selector(section);
      // Native flow: the dark closing scene rises after Inventory, without a pin.
      const entrance = gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: {
          id: 'final-cta-enter', trigger: section,
          start: 'top bottom', end: 'top 15%', scrub: 0.4,
          invalidateOnRefresh: true,
        },
      });
      entrance.fromTo(select('[data-final-line]'),
        { yPercent: 105 }, { yPercent: 0, duration: 0.55, stagger: 0.1 }, 0.08);
      entrance.fromTo(select('.final-cta__content > p, .final-cta__content > .button'),
        { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.3, stagger: 0.08 }, 0.45);
      entrance.fromTo(select('[data-final-media]'),
        { yPercent: 10, scale: 1.06 }, { yPercent: 0, scale: 1, duration: 1 }, 0);
    }, section);
    return () => media.revert();
  }, [locale]);

  return (
    <section ref={sectionRef} className="final-cta" aria-labelledby="final-cta-title" data-final-cta>
      <div className="final-cta__media" data-final-media>
        <AssetSlot asset={vehicleAsset} label={copy.asset} />
      </div>
      <div className="final-cta__content">
        <h2 id="final-cta-title">
          <span><span data-final-line>{copy.title}</span></span>
          <span><span data-final-line>{copy.subtitle}</span></span>
        </h2>
        <p>{copy.description.map((line) => <span key={line}>{line}</span>)}</p>
        <Button to={qualificationUrl({ intent: 'search', source: 'home-final-cta' })} variant="light" arrow={false}>
          {copy.cta}<span className="final-cta__arrow" aria-hidden="true">→</span>
        </Button>
      </div>
    </section>
  );
}
