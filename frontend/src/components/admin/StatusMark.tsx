import type { VehicleStatus } from '../../types/admin';
import { adminCopy } from '../../i18n/adminCopy';

/** Text first; the square only repeats it: filled = in the public catalogue, outlined = not listed. */
export function StatusMark({ status, showWhenSold = false }: { status: VehicleStatus; showWhenSold?: boolean }) {
  const soldVisible = status === 'Sold' && showWhenSold;
  return <span className="admin-status" data-status={status} data-sold-visible={soldVisible || undefined}>
    <span className="admin-status__mark" aria-hidden="true" /><span>{soldVisible ? adminCopy.status.soldVisibleName : adminCopy.status.names[status]}</span>
  </span>;
}
