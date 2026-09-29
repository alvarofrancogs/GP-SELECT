import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { adminApi } from '../../services/adminApi';
import { adminCopy } from '../../i18n/adminCopy';
import { describeError, fieldErrors } from '../../lib/adminErrors';
import { LIMITS, maxYear, parseInteger } from '../../lib/vehicleForm';
import { FormField } from '../../components/admin/FormField';
import { MonthSelect } from '../../components/admin/MonthSelect';

/** Creation asks only what the server requires; the editor takes over right after. */
export function AdminNewVehicle() {
  const text = adminCopy.create;
  const f = adminCopy.fields;
  const e = adminCopy.errors;
  const navigate = useNavigate();
  const [values, setValues] = useState({ make: '', model: '', year: '', month: '', internalReference: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const set = (key: keyof typeof values, value: string) => { setValues({ ...values, [key]: value }); setErrors({ ...errors, [key]: '' }); };

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const make = values.make.trim();
    const model = values.model.trim();
    const year = parseInteger(values.year);
    const local: Record<string, string> = {};
    if (!make) local.make = e.required;
    if (!model) local.model = e.required;
    if (year === null) local.year = e.required;
    else if (year === undefined) local.year = e.number;
    else if (year < 1886 || year > maxYear()) local.year = e.range('1886', String(maxYear()));
    setErrors(local);
    setFailure(null);
    if (Object.keys(local).length || typeof year !== 'number') {
      requestAnimationFrame(() => form.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus());
      return;
    }
    setBusy(true);
    try {
      const vehicle = await adminApi.createVehicle({
        make, model, firstRegistrationYear: year,
        firstRegistrationMonth: values.month ? Number(values.month) : null,
        internalReference: values.internalReference.trim() || null,
      });
      navigate(`/admin/vehiculos/${vehicle.id}`, { replace: true });
    } catch (error) {
      const server = fieldErrors(error);
      const { firstRegistrationYear, firstRegistrationMonth, ...rest } = server;
      setErrors({ ...rest, ...(firstRegistrationYear ? { year: firstRegistrationYear } : {}), ...(firstRegistrationMonth ? { month: firstRegistrationMonth } : {}) });
      setFailure(Object.keys(server).length ? adminCopy.editor.fixErrors : describeError(error));
      setBusy(false);
    }
  }

  return <section className="admin-create" aria-labelledby="admin-create-title">
    <Link to="/admin" className="admin-back"><span aria-hidden="true">←</span>{adminCopy.editor.back}</Link>
    <h1 id="admin-create-title" className="admin-title type-section">{text.title}</h1>
    <p className="admin-create__intro type-ui">{text.intro}</p>
    <form className="admin-create__form" onSubmit={submit} noValidate>
      {failure ? <p className="admin-notice" role="alert">{failure}</p> : null}
      <div className="admin-grid">
        <FormField id="new-make" label={f.make} error={errors.make}>
          {(a11y) => <input {...a11y} value={values.make} maxLength={LIMITS.make} required autoFocus onChange={(event) => set('make', event.target.value)} />}
        </FormField>
        <FormField id="new-model" label={f.model} error={errors.model}>
          {(a11y) => <input {...a11y} value={values.model} maxLength={LIMITS.model} required onChange={(event) => set('model', event.target.value)} />}
        </FormField>
        <FormField id="new-year" label={f.year} error={errors.year}>
          {(a11y) => <input {...a11y} value={values.year} inputMode="numeric" maxLength={4} required onChange={(event) => set('year', event.target.value)} />}
        </FormField>
        <FormField id="new-month" label={f.month} error={errors.month} optional>
          {(a11y) => <MonthSelect {...a11y} value={values.month} onChange={(value) => set('month', value)} />}
        </FormField>
        <FormField id="new-reference" label={f.internalReference} error={errors.internalReference} hint={f.internalHint} optional>
          {(a11y) => <input {...a11y} value={values.internalReference} maxLength={LIMITS.short} onChange={(event) => set('internalReference', event.target.value)} />}
        </FormField>
      </div>
      <div className="admin-create__actions">
        <Link to="/admin" className="admin-link">{text.cancel}</Link>
        <button type="submit" className="button button--dark admin-button" disabled={busy}>
          <span>{busy ? text.submitting : text.submit}</span><span className="button-arrow" aria-hidden="true">→</span>
        </button>
      </div>
    </form>
  </section>;
}
