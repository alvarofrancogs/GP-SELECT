import { contactConfig, showContactPreview } from '../config/contact';
import { useLanguage } from '../i18n/useLanguage';

export function DirectContact() {
  const { copy } = useLanguage();
  const text = copy.interiors.contact;
  const { whatsapp, phone, email } = contactConfig;
  const preview = showContactPreview && !whatsapp;
  if (!showContactPreview && !whatsapp && !phone && !email) return null;

  return (
    <aside className="direct-contact" aria-label={text.directLabel}>
      <p className="type-label">{text.directLabel}</p>
      {whatsapp || preview ? <div className="direct-contact__whatsapp">
        <h2 className="type-section">{text.whatsappTitle}</h2>
        <p className="type-body">{text.whatsappBody}</p>
        {whatsapp ? <a className="editorial-link type-ui" href={`https://wa.me/${whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noreferrer">
          {text.whatsappCta}<span aria-hidden="true">→</span>
        </a> : <button className="editorial-link type-ui" type="button" disabled>
          {text.whatsappCta}<span aria-hidden="true">→</span>
        </button>}
        {preview ? <p className="direct-contact__preview type-ui">DEV · src/config/contact.ts</p> : null}
      </div> : null}
      <dl className="direct-contact__channels type-ui">
        {phone ? <div><dt>{text.phoneLabel}</dt><dd><a className="type-numeric" href={`tel:${phone.replace(/[^\d+]/g, '')}`}>{phone}</a></dd></div> : null}
        {email ? <div><dt>{text.emailLabel}</dt><dd><a href={`mailto:${email}`}>{email}</a></dd></div> : null}
      </dl>
    </aside>
  );
}
