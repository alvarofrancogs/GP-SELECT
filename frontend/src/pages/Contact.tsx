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
  // Support both the public Spanish parameter and existing qualificationUrl links.
  const vehicle = (params.get('vehiculo') ?? params.get('vehicle') ?? '').slice(0, 200);
  // Only a vehicle link (or an explicit choice) asks for a vehicle; general contact starts on the open path.
  const path: LeadIntent = intent === 'vehicle' || (!intent && vehicle) ? 'vehicle' : 'search';
  const hasChannels = showContactPreview || Boolean(contactConfig.whatsapp || contactConfig.phone || contactConfig.email);

  // The address keeps the path and the catalogue car; changing them never resets what has been typed.
  function update(intent: LeadIntent, dropVehicle: boolean) {
    const updated = new URLSearchParams(params);
    updated.set('intent', intent);
    if (dropVehicle) {
      updated.delete('vehiculo');
      updated.delete('vehicle');
    }
    setParams(updated, { replace: true, preventScrollReset: true });
  }
  // Asking GP SELECT to find a car is not about the catalogue car the visitor came from.
  const selectPath = (next: LeadIntent) => update(next, next === 'search');
  // After a sent enquiry the next one starts without the previous car, on the same path.
  const newEnquiry = () => { if (vehicle) update(path, true); };

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
        {/* CSS exposes one contact slot at a time, keeping reading and focus order aligned. */}
        {hasChannels ? <div className="contact-content__direct-mobile"><DirectContact /></div> : null}
        <div className="contact-content__form">
          <p className="contact-introduction type-lede">{path === 'search' ? text.searchIntro : text.vehicleIntro}</p>
          {/* What happens after sending: the approved copy carries its own numbers. */}
          <ol className="contact-next type-body">{text.nextSteps.map((step) => <li key={step}>{step}</li>)}</ol>
          <ContactForm intent={path} vehicle={vehicle} onNewEnquiry={newEnquiry} />
        </div>
        <DirectContact />
      </div>
    </article>
  );
}
