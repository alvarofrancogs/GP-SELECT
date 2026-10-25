import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../i18n/useLanguage';
import { legalPaths, legalUi } from '../i18n/legalCopy';
import { startAnalytics, stopAnalytics } from '../lib/analytics';
import { setConsent, useConsent, type Consent } from '../lib/consent';
import '../styles/consent.css';

/** The analytics notice. Accept and Reject weigh the same; the page works the same either way. It also applies
    the saved choice on every load, and reopens from the footer so the choice can be changed as easily as it was given. */
export function ConsentBanner() {
  const { locale, href } = useLanguage();
  const { choice, editing } = useConsent();
  const copy = legalUi[locale].consent;
  const root = useRef<HTMLElement>(null);

  useEffect(() => {
    if (choice === 'granted') startAnalytics();
    else if (choice === 'denied') stopAnalytics();
  }, [choice]);

  // Reopened from the footer: keyboard focus goes into the notice.
  useEffect(() => {
    if (editing) root.current?.querySelector('button')?.focus();
  }, [editing]);

  if (choice !== null && !editing) return null;

  function choose(value: Consent) {
    setConsent(value);
    // The notice disappears with the focus on it: send it back to where it was reopened from.
    if (editing) document.querySelector<HTMLElement>('.footer-consent')?.focus();
  }

  return (
    <section ref={root} className="consent-banner" aria-labelledby="consent-title">
      <h2 id="consent-title">{copy.title}</h2>
      <p>{copy.text} <Link to={href(legalPaths.cookies)}>{copy.more}</Link></p>
      <div className="consent-banner__actions">
        <button type="button" onClick={() => choose('denied')}>{copy.reject}</button>
        <button type="button" onClick={() => choose('granted')}>{copy.accept}</button>
      </div>
    </section>
  );
}
