import { useEffect } from 'react';
import { parseSiteUrl, renderPageHead } from './pageMeta';
import type { PageMeta } from './pageMeta';

export const siteUrl = parseSiteUrl(import.meta.env.VITE_SITE_URL);

/** One owner per route. Remove its head on exit and restore the original nodes. */
export function usePageMeta(meta: PageMeta | null) {
  const html = meta ? renderPageHead(meta, siteUrl) : null;
  useEffect(() => {
    if (html === null) return;
    const previous = [...document.head.querySelectorAll(
      'title, [data-page-meta], meta[name="description"], meta[name="robots"], link[rel="canonical"], meta[property^="og:"], meta[name^="twitter:"]',
    )];
    previous.forEach((element) => element.remove());
    const template = document.createElement('template');
    template.innerHTML = html;
    const current = [...template.content.childNodes];
    document.head.append(...current);
    return () => {
      current.forEach((element) => element.remove());
      document.head.append(...previous);
    };
  }, [html]);
}
