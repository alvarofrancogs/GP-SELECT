import { useEffect, useId, useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react';
import { useNativeSelect } from '../hooks/useNativeSelect';
import { opensAbove, scrollOptionIntoView } from '../lib/listbox';
import '../styles/select.css';

const fold = (text: string) => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

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
  'aria-required'?: boolean;
}

/**
 * Select-only combobox (WAI-ARIA APG pattern) in the site's own language: a ruled trigger and a paper
 * list that unfolds below it, or above when there is no room. Keyboard: arrows, Home/End, typing a
 * letter, Enter/Space to choose, Escape to close.
 */
export function Select({ value, options, onChange, labelledBy, id, className = '', disabled, ...aria }: SelectProps) {
  const ownId = useId();
  const native = useNativeSelect();
  const baseId = id ?? ownId;
  const listId = `${baseId}-listbox`;
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const typed = useRef({ text: '', at: 0 });
  // Whether the highlighted option was reached with the mouse rather than the keyboard.
  const pointed = useRef(false);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [above, setAbove] = useState(false);
  const [alignEnd, setAlignEnd] = useState(false);
  const selectedIndex = Math.max(0, options.findIndex((option) => option.value === value));
  const selected = options[selectedIndex];
  const optionId = (index: number) => `${baseId}-option-${index}`;

  function show(index = selectedIndex) {
    if (disabled || !options.length) return;
    pointed.current = false;
    setActive(index);
    setOpen(true);
  }
  function choose(index: number) {
    const option = options[index];
    setOpen(false);
    if (option && option.value !== value) onChange(option.value);
  }

  // Opens upwards when the list would not fit below the trigger, and lines up with the trigger's right
  // edge when it would cross the page's (on a narrow screen the list is wider than its trigger).
  useLayoutEffect(() => {
    if (!open || native) return;
    function position() {
      if (!trigger.current || !list.current) return;
      const box = trigger.current.getBoundingClientRect();
      const viewport = window.visualViewport;
      const top = Math.max(viewport?.offsetTop ?? 0, document.querySelector('.site-header')?.getBoundingClientRect().bottom ?? 0);
      const bottom = (viewport?.offsetTop ?? 0) + (viewport?.height ?? window.innerHeight);
      const above = opensAbove(trigger.current, list.current) && box.top - top > bottom - box.bottom;
      setAbove(above);
      list.current.style.maxHeight = `${Math.max(0, Math.min(288, (above ? box.top - top : bottom - box.bottom) - 16))}px`;
      setAlignEnd(box.left + list.current.offsetWidth > document.documentElement.clientWidth);
    }
    position();
    window.addEventListener('scroll', position, { passive: true });
    window.addEventListener('resize', position);
    window.visualViewport?.addEventListener('resize', position);
    return () => {
      window.removeEventListener('scroll', position);
      window.removeEventListener('resize', position);
      window.visualViewport?.removeEventListener('resize', position);
    };
  }, [open, native]);

  useEffect(() => {
    if (open && list.current) scrollOptionIntoView(list.current, active);
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
    const text = (now - typed.current.at > 500 ? '' : typed.current.text) + fold(key);
    typed.current = { text, at: now };
    const start = open ? active : selectedIndex;
    const order = options.map((_, i) => (start + (text.length === 1 ? 1 : 0) + i) % options.length);
    const match = order.find((i) => fold(options[i].label).startsWith(text));
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
    // Tab keeps an option chosen with the keyboard (APG); one the mouse only passed over is not a choice.
    if (open && event.key === 'Tab') { if (pointed.current) setOpen(false); else choose(active); return; }
    const action = keys[event.key];
    if (action) {
      event.preventDefault();
      pointed.current = false;
      action();
    } else if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
      event.preventDefault();
      typeahead(event.key);
    }
  }

  // The OS picker owns viewport fitting, scrolling and touch accessibility on small/coarse screens.
  if (native) return <div className={`select select--native ${className}`.trim()}>
    <div className="select__trigger" data-disabled={disabled || undefined}>
      <span className="select__value" aria-hidden="true">{selected?.label}</span>
      <span className="select__chevron" aria-hidden="true" />
      <select id={baseId} className="select__native" value={value} disabled={disabled} aria-labelledby={labelledBy}
        {...aria} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    </div>
  </div>;

  return <div ref={root} className={`select select--custom ${className}`.trim()} data-open={open || undefined} data-above={above || undefined} data-align-end={alignEnd || undefined}>
    <button ref={trigger} id={baseId} type="button" className="select__trigger" role="combobox" disabled={disabled}
      aria-haspopup="listbox" aria-expanded={open} aria-controls={listId} aria-labelledby={labelledBy}
      aria-activedescendant={open ? optionId(active) : undefined} {...aria}
      onClick={() => open ? setOpen(false) : show()} onKeyDown={onKeyDown}
      onKeyUp={(event) => { if (event.key === ' ') event.preventDefault(); }}
      onBlur={(event) => { if (!root.current?.contains(event.relatedTarget as Node)) setOpen(false); }}>
      <span className="select__value">{selected?.label}</span>
      <span className="select__chevron" aria-hidden="true" />
    </button>
    <ul ref={list} id={listId} className="select__list" role="listbox" aria-labelledby={labelledBy} tabIndex={-1} aria-hidden={!open} inert={!open}>
      {options.map((option, index) => <li key={option.value} id={optionId(index)} role="option" className="select__option"
        aria-selected={option.value === value} data-active={index === active || undefined}
        onPointerDown={(event) => event.preventDefault()} onPointerMove={() => { pointed.current = true; setActive(index); }}
        onClick={() => { choose(index); trigger.current?.focus({ preventScroll: true }); }}>
        <span>{option.label}</span>
      </li>)}
    </ul>
  </div>;
}
