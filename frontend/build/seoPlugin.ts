import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { Plugin } from 'vite';
import { adminMeta, escapeHtml, getStaticPageMeta, legalPageMeta, notFoundMeta, parseSiteUrl, renderPageHead, staticPageMeta } from '../src/lib/pageMeta';
import { missingLegalFields } from '../src/config/legal';
import type { PageMeta } from '../src/lib/pageMeta';
import { readableHead, renderLlmsText, renderReadableContent } from './readableContent';
import { sceneAssets } from '../src/assets/sceneAssets';

// The home's first view: its photographs download alongside the script instead of after it renders.
const homePreload = [sceneAssets.heroBackground.src, sceneAssets.heroCar.src]
  .map((src) => `<link rel="preload" as="image" href="${src}" fetchpriority="high" />\n  `).join('');

/** Mirrors the public-page map in deploy/Caddyfile; never lowercase a vehicle slug. */
export function canonicalPagePath(pathname: string): string | null {
  let canonical: string | undefined;
  if (/^\/index\.html\/?$/i.test(pathname)) canonical = '/';
  const page = /^\/(vehiculos|importacion|nosotros|contacto|aviso-legal|privacidad|cookies)(?:\/index\.html)?\/?$/i.exec(pathname);
  if (page) canonical = `/${page[1].toLowerCase()}`;
  const vehicle = /^\/vehiculos\/([a-z0-9-]+)(?:\/index\.html)?\/?$/i.exec(pathname);
  if (vehicle) canonical = `/vehiculos/${vehicle[1]}`;
  return canonical && canonical !== pathname ? canonical : null;
}

/** Static reading views and metadata, retaining the SPA's built asset references. */
export function seoPlugin(rawSiteUrl?: string): Plugin {
  const siteUrl = parseSiteUrl(rawSiteUrl);
  let outDir: string;
  let isBuild = false;
  const staticFiles = Object.fromEntries(Object.keys(staticPageMeta).map((path) => [
    path, path === '/' ? 'index.html' : `${path.slice(1)}/index.html`,
  ]));
  // Legal pages get their own file too (a direct visit is not a 404), but stay out of the sitemap.
  const legalFiles = Object.fromEntries(Object.keys(legalPageMeta).map((path) => [path, `${path.slice(1)}/index.html`]));
  const pageFiles: Record<string, string> = { ...staticFiles, ...legalFiles };
  return {
    name: 'gp-select-seo',
    configResolved(config) {
      outDir = resolve(config.root, config.build.outDir);
      isBuild = config.command === 'build';
    },
    // Mirror the documented hosting rules: Vite's default SPA fallback serves home everywhere.
    configurePreviewServer(server) {
      server.middlewares.use((request, response, next) => {
        const url = new URL(request.url || '/', 'http://preview.local');
        const path = url.pathname;
        if (path === '/api' || path.startsWith('/api/') || path.startsWith('/assets/')) return next();
        if (path === '/servicios' || path === '/servicios/') {
          response.writeHead(308, { Location: `/importacion${url.search}` });
          response.end();
          return;
        }
        const canonical = canonicalPagePath(path);
        if (canonical) {
          response.writeHead(301, { Location: `${canonical}${url.search}` });
          response.end();
          return;
        }
        const explicitFiles = [...Object.values(pageFiles), 'admin/index.html', '404.html', 'spa.html', 'robots.txt', 'sitemap.xml', 'llms.txt'];
        if (explicitFiles.includes(path.slice(1))) return next();
        const file = pageFiles[path] || (path === '/admin' || path.startsWith('/admin/')
          ? 'admin/index.html' : /^\/vehiculos\/[^/]+$/.test(path) ? 'spa.html' : null);
        if (file) {
          request.url = `/${file}${url.search}`;
          next();
        } else if (request.headers.accept?.includes('text/html')) {
          void readFile(resolve(outDir, '404.html'), 'utf8').then((html) => {
            response.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
            response.end(html);
          }, next);
        } else next();
      });
    },
    async closeBundle() {
      if (!isBuild) return;
      if (!siteUrl) {
        this.warn(rawSiteUrl?.trim()
          ? 'VITE_SITE_URL inválida: usa un origen http(s). Se omiten canonical, og:url y sitemap.xml.'
          : 'VITE_SITE_URL no definida: se omiten canonical, og:url y sitemap.xml.');
      }
      const missingLegal = missingLegalFields();
      if (missingLegal.length) {
        this.warn(`Datos legales pendientes en src/config/legal.ts (${missingLegal.join(', ')}): las páginas legales los marcan como «Pendiente». Necesarios antes de publicar.`);
      }
      const template = await readFile(resolve(outDir, 'index.html'), 'utf8');
      const pages = [
        ...Object.entries(staticFiles).map(([path, file]) => ({
          file,
          meta: getStaticPageMeta(path, siteUrl),
          content: renderReadableContent(path),
        })),
        ...Object.entries(legalFiles).map(([path, file]) => ({
          file,
          meta: { ...legalPageMeta[path], path },
          content: renderReadableContent(path),
        })),
        { file: 'admin/index.html', meta: adminMeta, content: '' },
        { file: '404.html', meta: notFoundMeta, content: renderReadableContent('/404.html') },
        // Vehicle pages: the API (SeoController) fills this shell's metadata and #root per vehicle. Served as is,
        // it is a neutral page that never claims to be the home. It always carries the readable-content styles.
        { file: 'spa.html', meta: { title: 'GP SELECT', description: staticPageMeta['/'].description }, content: '', readable: true },
      ];
      for (const { file, meta, content, readable } of pages as { file: string; meta: PageMeta; content: string; readable?: boolean }[]) {
        const target = resolve(outDir, file);
        await mkdir(resolve(target, '..'), { recursive: true });
        // The markers let the API replace exactly this block (VehicleSeo.cs).
        const html = template.replace('<title>GP SELECT</title>', `<!--page-meta-->\n    ${renderPageHead(meta, siteUrl)}\n    <!--/page-meta-->`)
          .replace('</head>', `${file === 'index.html' ? homePreload : ''}${content || readable ? readableHead : ''}\n  </head>`)
          .replace('<div id="root"></div>', `<div id="root">${content}</div>`);
        await writeFile(target, html);
      }
      // The public API stays crawlable: the catalogue renders from it and the vehicle photos are served from it.
      const robots = `# One group covers all bots, including AI; bot-specific groups would override these Disallow rules.\nUser-agent: *\nAllow: /api/public/\nDisallow: /admin\nDisallow: /api\n${siteUrl ? `\nSitemap: ${siteUrl}/sitemap.xml\n` : ''}`;
      await writeFile(resolve(outDir, 'robots.txt'), robots);
      await writeFile(resolve(outDir, 'llms.txt'), renderLlmsText(siteUrl));
      if (siteUrl) {
        const entries = Object.keys(staticPageMeta).map((path) => `  <url><loc>${escapeHtml(`${siteUrl}${path}`)}</loc></url>`);
        await writeFile(resolve(outDir, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries.join('\n')}\n</urlset>\n`);
      }
    },
  };
}
