import { useId, useState } from 'react';
import { adminApi } from '../../services/adminApi';
import type { AdminVehicle, SettableStatus } from '../../types/admin';
import { adminCopy } from '../../i18n/adminCopy';
import { describeError } from '../../lib/adminErrors';
import { StatusMark } from './StatusMark';

const ORDER: SettableStatus[] = ['Draft', 'ComingSoon', 'Available', 'Reserved', 'Sold'];

interface StatusControlProps {
  vehicle: AdminVehicle;
  dirty: boolean;
  onChanged: (vehicle: AdminVehicle) => void;
}

/** Current state in words, and a disclosure with the other states and what each one means publicly. */
export function StatusControl({ vehicle, dirty, onChanged }: StatusControlProps) {
  const text = adminCopy.status;
  const id = useId();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<SettableStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState('');
  const archived = vehicle.status === 'Archived';
  const readyImages = vehicle.images.filter((image) => image.state === 'Ready').length;

  async function change(status: SettableStatus) {
    setBusy(status);
    setError(null);
    try {
      const updated = await adminApi.changeStatus(vehicle.id, status);
      onChanged(updated);
      setOpen(false);
      setDone(text.changed(text.names[status]));
    } catch (failure) {
      setError(describeError(failure));
    } finally {
      setBusy(null);
    }
  }

  return <div className="admin-status-control">
    <div className="admin-status-control__current">
      <p className="admin-status-control__label">{text.label}</p>
      <p className="admin-status-control__value"><StatusMark status={vehicle.status} /></p>
      <p className="admin-field__hint">{text.visibility[vehicle.status]}</p>
    </div>
    {archived ? null : <button type="button" className="admin-link" aria-expanded={open} aria-controls={`${id}-panel`}
      onClick={() => { setOpen(!open); setError(null); }}>{open ? text.close : text.change}<span aria-hidden="true">{open ? '×' : '→'}</span></button>}
    <p className="sr-only" role="status">{busy ? text.changing : done}</p>
    {open ? <div id={`${id}-panel`} className="admin-status-control__panel">
      {dirty ? <p className="admin-notice">{text.saveFirst}</p> : null}
      {!dirty && !error && readyImages === 0 ? <p className="admin-field__hint">{adminCopy.errors.codes.images_required}</p> : null}
      {error ? <p className="admin-notice" role="alert">{error}</p> : null}
      <ul>{ORDER.filter((status) => status !== vehicle.status).map((status) => <li key={status}>
        <button type="button" className="admin-status-option" disabled={dirty || busy !== null} onClick={() => change(status)}>
          <span className="admin-status-option__name">{busy === status ? text.changing : text.actions[status]}</span>
          <span className="admin-status-option__meta">{text.visibility[status]}</span>
        </button>
      </li>)}</ul>
    </div> : null}
  </div>;
}
