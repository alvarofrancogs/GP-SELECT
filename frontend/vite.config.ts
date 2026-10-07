import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { seoPlugin } from './build/seoPlugin';

export default defineConfig(({ mode }) => ({
  plugins: [react(), seoPlugin(loadEnv(mode, process.cwd(), 'VITE_').VITE_SITE_URL)],
  build: {
    rollupOptions: {
      output: {
        // Libraries change less often than the site: in their own files they stay cached across deploys.
        manualChunks(id) {
          if (!id.includes('/node_modules/')) return undefined;
          if (id.includes('/node_modules/gsap/')) return 'gsap';
          if (/\/node_modules\/react-router(-dom)?\//.test(id)) return 'router';
          if (/\/node_modules\/(react|react-dom|scheduler)\//.test(id)) return 'react';
          return undefined;
        },
      },
    },
  },
  server: {
    proxy: {
      '/api': { target: process.env.API_PROXY_TARGET ?? 'http://localhost:5000', changeOrigin: false },
    },
  },
}));
