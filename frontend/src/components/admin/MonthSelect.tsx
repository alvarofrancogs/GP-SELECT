import type { FieldA11y } from './FormField';
import { adminCopy } from '../../i18n/adminCopy';

const monthName = new Intl.DateTimeFormat('es-ES', { month: 'long', timeZone: 'UTC' });
const MONTHS = Array.from({ length: 12 }, (_, i) => monthName.format(new Date(Date.UTC(2024, i, 1))));

export function MonthSelect({ value, onChange, ...a11y }: FieldA11y & { value: string; onChange: (value: string) => void }) {
  return <select {...a11y} value={value} onChange={(event) => onChange(event.target.value)}>
    <option value="">{adminCopy.fields.monthNone}</option>
    {MONTHS.map((name, i) => <option key={name} value={String(i + 1)}>{name.charAt(0).toUpperCase() + name.slice(1)}</option>)}
  </select>;
}
