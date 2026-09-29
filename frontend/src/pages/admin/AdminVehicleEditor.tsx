import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { Link, useBlocker, useParams } from 'react-router-dom';
import { adminApi } from '../../services/adminApi';
import type { AdminVehicle } from '../../types/admin';
import { adminCopy } from '../../i18n/adminCopy';
import { describeError, errorReference, fieldErrors } from '../../lib/adminErrors';
import { buildPatch, formSignature, LIMITS, mapServerErrors, parseInteger, textFields, toForm, type TextField, type VehicleForm } from '../../lib/vehicleForm';
import { FormField } from '../../components/admin/FormField';
import { ListEditor } from '../../components/admin/ListEditor';
import { KeyValueEditor } from '../../components/admin/KeyValueEditor';
import { ImageUploader } from '../../components/admin/ImageUploader';
import { StatusControl } from '../../components/admin/StatusControl';
import { ArchiveVehicleDialog } from '../../components/admin/ArchiveVehicleDialog';
import { ConfirmDialog } from '../../components/admin/ConfirmDialog';
import { MonthSelect } from '../../components/admin/MonthSelect';
import { formatPrice } from '../../lib/vehicleFormat';

export function AdminVehicleEditor() {
  const { id = '' } = useParams();
  return <EditorLoader key={id} id={id} />;
}

function EditorLoader({ id }: { id: string }) {
  const [vehicle, setVehicle] = useState<AdminVehicle | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let ignore = false;
    adminApi.getVehicle(id).then((data) => { if (!ignore) setVehicle(data); }, (failure) => { if (!ignore) setError(failure); });
    return () => { ignore = true; };
  }, [id, attempt]);

  if (error) return <div className="admin-state" role="alert">
    <BackLink />
    <p className="type-ui">{describeError(error)}</p>
    {errorReference(error) ? <p className="admin-reference">{adminCopy.errors.reference}: {errorReference(error)}</p> : null}
    <button type="button" className="admin-link" onClick={() => { setError(null); setAttempt((n) => n + 1); }}>{adminCopy.errors.retry}</button>
  </div>;
  if (!vehicle) return <p className="admin-state type-ui" role="status">{adminCopy.editor.loading}</p>;
  return <VehicleEditor initial={vehicle} />;
}

const BackLink = () => <Link to="/admin" className="admin-back"><span aria-hidden="true">←</span>{adminCopy.editor.back}</Link>;

type SaveState = { kind: 'idle' | 'saving' | 'saved' } | { kind: 'error'; message: string; reference: string | null };

