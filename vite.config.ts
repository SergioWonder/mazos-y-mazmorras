import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  // Ruta base del repositorio en GitHub Pages
  base: '/mazo-y-mazmorra/',
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icono.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Mazo y Mazmorra',
        short_name: 'MazoMazmorra',
        description:
          'Roguelike de construcción de mazos con sabor a D&D: druida, bárbaro y mago contra el Asentamiento Ogro y la Cripta.',
        lang: 'es',
        display: 'fullscreen',
        orientation: 'landscape',
        background_color: '#0d120c',
        theme_color: '#0d120c',
        icons: [
          { src: 'icono-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icono-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icono-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg}'],
        // Las fuentes de Google se cachean al vuelo para jugar sin conexión
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-css',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-archivos',
              expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
        ],
      },
    }),
  ],
});
