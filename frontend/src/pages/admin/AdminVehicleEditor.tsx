import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { Link, useBlocker, useParams } from 'react-router-dom';
import { adminApi, ApiError } from '../../services/adminApi';
import type { AdminImage, AdminVehicle, SettableStatus, VehicleSaveRequest } from '../../types/admin';
import { adminCopy } from '../../i18n/adminCopy';
import { describeError, errorReference, fieldErrors } from '../../lib/adminErrors';
import { buildPatch, formSignature, LIMITS, mapServerErrors, parsePrice, textFields, toForm, type TextField, type VehicleForm } from '../../lib/vehicleForm';
import { FormField } from '../../components/admin/FormField';
import { ListEditor } from '../../components/admin/ListEditor';
import { KeyValueEditor } from '../../components/admin/KeyValueEditor';
import { ImageUploader } from '../../components/admin/ImageUploader';
import { StatusControl } from '../../components/admin/StatusControl';
import { RestoreVehicleButton } from '../../components/admin/RestoreVehicleButton';
import { ArchiveVehicleDialog } from '../../components/admin/ArchiveVehicleDialog';
import { ConfirmDialog } from '../../components/admin/ConfirmDialog';
import { MonthSelect } from '../../components/admin/MonthSelect';
import { SuggestInput } from '../../components/SuggestInput';
import { formatEuros } from '../../lib/adminFormat';

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

type SaveState = { kind: 'idle' | 'saving' | 'saved' | 'discarding' } | { kind: 'error'; message: string; reference: string | null };

