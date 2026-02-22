// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: ['@vite-pwa/nuxt'],
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  ssr: false,

  app: {
    head: {
      title: 'Food Tracker',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' },
        { name: 'description', content: 'Track your daily nutrition, scan barcodes, and monitor your health goals.' },
        { name: 'theme-color', content: '#0a0e17' },
        { name: 'mobile-web-app-capable', content: 'yes' },
        { name: 'apple-mobile-web-app-capable', content: 'yes' },
        { name: 'apple-mobile-web-app-status-bar-style', content: 'black-translucent' },
        { name: 'apple-mobile-web-app-title', content: 'Food Tracker' },
      ],
      link: [
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap' },
        { rel: 'apple-touch-icon', href: '/pwa-192x192.png' },
        { rel: 'manifest', href: '/manifest.webmanifest' },
      ],
    },
  },

  pwa: {
    registerType: 'autoUpdate',
    injectRegister: 'auto',
    manifest: {
      name: 'Food Tracker',
      short_name: 'Food Tracker',
      description: 'Track your daily nutrition, scan barcodes, and monitor your health goals.',
      theme_color: '#0a0e17',
      background_color: '#0a0e17',
      display: 'standalone',
      orientation: 'portrait',
      start_url: '/',
      scope: '/',
      icons: [
        {
          src: '/pwa-192x192.png',
          sizes: '192x192',
          type: 'image/png',
        },
        {
          src: '/pwa-512x512.png',
          sizes: '512x512',
          type: 'image/png',
          purpose: 'any maskable',
        },
      ],
    },
    workbox: {
      navigateFallback: '/',
      globPatterns: ['**/*.{js,css,html,png,svg,ico,woff2}'],
      runtimeCaching: [
        {
          urlPattern: /^\/api\/.*/,
          handler: 'NetworkFirst',
          options: {
            cacheName: 'api-cache',
            expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 },
            networkTimeoutSeconds: 10,
          },
        },
      ],
    },
    devOptions: {
      enabled: true,
      type: 'module',
    },
  },

  css: ['~/assets/css/main.css'],

  runtimeConfig: {
    public: {
      // API proxy is handled via Nitro routeRules
    },
  },

  nitro: {
    routeRules: {
      '/api/**': {
        // In production (Docker), the backend is available at http://backend:5000
        // In development, it's usually http://localhost:5000
        proxy: process.env.NODE_ENV === 'production'
          ? 'http://backend:5000/api/**'
          : 'http://localhost:5000/api/**',
      },
    },
  },
})
