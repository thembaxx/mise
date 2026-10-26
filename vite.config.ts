import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { redact } from '@tanstack/redact/vite';

// In the isolated experiment branch, default to Redact. Use --mode react for a native React control build.
// This Vite config is NOT used by Mise's production main branch.
export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    ...(mode === 'react' ? [] : [redact()]),
    VitePWA({
      registerType: 'prompt',
      injectRegister: false,
      // The existing manifest is kept as the single source of truth for name, icons and shortcuts.
      manifest: false,
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,webmanifest,txt,xml,woff2}'],
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
        cleanupOutdatedCaches: true,
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//, /^\/_vercel\//],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/images\.unsplash\.com\//,
            handler: 'CacheFirst',
            options: {
              cacheName: 'mise-food-images-v1',
              cacheableResponse: { statuses: [0, 200] },
              expiration: { maxEntries: 35, maxAgeSeconds: 7 * 24 * 60 * 60, purgeOnQuotaError: true },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\//,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'mise-font-css-v1',
              cacheableResponse: { statuses: [0, 200] },
              expiration: { maxEntries: 8, maxAgeSeconds: 7 * 24 * 60 * 60 },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\//,
            handler: 'CacheFirst',
            options: {
              cacheName: 'mise-font-files-v1',
              cacheableResponse: { statuses: [0, 200] },
              expiration: { maxEntries: 25, maxAgeSeconds: 365 * 24 * 60 * 60, purgeOnQuotaError: true },
            },
          },
        ],
      },
    }),
  ],
  build: { target: 'es2022', chunkSizeWarningLimit: 1400 },
  server: { host: '0.0.0.0' },
}));