function VehicleEditor({ initial }: { initial: AdminVehicle }) {
  const text = adminCopy.editor;
  const f = adminCopy.fields;
  const [vehicle, setVehicle] = useState(initial); // Last server state: the baseline for dirty tracking.
  const [form, setForm] = useState<VehicleForm>(() => toForm(initial));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [save, setSave] = useState<SaveState>({ kind: 'idle' });
  const [uploading, setUploading] = useState(false);
  const [uploadState, setUploadState] = useState<'none' | 'working' | 'failed'>('none');
  const [queued, setQueued] = useState(false);
  const pendingUploads = uploadState !== 'none';
  const [images, setImages] = useState(initial.images);
  const [removed, setRemoved] = useState<string[]>([]);
  const [status, setStatus] = useState<SettableStatus>(initial.status === 'Archived' ? 'Draft' : initial.status);
  const [showWhenSold, setShowWhenSold] = useState(initial.showWhenSold);
  const [uploaderKey, setUploaderKey] = useState(0);
  const actionRef = useRef(false);
  const galleryVersion = useRef(0);
  const reloadSequence = useRef(0);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const archived = vehicle.status === 'Archived';

  const savedSignature = useMemo(() => formSignature(toForm(vehicle)), [vehicle]);
  const visibleImages = images.filter((image) => !removed.includes(image.id));
  const galleryDirty = removed.length > 0 || images.some((image) => image.isStaged)
    || JSON.stringify(visibleImages.map((image) => image.id)) !== JSON.stringify(vehicle.images.filter((image) => !image.isStaged).map((image) => image.id));
  const statusDirty = status !== vehicle.status || (status === 'Sold' && showWhenSold !== vehicle.showWhenSold);
  const dirty = !archived && (formSignature(form) !== savedSignature || galleryDirty || statusDirty || pendingUploads);
  const processing = !archived && (uploading || uploadState === 'working'
    || images.some((image) => image.state === 'Processing' || (image.state === 'PendingUpload' && image.jobPending)));
  const incomplete = !archived && (pendingUploads || visibleImages.some((image) => image.state === 'PendingUpload'));
  const working = save.kind === 'saving' || save.kind === 'discarding';
  const archiveLocked = dirty || uploading || processing || working;

  const blocker = useBlocker(({ currentLocation, nextLocation }) => !archived && (dirty || uploading || processing || working) && (currentLocation.pathname !== nextLocation.pathname || currentLocation.search !== nextLocation.search || currentLocation.hash !== nextLocation.hash));
  useEffect(() => {
    if (archived || (!dirty && !uploading && !processing && !working)) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [archived, dirty, uploading, processing, working]);

  // Polling only refreshes image metadata. It must not replace the editing baseline or local order.
  const reload = useCallback(async () => {
    const version = galleryVersion.current;
    const sequence = ++reloadSequence.current;
    const updated = await adminApi.getVehicle(initial.id);
    if (version !== galleryVersion.current || sequence !== reloadSequence.current || actionRef.current) return;
    setImages((current) => {
      const byId = new Map(updated.images.map((image) => [image.id, image]));
      const knownIds = new Set(current.map((image) => image.id));
      return [...current.map((image) => byId.get(image.id) ?? image),
        ...updated.images.filter((image) => !knownIds.has(image.id))];
    });
  }, [initial.id]);

  useEffect(() => {
    // The server says which photos the worker still has a job for (queued, running or waiting for a retry), so a
    // reload keeps following them. A PendingUpload photo without one only changes once this tab sends it; one left
    // behind (a failed upload, another tab) would otherwise keep the editor asking every 1.5 s for nothing.
    const changing = images.some((image) => image.state === 'Processing' || image.jobPending
      || (image.state === 'PendingUpload' && (queued || uploading)));
    if (archived || working || !changing) return;
    const version = galleryVersion.current;
    const timer = window.setTimeout(() => {
      void reload().catch((failure) => {
        if (version !== galleryVersion.current || actionRef.current) return;
        setSave({ kind: 'error', message: describeError(failure), reference: errorReference(failure) });
      });
    }, 1500);
    return () => window.clearTimeout(timer);
  }, [archived, images, working, reload, save, queued, uploading]);

  const imageAdded = useCallback((image: AdminImage) => {
    setImages((current) => current.some((item) => item.id === image.id) ? current : [...current, image]);
    setSave({ kind: 'idle' });
  }, []);

  function resetDraft(updated: AdminVehicle) {
    galleryVersion.current += 1;
    setVehicle(updated);
    setForm(toForm(updated));
    setImages(updated.images);
    setRemoved([]);
    setStatus(updated.status === 'Archived' ? 'Draft' : updated.status);
    setShowWhenSold(updated.showWhenSold);
    setUploadState('none'); setQueued(false);
    setUploading(false);
    setUploaderKey((key) => key + 1);
    setErrors({});
  }

  async function discard() {
    if (actionRef.current || uploading || archived) return;
    actionRef.current = true;
    galleryVersion.current += 1;
    setSave({ kind: 'discarding' });
    setUploaderKey((key) => key + 1);
    setUploadState('none'); setQueued(false);
    try {
      // Remove only staged images; saved images have only been removed from the local draft.
      for (const image of images.filter((item) => item.isStaged)) {
        await adminApi.removeImage(vehicle.id, image.id);
        setImages((current) => current.filter((item) => item.id !== image.id));
        setRemoved((current) => current.filter((id) => id !== image.id));
      }
      resetDraft({ ...vehicle, images: vehicle.images.filter((image) => !image.isStaged) });
      setSave({ kind: 'idle' });
    } catch (failure) {
      setSave({ kind: 'error', message: describeError(failure), reference: errorReference(failure) });
    } finally {
      actionRef.current = false;
    }
  }

  function set<K extends keyof VehicleForm>(key: K, value: VehicleForm[K]) {
    if (actionRef.current || archived) return;
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
    if (!dirty || archived || actionRef.current || processing || incomplete) return;
    const { patch, errors: local, specKeys } = buildPatch(vehicle, form);
    if (Object.keys(local).length) {
      setErrors(local);
      setSave({ kind: 'error', message: text.fixErrors, reference: null });
      focusFirstError();
      return;
    }
    const body: VehicleSaveRequest = {};
    if (Object.keys(patch).length) body.changes = patch;
    if (galleryDirty) body.gallery = { order: visibleImages.map((image) => image.id), removed };
    if (statusDirty) body.status = { status, ...(status === 'Sold' ? { showWhenSold } : {}) };
    if (!Object.keys(body).length) { setForm(toForm(vehicle)); setSave({ kind: 'idle' }); return; }
    actionRef.current = true;
    galleryVersion.current += 1;
    setSave({ kind: 'saving' });
    try {
      const updated = await adminApi.saveVehicle(vehicle.id, body);
      resetDraft(updated);
      setSave({ kind: 'saved' });
    } catch (failure) {
      const mapped = mapServerErrors(fieldErrors(failure), specKeys);
      const server = failure instanceof ApiError && failure.status === 422 ? {}
        : Object.fromEntries(Object.entries(mapped).filter(([key]) => key in form || key.startsWith('spec:') || key === 'customSpecifications'));
      setErrors(server);
      setSave({ kind: 'error', message: Object.keys(server).length ? text.fixErrors : describeError(failure), reference: errorReference(failure) });
      if (Object.keys(server).length) focusFirstError();
    } finally {
      actionRef.current = false;
    }
  }

  const textInput = (name: TextField, label: string, options: { hint?: string; suggestions?: readonly string[] } = {}) =>
    <FormField id={`field-${name}`} label={label} error={errors[name]} hint={options.hint}>
      {(a11y) => options.suggestions
        ? <SuggestInput {...a11y} value={form[name]} maxLength={textFields[name].max} suggestions={options.suggestions} onChange={(value) => set(name, value)} />
        : <input {...a11y} value={form[name]} maxLength={textFields[name].max} onChange={(event) => set(name, event.target.value)} />}
    </FormField>;
  const numberInput = (name: 'mileageKm' | 'priceEur' | 'powerHp', label: string, unit: string, hint?: string) =>
    <FormField id={`field-${name}`} label={label} error={errors[name]} hint={hint} unit={unit}>
      {(a11y) => <input {...a11y} value={form[name]} inputMode={name === 'priceEur' ? 'decimal' : 'numeric'} autoComplete="off" onChange={(event) => set(name, event.target.value)} />}
    </FormField>;

  const price = parsePrice(form.priceEur);
  const priceHint = typeof price === 'number' ? `${formatEuros(price)}. ${f.priceHint}` : f.priceHint;
  const statusMessage = save.kind === 'saving' ? text.saving : save.kind === 'discarding' ? text.discarding
    : save.kind === 'error' ? save.message : processing ? text.processing : incomplete ? text.pendingPhotos
    : save.kind === 'saved' && !dirty ? text.saved : dirty ? text.dirty : text.clean;

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
      <StatusControl vehicle={archived ? vehicle : { ...vehicle, status, showWhenSold }} disabled={working}
        onChanged={(next, visible) => { setStatus(next); setShowWhenSold(visible); setSave({ kind: 'idle' }); }} />
      {archived ? <div className="admin-notice admin-notice--archived" role="status"><p>{text.archivedNotice}</p>
        <RestoreVehicleButton vehicleId={vehicle.id} className="admin-link" onRestored={(restored) => { resetDraft(restored); setSave({ kind: 'idle' }); }} />
      </div> : null}
    </header>

    {archived ? null : <div className="admin-savebar" data-dirty={dirty || undefined}>
      <p className="admin-savebar__status" role={save.kind === 'error' ? 'alert' : 'status'} data-kind={save.kind}>
        {statusMessage}{save.kind === 'error' && save.reference ? <span className="admin-reference"> {adminCopy.errors.reference}: {save.reference}</span> : null}
      </p>
      <div className="admin-savebar__actions">
        <button type="button" className="admin-link" disabled={!dirty || working || uploading}
          onClick={() => void discard()}>{text.discard}</button>
        <button type="submit" form="vehicle-editor-form" className="button button--dark admin-button" disabled={!dirty || working || processing || incomplete}>
          <span>{save.kind === 'saving' ? text.saving : text.save}</span>
        </button>
      </div>
    </div>}

    <form id="vehicle-editor-form" ref={formRef} className="admin-form" onSubmit={submit} noValidate aria-label={text.sections.vehicle}>
      <fieldset disabled={archived || working} className="admin-form__fields">
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
            {textInput('fuelType', f.fuelType, { suggestions: f.suggestions.fuelType })}
            {textInput('transmission', f.transmission, { suggestions: f.suggestions.transmission })}
            {textInput('bodyType', f.bodyType, { suggestions: f.suggestions.bodyType })}
            {textInput('drivetrain', f.drivetrain, { suggestions: f.suggestions.drivetrain })}
            {textInput('internalReference', f.internalReference, { hint: f.internalHint })}
          </div>
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
            if (actionRef.current || archived) return;
            setForm((current) => ({ ...current, specifications: rows }));
            if (save.kind !== 'saving') setSave({ kind: 'idle' });
          }} />
          {errors.customSpecifications ? <p className="admin-field__error">{errors.customSpecifications}</p> : null}
        </Section>
      </fieldset>

    </form>

    <Section id="photos" title={text.sections.photos}>
      <ImageUploader key={uploaderKey} vehicleId={vehicle.id} images={visibleImages} reload={reload}
        disabled={archived || working} onBusyChange={setUploading} onPendingChange={setUploadState} onQueuedChange={setQueued} onImageAdded={imageAdded}
        onOrderChange={(ids) => {
          setImages((current) => [...ids.map((id) => current.find((image) => image.id === id)!), ...current.filter((image) => !ids.includes(image.id))]);
          setSave({ kind: 'idle' });
        }}
        onRemove={(id) => { setRemoved((current) => [...current, id]); setSave({ kind: 'idle' }); }} />
    </Section>

    {archived ? null : <section className="admin-archive" aria-labelledby="archive-title">
      <h2 id="archive-title" className="admin-section__title">{adminCopy.archive.title}</h2>
      <div>
        <p className="admin-field__hint">{adminCopy.archive.body}</p>
        {/* Archiving makes the vehicle read-only: an upload or unsaved change would be stranded. */}
        <button type="button" className="admin-link admin-link--danger" disabled={archiveLocked} aria-describedby={archiveLocked ? 'archive-locked' : undefined}
          onClick={() => setArchiveOpen(true)}>{text.archiveAction}</button>
        {archiveLocked ? <p id="archive-locked" className="admin-field__hint">{text.archiveLocked}</p> : null}
      </div>
    </section>}

    <ArchiveVehicleDialog vehicleId={archiveOpen ? vehicle.id : null} onClose={() => setArchiveOpen(false)}
      onArchived={() => { setArchiveOpen(false); resetDraft({ ...vehicle, status: 'Archived' }); }} />
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
