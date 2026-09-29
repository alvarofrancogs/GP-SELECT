import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { adminApi } from '../../services/adminApi';
import type { AdminVehicleRow } from '../../types/admin';
import { adminCopy } from '../../i18n/adminCopy';
import { describeError, errorReference } from '../../lib/adminErrors';
import { formatNumber, searchable } from '../../lib/adminFormat';
import { formatPrice, formatRegistration } from '../../lib/vehicleFormat';
import { StatusMark } from '../../components/admin/StatusMark';
import { ArchiveVehicleDialog } from '../../components/admin/ArchiveVehicleDialog';

export function AdminVehicles() {
  const text = adminCopy.list;
  const [vehicles, setVehicles] = useState<AdminVehicleRow[] | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [attempt, setAttempt] = useState(0);
  const [query, setQuery] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [archiving, setArchiving] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState('');

  useEffect(() => {
    let ignore = false;
    adminApi.listVehicles().then((rows) => { if (!ignore) { setVehicles(rows); setError(null); } },
      (failure) => { if (!ignore) setError(failure); });
    return () => { ignore = true; };
  }, [attempt]);

  const archivedCount = vehicles?.filter((v) => v.status === 'Archived').length ?? 0;
  const shown = useMemo(() => {
    const terms = searchable(query).split(/\s+/).filter(Boolean);
    return (vehicles ?? []).filter((v) => (showArchived || v.status !== 'Archived')
      && terms.every((term) => searchable(`${v.make} ${v.model} ${v.variant ?? ''}`).includes(term)));
  }, [vehicles, query, showArchived]);

  if (error && !vehicles) return <div className="admin-state" role="alert">
    <p className="type-ui">{describeError(error)}</p>
    {errorReference(error) ? <p className="admin-reference">{adminCopy.errors.reference}: {errorReference(error)}</p> : null}
    <button type="button" className="admin-link" onClick={() => { setError(null); setAttempt((n) => n + 1); }}>{adminCopy.errors.retry}</button>
  </div>;
  if (!vehicles) return <p className="admin-state type-ui" role="status">{text.loading}</p>;

  const addLink = <Link to="/admin/nuevo" className="button button--dark admin-button"><span>{text.add}</span><span className="button-arrow" aria-hidden="true">→</span></Link>;
  if (vehicles.length === 0) return <section className="admin-empty" aria-labelledby="admin-empty-title">
    <h1 id="admin-empty-title" className="admin-title type-section">{text.emptyTitle}</h1>
    <p className="type-body">{text.emptyBody}</p>
    {addLink}
  </section>;

  return <section className="admin-list" aria-labelledby="admin-list-title">
    <header className="admin-page-head">
      <h1 id="admin-list-title" className="admin-title type-section">{text.title}<span className="admin-title__count type-fine">{shown.length}</span></h1>
      {addLink}
    </header>
    <div className="admin-toolbar">
      <div className="admin-field admin-field--inline">
        <label htmlFor="admin-search">{text.search}</label>
        <input id="admin-search" type="search" value={query} placeholder={text.searchPlaceholder} onChange={(event) => setQuery(event.target.value)} />
      </div>
      {archivedCount > 0 ? <label className="admin-check">
        <input type="checkbox" checked={showArchived} onChange={(event) => setShowArchived(event.target.checked)} />
        {text.showArchived} ({archivedCount})
      </label> : null}
      <p className="sr-only" role="status">{text.count(shown.length)}{announcement ? `. ${announcement}` : ''}</p>
    </div>
    {shown.length === 0 ? <p className="admin-state type-ui">{text.noResults}</p> : <>
      <div className="admin-rows__head type-ui" aria-hidden="true">
        <span />
        <span>{text.columns.vehicle}</span><span>{text.columns.year}</span><span>{text.columns.mileage}</span>
        <span>{text.columns.power}</span><span className="admin-rows__numeric">{text.columns.price}</span><span>{text.columns.status}</span><span />
      </div>
      <ul className="admin-rows">{shown.map((v) => <VehicleRow key={v.id} vehicle={v} onArchive={() => setArchiving(v.id)} />)}</ul>
    </>}
    <ArchiveVehicleDialog vehicleId={archiving} onClose={() => setArchiving(null)} onArchived={(id) => {
      setVehicles((rows) => rows?.map((row) => row.id === id ? { ...row, status: 'Archived' } : row) ?? rows);
      setArchiving(null);
      setAnnouncement(adminCopy.archive.done);
    }} />
  </section>;
}

function VehicleRow({ vehicle: v, onArchive }: { vehicle: AdminVehicleRow; onArchive: () => void }) {
  const text = adminCopy.list;
  const archived = v.status === 'Archived';
  const href = `/admin/vehiculos/${v.id}`;
  const name = <span className="sr-only"> {v.make} {v.model}</span>;
  return <li className="admin-row" data-archived={archived || undefined}>
    <Link to={href} className="admin-row__thumb" tabIndex={-1} aria-hidden="true">
      {v.coverCardUrl ? <img src={v.coverCardUrl} alt="" width={160} height={120} loading="lazy" decoding="async" /> : <span className="type-ui">{text.noPhoto}</span>}
    </Link>
    <div className="admin-row__identity">
      <Link to={href} className="admin-row__name"><span className="admin-row__model">{v.make} {v.model}</span>{v.variant ? <span className="admin-row__variant">{v.variant}</span> : null}</Link>
      <p className="admin-row__meta">{v.internalReference ? <span>{v.internalReference}</span> : null}<span>{text.photos(v.readyImageCount)}</span></p>
    </div>
    <div className="admin-row__facts">
    <p className="admin-row__fact type-numeric"><span className="admin-row__label">{text.columns.year}</span>{formatRegistration(v.year, v.month, 'es')}</p>
    <p className="admin-row__fact type-numeric" data-empty={v.mileageKm === null || undefined}><span className="admin-row__label">{text.columns.mileage}</span>{v.mileageKm === null ? '—' : `${formatNumber(v.mileageKm)} km`}</p>
    <p className="admin-row__fact type-numeric" data-empty={v.powerHp === null || undefined}><span className="admin-row__label">{text.columns.power}</span>{v.powerHp === null ? '—' : `${formatNumber(v.powerHp)} CV`}</p>
    <p className="admin-row__fact admin-row__price type-numeric"><span className="admin-row__label">{text.columns.price}</span>{formatPrice(v.priceEur, 'es', text.onRequest)}</p>
    <p className="admin-row__fact admin-row__state"><span className="admin-row__label">{text.columns.status}</span><StatusMark status={v.status} /></p>
    </div>
    <div className="admin-row__actions">
      {archived ? null : <>
        <Link to={href} className="admin-action">{text.edit}{name}</Link>
        <Link to={`${href}/vista-previa`} className="admin-action">{text.preview}{name}</Link>
        <button type="button" className="admin-action" onClick={onArchive}>{text.archive}{name}</button>
      </>}
    </div>
  </li>;
}
