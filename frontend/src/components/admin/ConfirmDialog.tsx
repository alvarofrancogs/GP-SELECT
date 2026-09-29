import { useEffect, useId, useRef } from 'react';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  body: string;
  confirmLabel: string;
  cancelLabel: string;
  busyLabel?: string;
  busy?: boolean;
  error?: string | null;
  onConfirm: () => void;
  onCancel: () => void;
}

/** Native modal dialog: focus trap, Escape and inert background come from the browser. */
export function ConfirmDialog({ open, title, body, confirmLabel, cancelLabel, busyLabel, busy = false, error, onConfirm, onCancel }: ConfirmDialogProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  const id = useId();

  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    if (open && !element.open) element.showModal();
    if (!open && element.open) element.close();
  }, [open]);

  return <dialog ref={dialog} className="admin-dialog" aria-labelledby={`${id}-title`} aria-describedby={`${id}-body`}
    onCancel={(event) => { event.preventDefault(); if (!busy) onCancel(); }}>
    <h2 id={`${id}-title`} className="admin-dialog__title type-heading">{title}</h2>
    <p id={`${id}-body`} className="admin-dialog__body type-body">{body}</p>
    {error ? <p className="admin-notice" role="alert">{error}</p> : null}
    <div className="admin-dialog__actions">
      <button type="button" className="admin-link" onClick={onCancel} disabled={busy} autoFocus>{cancelLabel}</button>
      <button type="button" className="button button--dark admin-button" onClick={onConfirm} disabled={busy}>
        <span>{busy && busyLabel ? busyLabel : confirmLabel}</span>
      </button>
    </div>
  </dialog>;
}
