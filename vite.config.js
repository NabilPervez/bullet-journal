import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Marginalia — Bullet Journal & Time Blocker',
        short_name: 'Marginalia',
        description: 'A digital bullet journal: rapid logging, an Index, Future Log, Monthly Log, and a daily time-blocking agenda.',
        theme_color: '#FAFAF7',
        background_color: '#FAFAF7',
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
        shortcuts: [
          { name: 'Daily Log', url: '/?view=daily', description: 'Rapid log + today\'s schedule' },
          { name: 'Monthly Log', url: '/?view=monthly', description: 'Days down the margin + brain dump' },
          { name: 'Future Log', url: '/?view=future', description: 'The next twelve months' },
          { name: 'Index', url: '/?view=index', description: 'Table of contents' }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico}'],
        navigateFallback: '/index.html',
        cleanupOutdatedCaches: true
      },
      devOptions: {
        enabled: false
      }
    })
  ]
})
