import { es } from '../src/i18n/es';
import { en } from '../src/i18n/en';
import { featuredCopy } from '../src/i18n/featuredCopy';
import { footerCopy } from '../src/i18n/footerCopy';
import { entityCopy } from '../src/i18n/entityCopy';
import { servicesCopy } from '../src/i18n/servicesCopy';
import { escapeHtml, staticPageMeta } from '../src/lib/pageMeta';
import { qualificationUrl } from '../src/lib/qualification';
import { legalConfig } from '../src/config/legal';
import { legalPages, legalUi, pendingLabels } from '../src/i18n/legalCopy';
import type { LegalDoc, LegalInline } from '../src/i18n/legalCopy';
import { localizeHref, matchPage, pagePath } from '../src/i18n/routes';
import type { Dictionary, Locale } from '../src/i18n/types';

const dictionaries: Record<Locale, Dictionary> = { es, en };

const navigation = (t: Dictionary, locale: Locale) => [
  [pagePath('home', locale), t.brand],
  [pagePath('vehicles', locale), t.nav.vehicles],
  [pagePath('import', locale), t.nav.import],
  [pagePath('about', locale), t.nav.about],
  [pagePath('contact', locale), t.nav.contact],
] as const;

const paragraph = (text: string) => `<p>${escapeHtml(text)}</p>`;
const heading = (level: 1 | 2 | 3, text: string) => `<h${level}>${escapeHtml(text)}</h${level}>`;
const link = (href: string, text: string) => `<a href="${escapeHtml(href)}">${escapeHtml(text)}</a>`;
const list = (items: string[]) => `<ul>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`;
const section = (title: string, body: string) => `<section>${heading(2, title)}${body}</section>`;
const introduction = (title: string, lede: string) => heading(1, title) + paragraph(lede);
const interiorIntroduction = (title: string, lede: string) =>
  `<h1>${escapeHtml(title)} <span class="static-content__lede">${escapeHtml(lede)}</span></h1>`;
const rows = (items: { title: string; body: string }[]) =>
  `<ul>${items.map((item) => `<li>${heading(3, item.title)}${paragraph(item.body)}</li>`).join('')}</ul>`;

function homeContent(t: Dictionary, locale: Locale): string {
  const services = servicesCopy[locale];
  const featured = featuredCopy[locale];
  return introduction(`${t.hero.left} ${t.hero.right}`, t.hero.description)
    + section(t.process.title, `<ol>${t.process.steps.map((step) =>
      `<li>${heading(3, step.word)}${paragraph(step.title)}${paragraph(step.description)}</li>`).join('')}</ol>`)
    + section(`${t.carHandoff.states[0].left} ${t.carHandoff.states[0].right}`,
      paragraph(t.carHandoff.states[0].description) + paragraph(t.carHandoff.states[0].fact)
      + t.carHandoff.states.slice(1).map((state, index) =>
        (index === 1 ? paragraph(t.carHandoff.interlude) : '')
        + heading(3, `${state.left} ${state.right}`) + paragraph(state.description) + paragraph(state.fact)).join(''))
    + section(`${services.title} ${services.titleFine}`, paragraph(services.description)
      + rows(services.items.map((item) => ({ title: item.title, body: item.description }))))
    // Inventory is live: include its fixed heading, never a guessed vehicle or availability state.
    + section(`${featured.title} ${featured.titleFine}`, link(pagePath('vehicles', locale), t.common.catalogue));
}

function aboutContent(t: Dictionary, locale: Locale): string {
  const text = t.interiors.about;
  return interiorIntroduction(text.title, text.lede)
    + section(text.why.title, paragraph(text.why.body))
    + section(text.audience.title, paragraph(text.audience.intro) + rows(text.audience.rows))
    + section(text.approach.title, paragraph(text.approach.body) + rows(text.approach.rows))
    + section(text.transparency.title, rows(text.transparency.rows.slice(0, 2))
      + `<ul><li>${heading(3, text.transparency.rows[2].title)}<p>${escapeHtml(text.transparency.rows[2].body.split(text.transparency.legalLabel)[0])}`
      + link(localizeHref('/aviso-legal', locale), text.transparency.legalLabel)
      + `${escapeHtml(text.transparency.rows[2].body.split(text.transparency.legalLabel)[1])}</p></li></ul>`)
    + section(text.closing, paragraph(text.closingNote)
      + link(localizeHref(qualificationUrl({ intent: 'search', source: 'nosotros' }), locale), text.cta)
      + ' ' + link(pagePath('import', locale), text.secondary));
}

