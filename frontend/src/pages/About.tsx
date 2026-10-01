import { Link } from 'react-router-dom';
import { sceneAssets } from '../assets/sceneAssets';
import { InteriorPageHeader } from '../components/InteriorPageHeader';
import { EditorialMedia } from '../components/EditorialMedia';
import { useLanguage } from '../i18n/useLanguage';
import { qualificationUrl } from '../lib/qualification';
import '../styles/interiors.css';

export function About() {
  const { copy } = useLanguage();
  const text = copy.interiors.about;

  return (
    <article className="interior-page about-page">
      <InteriorPageHeader {...text} />
      <div className="about-opening-media">
        <EditorialMedia asset={sceneAssets.aboutSelection} label={text.images.opening} />
      </div>
      <section className="about-why" aria-labelledby="about-why-title">
        <div className="about-why__copy">
          <h2 id="about-why-title" className="type-section">{text.why.title}</h2>
          <p className="type-body">{text.why.body}</p>
        </div>
        <EditorialMedia asset={sceneAssets.aboutDetail} label={text.images.detail} portrait />
      </section>
      <section className="about-audience" aria-labelledby="about-audience-title">
        <div className="about-audience__intro">
          <h2 id="about-audience-title" className="type-label">{text.audience.title}</h2>
          <p className="type-body">{text.audience.intro}</p>
        </div>
        <ul className="about-audience__rows">
          {text.audience.rows.map((row) => (
            <li key={row.title}>
              <h3 className="type-heading">{row.title}</h3>
              <p className="type-body">{row.body}</p>
            </li>
          ))}
        </ul>
      </section>
      <section className="interior-band about-approach" aria-labelledby="about-approach-title">
        <div>
          <h2 id="about-approach-title" className="type-section">{text.approach.title}</h2>
          <p className="type-body">{text.approach.body}</p>
        </div>
        <ul className="about-approach__rows">
          {text.approach.rows.map((row) => (
            <li key={row.title}>
              <h3 className="type-heading">{row.title}</h3>
              <p className="type-body">{row.body}</p>
            </li>
          ))}
        </ul>
      </section>
      <section className="interior-closing about-closing" aria-labelledby="about-closing-title">
        <h2 id="about-closing-title" className="type-section">{text.closing}</h2>
        <div className="interior-closing__links">
          <Link className="editorial-link type-lede" to={qualificationUrl({ intent: 'search', source: 'nosotros' })}>{text.cta}<span aria-hidden="true">→</span></Link>
          <Link className="editorial-link type-ui" to="/importacion">{text.secondary}<span aria-hidden="true">→</span></Link>
        </div>
        <p className="about-closing__note type-body">{text.closingNote}</p>
      </section>
    </article>
  );
}
