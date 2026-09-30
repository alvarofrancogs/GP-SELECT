import { Link } from 'react-router-dom';
import { sceneAssets } from '../assets/sceneAssets';
import { InteriorPageHeader } from '../components/InteriorPageHeader';
import { EditorialMedia } from '../components/EditorialMedia';
import { useLanguage } from '../i18n/useLanguage';
import { qualificationUrl } from '../lib/qualification';
import '../styles/interiors.css';

export function Import() {
  const { copy } = useLanguage();
  const text = copy.interiors.import;

  return (
    <article className="interior-page import-page">
      <InteriorPageHeader {...text} />
      <section className="import-brief" aria-labelledby="import-define-title">
        <div className="import-brief__copy">
          <h2 id="import-define-title" className="type-section">{text.define.title}</h2>
          <p className="type-body">{text.define.body}</p>
        </div>
        <ul className="import-brief__list">
          {text.define.items.map((item) => <li key={item} className="type-body">{item}</li>)}
        </ul>
        <p className="import-brief__detail type-body">{text.define.detail}</p>
      </section>
      <section className="import-chapter import-chapter--search" aria-labelledby="import-search-title">
        <div className="import-chapter__copy">
          <h2 id="import-search-title" className="type-section">{text.search.title}</h2>
          <p className="type-body">{text.search.body}</p>
        </div>
        <EditorialMedia asset={sceneAssets.importSearch} label={text.images.search} />
      </section>
      <section className="import-chapter import-chapter--analysis" aria-labelledby="import-analysis-title">
        <div className="import-chapter__copy">
          <h2 id="import-analysis-title" className="type-section">{text.analysis.title}</h2>
          <p className="type-body">{text.analysis.body}</p>
        </div>
        <EditorialMedia asset={sceneAssets.importInspection} label={text.images.inspection} />
      </section>
      <section className="interior-band import-chapter import-chapter--support" aria-labelledby="import-support-title">
        <div className="import-chapter__copy">
          <h2 id="import-support-title" className="type-section">{text.support.title}</h2>
          <p className="type-body">{text.support.body}</p>
          <p className="import-chapter__detail type-lede">{text.support.detail}</p>
        </div>
        <EditorialMedia asset={sceneAssets.importDelivery} label={text.images.delivery} portrait />
      </section>
      <section className="interior-closing import-closing" aria-labelledby="import-closing-title">
        <h2 id="import-closing-title" className="type-section">{text.closing}</h2>
        <p className="type-body">{text.closingBody}</p>
        <div className="interior-closing__links">
          <Link className="editorial-link type-lede" to={qualificationUrl({ intent: 'search', source: 'importacion' })}>{text.cta}<span aria-hidden="true">→</span></Link>
          <Link className="editorial-link type-ui" to="/contacto?intent=vehicle">{text.secondary}<span aria-hidden="true">→</span></Link>
        </div>
      </section>
    </article>
  );
}
