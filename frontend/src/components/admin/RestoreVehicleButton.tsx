import { useState } from 'react';
import { adminApi } from '../../services/adminApi';
import type { AdminVehicle } from '../../types/admin';
import { adminCopy } from '../../i18n/adminCopy';
import { describeError } from '../../lib/adminErrors';

/** Brings an archived vehicle back as a draft. `label` adds the vehicle name for screen readers in lists. */
export function RestoreVehicleButton({ vehicleId, label, className = 'admin-action', onRestored }: {
  vehicleId: string; label?: string; className?: string; onRestored: (vehicle: AdminVehicle) => void;
}) {
  const text = adminCopy.archive;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function restore() {
    setBusy(true);
    setError(null);
    try {
      onRestored(await adminApi.restoreVehicle(vehicleId));
    } catch (failure) {
      setError(describeError(failure));
      setBusy(false);
    }
  }

  return <>
    <button type="button" className={className} disabled={busy} onClick={restore}>
      {busy ? text.restoring : text.restore}{label ? <span className="sr-only"> {label}</span> : null}
    </button>
    {error ? <p className="admin-field__error" role="alert">{error}</p> : null}
  </>;
}
