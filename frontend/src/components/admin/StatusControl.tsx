import { useId, useRef, useState } from 'react';
import type { AdminVehicle, SettableStatus } from '../../types/admin';
import { adminCopy } from '../../i18n/adminCopy';
import { StatusMark } from './StatusMark';

const ORDER: SettableStatus[] = ['Draft', 'ComingSoon', 'Available', 'Reserved', 'Sold'];

interface StatusControlProps {
  vehicle: AdminVehicle;
  disabled?: boolean;
  onChanged: (status: SettableStatus, showWhenSold: boolean) => void;
}

/** Shows and changes the editor's draft status; only the explicit save action persists it. */
export function StatusControl({ vehicle, disabled, onChanged }: StatusControlProps) {
  const text = adminCopy.status;
  const id = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const selected = vehicle.status;
  const showWhenSold = vehicle.showWhenSold;
  const archived = vehicle.status === 'Archived';
  const visibility = (status: AdminVehicle['status'], visible: boolean) => status === 'Sold' && visible ? text.soldVisible : text.visibility[status];

  function close() {
    setOpen(false);
    triggerRef.current?.focus();
  }

  function toggle() {
    if (open) { close(); return; }
    setOpen(true);
  }

  return <div className="admin-status-control">
    <div className="admin-status-control__current">
      <p className="admin-status-control__label">{text.label}</p>
      <p className="admin-status-control__value"><StatusMark status={vehicle.status} showWhenSold={vehicle.showWhenSold} /></p>
      <p className="admin-field__hint">{visibility(vehicle.status, vehicle.showWhenSold)}</p>
    </div>
    {archived ? null : <button ref={triggerRef} type="button" className="admin-link" aria-expanded={open} aria-controls={`${id}-panel`}
      disabled={disabled} onClick={toggle}>{open ? text.close : text.change}<span aria-hidden="true">{open ? '×' : '→'}</span></button>}
    {open && !archived ? <div id={`${id}-panel`} className="admin-status-control__panel"
      onKeyDown={(event) => { if (event.key === 'Escape' && !disabled) { event.preventDefault(); close(); } }}>
      <fieldset className="admin-status-control__options" disabled={disabled}>
        <legend className="sr-only">{text.choose}</legend>
        {ORDER.map((status) => <label key={status} className="admin-status-option admin-check">
          <input type="radio" name={`${id}-status`} value={status} checked={selected === status}
            aria-labelledby={`${id}-${status}-name`} aria-describedby={`${id}-${status}-hint`} onChange={() => { onChanged(status, showWhenSold); }} />
          <span><span id={`${id}-${status}-name`} className="admin-status-option__name">{text.names[status]}</span>
            <span id={`${id}-${status}-hint`} className="admin-status-option__meta">{visibility(status, showWhenSold)}</span></span>
        </label>)}
        {selected === 'Sold' ? <div className="admin-status-control__sold">
          <label className="admin-check"><input type="checkbox" checked={showWhenSold}
            aria-describedby={`${id}-sold-hint`} onChange={(event) => { onChanged('Sold', event.target.checked); }} />{text.showWhenSold}</label>
          <p id={`${id}-sold-hint`} className="admin-field__hint">{visibility('Sold', showWhenSold)}</p>
        </div> : null}
      </fieldset>
    </div> : null}
  </div>;
}
