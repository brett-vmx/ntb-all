import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import VitePWA from '@vite-pwa/astro';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  // Placeholder until the real domain is bought (new-tibetan-bible.app is the candidate).
  site: 'https://new-tibetan-bible.app',
  // Default output is fully static — no SSR adapter (deploys to Cloudflare Pages as static).
  server: { port: 4418 },
  devToolbar: { enabled: false }, // its bar overlays the bottom of the screen and blocks taps on the player
  // Book/chapter URLs (/esther/3) are client-side routes served by the one shell,
  // so link prefetching would only fetch that shell again.
  prefetch: false,
  integrations: [
    sitemap(),
    // Dev only: book/chapter URLs (/esther/3) are client-side routes served by the
    // one shell. Production does this with public/_redirects (Netlify) or the
    // host's SPA fallback (Cloudflare); the dev server needs the same rewrite.
    {
      name: 'spa-fallback',
      hooks: {
        'astro:server:setup': ({ server }) => {
          server.middlewares.use((req, _res, next) => {
            if (req.url && /^\/[a-z0-9-]+\/\d+\/?(\?.*)?$/.test(req.url)) req.url = '/';
            next();
          });
        },
      },
    },
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'script',
      // injectManifest (custom src/sw.js), not generateSW — needed so audio
      // can be excluded from the automatic precache and routed only through
      // the CacheFirst+RangeRequestsPlugin strategy in src/sw.js. See that
      // file's comments for why generateSW's declarative runtimeCaching
      // wasn't enough on its own.
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.js',
      manifest: {
        name: 'New Tibetan Bible',
        short_name: 'NTB',
        description: 'The New Tibetan Bible in Amdo, Kham, and Central Tibetan, with audio narration, plus English, Chinese, Hindi and Nepali text.',
        theme_color: '#CFB63C',
        background_color: '#CFB63C',
        display: 'standalone',
        scope: '/',
        start_url: '/',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      },
      injectManifest: {
        // The precache is the app SHELL only: code, styles, fonts, icons. Book
        // data (/data), pictures (/img) and audio (/audio, later R2) are NOT in it —
        // they are fetched when a book is opened and cached at runtime by the
        // routes in src/sw.js. Audio in particular must never be precached (it
        // would register a route that beats the Range-aware audio route).
        globPatterns: ['**/*.{html,js,css,png,ico,ttf,woff2}'],
        globIgnores: ['img/**', 'data/**', 'audio/**'],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
      },
    }),
  ],
  vite: {
    plugins: [tailwindcss()],
  },
});
