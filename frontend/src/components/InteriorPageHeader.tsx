import type { InteriorHeaderCopy } from '../i18n/types';

export function InteriorPageHeader({ title, lede }: InteriorHeaderCopy) {
  return (
    <header className="interior-header">
      <div className="interior-header__line">
        <h1 className="type-display">{title}</h1>
        <p className="type-lede">{lede}</p>
      </div>
    </header>
  );
}
