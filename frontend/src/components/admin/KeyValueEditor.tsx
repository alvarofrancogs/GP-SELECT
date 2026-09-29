import { useEffect, useRef, useState } from 'react';
import { adminCopy } from '../../i18n/adminCopy';
import { LIMITS, newRowKey, type SpecificationRow } from '../../lib/vehicleForm';

interface KeyValueEditorProps {
  rows: SpecificationRow[];
  onChange: (rows: SpecificationRow[]) => void;
  errors: Record<string, string>;
  disabled?: boolean;
}

/** Additional specifications as name | value rows. */
export function KeyValueEditor({ rows, onChange, errors, disabled }: KeyValueEditorProps) {
  const text = adminCopy.specifications;
  const [focusKey, setFocusKey] = useState<string | null>(null);
  const list = useRef<HTMLOListElement>(null);
  const full = rows.length >= LIMITS.specRows;

  useEffect(() => {
    if (!focusKey) return;
    list.current?.querySelector<HTMLInputElement>(`[data-row="${focusKey}"]`)?.focus();
    setFocusKey(null);
  }, [focusKey]);

  function update(key: string, patch: Partial<SpecificationRow>) {
    onChange(rows.map((row) => row.key === key ? { ...row, ...patch } : row));
  }
  function add() {
    const key = newRowKey();
    onChange([...rows, { key, label: '', value: '' }]);
    setFocusKey(key);
  }

  return <div className="admin-kv">
    {rows.length ? <div className="admin-kv__head" aria-hidden="true"><span>{text.name}</span><span>{text.value}</span></div>
      : <p className="admin-empty-line">{text.empty}</p>}
    <ol className="admin-kv__rows" ref={list}>{rows.map((row, index) => {
      const error = errors[`spec:${row.key}`];
      const id = `spec-${row.key}`;
      return <li key={row.key} className="admin-kv__row">
        <label htmlFor={`${id}-label`} className="sr-only">{text.name}, {text.row(index + 1)}</label>
        <input id={`${id}-label`} data-row={row.key} value={row.label} maxLength={LIMITS.specLabel} disabled={disabled}
          aria-invalid={error && !row.label.trim() ? true : undefined} aria-describedby={error ? `${id}-error` : undefined}
          onChange={(event) => update(row.key, { label: event.target.value })} />
        <label htmlFor={`${id}-value`} className="sr-only">{text.value}, {text.row(index + 1)}</label>
        <input id={`${id}-value`} value={row.value} maxLength={LIMITS.specValue} disabled={disabled}
          aria-invalid={error && !row.value.trim() ? true : undefined} aria-describedby={error ? `${id}-error` : undefined}
          onChange={(event) => update(row.key, { value: event.target.value })} />
        <button type="button" className="admin-action" disabled={disabled} onClick={() => onChange(rows.filter((r) => r.key !== row.key))}>
          {text.remove}<span className="sr-only"> {text.row(index + 1)}</span>
        </button>
        {error ? <p id={`${id}-error`} className="admin-field__error">{error}</p> : null}
      </li>;
    })}</ol>
    <button type="button" className="admin-link" onClick={add} disabled={disabled || full}>{text.add}<span aria-hidden="true">+</span></button>
    {full ? <p className="admin-field__hint">{text.full}</p> : null}
  </div>;
}
