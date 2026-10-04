import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { Plugin } from 'vite';
import { adminMeta, escapeHtml, getStaticPageMeta, notFoundMeta, parseSiteUrl, renderPageHead, staticPageMeta } from '../src/lib/pageMeta';

/** Head-only HTML copies: the built SPA body and its asset references stay intact. */
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
        const explicitFiles = [...Object.values(staticFiles), 'admin/index.html', '404.html', 'spa.html', 'robots.txt', 'sitemap.xml'];
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
        })),
        { file: 'admin/index.html', meta: adminMeta },
        { file: '404.html', meta: notFoundMeta },
        // Dynamic details await SEO-2; this neutral shell never claims to be the home.
        { file: 'spa.html', meta: { title: 'GP SELECT', description: staticPageMeta['/'].description } },
      ];
      for (const { file, meta } of pages) {
        const target = resolve(outDir, file);
        await mkdir(resolve(target, '..'), { recursive: true });
        await writeFile(target, template.replace('<title>GP SELECT</title>', renderPageHead(meta, siteUrl)));
      }
      const robots = `User-agent: *\nDisallow: /admin\nDisallow: /api\n${siteUrl ? `\nSitemap: ${siteUrl}/sitemap.xml\n` : ''}`;
      await writeFile(resolve(outDir, 'robots.txt'), robots);
      if (siteUrl) {
        const entries = Object.keys(staticPageMeta).map((path) => `  <url><loc>${escapeHtml(`${siteUrl}${path}`)}</loc></url>`);
        await writeFile(resolve(outDir, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries.join('\n')}\n</urlset>\n`);
      }
    },
  };
}
