import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import fs from 'node:fs';
import path from 'node:path';
import {defineConfig} from 'vite';
import {VitePWA} from 'vite-plugin-pwa';

const base = process.env.GITHUB_PAGES === 'true' ? '/apis-market-intelligence/' : '/';

export default defineConfig(() => ({
  base,
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg', 'apple-touch-icon.png', 'pwa-192x192.png', 'pwa-512x512.png', 'pwa-maskable-512x512.png'],
      manifest: {
        id: base,
        name: 'Stocks — Global Market Terminal',
        short_name: 'Stocks',
        description: 'Free global market dashboard using scheduled public market-data snapshots, local portfolio storage and transparent source timestamps.',
        theme_color: '#080C14',
        background_color: '#080C14',
        display: 'standalone',
        start_url: base,
        scope: base,
        icons: [
          {src: `${base}pwa-192x192.png`, sizes: '192x192', type: 'image/png', purpose: 'any'},
          {src: `${base}pwa-512x512.png`, sizes: '512x512', type: 'image/png', purpose: 'any'},
          {src: `${base}pwa-maskable-512x512.png`, sizes: '512x512', type: 'image/png', purpose: 'maskable'},
        ],
      },
      workbox: {
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2,json}'],
        navigateFallbackDenylist: [/\/api\//],
        runtimeCaching: [
          {
            urlPattern: /\/api\/.*\.json(?:\?.*)?$/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'stocks-public-snapshots',
              networkTimeoutSeconds: 5,
              expiration: {maxEntries: 260, maxAgeSeconds: 60 * 60 * 24 * 2},
              cacheableResponse: {statuses: [0, 200]},
            },
          },
        ],
      },
      devOptions: {enabled: false},
    }),
    {
      name: 'copy-unbundled-src-assets',
      apply: 'build',
      closeBundle(error?: Error): void {
        if (error) return;
        const distDir = path.resolve(import.meta.dirname, 'dist');
        const srcAssets = path.resolve(import.meta.dirname, 'src/assets');
        const distAssets = path.resolve(distDir, 'src/assets');
        if (fs.existsSync(distDir) && fs.existsSync(srcAssets)) fs.cpSync(srcAssets, distAssets, {recursive: true, force: true});
      },
    },
  ],
  resolve: {alias: {'@': path.resolve(import.meta.dirname, '.') }},
  build: {
    chunkSizeWarningLimit: 600,
    rolldownOptions: {output: {codeSplitting: {groups: [
      {name: 'vendor-react', test: /node_modules[\/](react|react-dom|scheduler)[\/]/, priority: 30},
      {name: 'vendor-d3', test: /node_modules[\/]d3(-[a-z]+)?[\/]/, priority: 20},
      {name: 'vendor-motion', test: /node_modules[\/](motion|framer-motion)[\/]/, priority: 15},
      {name: 'vendor-icons', test: /node_modules[\/]lucide-react[\/]/, priority: 10},
    ]}}},
  },
  server: {
    hmr: process.env.DISABLE_HMR !== 'true',
    watch: process.env.DISABLE_HMR === 'true' ? null : {},
  },
}));
