import type { ReactNode } from 'react';
import { adminCopy } from '../../i18n/adminCopy';

export interface FieldA11y { id: string; 'aria-invalid': true | undefined; 'aria-describedby': string | undefined }

interface FormFieldProps {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  optional?: boolean;
  unit?: string;
  wide?: boolean;
  children: (a11y: FieldA11y) => ReactNode;
}

/** Label, control, hint and error wired together; the control comes from the caller. */
export function FormField({ id, label, error, hint, optional, unit, wide, children }: FormFieldProps) {
  const described = [hint ? `${id}-hint` : null, error ? `${id}-error` : null].filter(Boolean).join(' ') || undefined;
  return <div className={`admin-field${wide ? ' admin-field--wide' : ''}`} data-invalid={error ? true : undefined}>
    <label id={`${id}-label`} htmlFor={id}>{label}{optional ? <span className="admin-field__optional"> ({adminCopy.fields.optional})</span> : null}</label>
    <div className={unit ? 'admin-field__unit' : undefined}>
      {children({ id, 'aria-invalid': error ? true : undefined, 'aria-describedby': described })}
      {unit ? <span aria-hidden="true">{unit}</span> : null}
    </div>
    {hint ? <p id={`${id}-hint`} className="admin-field__hint">{hint}</p> : null}
    {error ? <p id={`${id}-error`} className="admin-field__error">{error}</p> : null}
  </div>;
}
