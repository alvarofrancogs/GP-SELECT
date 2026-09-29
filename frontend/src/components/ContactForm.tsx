import { useId, useRef, useState, type FormEvent } from 'react';
import { useLanguage } from '../i18n/useLanguage';
import { submitLead, validateLead, type LeadDraft, type LeadField, type LeadIntent } from '../lib/submitLead';

export function ContactForm({ intent, vehicle }: { intent: LeadIntent; vehicle: string }) {
  const { copy } = useLanguage();
  const text = copy.interiors.contact;
  const id = useId();
  const formRef = useRef<HTMLFormElement>(null);
  const successRef = useRef<HTMLDivElement>(null);
  const [errors, setErrors] = useState<LeadField[]>([]);
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'failure'>('idle');
  const search = intent === 'search';
  const fields = ['name', 'phone', 'email', 'vehicle', 'message'] as const;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (status === 'submitting') return;
    const data = new FormData(event.currentTarget);
    const lead: LeadDraft = {
      name: String(data.get('name') ?? '').trim(),
      phone: String(data.get('phone') ?? '').trim(),
      email: String(data.get('email') ?? '').trim(),
      vehicle: String(data.get('vehicle') ?? '').trim(),
      message: String(data.get('message') ?? '').trim(),
      intent,
    };
    const invalid = validateLead(lead);
    setErrors(invalid);
    if (invalid.length) {
      setStatus('idle');
      formRef.current?.querySelector<HTMLElement>(`[name="${invalid[0]}"]`)?.focus();
      return;
    }
    setStatus('submitting');
    try {
      const result = await submitLead(lead);
      setStatus(result.ok ? 'success' : 'failure');
      if (result.ok) requestAnimationFrame(() => successRef.current?.focus());
    } catch {
      setStatus('failure');
    }
  }

  function edit() {
    setStatus('idle');
    requestAnimationFrame(() => formRef.current?.querySelector<HTMLInputElement>('input')?.focus());
  }

  return (
    <section className="contact-form-section" aria-labelledby={`${id}-title`}>
      <h2 id={`${id}-title`} className="type-heading">{text.formTitle}</h2>
      <div ref={successRef} className="contact-success" hidden={status !== 'success'} tabIndex={-1} role="status">
        <h3 className="type-section">{text.successTitle}</h3>
        <p className="type-body">{text.successBody}</p>
        <button className="editorial-link type-ui" type="button" onClick={edit}>{text.edit}<span aria-hidden="true">→</span></button>
      </div>
      <form ref={formRef} noValidate onSubmit={handleSubmit} hidden={status === 'success'} aria-busy={status === 'submitting'}>
        <p className="contact-form__hint type-body">{text.requiredHint}</p>
        <div className="contact-fields">
          {fields.map((field) => {
            const invalid = errors.includes(field);
            const optional = field === 'phone' || (field === 'vehicle' && search);
            const inputId = `${id}-${field}`;
            const describedBy = [invalid ? `${inputId}-error` : '', field === 'message' ? `${inputId}-hint` : ''].filter(Boolean).join(' ') || undefined;
            const shared = {
              id: inputId, name: field, required: !optional, 'aria-invalid': invalid,
              'aria-describedby': describedBy,
              onChange: () => {
                setErrors((current) => current.filter((item) => item !== field));
                if (status === 'failure') setStatus('idle');
              },
            };
            return (
              <div key={field} className={`contact-field${field === 'message' ? ' contact-field--wide' : ''}`}>
                <label className="type-ui" htmlFor={inputId}>{text.fields[field]}{optional ? <span> ({text.optional})</span> : null}</label>
                {field === 'message' ? <>
                  <p id={`${inputId}-hint`} className="type-body contact-field__hint">{search ? text.searchMessage : text.vehicleMessage}</p>
                  <textarea {...shared} rows={4} minLength={10} maxLength={5000} className="type-body" />
                </> : <input {...shared} className="type-ui" type={field === 'email' ? 'email' : field === 'phone' ? 'tel' : 'text'}
                  autoComplete={field === 'name' ? 'name' : field === 'phone' ? 'tel' : field === 'email' ? 'email' : 'off'}
                  defaultValue={field === 'vehicle' ? vehicle : ''} maxLength={field === 'phone' ? 30 : 200} />}
                {invalid ? <p id={`${inputId}-error`} className="contact-field__error type-ui">{text.errors[field]}</p> : null}
              </div>
            );
          })}
        </div>
        {import.meta.env.DEV ? <p className="contact-preview type-body" id={`${id}-preview`}>{text.preview}</p> : null}
        {status === 'failure' ? <p className="contact-failure type-body" role="alert">{text.failure}</p> : null}
        <button className="button button--dark contact-submit" type="submit" disabled={status === 'submitting'} aria-describedby={import.meta.env.DEV ? `${id}-preview` : undefined}>
          <span>{status === 'submitting' ? text.submitting : text.submit}</span><span className="button-arrow" aria-hidden="true">→</span>
        </button>
      </form>
    </section>
  );
}