function importContent(t: Dictionary, locale: Locale): string {
  const text = t.interiors.import;
  return interiorIntroduction(text.title, text.lede)
    + section(text.define.title, paragraph(text.define.body) + list(text.define.items) + paragraph(text.define.detail))
    + section(text.search.title, paragraph(text.search.body))
    + section(text.analysis.title, paragraph(text.analysis.body))
    + section(text.support.title, paragraph(text.support.body) + paragraph(text.support.detail))
    + section(text.stages.title, paragraph(text.stages.intro) + rows(text.stages.rows))
    + section(text.taxes.title, paragraph(text.taxes.body))
    + section(text.faq.title, rows(text.faq.rows))
    + section(text.closing, paragraph(text.closingBody)
      + link(localizeHref(qualificationUrl({ intent: 'search', source: 'importacion' }), locale), text.cta)
      + ' ' + link(localizeHref('/contacto?intent=vehicle', locale), text.secondary));
}

function contactContent(t: Dictionary, locale: Locale): string {
  const text = t.interiors.contact;
  return interiorIntroduction(text.title, text.lede)
    + paragraph(text.pathsLabel)
    + `<ul><li>${link(localizeHref('/contacto?intent=vehicle', locale), text.vehiclePath)}${paragraph(text.vehicleIntro)}</li>`
    + `<li>${link(localizeHref('/contacto?intent=search', locale), text.searchPath)}${paragraph(text.searchIntro)}</li></ul>`
    + `<ol>${text.nextSteps.map((step) => `<li>${escapeHtml(step.replace(/^\d+\. /, ''))}</li>`).join('')}</ol>`;
}

// Same text as the React legal page (src/pages/Legal.tsx): always the Spanish, binding version; a missing detail
// reads as pending. In English it carries the note that says so, and its internal links stay in English.
function legalContent(doc: LegalDoc, locale: Locale): string {
  const page = legalPages[doc];
  const ui = legalUi[locale];
  const inline = (part: LegalInline): string => {
    if (typeof part === 'string') return escapeHtml(part);
    if ('field' in part) return escapeHtml(legalConfig[part.field] ?? `[Pendiente: ${pendingLabels[part.field]}]`);
    return link(localizeHref(part.to, locale), part.text);
  };
  const shown = (item: LegalInline[]) => item.every((part) => typeof part === 'string' || !('field' in part) || !part.optional || legalConfig[part.field]);
  const body = heading(1, page.title) + paragraph(page.lede)
    + (ui.bindingNote ? `<p lang="en">${escapeHtml(ui.bindingNote)}</p>` : '')
    + page.sections.map((item) => section(item.heading, item.blocks.map((block) =>
      'p' in block ? `<p>${block.p.map(inline).join('')}</p>`
        : `<ul>${block.list.filter(shown).map((entry) => `<li>${entry.map(inline).join('')}</li>`).join('')}</ul>`).join(''))).join('')
    + paragraph(`${legalUi.es.updated}: ${legalConfig.updated}`);
  return locale === 'es' ? body : `<div lang="es">${body}</div>`;
}

