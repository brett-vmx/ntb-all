// Writes public/data/audio-manifest.json from the mp3s in audio-src/:
//   { "<book>": { "<track>": { "<chapter>": bytes, ... } } }
// It drives every size shown in the download UI. audio-src/ is not in git (the
// audio lives on R2); this file is, so the app knows what exists and how big it
// is without asking the bucket. Run after adding/removing audio, then upload.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'audio-src');
const manifest = {};
for (const book of fs.readdirSync(SRC, { withFileTypes: true }).filter((d) => d.isDirectory())) {
  for (const track of fs.readdirSync(path.join(SRC, book.name), { withFileTypes: true }).filter((d) => d.isDirectory())) {
    for (const f of fs.readdirSync(path.join(SRC, book.name, track.name))) {
      const m = f.match(/^chapter-(\d+)\.mp3$/);
      if (!m) continue;
      ((manifest[book.name] ??= {})[track.name] ??= {})[Number(m[1])] = fs.statSync(path.join(SRC, book.name, track.name, f)).size;
    }
  }
}
fs.mkdirSync(path.join(ROOT, 'public/data'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'public/data/audio-manifest.json'), JSON.stringify(manifest));
const files = Object.values(manifest).flatMap((b) => Object.values(b).flatMap((t) => Object.values(t)));
console.log(`audio-manifest.json: ${files.length} files, ${(files.reduce((a, b) => a + b, 0) / 1e6).toFixed(1)} MB`);
