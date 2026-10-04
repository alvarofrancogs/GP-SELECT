import { Link } from 'react-router-dom';
import { legalConfig } from '../config/legal';
import { legalPages, legalUi, pendingLabels } from '../i18n/legalCopy';
import type { LegalBlock, LegalDoc, LegalInline } from '../i18n/legalCopy';
import { useLanguage } from '../i18n/useLanguage';
import '../styles/interiors.css';
import '../styles/legal.css';

/** One run of legal text. A missing holder detail is marked, never filled with a guess. */
export function LegalText({ inline }: { inline: LegalInline }) {
  if (typeof inline === 'string') return <>{inline}</>;
  if ('field' in inline) {
    const value = legalConfig[inline.field];
    return value ? <>{value}</> : <mark className="legal-pending">Pendiente: {pendingLabels[inline.field]}</mark>;
  }
  return inline.to.startsWith('/')
    ? <Link to={inline.to}>{inline.text}</Link>
    : <a href={inline.to} target="_blank" rel="noopener noreferrer">{inline.text}</a>;
}

// A list item about an optional detail that is not set (phone, registry) is left out.
const shown = (item: LegalInline[]) => item.every((part) => typeof part === 'string' || !('field' in part) || !part.optional || legalConfig[part.field]);

function Block({ block }: { block: LegalBlock }) {
  if ('p' in block) return <p className="type-body">{block.p.map((inline, index) => <LegalText key={index} inline={inline} />)}</p>;
  return (
    <ul className="type-body">
      {block.list.filter(shown).map((item, index) => <li key={index}>{item.map((inline, part) => <LegalText key={part} inline={inline} />)}</li>)}
    </ul>
  );
}

export function LegalPage({ doc }: { doc: LegalDoc }) {
  const { locale } = useLanguage();
  const page = legalPages[doc];
  const ui = legalUi[locale];

  return (
    <article className="interior-page legal-page" lang="es">
      <header className="legal-header">
        <h1 className="type-display">{page.title}</h1>
        <p className="type-lede">{page.lede}</p>
        {ui.bindingNote ? <p className="legal-note type-ui" lang="en">{ui.bindingNote}</p> : null}
      </header>
      <div className="legal-body">
        {page.sections.map((section) => (
          <section key={section.heading}>
            <h2 className="type-heading">{section.heading}</h2>
            {section.blocks.map((block, index) => <Block key={index} block={block} />)}
          </section>
        ))}
        <p className="legal-updated type-ui">{legalUi.es.updated}: {legalConfig.updated}</p>
      </div>
    </article>
  );
}
