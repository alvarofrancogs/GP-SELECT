import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { seoPlugin } from './build/seoPlugin';

export default defineConfig(({ mode }) => ({
  plugins: [react(), seoPlugin(loadEnv(mode, process.cwd(), 'VITE_').VITE_SITE_URL)],
  server: {
    proxy: {
      '/api': { target: 'http://localhost:5000', changeOrigin: false },
    },
  },
}));