function VehicleEditor({ initial }: { initial: AdminVehicle }) {
  const text = adminCopy.editor;
  const f = adminCopy.fields;
  const [vehicle, setVehicle] = useState(initial); // Last server state: the baseline for dirty tracking.
  const [form, setForm] = useState<VehicleForm>(() => toForm(initial));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [save, setSave] = useState<SaveState>({ kind: 'idle' });
  const [uploading, setUploading] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const archived = vehicle.status === 'Archived';

  const savedSignature = useMemo(() => formSignature(toForm(vehicle)), [vehicle]);
  const dirty = !archived && formSignature(form) !== savedSignature;

  const blocker = useBlocker(({ currentLocation, nextLocation }) => (dirty || uploading) && currentLocation.pathname !== nextLocation.pathname);
  useEffect(() => {
    if (!dirty && !uploading) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty, uploading]);

  const reload = useCallback(async () => {
    try { setVehicle(await adminApi.getVehicle(vehicle.id)); } catch { /* The next action surfaces connection problems. */ }
  }, [vehicle.id]);

  function set<K extends keyof VehicleForm>(key: K, value: VehicleForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
    if (save.kind !== 'saving') setSave({ kind: 'idle' });
    const errorKey = key as string;
    if (errors[errorKey]) setErrors((current) => { const next = { ...current }; delete next[errorKey]; return next; });
  }

  function focusFirstError() {
    requestAnimationFrame(() => formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus());
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!dirty || save.kind === 'saving') return;
    const { patch, errors: local, specKeys } = buildPatch(vehicle, form);
    if (Object.keys(local).length) {
      setErrors(local);
      setSave({ kind: 'error', message: text.fixErrors, reference: null });
      focusFirstError();
      return;
    }
    if (!Object.keys(patch).length) { setForm(toForm(vehicle)); return; } // Only whitespace changed.
    setSave({ kind: 'saving' });
    try {
      const updated = await adminApi.updateVehicle(vehicle.id, patch);
      setVehicle(updated);
      setForm(toForm(updated));
      setErrors({});
      setSave({ kind: 'saved' });
    } catch (failure) {
      const server = mapServerErrors(fieldErrors(failure), specKeys);
      setErrors(server);
      setSave({ kind: 'error', message: Object.keys(server).length ? text.fixErrors : describeError(failure), reference: errorReference(failure) });
      if (Object.keys(server).length) focusFirstError();
    }
  }

  const textInput = (name: TextField, label: string, options: { hint?: string; list?: string } = {}) =>
    <FormField id={`field-${name}`} label={label} error={errors[name]} hint={options.hint}>
      {(a11y) => <input {...a11y} value={form[name]} maxLength={textFields[name].max} list={options.list}
        onChange={(event) => set(name, event.target.value)} />}
    </FormField>;
  const numberInput = (name: 'mileageKm' | 'priceEur' | 'powerHp', label: string, unit: string, hint?: string) =>
    <FormField id={`field-${name}`} label={label} error={errors[name]} hint={hint} unit={unit}>
      {(a11y) => <input {...a11y} value={form[name]} inputMode="numeric" autoComplete="off" onChange={(event) => set(name, event.target.value)} />}
    </FormField>;
  const suggestions = (name: keyof typeof f.suggestions) =>
    <datalist id={`suggest-${name}`}>{f.suggestions[name].map((value) => <option key={value} value={value} />)}</datalist>;

  const price = parseInteger(form.priceEur);
  const priceHint = typeof price === 'number' ? `${formatPrice(price, 'es', '')}. ${f.priceHint}` : f.priceHint;
  const statusMessage = save.kind === 'saving' ? text.saving : save.kind === 'saved' && !dirty ? text.saved
    : save.kind === 'error' ? save.message : dirty ? text.dirty : text.clean;

  return <article className="admin-editor">
    <header className="admin-editor__head">
      <BackLink />
      <div className="admin-editor__title-row">
        <h1 className="admin-editor__title">
          <span className="type-section">{vehicle.make} {vehicle.model}</span>
          {vehicle.variant ? <span className="type-fine">{vehicle.variant}</span> : null}
        </h1>
        {archived ? null : <Link to={`/admin/vehiculos/${vehicle.id}/vista-previa`} className="admin-link">{text.preview}<span aria-hidden="true">→</span></Link>}
      </div>
      <StatusControl vehicle={vehicle} dirty={dirty} onChanged={setVehicle} />
      {archived ? <p className="admin-notice" role="status">{text.archivedNotice}</p> : null}
    </header>

    <form ref={formRef} className="admin-form" onSubmit={submit} noValidate aria-label={text.sections.vehicle}>
      <fieldset disabled={archived} className="admin-form__fields">
        <Section id="vehicle" title={text.sections.vehicle} note={text.requiredNote}>
          <div className="admin-grid">
            <FormField id="field-make" label={f.make} error={errors.make}>
              {(a11y) => <input {...a11y} value={form.make} maxLength={LIMITS.make} required onChange={(event) => set('make', event.target.value)} />}
            </FormField>
            <FormField id="field-model" label={f.model} error={errors.model}>
              {(a11y) => <input {...a11y} value={form.model} maxLength={LIMITS.model} required onChange={(event) => set('model', event.target.value)} />}
            </FormField>
            {textInput('variant', f.variant)}
            <FormField id="field-firstRegistrationYear" label={f.year} error={errors.firstRegistrationYear}>
              {(a11y) => <input {...a11y} value={form.firstRegistrationYear} inputMode="numeric" maxLength={4} required
                onChange={(event) => set('firstRegistrationYear', event.target.value)} />}
            </FormField>
            <FormField id="field-firstRegistrationMonth" label={f.month} error={errors.firstRegistrationMonth}>
              {(a11y) => <MonthSelect {...a11y} value={form.firstRegistrationMonth} onChange={(value) => set('firstRegistrationMonth', value)} />}
            </FormField>
            {numberInput('mileageKm', f.mileageKm, f.kmUnit)}
            {numberInput('priceEur', f.priceEur, f.eurUnit, priceHint)}
            {numberInput('powerHp', f.powerHp, f.hpUnit)}
            {textInput('fuelType', f.fuelType, { list: 'suggest-fuelType' })}
            {textInput('transmission', f.transmission, { list: 'suggest-transmission' })}
            {textInput('bodyType', f.bodyType, { list: 'suggest-bodyType' })}
            {textInput('drivetrain', f.drivetrain, { list: 'suggest-drivetrain' })}
            {textInput('internalReference', f.internalReference, { hint: f.internalHint })}
          </div>
          {suggestions('fuelType')}{suggestions('transmission')}{suggestions('bodyType')}{suggestions('drivetrain')}
        </Section>

        <Section id="appearance" title={text.sections.appearance}>
          <div className="admin-grid">
            {textInput('exteriorColour', f.exteriorColour)}
            {textInput('interior', f.interior)}
            <FormField id="field-provenance" label={f.provenance} error={errors.provenance} hint={f.provenanceHint} wide>
              {(a11y) => <input {...a11y} value={form.provenance} maxLength={LIMITS.provenance} onChange={(event) => set('provenance', event.target.value)} />}
            </FormField>
          </div>
        </Section>

        <Section id="information" title={text.sections.information}>
          <div className="admin-grid admin-grid--single">
            <FormField id="field-description" label={f.description} error={errors.description} wide>
              {(a11y) => <textarea {...a11y} rows={8} value={form.description} maxLength={LIMITS.description} onChange={(event) => set('description', event.target.value)} />}
            </FormField>
            <FormField id="field-history" label={f.history} error={errors.history} hint={f.historyHint} wide>
              {(a11y) => <textarea {...a11y} rows={5} value={form.history} maxLength={LIMITS.history} onChange={(event) => set('history', event.target.value)} />}
            </FormField>
          </div>
        </Section>

        <Section id="equipment" title={text.sections.equipment}>
          <ListEditor items={form.equipment} onChange={(items) => set('equipment', items)} label={text.sections.equipment} error={errors.equipment} />
        </Section>

        <Section id="specifications" title={text.sections.specifications}>
          <KeyValueEditor rows={form.specifications} errors={errors} onChange={(rows) => {
            setForm((current) => ({ ...current, specifications: rows }));
            if (save.kind !== 'saving') setSave({ kind: 'idle' });
          }} />
          {errors.customSpecifications ? <p className="admin-field__error">{errors.customSpecifications}</p> : null}
        </Section>
      </fieldset>

      {archived ? null : <div className="admin-savebar" data-dirty={dirty || undefined}>
        <p className="admin-savebar__status" role={save.kind === 'error' ? 'alert' : 'status'} data-kind={save.kind}>
          {statusMessage}{save.kind === 'error' && save.reference ? <span className="admin-reference"> {adminCopy.errors.reference}: {save.reference}</span> : null}
        </p>
        <div className="admin-savebar__actions">
          {dirty ? <button type="button" className="admin-link" disabled={save.kind === 'saving'}
            onClick={() => { setForm(toForm(vehicle)); setErrors({}); setSave({ kind: 'idle' }); }}>{text.discard}</button> : null}
          <button type="submit" className="button button--dark admin-button" disabled={!dirty || save.kind === 'saving'}>
            <span>{save.kind === 'saving' ? text.saving : text.save}</span>
          </button>
        </div>
      </div>}
    </form>

    <Section id="photos" title={text.sections.photos}>
      <ImageUploader vehicleId={vehicle.id} images={vehicle.images} reload={reload} disabled={archived} onBusyChange={setUploading} />
    </Section>

    {archived ? null : <section className="admin-archive" aria-labelledby="archive-title">
      <h2 id="archive-title" className="admin-section__title">{adminCopy.archive.title}</h2>
      <div>
        <p className="admin-field__hint">{adminCopy.archive.body}</p>
        <button type="button" className="admin-link admin-link--danger" onClick={() => setArchiveOpen(true)}>{text.archiveAction}</button>
      </div>
    </section>}

    <ArchiveVehicleDialog vehicleId={archiveOpen ? vehicle.id : null} onClose={() => setArchiveOpen(false)}
      onArchived={() => { setArchiveOpen(false); setVehicle({ ...vehicle, status: 'Archived' }); setForm(toForm(vehicle)); }} />
    <ConfirmDialog open={blocker.state === 'blocked'} title={adminCopy.unsaved.title} body={adminCopy.unsaved.body}
      confirmLabel={adminCopy.unsaved.leave} cancelLabel={adminCopy.unsaved.stay}
      onConfirm={() => blocker.proceed?.()} onCancel={() => blocker.reset?.()} />
  </article>;
}

function Section({ id, title, note, children }: { id: string; title: string; note?: string; children: ReactNode }) {
  return <section className="admin-section" aria-labelledby={`section-${id}`}>
    <div className="admin-section__head"><h2 id={`section-${id}`} className="admin-section__title">{title}</h2>{note ? <p className="admin-field__hint">{note}</p> : null}</div>
    <div className="admin-section__body">{children}</div>
  </section>;
}
