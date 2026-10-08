// Offline audio, saved one chapter at a time.
//
// The page itself downloads each file (so it can show real progress) and stores the
// complete response in the same Cache Storage entry the service worker's audio route
// serves from ('audio-range-cache' — see src/sw.js, which turns a cached full file
// into the 206 partial responses that make seeking work offline). Cache Storage is
// the single source of truth: a chapter is "saved" exactly when its URL is in that
// cache, whether this manager put it there or the audio route did while playing.
//
// Used by the Settings › Audio tab (chapter grid, "All"), the player's download icon,
// the Downloads view and the book picker. Everything redraws on 'ntb:downloads-changed'.

const CACHE = 'audio-range-cache';
export const AUDIO_BASE: string = (import.meta.env.PUBLIC_AUDIO_BASE as string | undefined) ?? '';

export type Manifest = Record<string, Record<string, Record<string, number>>>; // book -> track -> chapter -> bytes

interface Job { p: number; ctrl: AbortController; started: boolean }
const saved = new Set<string>();
const jobs = new Map<string, Job>();
let manifest: Manifest = {};
let notifyTimer = 0;

const emitNow = () => window.dispatchEvent(new CustomEvent('ntb:downloads-changed'));
// Progress ticks come far faster than the UI needs; coalesce to ~8 per second.
function emit() {
  if (notifyTimer) return;
  notifyTimer = window.setTimeout(() => { notifyTimer = 0; emitNow(); }, 120);
}

export const audioUrl = (book: string, track: string, n: number): string => `${AUDIO_BASE}/audio/${book}/${track}/chapter-${n}.mp3`;
/** Normalize to the absolute form Cache Storage reports (dev uses relative /audio/... paths). */
const abs = (u: string): string => new URL(u, location.href).href;
export const isSaved = (url: string): boolean => saved.has(abs(url));
/** 0..1 while downloading, null when not. */
export const progressOf = (url: string): number | null => jobs.get(abs(url))?.p ?? null;
export const chapterBytes = (book: string, track: string, n: number): number => manifest[book]?.[track]?.[n] ?? 0;
export const savedUrls = (): string[] => [...saved];

/** Parse a saved URL back to its book/track/chapter (null for anything else). */
export function parseUrl(url: string): { book: string; track: string; n: number } | null {
  const m = new URL(url, location.href).pathname.match(/^\/audio\/([a-z0-9-]+)\/(adx|bod|khg|eng|cmn)\/chapter-(\d+)\.mp3$/);
  return m ? { book: m[1], track: m[2], n: Number(m[3]) } : null;
}

export function formatMB(bytes: number): string {
  const mb = bytes / 1e6;
  return mb < 0.05 ? '0 MB' : mb < 10 ? `${mb.toFixed(1)} MB` : `${Math.round(mb)} MB`;
}

/** Load the size manifest and see what is already in the cache. Call once at boot. */
export async function initDownloads(): Promise<void> {
  try {
    manifest = await (await fetch('/data/audio-manifest.json')).json();
  } catch { /* offline first run: sizes show as 0 until the next load */ }
  try {
    const cache = await caches.open(CACHE);
    for (const req of await cache.keys()) saved.add(req.url);
  } catch { /* Cache Storage unavailable (private mode): nothing can be saved */ }
  emitNow();
}

export async function save(url: string): Promise<void> {
  url = abs(url);
  if (saved.has(url) || jobs.has(url) || !('caches' in window)) return;
  const job: Job = { p: 0, ctrl: new AbortController(), started: true };
  jobs.set(url, job);
  emit();
  try {
    // Same request shape as the <audio crossorigin="anonymous"> element, so the
    // cached entry is the one its CacheFirst route looks up.
    const res = await fetch(url, { mode: 'cors', credentials: 'omit', signal: job.ctrl.signal });
    if (res.status !== 200 || !res.body) throw new Error(`HTTP ${res.status}`);
    const total = Number(res.headers.get('content-length')) || 0;
    const reader = res.body.getReader();
    const chunks: Uint8Array[] = [];
    let got = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      got += value.length;
      job.p = total ? Math.min(got / total, 0.99) : 0.5;
      emit();
    }
    const type = res.headers.get('content-type') ?? 'audio/mpeg';
    const blob = new Blob(chunks as BlobPart[], { type });
    const cache = await caches.open(CACHE);
    await cache.put(url, new Response(blob, { status: 200, headers: { 'Content-Type': type, 'Content-Length': String(blob.size) } }));
    saved.add(url);
    // Ask the browser not to evict saved audio under storage pressure (iOS Safari
    // is stricter for sites that aren't installed to the home screen).
    void navigator.storage?.persist?.();
  } catch {
    /* cancelled, offline or failed: leave it unsaved; the user can try again */
  } finally {
    jobs.delete(url);
    emitNow();
  }
}

export function cancel(url: string): void {
  url = abs(url);
  const j = jobs.get(url);
  if (!j) return;
  j.ctrl.abort();
  if (!j.started) { jobs.delete(url); emitNow(); } // queued but not begun: just drop it
}

export async function remove(url: string): Promise<void> {
  url = abs(url);
  cancel(url);
  saved.delete(url);
  try { await (await caches.open(CACHE)).delete(url); } catch { /* ignore */ }
  emitNow();
}

export async function removeMany(urls: string[]): Promise<void> {
  urls = urls.map(abs);
  for (const u of urls) { cancel(u); saved.delete(u); }
  try { const c = await caches.open(CACHE); await Promise.all(urls.map((u) => c.delete(u))); } catch { /* ignore */ }
  emitNow();
}

export function saveMany(urls: string[]): void {
  urls = urls.map(abs);
  // A few at a time: all-at-once would split the connection ten ways and make
  // every chapter's progress crawl.
  const queue = urls.filter((u) => !saved.has(u) && !jobs.has(u));
  for (const u of queue) jobs.set(u, { p: 0, ctrl: new AbortController(), started: false }); // show as pending right away
  emitNow();
  const next = async (): Promise<void> => {
    const u = queue.shift();
    if (!u) return;
    if (!jobs.has(u)) return next(); // cancelled while queued
    jobs.delete(u); // hand over to save(), which owns the job from here
    await save(u);
    return next();
  };
  void Promise.all([next(), next(), next()]);
}

export function cancelMany(urls: string[]): void {
  for (const u of urls) cancel(u); // cancel() normalizes
}

export async function clearAll(): Promise<void> {
  for (const j of jobs.values()) j.ctrl.abort();
  saved.clear();
  try { await caches.delete(CACHE); } catch { /* ignore */ }
  emitNow();
}
