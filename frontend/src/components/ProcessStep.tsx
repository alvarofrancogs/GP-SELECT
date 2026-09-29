import type { EditorialCopy } from '../i18n/types';

interface ProcessStepProps extends EditorialCopy {
  number: number;
  detail: string;
}

export function ProcessStep({ number, title, body, detail }: ProcessStepProps) {
  return (
    <li className="import-step">
      <span className="import-step__number type-ui type-numeric" aria-hidden="true">{String(number).padStart(2, '0')}</span>
      <div>
        <h2 className="type-section">{title}</h2>
        <p className="type-body">{body}</p>
        <p className="import-step__detail type-ui">{detail}</p>
      </div>
    </li>
  );
}