/** Build-only reading view. All public copy comes from the same dictionaries as React. */
export function renderReadableContent(path: string): string {
  const notFound = /^(\/en)?\/404\.html$/.exec(path);
  const match = notFound ? null : matchPage(path);
  if (!notFound && !match) throw new Error(`No readable content for ${path}`);
  const locale: Locale = notFound ? (notFound[1] ? 'en' : 'es') : match!.locale;
  const t = dictionaries[locale];
  let content: string;
  switch (notFound ? '404' : match!.page) {
    case 'home': content = homeContent(t, locale); break;
    case 'about': content = aboutContent(t, locale); break;
    case 'import': content = importContent(t, locale); break;
    case 'contact': content = contactContent(t, locale); break;
    case 'vehicles':
      content = interiorIntroduction(t.vehicles.title, t.vehicles.lede)
        + '<!--vehicle-list--><!--/vehicle-list-->'
        + section(t.vehicles.closing, link(localizeHref(qualificationUrl({ intent: 'import', source: 'vehicles' }), locale), t.vehicles.find));
      break;
    case 'aviso-legal': case 'privacidad': case 'cookies': content = legalContent(match!.page as LegalDoc, locale); break;
    case '404':
      content = paragraph(t.notFound.eyebrow) + introduction(t.notFound.title, t.notFound.description)
        + link(pagePath('home', locale), t.common.backHome) + ' ' + link(pagePath('vehicles', locale), t.notFound.vehicles);
      break;
    default: throw new Error(`No readable content for ${path}`);
  }
  const footer = footerCopy[locale];
  return `<div class="static-content"><header>${link(pagePath('home', locale), t.brand)}</header><main>${content}</main>`
    + `<footer>${paragraph(footer.description)}${paragraph(footer.location)}`
    + `<nav aria-label="${escapeHtml(footer.navigation)}"><ul>${navigation(t, locale).map(([href, label]) =>
      `<li>${link(href, label)}</li>`).join('')}</ul></nav></footer></div>`;
}

// Run before the body is parsed. createRoot removes this wrapper at its first commit;
// neither the root nor React's preloader/content is hidden by these scoped rules.
export const readableHead = `<script>document.documentElement.classList.add('js')</script>
    <style>
      html.js #root > .static-content { display: none; }
      #root > .static-content { max-width: 76rem; margin: auto; padding: 2rem clamp(1.25rem, 5vw, 4rem); background: var(--color-paper, #f5f2ec); color: var(--color-ink, #101112); font-family: var(--font-family, sans-serif); font-size: 1rem; line-height: 1.6; overflow-wrap: anywhere; }
      .static-content main { margin-block: 3rem; }
      .static-content section { margin-block: 2.5rem; }
      .static-content h1 { font-size: clamp(2rem, 5vw, 3.5rem); line-height: 1.15; }
      .static-content__lede { display: block; max-width: 72ch; margin-block: 1rem; font-size: 1rem; font-weight: 400; line-height: 1.6; }
      .static-content h2 { font-size: clamp(1.5rem, 3vw, 2rem); line-height: 1.25; }
      .static-content h3 { font-size: 1.125rem; line-height: 1.4; }
      .static-content p, .static-content ul, .static-content ol { margin-block: 1rem; max-width: 72ch; }
      .static-content li { margin-block: .75rem; }
      .static-content a { text-decoration: underline; text-underline-offset: .2em; }
      .static-content main > a, .static-content section > a { display: inline-block; margin: .5rem 1rem .5rem 0; }
      .static-content footer { border-top: 1px solid var(--color-line, #bec3bd); padding-top: 1rem; }
      .static-content nav ul { display: flex; flex-wrap: wrap; gap: .5rem 1.5rem; padding: 0; list-style: none; }
    </style>`;

/** llms.txt: the Spanish site first (the main language), then the English pages. */
export function renderLlmsText(siteUrl?: string): string {
  const entry = (path: string, label: string) =>
    `- [${label}](${siteUrl || ''}${path}): ${staticPageMeta[path].description}`;
  const pages = (t: Dictionary, locale: Locale) => navigation(t, locale).filter(([path]) => path !== pagePath('contact', locale))
    .map(([path, label]) => entry(path, label)).join('\n');
  return `# ${es.brand}\n\n> ${entityCopy.es}\n\n${footerCopy.es.location}\n\n`
    + `${es.interiors.about.lede}\n\n${es.interiors.import.lede}\n\n`
    + `## ${footerCopy.es.navigation}\n\n${pages(es, 'es')}\n\n`
    + `## ${es.nav.contact}\n\n${entry('/contacto', es.nav.contact)}\n\n`
    + `## English\n\n> ${entityCopy.en}\n\n${pages(en, 'en')}\n${entry(pagePath('contact', 'en'), en.nav.contact)}\n`;
}

