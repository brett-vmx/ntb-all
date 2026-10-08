# ntb-all — build plan

One New Tibetan Bible web app for every finished book, replacing the separate
`ntb-jonah`, `ntb-ruth` and `ntb-esther` apps. Approved design: the "Books and
downloads" mockup (Claude artifact, same link John's team has).

## Decisions already made (Brett, Oct 2026)
- **One app, one domain.** The book title in the header is a book picker. Only
  *finished* books are listed.
- **Install = app shell only.** A book's text and pictures load the first time
  that book is opened (then cached). Audio is never fetched at install.
- **Audio is saved chapter by chapter.** Playing a chapter saves it in the
  background; a download icon at the right of the player's bottom row, and the
  chapter grid in Settings › Audio, save ahead of time. Tap a saved chapter
  twice to remove it. A Downloads view (Settings › Audio) lists everything across
  all books, with remove and Clear all.
- **Five tracks per book:** Amdo (adx), Central (bod), Kham (khg), English (eng),
  Chinese (cmn). Chinese for every book.
- **Audio lives on Cloudflare R2**, not in git and not on Netlify.
- Don't touch John's audio (no re-encoding). Keep Esther-style on-demand caching.
- Minimize in-app text that needs Tibetan translation.
- Never commit or push without Brett's explicit say-so (Netlify credit concern).

## Base code
Start from `../Esther` (newest: footnotes #35, on-demand audio caching, seek
tolerance, Chinese audio, bridged verses). Read its CLAUDE.md and the CLAUDE.md of
`ntb-jonah` before changing anything — they hold hard-won, tested rules (view
transition re-init, popstate interception, modal height vs header, iOS Safari
dagger wrapping, etc.). Carry those rules into this repo's own CLAUDE.md.

## Architecture
1. **Book registry.** `books/<code>/book.json` per book: ids and names in the 5
   reading languages, chapter count, cover + inline image maps, verse-bridge labels,
   Nepali chapter titles, source file names, which audio tracks exist. This replaces
   the per-book constants hard-coded in each `gen-chapters.mjs`
   (`INLINE_IMAGES`, `COVER_IMAGES`, `NEPALI_TITLES`, `DURATIONS`, …).
2. **Generator loops over books.** One `scripts/gen-books.mjs` (generalized
   Esther/Jonah/Ruth generator). **Parity check first:** for Ruth, Esther and
   Jonah the new generator must reproduce each old repo's chapter JSON exactly
   (diff them) before anything else is built on it.
3. **Runtime data, not build-time inline.** Per-book JSON (`/data/<book>.json`:
   text in all languages, timing, notes) and images (`/img/<book>/…`) are fetched
   when a book is opened and runtime-cached by the service worker. The shell
   precache holds only code, fonts, icons, the menu and `books.json`.
4. **Routing.** Same SPA-by-modal pattern: `/` (current book), `/<book>/`,
   `/<book>/<n>`; keep the popstate-interception rule. Last book is remembered.
   Decide in phase 3 whether to emit static per-chapter fallback pages (SEO/direct
   links) — if so they must be excluded from the precache.
5. **Settings.** Unify keys as `ntb-*` (localStorage is per-origin, so nothing
   migrates from the old apps). Tabs Text / Audio as in the mockup.
6. **Audio.**
   - Source of truth outside git: a local `audio-src/<book>/<track>/chapter-N.mp3`
     (gitignored) mirrored to R2 by `scripts/upload-audio.mjs`.
   - `scripts/gen-manifest.mjs` writes `audio-manifest.json` (book → track →
     chapter → bytes, duration). It drives which tracks a book offers, every size
     shown in the UI, and the Downloads view. (Replaces `AVAILABLE_DIALECTS`.)
   - R2 bucket on its own subdomain (e.g. `audio.<domain>`) with CORS + Range.
     `<audio crossorigin="anonymous">`; the SW keeps the `CacheFirst` +
     `RangeRequestsPlugin` route. **Verify seeking and offline on the deployed
     R2 setup in a clean profile** (a stale cached site fooled us once).
   - A page-side `downloads.ts` manager does the fetch + `cache.put` itself
     (streams, so it can show real progress rings), lists/deletes via the Cache
     API, and is shared by the player icon, the chapter grid and the Downloads
     view. Cache Storage is the source of truth (no separate database).
   - First play of an unsaved chapter streams and saves, i.e. two fetches; fine at
     1–4 MB per chapter, optimize later if needed.
   - Ask the browser for persistent storage (`navigator.storage.persist()`) once
     something is saved; iOS can evict storage for sites not on the home screen.
7. **Old apps.** Keep Jonah, Ruth and Esther live until this ships, then turn their
   domains (incl. yohna.app) into redirects to `/<book>/`. Static build, so the
   same output can be deployed to a second mirror domain.

## Phases (each ends with a working, verified app)
1. Scaffold repo from Esther; book registry; multi-book generator with parity
   check for Ruth/Esther/Jonah.
2. Runtime data loading + SW (shell-only precache); open any book end to end.
3. Header book picker, per-book routing, intro/timeline buttons per book.
4. Audio: R2 + manifest + upload script, downloads manager, Settings › Audio
   (track boxes, 5-per-row chapter grid, download-all), player download icon,
   Downloads view, auto-save on play, persistent-storage request.
