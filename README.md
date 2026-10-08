# New Tibetan Bible — web app

One installable web app (PWA) for reading and listening to the New Tibetan Bible, book by book, in Tibetan
(Amdo, Central, Kham audio), English, Chinese, Hindi and Nepali. Live: https://new-tibetan-bible.app

Finished books: Ruth, Esther, Jonah. Read `CLAUDE.md` (working reference) and `PLAN.md` (decisions and progress).

```bash
npm ci
npm run dev           # http://localhost:4418  (needs a local audio-src/ for audio)
npm run deploy        # regenerate content, build, publish to Cloudflare (needs `npx wrangler login`)
```
