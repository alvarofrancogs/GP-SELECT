import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { enquiriesEnabled } from '../config/contact';
import { legalConfig } from '../config/legal';
import { legalPaths, legalUi } from '../i18n/legalCopy';
import { useLanguage } from '../i18n/useLanguage';
import { submitLead, validateLead, type LeadConfiguration, type LeadDraft, type LeadField, type LeadIntent } from '../lib/submitLead';
import { vehicleLabel } from '../lib/vehicleFormat';
import { lastVehicles, listVehicles } from '../services/vehicles';
import { Select } from './Select';

interface ContactFormProps {
  configuration: LeadConfiguration;
  intent: LeadIntent;
  vehicle?: string;
  onNewEnquiry?: () => void;
  onBusyChange?: (busy: boolean) => void;
  onSearch?: () => void;
}
const emptyDraft = { vehicle: '', budget: '', message: '' };

/** One form engine; common details and each path's draft stay in memory. */
export function ContactForm({ configuration, intent, vehicle = '', onNewEnquiry, onBusyChange, onSearch }: ContactFormProps) {
  const { copy, locale, href } = useLanguage();
  const notice = legalUi[locale].formNotice;
  const text = copy.interiors.contact;
  const id = useId();
  const formRef = useRef<HTMLFormElement>(null);
  const successRef = useRef<HTMLDivElement>(null);
  const inFlight = useRef(false);
  const [common, setCommon] = useState({ name: '', email: '', phone: '' });
  const [drafts, setDrafts] = useState({ search: { ...emptyDraft }, vehicle: { ...emptyDraft, vehicle }, information: { ...emptyDraft } });
  const [feedback, setFeedback] = useState<{ intent: LeadIntent; status: 'idle' | 'submitting' | 'success' | 'failure'; errors: LeadField[]; sent?: boolean; rateLimited?: boolean }>({ intent, status: 'idle', errors: [] });
  const status = feedback.intent === intent ? feedback.status : 'idle';
  const errors = feedback.intent === intent ? feedback.errors : [];
  const submitting = status === 'submitting';
  const importing = configuration === 'import';
  const search = intent === 'search';
  const stockField = !importing && intent === 'vehicle';
  const messageRequired = importing || intent === 'information';
  const draft = drafts[intent];
  const [known] = useState(lastVehicles);
  const [stock, setStock] = useState(known ?? []);
  const [stockStatus, setStockStatus] = useState<'loading' | 'ready' | 'error'>(known ? 'ready' : 'loading');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (importing) return;
    const request = new AbortController();
    listVehicles(request.signal).then((data) => {
      if (!request.signal.aborted) { setStock(data); setStockStatus('ready'); }
    }, () => { if (!request.signal.aborted) setStockStatus('error'); });
    return () => request.abort();
  }, [importing, attempt]);

  const stockOptions = [{ value: '', label: text.stockPlaceholder }, ...stock.filter((car) => car.availability !== 'sold').map((car) => {
    const value = vehicleLabel(car);
    const availability = car.availability === 'reserved' ? copy.vehicles.reserved : car.availability === 'coming-soon' ? copy.vehicles.comingSoon : '';
    return { value, label: `${value}${availability ? ` · ${availability}` : ''}` };
  })];
  const selectedVehicle = stockOptions.some((option) => option.value === draft.vehicle) ? draft.vehicle : '';
  const stockNotice = stockStatus === 'loading' ? text.stockLoading : stockStatus === 'error' ? text.stockError
    : draft.vehicle && !selectedVehicle ? text.stockUnmatched : stockOptions.length === 1 ? text.stockEmpty : '';
  const fields: LeadField[] = ['name', 'email', 'phone', ...(!importing && intent === 'information' ? [] : ['vehicle' as const]), ...(!importing && search ? ['budget' as const] : []), 'message'];

  function focusField(field: LeadField) {
    document.getElementById(`${id}-${field}`)?.focus();
  }
  function change(field: LeadField, value: string) {
    if (field === 'name' || field === 'email' || field === 'phone') setCommon((current) => ({ ...current, [field]: value }));
    else setDrafts((current) => ({ ...current, [intent]: { ...current[intent], [field]: value } }));
    setFeedback((current) => ({ intent, status: 'idle', errors: current.intent === intent ? current.errors.filter((item) => item !== field) : [] }));
  }
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlight.current) return;
    const lead: LeadDraft = { ...common, ...draft, intent, vehicle: stockField ? selectedVehicle : draft.vehicle };
    const invalid = validateLead(lead, configuration);
    setFeedback({ intent, status: 'idle', errors: invalid });
    if (invalid.length) { focusField(invalid[0]); return; }
    inFlight.current = true;
    onBusyChange?.(true);
    setFeedback({ intent, status: 'submitting', errors: [] });
    try {
      const result = await submitLead(lead, enquiriesEnabled, locale, configuration);
      if (result.ok) {
        setFeedback({ intent, status: 'success', errors: [], sent: result.mode === 'sent' });
        requestAnimationFrame(() => successRef.current?.focus());
      } else if (result.reason === 'invalid') {
        setFeedback({ intent, status: 'idle', errors: result.fields });
        focusField(result.fields[0]);
      } else setFeedback({ intent, status: 'failure', errors: [], rateLimited: result.reason === 'rate_limited' });
    } catch {
      setFeedback({ intent, status: 'failure', errors: [] });
    } finally {
      inFlight.current = false;
      onBusyChange?.(false);
    }
  }
  function edit() {
    if (feedback.sent) {
      setCommon({ name: '', email: '', phone: '' });
      setDrafts((current) => ({ ...current, [intent]: { ...emptyDraft } }));
      onNewEnquiry?.();
    }
    setFeedback({ intent, status: 'idle', errors: [] });
    requestAnimationFrame(() => focusField('name'));
  }

  return <section className="contact-form-section" aria-labelledby={`${id}-title`}>
    <h2 id={`${id}-title`} className="type-heading">{importing ? copy.interiors.import.formTitle : text.formTitle}</h2>
    <div ref={successRef} className="contact-success" hidden={status !== 'success'} tabIndex={-1} role="status">
      <h3 className="type-section">{feedback.sent ? text.sentTitle : text.successTitle}</h3>
      <p className="type-body">{feedback.sent ? text.sentBody : text.successBody}</p>
      <button className="editorial-link type-ui" type="button" onClick={edit}>{feedback.sent ? text.another : text.edit}<span aria-hidden="true">→</span></button>
    </div>
    <form ref={formRef} noValidate onSubmit={handleSubmit} hidden={status === 'success'} aria-busy={submitting}>
      <p className="contact-form__hint type-body">{text.requiredHint}</p>
      <div className="contact-fields">
        {fields.map((field) => {
          const invalid = errors.includes(field);
          const optional = field === 'phone' || field === 'budget' || (field === 'vehicle' && importing) || (field === 'message' && !messageRequired);
          const inputId = `${id}-${field}`;
          const hint = field === 'budget' ? text.budgetHint : field === 'message' && messageRequired ? text.messageHint : '';
          const describedBy = [invalid ? `${inputId}-error` : '', hint ? `${inputId}-hint` : '', stockField && field === 'vehicle' && stockNotice ? `${inputId}-stock` : ''].filter(Boolean).join(' ') || undefined;
          const label = field === 'vehicle' ? importing ? text.fields.importVehicle : search ? text.fields.desiredVehicle : text.fields.vehicle
            : field === 'message' ? intent === 'information' ? text.fields.enquiry : !importing && search ? text.fields.comments : text.fields.message : text.fields[field];
          const error = field === 'vehicle' && search && !importing ? text.errors.desiredVehicle : field === 'message' && intent === 'information' ? text.errors.enquiry : text.errors[field];
          const value = field === 'name' || field === 'email' || field === 'phone' ? common[field] : draft[field];
          const shared = { id: inputId, name: field, required: !optional, disabled: submitting, value, 'aria-invalid': invalid,
            'aria-describedby': describedBy, onChange: (event: { target: { value: string } }) => change(field, event.target.value) };
          const wide = importing ? field === 'message' : field !== 'name' && field !== 'email';
          return <div key={field} className={`contact-field${wide ? ' contact-field--wide' : ''}`}>
            <label id={`${inputId}-label`} className="type-ui" htmlFor={inputId}>{label}{optional ? <span> ({text.optional})</span> : <> *<span className="sr-only"> {text.required}</span></>}</label>
            {hint ? <p id={`${inputId}-hint`} className="type-body contact-field__hint">{hint}</p> : null}
            {stockField && field === 'vehicle' ? <>
              <Select id={inputId} labelledBy={`${inputId}-label`} value={selectedVehicle} options={stockOptions} onChange={(value) => change('vehicle', value)}
                disabled={stockStatus === 'loading' || submitting} aria-describedby={describedBy} aria-invalid={invalid ? true : undefined} />
              {stockNotice ? <p id={`${inputId}-stock`} className="contact-field__hint type-body" role="status">{stockNotice}</p> : null}
              {stockStatus === 'error' ? <button className="editorial-link type-ui" type="button" disabled={submitting} onClick={() => { setStockStatus('loading'); setAttempt((current) => current + 1); }}>{copy.vehicles.retry}<span aria-hidden="true">→</span></button> : null}
              <button className="editorial-link type-ui" type="button" disabled={submitting} onClick={onSearch}>{text.stockAlternative}<span aria-hidden="true">→</span></button>
            </> : field === 'message' ? <textarea {...shared} rows={4} minLength={messageRequired ? 10 : undefined} maxLength={5000} className="type-body" />
              : <input {...shared} className="type-ui" type={field === 'email' ? 'email' : field === 'phone' ? 'tel' : 'text'}
                autoComplete={field === 'name' ? 'name' : field === 'phone' ? 'tel' : field === 'email' ? 'email' : 'off'} maxLength={field === 'budget' ? 80 : field === 'phone' ? 30 : 200} />}
            {invalid ? <p id={`${inputId}-error`} className="contact-field__error type-ui">{error}</p> : null}
          </div>;
        })}
      </div>
      {enquiriesEnabled ? null : <p className="contact-preview type-body" id={`${id}-preview`}>{text.preview}</p>}
      {status === 'failure' ? <p className="contact-failure type-body" role="alert">{feedback.rateLimited ? text.rateLimited : enquiriesEnabled ? text.sendFailure : text.failure}</p> : null}
      <p className="sr-only" role="status">{submitting ? enquiriesEnabled ? text.sending : text.submitting : ''}</p>
      <button className="button button--dark contact-submit" type="submit" disabled={submitting} aria-describedby={enquiriesEnabled ? undefined : `${id}-preview`}>
        <span>{submitting ? enquiriesEnabled ? text.sending : text.submitting : text.submit}</span><span className="button-arrow" aria-hidden="true">→</span>
      </button>
      <p className="contact-privacy type-ui">
        {notice.before}{legalConfig.holder ?? copy.brand}{notice.purpose}
        <Link to={href(legalPaths.privacidad)}>{notice.link}</Link>{notice.after}
      </p>
    </form>
  </section>;
}
