import { precacheAndRoute, cleanupOutdatedCaches, createHandlerBoundToURL } from 'workbox-precaching';
import { registerRoute, NavigationRoute } from 'workbox-routing';
import { CacheFirst, StaleWhileRevalidate } from 'workbox-strategies';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';
import { RangeRequestsPlugin } from 'workbox-range-requests';

// registerType: 'autoUpdate' (astro.config.mjs) posts this message from
// registerSW.js once a new SW has installed, so it activates immediately
// instead of waiting for every tab to close.
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

// Everything EXCEPT the dialect audio files goes through the normal
// generated precache manifest (audio is excluded via
// astro.config.mjs's injectManifest.globPatterns — see the audio section
// below for why).
precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();
registerRoute(new NavigationRoute(createHandlerBoundToURL('/')));

// --- Book data and pictures: fetched when a book is opened, cached after ---
// The install only precaches the shell (astro.config.mjs globIgnores), so each
// book's JSON and images arrive lazily. Data is stale-while-revalidate so text
// corrections reach readers on their next visit; images never change in place.
registerRoute(({ url }) => url.pathname.startsWith('/data/'), new StaleWhileRevalidate({
  cacheName: 'ntb-data',
  plugins: [new CacheableResponsePlugin({ statuses: [0, 200] })],
}));
registerRoute(({ url }) => url.pathname.startsWith('/img/'), new CacheFirst({
  cacheName: 'ntb-img',
  plugins: [new CacheableResponsePlugin({ statuses: [0, 200] })],
}));

// --- Audio: one CacheFirst + RangeRequestsPlugin route, not precached ---
//
// Cloudflare Pages does not honor Range requests for static assets — it
// always returns a plain 200 with the full file, never 206/Accept-Ranges.
// Without that, HTMLMediaElement.seekable collapses to [0,0] and any seek
// ahead of what's already been downloaded (the seek track, prev/next-verse)
// silently fails. workbox-range-requests fixes this: it synthesizes real
// 206 partial responses from a cached full copy of the file.
//
// This must be the ONLY route serving these files. Audio was previously
// ALSO included in the standard precache (globPatterns included 'mp3'),
// which seemed harmless but wasn't: precacheAndRoute() registers its own
// route for every precached URL, and — confirmed by testing, not a guess —
// that route is checked before any later registerRoute() call and serves
// the full cached file directly, with no Range awareness at all, for every
// request including ones carrying a Range header. The prev/next-verse
// buttons and seek track kept failing even after adding the plugin below,
// because the plain precache route was winning every time. Removing 'mp3'
// from the precache glob and routing audio only through this
// CacheFirst+RangeRequestsPlugin strategy is what actually fixes it — do
// not put audio back in globPatterns.
const AUDIO_CACHE = 'audio-range-cache';
const audioStrategy = new CacheFirst({
  cacheName: AUDIO_CACHE,
  plugins: [
    new CacheableResponsePlugin({ statuses: [0, 200] }),
    new RangeRequestsPlugin(),
  ],
});

registerRoute(({ request }) => request.destination === 'audio', audioStrategy);

// --- Offline audio is saved by the page, not here ---
// src/lib/downloads.ts downloads each chapter (so it can show progress) and puts the
// complete response into 'audio-range-cache' — the cache the route above serves from.
// This worker only has to turn that stored full file into Range (206) responses,
// which RangeRequestsPlugin does, so seeking works offline exactly as online.
