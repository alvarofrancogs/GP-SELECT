import { Link } from 'react-router-dom';
import { sceneAssets } from '../assets/sceneAssets';
import { InteriorPageHeader } from '../components/InteriorPageHeader';
import { EditorialMedia } from '../components/EditorialMedia';
import { useLanguage } from '../i18n/useLanguage';
import '../styles/interiors.css';

export function About() {
  const { copy } = useLanguage();
  const text = copy.interiors.about;
  return (
    <article className="interior-page about-page">
      <InteriorPageHeader {...text} />
      <section className="about-introduction" aria-labelledby="about-introduction-title">
        <EditorialMedia asset={sceneAssets.aboutSelection} label={text.images.selection} />
        <div className="about-introduction__copy">
          <h2 id="about-introduction-title" className="type-heading">{text.introduction.title}</h2>
          <p className="type-body">{text.introduction.body}</p>
        </div>
      </section>
      <h2 className="about-manifesto type-display">
        {text.manifesto.map((line) => <span key={line}>{line}</span>)}
      </h2>
      <section className="about-selection" aria-labelledby="about-selection-title">
        <div>
          <h2 id="about-selection-title" className="type-section">{text.selection.title}</h2>
          <p className="type-body">{text.selection.body}</p>
        </div>
        <EditorialMedia asset={sceneAssets.aboutDetail} label={text.images.detail} portrait />
      </section>
      <section className="about-principles" aria-labelledby="about-principles-title">
        <h2 id="about-principles-title" className="type-label">{text.principlesLabel}</h2>
        <div className="about-principles__columns">
          {text.principles.map((principle) => <div key={principle.title}>
            <h3 className="type-heading">{principle.title}</h3>
            <p className="type-body">{principle.body}</p>
          </div>)}
        </div>
      </section>
      <section className="interior-band about-europe" aria-labelledby="about-europe-title">
        <p className="type-label">{text.europe.label}</p>
        <h2 id="about-europe-title" className="type-section">{text.europe.title}</h2>
        <div className="about-europe__copy">
          <p className="type-lede">{text.europe.body}</p>
          <p className="type-body">{text.europe.detail}</p>
        </div>
      </section>
      <div className="interior-closing">
        <Link className="editorial-link type-section" to="/contacto">{text.cta}<span aria-hidden="true">→</span></Link>
      </div>
    </article>
  );
}
