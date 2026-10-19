import { Link } from 'react-router-dom';
import { ContactForm } from '../components/ContactForm';
import { useLanguage } from '../i18n/useLanguage';
import { useEffect, useRef, type MouseEvent, type ReactNode } from 'react';
import '../styles/interiors.css';

function Disclosure({ title, level = 2, children }: { title: string; level?: 2 | 3; children: ReactNode }) {
  const Heading = level === 3 ? 'h3' : 'h2';
  const panel = useRef<HTMLDivElement>(null);
  const animation = useRef<Animation | null>(null);
  const expanding = useRef(false);
  useEffect(() => {
    const media = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    const finish = () => { if (media?.matches) animation.current?.finish(); };
    media?.addEventListener('change', finish);
    return () => { animation.current?.cancel(); media?.removeEventListener('change', finish); };
  }, []);

  function toggle(event: MouseEvent<HTMLElement>) {
    const details = event.currentTarget.parentElement as HTMLDetailsElement;
    const body = panel.current;
    if (!body) return;
    event.preventDefault();
    const next = animation.current ? !expanding.current : !details.open;
    const height = details.open ? body.getBoundingClientRect().height : 0;
    const opacity = details.open ? getComputedStyle(body).opacity : '0';
    animation.current?.cancel();
    animation.current = null;
    expanding.current = next;
    event.currentTarget.setAttribute('aria-expanded', String(next));
    body.inert = !next;
    details.dataset.closing = String(!next);
    if (!body.animate || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      details.open = next;
      return;
    }
    // Keep native details open until the exit finishes; all copy remains in the DOM.
    details.open = true;
    const motion = body.animate([{ height: `${height}px`, opacity }, { height: next ? `${body.scrollHeight}px` : '0px', opacity: next ? 1 : 0 }],
      { duration: 220, easing: getComputedStyle(details).getPropertyValue('--ease-out').trim(), fill: 'both' });
    animation.current = motion;
    motion.onfinish = () => {
      if (animation.current !== motion) return;
      details.open = next;
      motion.cancel();
      animation.current = null;
    };
  }
  return <details className="editorial-disclosure">
    <summary onClick={toggle}><Heading className="type-heading"><span>{title}</span><span className="editorial-disclosure__indicator" aria-hidden="true" /></Heading></summary>
    <div ref={panel} className="editorial-disclosure__panel"><div className="editorial-disclosure__body type-body">{children}</div></div>
  </details>;
}

export function Import() {
  const { copy, href } = useLanguage();
  const text = copy.interiors.import;

  return <article className="interior-page import-page">
    <div className="import-opening">
      <header className="import-opening__header"><h1 className="type-display">{text.title}</h1></header>
      <div id="import-form" className="import-opening__form" tabIndex={-1}>
        <ContactForm configuration="import" intent="search" />
      </div>
      <div className="import-opening__information">
        <p className="type-lede">{text.lede}</p>
        <h2 className="type-heading">{text.overviewTitle}</h2>
        <ul className="import-opening__benefits type-body">{text.overviewItems.map((item) => <li key={item}>{item}</li>)}</ul>
      </div>
    </div>
    <div className="import-information">
      <Disclosure title={text.define.title}>
        <p>{text.define.body}</p><ul>{text.define.items.map((item) => <li key={item}>{item}</li>)}</ul><p>{text.define.detail}</p>
      </Disclosure>
      <Disclosure title={text.search.title}><p>{text.search.body}</p></Disclosure>
      <Disclosure title={text.analysis.title}><p>{text.analysis.body}</p></Disclosure>
      <Disclosure title={text.support.title}><p>{text.support.body}</p><p>{text.support.detail}</p></Disclosure>
      <Disclosure title={text.stages.title}>
        <p>{text.stages.intro}</p>
        <ol className="import-stages">{text.stages.rows.map((row) => <li key={row.title}><h3 className="type-heading">{row.title}</h3><p>{row.body}</p></li>)}</ol>
      </Disclosure>
      <Disclosure title={text.taxes.title}><p>{text.taxes.body}</p></Disclosure>
      <Link className="editorial-link type-ui import-guide" to={href('/guias/importar-un-coche-de-europa')}>{text.taxes.guide}<span aria-hidden="true">→</span></Link>
      <section className="import-faq" aria-labelledby="import-faq-title">
        <h2 id="import-faq-title" className="type-section">{text.faq.title}</h2>
        {text.faq.rows.map((row) => <Disclosure key={row.title} title={row.title} level={3}><p>{row.body}</p></Disclosure>)}
      </section>
    </div>
    <section className="interior-closing import-closing" aria-labelledby="import-closing-title">
      <h2 id="import-closing-title" className="type-section">{text.closing}</h2><p className="type-body">{text.closingBody}</p>
      <div className="interior-closing__links">
        <a className="editorial-link type-ui" href="#import-form" onClick={() => document.getElementById('import-form')?.focus({ preventScroll: true })}>{text.backToForm}<span aria-hidden="true">→</span></a>
        <Link className="editorial-link type-ui" to={href('/contacto?intent=vehicle')}>{text.secondary}<span aria-hidden="true">→</span></Link>
      </div>
    </section>
  </article>;
}
