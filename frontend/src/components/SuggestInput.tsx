import { useEffect, useRef, useState, type InputHTMLAttributes, type KeyboardEvent } from 'react';
import '../styles/select.css';

const fold = (text: string) => text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

interface SuggestInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'list'> {
  id: string;
  value: string;
  suggestions: readonly string[];
  onChange: (value: string) => void;
}

/**
 * Expects a visible label with id `${id}-label` (FormField provides it).
 * Free text with suggestions (WAI-ARIA combobox with list autocomplete), drawn like Select: replaces the
 * browser's <datalist> popup. Any text is still valid; the list only helps to keep values consistent.
 */
export function SuggestInput({ id, value, suggestions, onChange, className = '', disabled, ...rest }: SuggestInputProps) {
  const listId = `${id}-suggestions`;
  const root = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const query = fold(value.trim());
  // While typing, only what matches; on focus with a known value, the whole list to pick another.
  const matches = query && !suggestions.some((s) => fold(s) === query) ? suggestions.filter((s) => fold(s).includes(query)) : suggestions;
  const shown = open && matches.length > 0;

  useEffect(() => {
    if (!shown) return;
    const outside = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false); };
    document.addEventListener('pointerdown', outside);
    return () => document.removeEventListener('pointerdown', outside);
  }, [shown]);

  function pick(text: string) {
    onChange(text);
    setOpen(false);
    setActive(-1);
  }

  function onKeyDown(event: KeyboardEvent) {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (!open) { setOpen(true); setActive(0); } else setActive(Math.min(active + 1, matches.length - 1));
    } else if (event.key === 'ArrowUp' && shown) {
      event.preventDefault();
      setActive(Math.max(active - 1, 0));
    } else if (event.key === 'Enter' && shown && active >= 0) {
      event.preventDefault();
      pick(matches[active]);
    } else if (event.key === 'Escape' && shown) {
      event.preventDefault();
      setOpen(false);
    }
  }

  return <div ref={root} className="select select--suggest" data-open={shown || undefined}>
    <input {...rest} id={id} className={className} value={value} disabled={disabled} autoComplete="off"
      role="combobox" aria-autocomplete="list" aria-expanded={shown} aria-controls={listId}
      aria-activedescendant={shown && active >= 0 ? `${listId}-${active}` : undefined}
      onFocus={() => setOpen(true)} onClick={() => setOpen(true)} onKeyDown={onKeyDown}
      onBlur={(event) => { if (!root.current?.contains(event.relatedTarget as Node)) setOpen(false); }}
      onChange={(event) => { onChange(event.target.value); setOpen(true); setActive(-1); }} />
    <ul id={listId} className="select__list" role="listbox" aria-labelledby={`${id}-label`} hidden={!shown}>
      {matches.map((text, index) => <li key={text} id={`${listId}-${index}`} role="option" className="select__option"
        aria-selected={fold(text) === query} data-active={index === active || undefined}
        onPointerDown={(event) => event.preventDefault()} onPointerMove={() => setActive(index)} onClick={() => pick(text)}>
        <span>{text}</span>
      </li>)}
    </ul>
  </div>;
}
