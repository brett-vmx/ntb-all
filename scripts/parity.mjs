// Proves the merged generator reproduces what the three old per-app generators
// produced. Compares public/data/<code>.json against each old repo's generated
// src/content/** files (deep-equal, key order ignored), after mapping the old
// Astro asset paths (../../assets/...) to the new /img/... URLs.
//   node scripts/parity.mjs [oldReposDir]   (regenerates with every audio track assumed present,
//   then restores the normal output)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OLD = path.resolve(process.argv[2] ?? path.join(ROOT, '..'));
execFileSync('node', [path.join(ROOT, 'scripts/gen-books.mjs')], { env: { ...process.env, NTB_ASSUME_ALL_AUDIO: '1' }, stdio: 'ignore' });
const REPOS = { jonah: 'ntb-jonah', ruth: 'ntb-ruth', esther: 'Esther' };

const norm = (v, code) => JSON.parse(JSON.stringify(v).replace(/\/audio\/(adx|bod|khg|eng|cmn)\//g, `/audio/${code}/$1/`).replace(/\.\.\/\.\.\/assets\/chapters\/(inline|covers)\//g, `/img/${code}/$1/`).replace(/\.\.\/\.\.\/assets\/timeline\//g, '/img/timeline/'));
function diff(a, b, p = '') {
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return [`${p}: length ${a.length} vs ${b.length}`];
    return a.flatMap((x, i) => diff(x, b[i], `${p}[${i}]`));
  }
  if (a && b && typeof a === 'object' && typeof b === 'object') {
    return [...new Set([...Object.keys(a), ...Object.keys(b)])].flatMap((k) => {
      if (!(k in a)) return [`${p}.${k}: only in new`];
      if (!(k in b)) return [`${p}.${k}: only in old`];
      return diff(a[k], b[k], `${p}.${k}`);
    });
  }
  return a === b ? [] : [`${p}: ${JSON.stringify(a)?.slice(0, 80)} vs ${JSON.stringify(b)?.slice(0, 80)}`];
}
// Known, intended differences (the new output is the correct one).
//  - Jonah Chinese 3:5: the old ntb-jonah parser leaked the footnote
//    "\f - \fr 3:5 \ft 或译：披上麻布\f*" into the verse text ("…穿麻衣-3:5或译：披上麻布。").
//    Esther's parser (used here) strips it, as it already did for Ruth and Esther.
const KNOWN = new Set(['jonah:chapter-3.blocks[4].cmn']);
const load = (f) => JSON.parse(fs.readFileSync(f, 'utf8'));
let bad = 0;
for (const [code, repo] of Object.entries(REPOS)) {
  const neu = load(path.join(ROOT, 'public/data', `${code}.json`));
  const dir = path.join(OLD, repo, 'src/content');
  let problems = [];
  neu.chapters.forEach((c) => {
    const old = norm(load(path.join(dir, 'chapters', `chapter-${c.chapterNumber}.json`)), code);
    problems.push(...diff(c, old, `chapter-${c.chapterNumber}`));
  });
  const oldCount = fs.readdirSync(path.join(dir, 'chapters')).filter((f) => f.endsWith('.json')).length;
  if (oldCount !== neu.chapters.length) problems.push(`chapter count ${neu.chapters.length} vs ${oldCount}`);
  problems.push(...diff(neu.intro, load(path.join(dir, 'intro', `${code}.json`)), 'intro'));
  const known = problems.filter((p) => KNOWN.has(`${code}:${p.split(': ')[0]}`));
  problems = problems.filter((p) => !known.includes(p));
  console.log(`${code}: ${problems.length ? 'DIFFERS' : 'identical'}  (${neu.chapters.length} chapters + intro)${known.length ? `, ${known.length} known fix` : ''}`);
  problems.slice(0, 15).forEach((p) => console.log('   ' + p));
  bad += problems.length;
}
const shared = [['bible-intro', 'bible-intro/bible-intro.json'], ['timeline', 'timeline/timeline.json']];
for (const [name, rel] of shared) {
  const neu = load(path.join(ROOT, 'public/data', `${name}.json`));
  for (const [code, repo] of Object.entries(REPOS)) {
    const p = diff(neu, norm(load(path.join(OLD, repo, 'src/content', rel)), code));
    console.log(`${name} vs ${repo}: ${p.length ? 'DIFFERS ' + p.slice(0, 3).join('; ') : 'identical'}`);
    bad += p.length;
  }
}
execFileSync('node', [path.join(ROOT, 'scripts/gen-books.mjs')], { stdio: 'ignore' }); // restore normal output
process.exit(bad ? 1 : 0);