5. Verify: headless Chrome (SW/offline), real Safari in the iOS Simulator
   (layout, footnote †, player row at 375px), clean-profile offline test.
6. Docs (CLAUDE.md, README), then redirects for the three old apps.

## Progress
- **Phase 1 done (uncommitted):** `books/<code>/{config.mjs,source/}` for Ruth, Esther,
  Jonah; merged generator `scripts/gen-books.mjs` -> `public/data/{books,<code>,bible-intro,timeline}.json`;
  `scripts/parity.mjs` proves the output equals the three old generators (byte-for-byte
  after path mapping) with one intended fix: Jonah's Chinese 3:5 no longer leaks the
  footnote text (the live ntb-jonah app still shows "…穿麻衣-3:5或译：披上麻布。").
  Images copied to `public/img/<code>/{inline,covers}` and `public/img/timeline`.
- **Phase 2 done (uncommitted):** app copied from Esther and made data-driven. `index.astro`
  has no content collections; `boot()` fetches `/data/books.json`, then `loadBook(code)`
  fetches `/data/<code>.json` (+ shared bible-intro/timeline), draws the tiles and re-runs
  `initModal()`. Routes are `/<book>/<n>` (deep links via `public/_redirects`; dev has a
  rewrite in astro.config.mjs). Opening a book prefetches its images. Settings keys/events
  are `ntb-*`/`ntb:*`; header title and About banner follow the current book
  (`public/img/<code>/about-banner.webp`). Audio paths are `/audio/<book>/<track>/chapter-N.mp3`;
  local test audio is in gitignored `audio-src/` (symlinked as `public/audio`).
  **Verified** (headless Chrome, built preview): precache is the shell only (18 files, 5.7 MB);
  `ntb-data`/`ntb-img` fill when a book is opened; offline reload, opening an opened
  book's chapters with images, playing + seeking a played chapter's audio all work with the
  server stopped; switching to a never-opened book offline fails gracefully
  (`ntb:book-load-failed` event; the picker UI must surface it).
- **Hosting is live (Oct 8):** https://new-tibetan-bible.app (Cloudflare Workers static assets,
  `wrangler.jsonc`, deployed with `npx wrangler deploy` after `npm run build` — no git needed).
  Audio: R2 bucket `ntb`, public at https://audio.new-tibetan-bible.app/audio/<book>/<track>/chapter-N.mp3
  (custom domain, CORS for the app origins + localhost:4418, Range works); uploaded with
  `node scripts/upload-audio.mjs`; `PUBLIC_AUDIO_BASE` in `.env.production`. Verified on the live
  site in a clean profile: audio plays/seeks from R2, played chapters cache and play offline.
  Account: brett@vmx.media (zone id f861b98a66b39a185426ec52514f32fb).
- **Wordproject hold:** Esther's Chinese (Wordproject) is NOT in `audio-src/` or R2 — it is parked in
  gitignored `audio-hold/esther/cmn/`. Until released, Esther offers 4 tracks (a book/track with no
  audio file is simply not offered: gen-books checks `audio-src/`). To release: move it back to
  `audio-src/esther/cmn`, then `npm run gen-books && npm run gen-manifest && node scripts/upload-audio.mjs esther`.
- **Phase 3 done:** header book name is a picker button (`#book-btn` → `#book-sheet`); Settings sheet
  has Text | Audio tabs; Audio tab lists the book's available tracks as radio rows (replaces the old
  Tibetan-only dialect row). `setAvailableDialects()` is set per book on load.
- **Esther Chinese released (Oct 8, at Brett's instruction, so John can review everything in one app):**
  it is in `audio-src/esther/cmn` and on R2; the Wordproject email has still NOT been sent.
- **Phase 4 done, deployed:** `src/lib/downloads.ts` (page-side manager: fetch with progress ->
  `cache.put` into `audio-range-cache`, which the SW audio route serves with Range support; Cache
  Storage is the source of truth; asks `navigator.storage.persist()` after a save). UI: Settings ›
  Audio = one box per track with an "All" button (white -> dark when everything is saved, size in
  small gray text under it) and, for the selected track, a "Chapter Downloads" grid (white cells,
  dark when saved, thin progress bar while downloading, tap a saved one twice to remove); "All
  Downloads" row -> Downloads view (grouped by book, remove per track, Clear all with 2-tap
  confirm); player: download icon at the far right of the bottom row (ring -> progress -> dark check,
  tap when saved for a Remove popover); playing a chapter saves it. Book picker shows saved size.
  The old SW `CACHE_AUDIO` message path is gone. Verified headless Chrome, local + live (R2,
  CORS, offline playback + seek of saved chapters). NOT yet verified on real Safari / iOS.
- Next: iOS Simulator pass (player row at 375px, settings sheet, downloads on Safari), About page
  copy per book, per-book intro/timeline buttons check, README/CLAUDE.md for the new repo, then
  redirects from the three old apps. Wordproject permission still open.

## Open items for Brett
- App/repo name and domain (and who creates the GitHub repo).
- Cloudflare: create the R2 bucket + custom subdomain and an API token (or run the
  upload script yourself); Claude can't do account-level actions.
- Shell hosting stays on Netlify for now?
- Wordproject written permission (Chinese audio for all 66 books): email drafted.
- Which book is "current" on first launch (suggest Esther, the newest).
- John hasn't reviewed #24–34, footnotes or Chinese audio; those carry over as-is.
