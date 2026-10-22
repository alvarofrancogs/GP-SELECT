import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { legalConfig } from '../config/legal';
import { legalPaths, legalUi } from '../i18n/legalCopy';
import { useLanguage } from '../i18n/useLanguage';
import {
  appointmentFields, appointmentLimits, lastBookableDay, localDay, submitAppointment, validateAppointment,
  type AppointmentDraft, type AppointmentField,
} from '../lib/appointment';

const emptyDraft: AppointmentDraft = { date: '', time: '', name: '', phone: '', message: '' };

/** The Citas form: day, time, name, phone and a free message. It follows the contact form's pattern
    (validated on submit, first error focused, honest preview while sending is not available). */
export function AppointmentForm() {
  const { copy, locale, href } = useLanguage();
  const text = copy.interiors.appointments;
  const notice = legalUi[locale].formNotice;
  const id = useId();
  const successRef = useRef<HTMLDivElement>(null);
  const pendingFocus = useRef<AppointmentField | null>(null);
  const [draft, setDraft] = useState(emptyDraft);
  const [errors, setErrors] = useState<AppointmentField[]>([]);
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success'>('idle');
  const submitting = status === 'submitting';
  // Read once per render: the date picker opens on a day that can be requested.
  const today = localDay();

  useEffect(() => {
    const field = pendingFocus.current;
    if (!field) return;
    pendingFocus.current = null;
    // The committed render has attached the error description the screen reader reads with the field.
    document.getElementById(`${id}-${field}`)?.focus();
  }, [errors, id]);

  function change(field: AppointmentField, value: string) {
    setDraft((current) => ({ ...current, [field]: value }));
    setErrors((current) => current.filter((item) => item !== field));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    const invalid = validateAppointment(draft);
    pendingFocus.current = invalid[0] ?? null;
    setErrors(invalid);
    if (invalid.length) return;
    setStatus('submitting');
    await submitAppointment();
    setStatus('success');
    requestAnimationFrame(() => successRef.current?.focus());
  }

  function edit() {
    setStatus('idle');
    requestAnimationFrame(() => document.getElementById(`${id}-date`)?.focus());
  }

  return <section className="contact-form-section appointment-form" aria-labelledby={`${id}-title`}>
    <h2 id={`${id}-title`} className="type-heading">{text.formTitle}</h2>
    <div ref={successRef} className="contact-success" hidden={status !== 'success'} tabIndex={-1} role="status">
      <h3 className="type-section">{text.successTitle}</h3>
      <p className="type-body">{text.successBody}</p>
      <button className="editorial-link type-ui" type="button" onClick={edit}>{text.edit}<span aria-hidden="true">→</span></button>
    </div>
    <form noValidate onSubmit={handleSubmit} hidden={status === 'success'} aria-busy={submitting}>
      <p className="contact-form__hint type-body">{text.requiredHint}</p>
      <div className="contact-fields">
        {appointmentFields.map((field) => {
          const inputId = `${id}-${field}`;
          const invalid = errors.includes(field);
          const optional = field === 'message';
          const hint = field === 'message' ? text.messageHint : '';
          const describedBy = [invalid ? `${inputId}-error` : '', hint ? `${inputId}-hint` : ''].filter(Boolean).join(' ') || undefined;
          const shared = {
            id: inputId, name: field, required: !optional, disabled: submitting, value: draft[field],
            'aria-invalid': invalid, 'aria-describedby': describedBy,
            onChange: (event: { target: { value: string } }) => change(field, event.target.value),
          };
          const layout = field === 'message' ? ' contact-field--wide' : field === 'date' || field === 'time' ? ' appointment-field--when' : ' appointment-field--who';
          return <div key={field} className={`contact-field${layout}`}>
            <label className="type-ui" htmlFor={inputId}>
              {text.fields[field]}{optional ? <span> ({text.optional})</span> : <> *<span className="sr-only"> {text.required}</span></>}
            </label>
            {hint ? <p id={`${inputId}-hint`} className="type-body contact-field__hint">{hint}</p> : null}
            {field === 'message'
              ? <textarea {...shared} rows={4} maxLength={appointmentLimits.message} className="type-body" />
              : field === 'date' ? <input {...shared} className="type-ui" type="date" min={today} max={lastBookableDay()} />
                : field === 'time' ? <input {...shared} className="type-ui" type="time" step={900} />
                  : <input {...shared} className="type-ui" type={field === 'phone' ? 'tel' : 'text'}
                    autoComplete={field === 'phone' ? 'tel' : 'name'} enterKeyHint="next" maxLength={appointmentLimits[field]} />}
            {invalid ? <p id={`${inputId}-error`} className="contact-field__error type-ui">{text.errors[field]}</p> : null}
          </div>;
        })}
      </div>
      <p className="contact-preview type-body" id={`${id}-preview`}>{text.preview}</p>
      <p className="sr-only" role="status">{submitting ? text.submitting : ''}</p>
      <button className="button button--dark contact-submit" type="submit" disabled={submitting} aria-describedby={`${id}-preview`}>
        <span>{submitting ? text.submitting : text.submit}</span><span className="button-arrow" aria-hidden="true">→</span>
      </button>
      <p className="contact-privacy type-ui">
        {notice.before}{legalConfig.holder ?? copy.brand}{notice.appointmentPurpose}
        <Link to={href(legalPaths.privacidad)}>{notice.link}</Link>{notice.after}
      </p>
    </form>
  </section>;
}
