import { useSearchParams } from 'react-router-dom';
import { InteriorPageHeader } from '../components/InteriorPageHeader';
import { ContactForm } from '../components/ContactForm';
import { DirectContact } from '../components/DirectContact';
import { contactConfig, showContactPreview } from '../config/contact';
import { useLanguage } from '../i18n/useLanguage';
import type { LeadIntent } from '../lib/submitLead';
import '../styles/interiors.css';

export function Contact() {
  const { copy } = useLanguage();
  const text = copy.interiors.contact;
  const [params, setParams] = useSearchParams();
  const intent = params.get('intent');
  const path: LeadIntent = intent === 'search' || intent === 'import' ? 'search' : 'vehicle';
  // Support both the public Spanish parameter and existing qualificationUrl links.
  const vehicle = (params.get('vehiculo') ?? params.get('vehicle') ?? '').slice(0, 200);
  const hasChannels = showContactPreview || Boolean(contactConfig.whatsapp || contactConfig.phone || contactConfig.email);

  function selectPath(next: LeadIntent) {
    const updated = new URLSearchParams(params);
    updated.set('intent', next);
    setParams(updated, { replace: true, preventScrollReset: true });
  }

  return (
    <article className="interior-page contact-page">
      <InteriorPageHeader {...text} />
      <fieldset className="contact-paths">
        <legend className="type-label">{text.pathsLabel}</legend>
        {(['vehicle', 'search'] as const).map((value) => (
          <label key={value} className="contact-path">
            <input type="radio" name="contact-path" value={value} checked={path === value} onChange={() => selectPath(value)} />
            <span className="type-heading">{value === 'vehicle' ? text.vehiclePath : text.searchPath}</span>
            <span className="contact-path__arrow" aria-hidden="true">→</span>
          </label>
        ))}
      </fieldset>
      <div className={`contact-content${hasChannels ? ' contact-content--channels' : ''}`}>
        <div className="contact-content__form">
          <p className="contact-introduction type-lede">{path === 'search' ? text.searchIntro : text.vehicleIntro}</p>
          <ContactForm key={vehicle} intent={path} vehicle={vehicle} />
        </div>
        <DirectContact />
      </div>
    </article>
  );
}
