import type { FieldA11y } from './FormField';
import { Select } from '../Select';
import { adminCopy } from '../../i18n/adminCopy';

const monthName = new Intl.DateTimeFormat('es-ES', { month: 'long', timeZone: 'UTC' });
const MONTHS = Array.from({ length: 12 }, (_, i) => monthName.format(new Date(Date.UTC(2024, i, 1))));
const OPTIONS = [{ value: '', label: adminCopy.fields.monthNone },
  ...MONTHS.map((name, i) => ({ value: String(i + 1), label: name.charAt(0).toUpperCase() + name.slice(1) }))];

export function MonthSelect({ value, onChange, id, ...a11y }: FieldA11y & { value: string; onChange: (value: string) => void }) {
  return <Select id={id} labelledBy={`${id}-label`} value={value} options={OPTIONS} onChange={onChange} {...a11y} />;
}
