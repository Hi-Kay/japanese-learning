import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// Served from https://hi-kay.github.io/japanese-learning/ — all asset URLs need this prefix.
const BASE = '/japanese-learning/'

// https://vite.dev/config/
export default defineConfig({
  base: BASE,
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon-16x16.png', 'favicon-32x32.png', 'apple-touch-icon.png'],
      manifest: {
        name: '日本語 — Japanese Learning',
        short_name: 'Nihongo',
        description: 'Learn hiragana, katakana, kanji, and everyday Japanese vocabulary with spaced repetition.',
        theme_color: '#f43f5e',
        background_color: '#fafaf9',
        display: 'standalone',
        start_url: BASE,
        scope: BASE,
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Stroke-order SVGs are fetched live from a CDN; cache them so writing practice keeps working offline.
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/cdn\.jsdelivr\.net\/gh\/KanjiVG\//,
            handler: 'CacheFirst',
            options: {
              cacheName: 'kanjivg-cache',
              expiration: { maxEntries: 400, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
})
