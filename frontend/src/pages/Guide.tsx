import { Link } from 'react-router-dom';
import { InteriorPageHeader } from '../components/InteriorPageHeader';
import { guideCopy } from '../i18n/guideCopy';
import type { GuideSection } from '../i18n/guideCopy';
import { useLanguage } from '../i18n/useLanguage';
import { qualificationUrl } from '../lib/qualification';
import '../styles/interiors.css';

function Section({ section, rows }: { section: GuideSection; rows?: { title: string; body: string }[] }) {
  const titleId = `guide-${section.id}-title`;
  return (
    <section className="import-brief" aria-labelledby={titleId}>
      <div className="import-brief__copy">
        <h2 id={titleId} className="type-section">{section.title}</h2>
      </div>
      <div>
        {section.blocks.map((block, index) => 'p' in block
          ? <p key={index} className="type-body">{block.p}</p>
          : <ul key={index} className="import-brief__list">{block.list.map((item) => <li key={item} className="type-body">{item}</li>)}</ul>)}
        {rows ? (
          <ul className="import-brief__list">
            {rows.map((row) => (
              <li key={row.title}>
                <h3 className="type-heading">{row.title}</h3>
                <p className="type-body">{row.body}</p>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </section>
  );
}

/** The import guide (SEO B8). It reuses the Import page's composition. */
export function Guide() {
  const { locale, href } = useLanguage();
  const text = guideCopy[locale];

  return (
    <article className="interior-page import-page guide-page">
      <InteriorPageHeader title={text.title} lede={text.lede} />
      <section className="import-brief" aria-label={text.reviewed.label}>
        <div className="import-brief__copy">
          <p className="type-ui">{text.reviewed.label} <time dateTime={text.reviewed.iso}>{text.reviewed.date}</time></p>
        </div>
        <p className="type-body">{text.notice}</p>
      </section>
      {text.sections.map((section) => <Section key={section.id} section={section} />)}
      <Section section={{ id: 'faq', title: text.faq.title, blocks: [] }} rows={text.faq.rows} />
      <Section section={text.gpSelect} />
      <section className="import-brief" aria-labelledby="guide-sources-title">
        <div className="import-brief__copy">
          <h2 id="guide-sources-title" className="type-section">{text.sources.title}</h2>
          <p className="type-body">{text.sources.intro}</p>
        </div>
        <ul className="import-brief__list guide-sources">
          {text.sources.rows.map((row) => (
            <li key={row.href} className="type-body"><a href={row.href} target="_blank" rel="noreferrer">{row.label}</a></li>
          ))}
        </ul>
      </section>
      <section className="interior-closing import-closing" aria-labelledby="guide-closing-title">
        <h2 id="guide-closing-title" className="type-section">{text.closing}</h2>
        <p className="type-body">{text.closingBody}</p>
        <div className="interior-closing__links">
          <Link className="editorial-link type-lede" to={href(qualificationUrl({ intent: 'search', source: 'guia' }))}>{text.cta}<span aria-hidden="true">→</span></Link>
          <Link className="editorial-link type-ui" to={href('/importacion')}>{text.secondary}<span aria-hidden="true">→</span></Link>
        </div>
      </section>
    </article>
  );
}
