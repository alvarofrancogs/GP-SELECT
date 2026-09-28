import { useLocation } from 'react-router-dom';
import { Button } from '../components/Button';
import { Container } from '../components/Container';
import { useLanguage } from '../i18n/useLanguage';
import type { Dictionary } from '../i18n/types';

export function PlannedPage({ page }: { page?: keyof Dictionary['nav'] }) {
  const { copy } = useLanguage();
  const { search } = useLocation();
  const hasQualificationIntent = page === 'contact' && new URLSearchParams(search).has('intent');

  return (
    <section className="planned-page">
      <Container>
        <p className="eyebrow">{copy.comingSoon.eyebrow}</p>
        <h1>{page ? copy.nav[page] : copy.comingSoon.unknown}</h1>
        <h2>{copy.comingSoon.title}</h2>
        <p>{hasQualificationIntent ? copy.comingSoon.qualification : copy.comingSoon.description}</p>
        <Button to="/">{copy.common.backHome}</Button>
      </Container>
    </section>
  );
}
