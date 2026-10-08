# New Tibetan Bible — one app, every book

Consolidated PWA replacing the separate `ntb-jonah`, `ntb-ruth` and `ntb-esther` apps. Live at
**https://new-tibetan-bible.app**. Client: New Tibetan Bible translation committee (contact John;
Brett relays requests). Text © NTB committee CC BY-NC-ND 4.0; illustrations Sweet Publishing (public domain).
Read `PLAN.md` for the decision log and progress; this file is the working reference.

## Rules (from Brett)
- **Never commit or push unless Brett says so.** Stage specific files, never `git add -A`.
- **Never ask for or paste credentials in chat.** Cloudflare access is `wrangler login` (OAuth on this Mac).
- Don't alter John's audio (no re-encoding). Minimize in-app text that needs Tibetan translation.
- Esther's Chinese audio is **Wordproject's** (copyrighted, non-profit use only, hosting/linking needs their
  approval). It is live for John's review but the permission email has NOT been sent — see PLAN.md.

## Stack
Astro 5 (static, no SSR), Tailwind v4, vanilla TS, `@vite-pwa/astro` with a hand-written Workbox `injectManifest`
service worker (`src/sw.js`). No framework islands. Hosting: **Cloudflare Workers static assets** (`wrangler.jsonc`).
Audio: **Cloudflare R2** bucket `ntb`, public at `https://audio.new-tibetan-bible.app`.

## Layout
```
books/<code>/config.mjs      per-book editorial data (illustration placement, covers, titles, durations, names, source files)
books/<code>/source/         Tibetan SFM, BSB English, CUV Chinese, Hindi/Nepali USFM, timing exports (timing/)
shared/bible-intro.rtf       NTB Bible introduction (all books)
scripts/gen-books.mjs        ALL generated content: public/data/{books,<code>,bible-intro,timeline}.json
scripts/gen-manifest.mjs     public/data/audio-manifest.json (bytes per mp3, from audio-src/)
scripts/upload-audio.mjs     audio-src/ -> R2 (wrangler, one file at a time)
scripts/parity.mjs           proves gen-books output == the three old apps' output (run after touching the generator)
public/img/<code>/{inline,covers,about-banner.webp}, public/img/timeline/   runtime-fetched pictures
src/pages/index.astro        the whole app UI + logic (chapter modal, player, intro/timeline modals, boot/loadBook)
src/layouts/Layout.astro     header (book picker), Settings sheet (Text | Audio tabs + Downloads view), About, book sheet
src/lib/downloads.ts         offline audio manager (Cache Storage)
src/i18n/settings-store.ts   settings in localStorage (`ntb-*` keys, `ntb:*` events), AVAILABLE_DIALECTS
audio-src/ (gitignored)      local copy of all mp3s: audio-src/<book>/<track>/chapter-N.mp3 (symlinked as public/audio for dev)
docs/legacy-CLAUDE-esther.md the old Esther/Jonah CLAUDE.md — long, but holds many hard-won, tested rules (see below)
```
Never hand-edit `public/data/*.json`; edit the source/config and run `npm run gen-books`.

## Commands
- `npm run dev` (port 4418; bind IPv4 for the iOS Simulator: `npm run dev -- --host 127.0.0.1`)
- `npm run gen-books` · `npm run gen-manifest` · `npm run parity`
- `npm run deploy` = gen-books + gen-manifest + build + `npx wrangler deploy` (**no git needed**)
- `npm run upload-audio [book]`

## How it works
- **One shell, runtime data.** Install precaches the shell only (code, fonts, icons ≈ 5.7 MB; see `astro.config.mjs`
  `globIgnores`). `boot()` in index.astro fetches `/data/books.json`, then `loadBook(code)` fetches `/data/<code>.json`
  (+ shared bible-intro/timeline), renders the tiles, re-runs `initModal()`, and prefetches the book's pictures.
  SW runtime routes: `/data/` stale-while-revalidate, `/img/` cache-first, audio below.
- **Routes** are client-side: `/<book>/<n>`. Production serves the shell for them (Workers `not_found_handling:
  single-page-application`); the dev server rewrites in `astro.config.mjs`. The current book is `localStorage['ntb-book']`
  or the URL; the header book name is a picker (`#book-btn` → `#book-sheet`); switching fires `ntb:book-changed`.
- **Tracks** per book = those with an mp3 for every chapter in `audio-src/` at generate time (`gen-books` writes
  `audio.<track>: null` otherwise); `setAvailableDialects()` publishes them. A track with no file is never offered.
- **Audio + downloads.** `<audio crossorigin="anonymous">` plays R2 URLs (`PUBLIC_AUDIO_BASE` in `.env.production`;
  empty in dev = local files). The SW audio route is `CacheFirst + RangeRequestsPlugin` — this is what makes seeking
  work offline (R2 itself supports Range). `downloads.ts` fetches a file with progress and `cache.put`s the full 200
  into `audio-range-cache`; **Cache Storage is the single source of truth** for "saved". Playing a chapter saves it
  (`play` listener). UI: Settings › Audio (track boxes, "All" button, 5-per-row chapter grid with `(X/N)`, two-tap
  remove), player download icon (far right of the bottom row), Settings › All Downloads view, book picker sizes.
  Don't put audio in the precache (it would register a route that beats the Range-aware one).
- **Detached-click-target gotcha (bit us three times):** a handler that re-renders innerHTML makes `e.target` detached
  by the time document-level "outside click" listeners run. Guard with `document.contains(target)` or
  `e.composedPath()`.
- Footnotes (†), verse bridges, Tibetan typography (shad spacing, justification), seek tolerance, header safe-area and
  modal-height rules, intro/timeline buttons etc. are carried over unchanged from the old apps — their rationale is in
  `docs/legacy-CLAUDE-esther.md` ("Footnotes (request #35)", "Tibetan typography", "Next-verse seek tolerance",
  "The chapter modal must never grow taller…", "Bible introduction & timeline buttons"). Read the relevant section
  before changing those areas. Class/rule differences: events are `ntb:*` not `esther:*`; no ClientRouter hijack
  concerns remain except the early `popstate` interceptor in Layout.astro (still there; harmless).

## Testing recipes
- Offline/SW behaviour needs a real browser engine with service workers: the built-in browser pane can't register
  them. Use headless Chrome via puppeteer-core (see PLAN.md history; `setOfflineMode(true)` works) against
  `npm run build && npx astro preview --port 4418`, or against the live site with a clean profile.
- Real Safari: iOS Simulator (iPhone 17 Pro, 402×874 pt). Open `https://new-tibetan-bible.app/...` with `open_url`.
  **Simulator screenshots lag the action by one or two steps** — wait ~4 s and re-screenshot before concluding a tap did
  nothing. A freshly deployed version appears on the *second* load (autoUpdate service worker).
- Always run `npm run parity` after changing `gen-books.mjs` or any `books/*/config.mjs`.

## Known gaps / next
- Wordproject permission (Chinese audio, all books) — email drafted, unsent; John to judge quality first.
- First paint shows an empty grid/title for ~1 s on a cold load (data is fetched at runtime); a skeleton would help.
- Per-book About copy, redirects from the three old apps (incl. yohna.app), audio for more books via wrangler is slow —
  use rclone with an R2 access key for bulk uploads. Move repo/R2/DNS under John's Cloudflare account when he is ready.
- `ntb-jonah`'s live Chinese 3:5 still shows a stray footnote fragment (fixed here only).
