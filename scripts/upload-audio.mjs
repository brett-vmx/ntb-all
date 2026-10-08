// Uploads audio-src/ to the R2 bucket (idempotent: re-uploads overwrite).
//   node scripts/upload-audio.mjs [book]      needs `npx wrangler login`
// Keys are audio/<book>/<track>/chapter-N.mp3, served at https://audio.<domain>/<key> (same path as in dev).
// Uses wrangler one file at a time — fine for a few hundred files; for the whole
// Bible switch to rclone with an R2 access key (see PLAN.md).
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'audio-src');
const BUCKET = process.env.NTB_R2_BUCKET ?? 'ntb';
const only = process.argv[2];
let n = 0, bytes = 0;
for (const book of fs.readdirSync(SRC)) {
  if (only && book !== only) continue;
  if (!fs.statSync(path.join(SRC, book)).isDirectory()) continue;
  for (const track of fs.readdirSync(path.join(SRC, book))) {
    for (const f of fs.readdirSync(path.join(SRC, book, track)).filter((x) => x.endsWith('.mp3'))) {
      const file = path.join(SRC, book, track, f);
      execFileSync('npx', ['wrangler', 'r2', 'object', 'put', `${BUCKET}/audio/${book}/${track}/${f}`, '--file', file, '--content-type', 'audio/mpeg', '--cache-control', 'public, max-age=86400', '--remote'], { stdio: 'pipe', cwd: ROOT });
      n++; bytes += fs.statSync(file).size;
      process.stdout.write(`\r${n} files, ${(bytes / 1e6).toFixed(0)} MB   `);
    }
  }
}
console.log(`\nuploaded ${n} files to r2://${BUCKET}`);
