import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { Plugin } from 'vite';
import { adminMeta, escapeHtml, getStaticPageMeta, notFoundMeta, parseSiteUrl, renderPageHead, staticPageMeta } from '../src/lib/pageMeta';
import { readableHead, renderLlmsText, renderReadableContent } from './readableContent';

/** Static reading views and metadata, retaining the SPA's built asset references. */
export function seoPlugin(rawSiteUrl?: string): Plugin {
  const siteUrl = parseSiteUrl(rawSiteUrl);
  let outDir: string;
  let isBuild = false;
  const staticFiles = Object.fromEntries(Object.keys(staticPageMeta).map((path) => [
    path, path === '/' ? 'index.html' : `${path.slice(1)}/index.html`,
  ]));
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
        const path = url.pathname.toLowerCase().replace(/\/+$/, '') || '/';
        if (path === '/api' || path.startsWith('/api/') || path.startsWith('/assets/')) return next();
        if (path === '/servicios') {
          response.writeHead(308, { Location: `/importacion${url.search}` });
          response.end();
          return;
        }
        const explicitFiles = [...Object.values(staticFiles), 'admin/index.html', '404.html', 'spa.html', 'robots.txt', 'sitemap.xml', 'llms.txt'];
        if (explicitFiles.includes(path.slice(1))) return next();
        const file = staticFiles[path] || (path === '/admin' || path.startsWith('/admin/')
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
      const template = await readFile(resolve(outDir, 'index.html'), 'utf8');
      const pages = [
        ...Object.entries(staticFiles).map(([path, file]) => ({
          file,
          meta: getStaticPageMeta(path, siteUrl),
          content: renderReadableContent(path),
        })),
        { file: 'admin/index.html', meta: adminMeta, content: '' },
        { file: '404.html', meta: notFoundMeta, content: renderReadableContent('/404.html') },
        // Dynamic details await SEO-2; this neutral shell never claims to be the home.
        { file: 'spa.html', meta: { title: 'GP SELECT', description: staticPageMeta['/'].description }, content: '' },
      ];
      for (const { file, meta, content } of pages) {
        const target = resolve(outDir, file);
        await mkdir(resolve(target, '..'), { recursive: true });
        const html = template.replace('<title>GP SELECT</title>', renderPageHead(meta, siteUrl))
          .replace('</head>', `${content ? readableHead : ''}\n  </head>`)
          .replace('<div id="root"></div>', `<div id="root">${content}</div>`);
        await writeFile(target, html);
      }
      const robots = `# One group covers all bots, including AI; bot-specific groups would override these Disallow rules.\nUser-agent: *\nDisallow: /admin\nDisallow: /api\n${siteUrl ? `\nSitemap: ${siteUrl}/sitemap.xml\n` : ''}`;
      await writeFile(resolve(outDir, 'robots.txt'), robots);
      await writeFile(resolve(outDir, 'llms.txt'), renderLlmsText(siteUrl));
      if (siteUrl) {
        const entries = Object.keys(staticPageMeta).map((path) => `  <url><loc>${escapeHtml(`${siteUrl}${path}`)}</loc></url>`);
        await writeFile(resolve(outDir, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries.join('\n')}\n</urlset>\n`);
      }
    },
  };
}
