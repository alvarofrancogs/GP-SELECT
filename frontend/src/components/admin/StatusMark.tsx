import type { VehicleStatus } from '../../types/admin';
import { adminCopy } from '../../i18n/adminCopy';

/** Text first; the square only repeats it: filled = in the public catalogue, outlined = not listed. */
export function StatusMark({ status }: { status: VehicleStatus }) {
  return <span className="admin-status" data-status={status}>
    <span className="admin-status__mark" aria-hidden="true" />{adminCopy.status.names[status]}
  </span>;
}
