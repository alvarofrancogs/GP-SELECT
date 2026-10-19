import { useRef, useState } from 'react';
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
  const [busy, setBusy] = useState(false);
  const searchRadio = useRef<HTMLInputElement>(null);
  const vehicle = (params.get('vehiculo')?.trim() || params.get('vehicle')?.trim() || '').slice(0, 200);
  const requested = params.get('intent');
  const path: LeadIntent = vehicle || requested === 'vehicle' ? 'vehicle' : requested === 'information' ? 'information' : 'search';
  const hasChannels = showContactPreview || Boolean(contactConfig.whatsapp || contactConfig.phone || contactConfig.email);
  const labels = { search: text.searchPath, vehicle: text.vehiclePath, information: text.informationPath };
  const intros = { search: text.searchIntro, vehicle: text.vehicleIntro, information: text.informationIntro };

  function selectPath(intent: LeadIntent) {
    if (busy) return;
    const updated = new URLSearchParams(params);
    updated.set('intent', intent);
    updated.delete('vehiculo');
    updated.delete('vehicle');
    setParams(updated, { replace: true, preventScrollReset: true });
  }

  return <article className="interior-page contact-page">
    <InteriorPageHeader {...text} />
    <fieldset className="contact-paths" disabled={busy}>
      <legend className="type-label">{text.pathsLabel}</legend>
      {(['search', 'vehicle', 'information'] as const).map((value) => <label key={value} className="contact-path">
        <input ref={value === 'search' ? searchRadio : undefined} type="radio" name="contact-path" value={value} checked={path === value}
          onChange={() => selectPath(value)} aria-controls="contact-panel" />
        <span className="type-heading">{labels[value]}</span><span className="contact-path__arrow" aria-hidden="true">→</span>
      </label>)}
    </fieldset>
    <div className={`contact-content${hasChannels ? ' contact-content--channels' : ''}`}>
      {hasChannels ? <div className="contact-content__direct"><DirectContact /></div> : null}
      <div id="contact-panel" className="contact-content__form">
        <p className="contact-introduction type-lede">{intros[path]}</p>
        <ContactForm configuration="contact" intent={path} vehicle={vehicle} onBusyChange={setBusy}
          onNewEnquiry={() => selectPath(path)} onSearch={() => { selectPath('search'); searchRadio.current?.focus(); }} />
        <section className="contact-next-section">
          <h2 className="type-heading">{text.nextTitle}</h2>
          <ol className={`contact-next type-body${path === 'search' ? ' contact-next--search' : ''}`}>
            {(path === 'search' ? text.nextSteps : text.enquirySteps).map((step) => <li key={step}>{step}</li>)}
          </ol>
        </section>
      </div>
    </div>
  </article>;
}
