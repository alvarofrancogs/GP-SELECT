import { es } from '../src/i18n/es';
import { featuredCopy } from '../src/i18n/featuredCopy';
import { footerCopy } from '../src/i18n/footerCopy';
import { servicesCopy } from '../src/i18n/servicesCopy';
import { escapeHtml, staticPageMeta } from '../src/lib/pageMeta';
import { qualificationUrl } from '../src/lib/qualification';
import { legalConfig } from '../src/config/legal';
import { legalPages, legalPaths, pendingLabels } from '../src/i18n/legalCopy';
import type { LegalDoc, LegalInline } from '../src/i18n/legalCopy';

const navigation = [
  ['/', es.brand],
  ['/vehiculos', es.nav.vehicles],
  ['/importacion', es.nav.import],
  ['/nosotros', es.nav.about],
  ['/contacto', es.nav.contact],
] as const;

const paragraph = (text: string) => `<p>${escapeHtml(text)}</p>`;
const heading = (level: 1 | 2 | 3, text: string) => `<h${level}>${escapeHtml(text)}</h${level}>`;
const link = (href: string, text: string) => `<a href="${escapeHtml(href)}">${escapeHtml(text)}</a>`;
const list = (items: string[]) => `<ul>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`;
const section = (title: string, body: string) => `<section>${heading(2, title)}${body}</section>`;
const introduction = (title: string, lede: string) => heading(1, title) + paragraph(lede);
const rows = (items: { title: string; body: string }[]) =>
  `<ul>${items.map((item) => `<li>${heading(3, item.title)}${paragraph(item.body)}</li>`).join('')}</ul>`;

function homeContent(): string {
  const services = servicesCopy.es;
  const featured = featuredCopy.es;
  return introduction(`${es.hero.left} ${es.hero.right}`, es.hero.description)
    + section(es.process.title, `<ol>${es.process.steps.map((step) =>
      `<li>${heading(3, step.word)}${paragraph(step.title)}${paragraph(step.description)}</li>`).join('')}</ol>`)
    + section(`${es.carHandoff.states[0].left} ${es.carHandoff.states[0].right}`,
      paragraph(es.carHandoff.states[0].description) + paragraph(es.carHandoff.states[0].fact)
      + es.carHandoff.states.slice(1).map((state, index) =>
        (index === 1 ? paragraph(es.carHandoff.interlude) : '')
        + heading(3, `${state.left} ${state.right}`) + paragraph(state.description) + paragraph(state.fact)).join(''))
    + section(`${services.title} ${services.titleFine}`, paragraph(services.description)
      + rows(services.items.map((item) => ({ title: item.title, body: item.description }))))
    // Inventory is live: include its fixed heading, never a guessed vehicle or availability state.
    + section(`${featured.title} ${featured.titleFine}`, link('/vehiculos', es.common.catalogue));
}

function aboutContent(): string {
  const text = es.interiors.about;
  return introduction(text.title, text.lede)
    + section(text.why.title, paragraph(text.why.body))
    + section(text.audience.title, paragraph(text.audience.intro) + rows(text.audience.rows))
    + section(text.approach.title, paragraph(text.approach.body) + rows(text.approach.rows))
    + section(text.closing, paragraph(text.closingNote)
      + link(qualificationUrl({ intent: 'search', source: 'nosotros' }), text.cta)
      + ' ' + link('/importacion', text.secondary));
}

function importContent(): string {
  const text = es.interiors.import;
  return introduction(text.title, text.lede)
    + section(text.define.title, paragraph(text.define.body) + list(text.define.items) + paragraph(text.define.detail))
    + section(text.search.title, paragraph(text.search.body))
    + section(text.analysis.title, paragraph(text.analysis.body))
    + section(text.support.title, paragraph(text.support.body) + paragraph(text.support.detail))
    + section(text.closing, paragraph(text.closingBody)
      + link(qualificationUrl({ intent: 'search', source: 'importacion' }), text.cta)
      + ' ' + link('/contacto?intent=vehicle', text.secondary));
}

