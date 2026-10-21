import { useRef, useState } from 'react';
import { adminApi, ApiError } from '../../services/adminApi';
import { adminCopy } from '../../i18n/adminCopy';
import { describeError } from '../../lib/adminErrors';
import { ConfirmDialog } from './ConfirmDialog';

interface DeleteVehicleDialogProps {
  vehicle: { id: string; make: string; model: string; variant?: string | null } | null;
  unsaved?: boolean;
  onClose: () => void;
  onDeleted: (id: string) => void;
}

export function DeleteVehicleDialog({ vehicle, unsaved = false, onClose, onDeleted }: DeleteVehicleDialogProps) {
  const text = adminCopy.delete;
  const pending = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const name = vehicle ? [vehicle.make, vehicle.model, vehicle.variant].filter(Boolean).join(' ') : '';

  async function confirm() {
    if (!vehicle || pending.current) return;
    pending.current = true;
    setBusy(true);
    setError(null);
    try {
      // A 404 on a retry means an earlier attempt already deleted it (its response was lost).
      await adminApi.deleteVehicle(vehicle.id).catch((failure: unknown) => {
        if (!(failure instanceof ApiError && failure.status === 404)) throw failure;
      });
      onDeleted(vehicle.id);
    } catch (failure) {
      setError(describeError(failure));
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }

  return <ConfirmDialog open={vehicle !== null} title={text.title}
    body={`${text.body(name)}${unsaved ? ` ${text.unsaved}` : ''}`} confirmLabel={text.confirm}
    cancelLabel={text.cancel} busyLabel={text.working} busy={busy} error={error} onConfirm={confirm}
    onCancel={() => { setError(null); onClose(); }} />;
}
