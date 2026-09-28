import { europeAssets } from '../assets/europeAssets';
import { AssetSlot } from '../components/AssetSlot';
import { Button } from '../components/Button';
import { useEuropeScene } from '../hooks/useEuropeScene';
import { europeCopy } from '../i18n/europeCopy';
import { useLanguage } from '../i18n/useLanguage';
import '../styles/europe.css';

export function EuropeSection() {
  const { locale } = useLanguage();
  const copy = europeCopy[locale];
  const { sectionRef, pinRef } = useEuropeScene();

  return (
    <section id="europa" ref={sectionRef} className="europe-section" data-scene="europe" aria-labelledby="europe-title">
      <div ref={pinRef} className="europe-pin" data-scene-pin>
        <div className="europe-background" aria-hidden="true" />
        <div className="europe-heading" data-europe-heading>
          <p className="europe-eyebrow eyebrow">{copy.eyebrow}</p>
          <h2 id="europe-title" className="europe-title">
            <span>{copy.title}</span>
            <span>{copy.subtitle}</span>
          </h2>
          <p className="europe-description">
            {copy.description.map((line) => <span key={line}>{line}</span>)}
          </p>
        </div>
        <div className="europe-vehicle" data-europe-vehicle>
          <AssetSlot asset={europeAssets.vehicle} label={copy.vehicleAsset} />
        </div>
        <div className="europe-map" data-europe-map>
          <AssetSlot asset={europeAssets.map} label={copy.mapAsset} />
        </div>
        <ul className="europe-countries" aria-label={copy.countriesLabel}>
          {copy.countries.map((country, index) => <li key={index} data-europe-country>{country}</li>)}
        </ul>
        <div className="europe-cta">
          <Button to="/vehiculos" variant="outline">{copy.cta}</Button>
        </div>
      </div>
    </section>
  );
}
