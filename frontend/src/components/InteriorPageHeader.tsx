import type { InteriorHeaderCopy } from '../i18n/types';

export function InteriorPageHeader({ title, lede }: InteriorHeaderCopy) {
  return (
    <header className="interior-header">
      <h1 className="interior-header__line">
        <span className="interior-header__title type-display">{title}</span>{' '}
        <span className="interior-header__lede type-lede">{lede}</span>
      </h1>
    </header>
  );
}
