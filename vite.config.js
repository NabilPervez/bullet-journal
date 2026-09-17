import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: false,
    include: ['src/**/*.{test,spec}.{js,jsx}'],
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png', 'shortcut-*.png'],
      manifest: {
        // A stable identity for the installed app, independent of start_url.
        id: '/',
        name: 'Digital Bullet Journal',
        short_name: 'Bullet Journal',
        description: 'A digital bullet journal: rapid logging, an index, a future log, a monthly log, and a daily time-blocking agenda.',
        theme_color: '#0B0B0F',
        background_color: '#0B0B0F',
        display: 'standalone',
        orientation: 'portrait-primary',
        start_url: '/',
        scope: '/',
        lang: 'en',
        categories: ['productivity', 'lifestyle'],
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ],
        // Become Android long-press shortcuts in the Play Store build, which
        // expects each one to carry an icon. "Index" was dropped: it now opens
        // the same screen as Future.
        shortcuts: [
          { name: 'Today', short_name: 'Today', url: '/?view=daily', description: 'Rapid log and schedule', icons: [{ src: 'shortcut-today.png', sizes: '96x96', type: 'image/png' }] },
          { name: 'Week', short_name: 'Week', url: '/?view=weekly', description: 'The next seven days', icons: [{ src: 'shortcut-week.png', sizes: '96x96', type: 'image/png' }] },
          { name: 'Month', short_name: 'Month', url: '/?view=monthly', description: 'Days down the margin and a brain dump', icons: [{ src: 'shortcut-month.png', sizes: '96x96', type: 'image/png' }] },
          { name: 'Future', short_name: 'Future', url: '/?view=future', description: 'The next twelve months', icons: [{ src: 'shortcut-future.png', sizes: '96x96', type: 'image/png' }] }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico}'],
        // The privacy page is its own document; don't precache it into the
        // app shell.
        globIgnores: ['privacy/**'],
        navigateFallback: '/index.html',
        // Without this, once the service worker is installed it answers
        // navigation to /privacy with the journal app instead of the policy.
        navigateFallbackDenylist: [/^\/privacy/, /^\/\.well-known\//],
        cleanupOutdatedCaches: true,
        // Fonts come from Google. Cache them so an offline launch — likely in
        // an installed Android app — keeps its typography instead of falling
        // back to system faces.
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'google-fonts-stylesheets' }
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-webfonts',
              expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] }
            }
          }
        ]
      },
      devOptions: {
        enabled: false
      }
    })
  ]
})
