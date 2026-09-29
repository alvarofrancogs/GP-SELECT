import { Link } from 'react-router-dom';
import { sceneAssets } from '../assets/sceneAssets';
import { InteriorPageHeader } from '../components/InteriorPageHeader';
import { EditorialMedia } from '../components/EditorialMedia';
import { ProcessStep } from '../components/ProcessStep';
import { useLanguage } from '../i18n/useLanguage';
import { qualificationUrl } from '../lib/qualification';
import '../styles/interiors.css';

export function Import() {
  const { copy } = useLanguage();
  const text = copy.interiors.import;
  const groups = [
    { start: 0, end: 2, asset: sceneAssets.importSearch, label: text.images.search },
    { start: 2, end: 3, asset: sceneAssets.importInspection, label: text.images.inspection },
    { start: 3, end: 5, asset: sceneAssets.importDelivery, label: text.images.delivery },
  ];

  return (
    <article className="interior-page import-page">
      <InteriorPageHeader {...text} />
      {groups.map((group) => (
        <div key={group.start} className={`import-stage${group.start === 3 ? ' interior-band import-stage--dark' : ''}${group.start === 2 ? ' import-stage--reverse' : ''}`}>
          <ol className="import-steps" start={group.start + 1}>
            {text.steps.slice(group.start, group.end).map((step, index) => (
              <ProcessStep key={step.id} {...step} number={group.start + index + 1} />
            ))}
          </ol>
          <EditorialMedia asset={group.asset} label={group.label} portrait={group.start !== 2} />
        </div>
      ))}
      <section className="interior-closing" aria-labelledby="import-closing-title">
        <h2 id="import-closing-title" className="type-section">{text.closing}</h2>
        <div className="interior-closing__links">
          <Link className="editorial-link type-lede" to={qualificationUrl({ intent: 'search', source: 'importacion' })}>{text.cta}<span aria-hidden="true">→</span></Link>
          <Link className="editorial-link type-ui" to="/contacto">{text.secondary}<span aria-hidden="true">→</span></Link>
        </div>
      </section>
    </article>
  );
}
