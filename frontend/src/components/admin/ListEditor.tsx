import { useId, useState, type KeyboardEvent } from 'react';
import { adminCopy } from '../../i18n/adminCopy';
import { LIMITS } from '../../lib/vehicleForm';

interface ListEditorProps {
  items: string[];
  onChange: (items: string[]) => void;
  label: string;
  error?: string;
  disabled?: boolean;
}

/** Equipment as a plain list: type, add, remove. Empty and duplicate entries never reach the list. */
export function ListEditor({ items, onChange, label, error, disabled }: ListEditorProps) {
  const text = adminCopy.equipment;
  const id = useId();
  const [draft, setDraft] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const full = items.length >= LIMITS.equipmentItems;

  function add() {
    const value = draft.trim().replace(/\s+/g, ' ');
    if (!value) return;
    if (full) { setMessage(text.full); return; }
    if (items.some((item) => item.toLocaleLowerCase('es') === value.toLocaleLowerCase('es'))) { setMessage(text.duplicate); return; }
    onChange([...items, value]);
    setDraft('');
    setMessage(null);
  }
  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== 'Enter') return;
    event.preventDefault(); // Enter adds the item instead of submitting the whole vehicle.
    add();
  }

  const feedback = message ?? error ?? (full ? text.full : null);
  return <div className="admin-list-editor">
    <div className="admin-list-editor__add">
      <label htmlFor={`${id}-input`} className="sr-only">{label}</label>
      <input id={`${id}-input`} value={draft} maxLength={LIMITS.equipmentItem} placeholder={text.placeholder} disabled={disabled || full}
        aria-describedby={`${id}-feedback`} aria-invalid={message || error ? true : undefined}
        onChange={(event) => { setDraft(event.target.value); setMessage(null); }} onKeyDown={onKeyDown} />
      <button type="button" className="admin-link" onClick={add} disabled={disabled || full || !draft.trim()}>{text.add}</button>
      <span className="admin-counter type-numeric">{text.count(items.length)}</span>
    </div>
    <p id={`${id}-feedback`} className="admin-field__error" role="status">{feedback ?? ''}</p>
    {items.length ? <ul className="admin-list-editor__items">{items.map((item, index) => <li key={item}>
      <span>{item}</span>
      <button type="button" className="admin-action" disabled={disabled} onClick={() => onChange(items.filter((_, i) => i !== index))}>
        {text.remove}<span className="sr-only"> {item}</span>
      </button>
    </li>)}</ul> : <p className="admin-empty-line">{text.empty}</p>}
  </div>;
}
