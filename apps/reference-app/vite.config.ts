import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),

    VitePWA({
      registerType: 'prompt',

      includeAssets: ['icon.svg', 'icon-maskable.svg'],

      manifest: {
        name: 'Household Vault',
        short_name: 'Vault',
        description: 'Offline-first household asset, warranty and service records.',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        background_color: '#f5f7fb',
        theme_color: '#242938',

        icons: [
          {
            src: '/icon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any',
          },
          {
            src: '/icon-maskable.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'maskable',
          },
        ],
      },

      workbox: {
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
        navigateFallback: '/index.html',
        cleanupOutdatedCaches: true,
        clientsClaim: false,
        skipWaiting: false,

        // Domain/API responses are intentionally not runtime-cached.
        // Structured application data belongs in PowerSync SQLite,
        // not the Service Worker.
        runtimeCaching: [],
      },
    }),
  ],
});