function contactContent(): string {
  const text = es.interiors.contact;
  return introduction(text.title, text.lede)
    + paragraph(text.pathsLabel)
    + `<ul><li>${link('/contacto?intent=vehicle', text.vehiclePath)}${paragraph(text.vehicleIntro)}</li>`
    + `<li>${link('/contacto?intent=search', text.searchPath)}${paragraph(text.searchIntro)}</li></ul>`;
}

// Same text as the React legal page (src/pages/Legal.tsx); a missing detail reads as pending.
function legalInline(inline: LegalInline): string {
  if (typeof inline === 'string') return escapeHtml(inline);
  if ('field' in inline) return escapeHtml(legalConfig[inline.field] ?? `[Pendiente: ${pendingLabels[inline.field]}]`);
  return link(inline.to, inline.text);
}

function legalContent(doc: LegalDoc): string {
  const page = legalPages[doc];
  const shown = (item: LegalInline[]) => item.every((part) => typeof part === 'string' || !('field' in part) || !part.optional || legalConfig[part.field]);
  return introduction(page.title, page.lede) + page.sections.map((item) => section(item.heading, item.blocks.map((block) =>
    'p' in block ? `<p>${block.p.map(legalInline).join('')}</p>`
      : `<ul>${block.list.filter(shown).map((entry) => `<li>${entry.map(legalInline).join('')}</li>`).join('')}</ul>`).join(''))).join('')
    + paragraph(`Última revisión: ${legalConfig.updated}`);
}

/** Build-only reading view. All public copy comes from the same dictionaries as React. */
export function renderReadableContent(path: string): string {
  let content: string;
  switch (path) {
    case '/': content = homeContent(); break;
    case '/nosotros': content = aboutContent(); break;
    case '/importacion': content = importContent(); break;
    case '/contacto': content = contactContent(); break;
    case '/vehiculos':
      content = introduction(es.vehicles.title, es.vehicles.lede)
        + section(es.vehicles.closing, link(qualificationUrl({ intent: 'import', source: 'vehicles' }), es.vehicles.find));
      break;
    case legalPaths['aviso-legal']: content = legalContent('aviso-legal'); break;
    case legalPaths.privacidad: content = legalContent('privacidad'); break;
    case legalPaths.cookies: content = legalContent('cookies'); break;
    case '/404.html':
      content = paragraph(es.notFound.eyebrow) + introduction(es.notFound.title, es.notFound.description)
        + link('/', es.common.backHome) + ' ' + link('/vehiculos', es.notFound.vehicles);
      break;
    default: throw new Error(`No readable content for ${path}`);
  }
  const footer = footerCopy.es;
  return `<div class="static-content"><header>${link('/', es.brand)}</header><main>${content}</main>`
    + `<footer>${paragraph(footer.description)}${paragraph(footer.location)}`
    + `<nav aria-label="${escapeHtml(footer.navigation)}"><ul>${navigation.map(([href, label]) =>
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
      .static-content h2 { font-size: clamp(1.5rem, 3vw, 2rem); line-height: 1.25; }
      .static-content h3 { font-size: 1.125rem; line-height: 1.4; }
      .static-content p, .static-content ul, .static-content ol { margin-block: 1rem; max-width: 72ch; }
      .static-content li { margin-block: .75rem; }
      .static-content a { text-decoration: underline; text-underline-offset: .2em; }
      .static-content main > a, .static-content section > a { display: inline-block; margin: .5rem 1rem .5rem 0; }
      .static-content footer { border-top: 1px solid var(--color-line, #bec3bd); padding-top: 1rem; }
      .static-content nav ul { display: flex; flex-wrap: wrap; gap: .5rem 1.5rem; padding: 0; list-style: none; }
    </style>`;

export function renderLlmsText(siteUrl?: string): string {
  const entry = (path: string, label: string) =>
    `- [${label}](${siteUrl || ''}${path}): ${staticPageMeta[path].description}`;
  return `# ${es.brand}\n\n> ${staticPageMeta['/'].description}\n\n${footerCopy.es.location}\n\n`
    + `${es.interiors.about.lede}\n\n${es.interiors.import.lede}\n\n`
    + `## ${footerCopy.es.navigation}\n\n${navigation.filter(([path]) => path !== '/contacto').map(([path, label]) => entry(path, label)).join('\n')}\n\n`
    + `## ${es.nav.contact}\n\n${entry('/contacto', es.nav.contact)}\n`;
}
