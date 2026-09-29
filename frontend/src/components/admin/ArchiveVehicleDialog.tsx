import { useState } from 'react';
import { adminApi } from '../../services/adminApi';
import { adminCopy } from '../../i18n/adminCopy';
import { describeError } from '../../lib/adminErrors';
import { ConfirmDialog } from './ConfirmDialog';

interface ArchiveVehicleDialogProps {
  vehicleId: string | null;
  onClose: () => void;
  onArchived: (vehicleId: string) => void;
}

export function ArchiveVehicleDialog({ vehicleId, onClose, onArchived }: ArchiveVehicleDialogProps) {
  const text = adminCopy.archive;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirm() {
    if (!vehicleId) return;
    setBusy(true);
    setError(null);
    try {
      await adminApi.archiveVehicle(vehicleId);
      onArchived(vehicleId);
    } catch (failure) {
      setError(describeError(failure));
    } finally {
      setBusy(false);
    }
  }

  return <ConfirmDialog open={vehicleId !== null} title={text.title} body={text.body} confirmLabel={text.confirm}
    cancelLabel={text.cancel} busyLabel={text.working} busy={busy} error={error} onConfirm={confirm}
    onCancel={() => { setError(null); onClose(); }} />;
}
