import { useEffect, useId, useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react';
import '../styles/select.css';

export interface SelectOption { value: string; label: string }

interface SelectProps {
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  /** Id of the visible label (the combobox takes its name from it and its value from the text shown). */
  labelledBy: string;
  id?: string;
  className?: string;
  disabled?: boolean;
  'aria-describedby'?: string;
  'aria-invalid'?: true;
}

/**
 * Select-only combobox (WAI-ARIA APG pattern) in the site's own language: a ruled trigger and a paper
 * list that unfolds below it, or above when there is no room. Keyboard: arrows, Home/End, typing a
 * letter, Enter/Space to choose, Escape to close.
 */
export function Select({ value, options, onChange, labelledBy, id, className = '', disabled, ...aria }: SelectProps) {
  const ownId = useId();
  const baseId = id ?? ownId;
  const listId = `${baseId}-listbox`;
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const typed = useRef({ text: '', at: 0 });
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [above, setAbove] = useState(false);
  const selectedIndex = Math.max(0, options.findIndex((option) => option.value === value));
  const selected = options[selectedIndex];
  const optionId = (index: number) => `${baseId}-option-${index}`;

  function show(index = selectedIndex) {
    if (disabled || !options.length) return;
    setActive(index);
    setOpen(true);
  }
  function choose(index: number) {
    const option = options[index];
    setOpen(false);
    if (option && option.value !== value) onChange(option.value);
  }

  // Opens upwards when the list would not fit below the trigger.
  useLayoutEffect(() => {
    if (!open || !trigger.current || !list.current) return;
    const box = trigger.current.getBoundingClientRect();
    const needed = Math.min(list.current.scrollHeight, 288) + 12;
    setAbove(window.innerHeight - box.bottom < needed && box.top > window.innerHeight - box.bottom);
  }, [open]);

  useEffect(() => {
    if (open) list.current?.children[active]?.scrollIntoView({ block: 'nearest' });
  }, [open, active]);

  // A press anywhere else closes the list without choosing.
  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false); };
    document.addEventListener('pointerdown', outside);
    return () => document.removeEventListener('pointerdown', outside);
  }, [open]);

  /** Typing jumps to the next option starting with what was typed in the last half second. */
  function typeahead(key: string) {
    const now = Date.now();
    const text = (now - typed.current.at > 500 ? '' : typed.current.text) + key.toLowerCase();
    typed.current = { text, at: now };
    const start = open ? active : selectedIndex;
    const order = options.map((_, i) => (start + (text.length === 1 ? 1 : 0) + i) % options.length);
    const match = order.find((i) => options[i].label.toLowerCase().startsWith(text));
    if (match !== undefined) show(match);
  }

  function onKeyDown(event: KeyboardEvent) {
    const last = options.length - 1;
    const keys: Record<string, () => void> = open ? {
      ArrowDown: () => setActive(Math.min(active + 1, last)),
      ArrowUp: () => event.altKey ? choose(active) : setActive(Math.max(active - 1, 0)),
      Home: () => setActive(0),
      End: () => setActive(last),
      PageDown: () => setActive(Math.min(active + 10, last)),
      PageUp: () => setActive(Math.max(active - 10, 0)),
      Enter: () => choose(active),
      ' ': () => choose(active),
      Escape: () => setOpen(false),
    } : {
      ArrowDown: () => show(),
      ArrowUp: () => show(),
      Enter: () => show(),
      ' ': () => show(),
      Home: () => show(0),
      End: () => show(last),
    };
    if (open && event.key === 'Tab') { choose(active); return; }
    const action = keys[event.key];
    if (action) {
      event.preventDefault();
      action();
    } else if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
      event.preventDefault();
      typeahead(event.key);
    }
  }

  return <div ref={root} className={`select ${className}`.trim()} data-open={open || undefined} data-above={above || undefined}>
    <button ref={trigger} id={baseId} type="button" className="select__trigger" role="combobox" disabled={disabled}
      aria-haspopup="listbox" aria-expanded={open} aria-controls={listId} aria-labelledby={labelledBy}
      aria-activedescendant={open ? optionId(active) : undefined} {...aria}
      onClick={() => open ? setOpen(false) : show()} onKeyDown={onKeyDown}
      onKeyUp={(event) => { if (event.key === ' ') event.preventDefault(); }}
      onBlur={(event) => { if (!root.current?.contains(event.relatedTarget as Node)) setOpen(false); }}>
      <span className="select__value">{selected?.label}</span>
      <span className="select__chevron" aria-hidden="true" />
    </button>
    <ul ref={list} id={listId} className="select__list" role="listbox" aria-labelledby={labelledBy} tabIndex={-1} hidden={!open}>
      {options.map((option, index) => <li key={option.value} id={optionId(index)} role="option" className="select__option"
        aria-selected={option.value === value} data-active={index === active || undefined}
        onPointerDown={(event) => event.preventDefault()} onPointerMove={() => setActive(index)}
        onClick={() => { choose(index); trigger.current?.focus(); }}>
        <span>{option.label}</span>
      </li>)}
    </ul>
  </div>;
}
