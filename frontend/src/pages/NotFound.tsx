import { Link } from 'react-router-dom';
import { Button } from '../components/Button';
import { Container } from '../components/Container';
import { useLanguage } from '../i18n/useLanguage';
import '../styles/interiors.css';

export function NotFound() {
  const { copy } = useLanguage();

  return (
    <section className="planned-page">
      <Container>
        <p className="eyebrow">{copy.notFound.eyebrow}</p>
        <h1>{copy.notFound.title}</h1>
        <p>{copy.notFound.description}</p>
        <div className="planned-page__actions">
          <Button to="/">{copy.common.backHome}</Button>
          <Link className="editorial-link type-ui" to="/vehiculos">{copy.notFound.vehicles}<span aria-hidden="true">→</span></Link>
        </div>
      </Container>
    </section>
  );
}
