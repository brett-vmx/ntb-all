// Generates per-book content for the consolidated NTB app from each book's
// source files in books/<code>/source/ (Tibetan SFM, BSB English, CUV Chinese,
// Hindi, Nepali USFM, timing exports) plus the per-book editorial maps in
// books/<code>/config.mjs.
//
//   node scripts/gen-books.mjs            all books
//   node scripts/gen-books.mjs esther     one book
//
// Output (public/data/, fetched by the app at runtime — never hand-edit):
//   books.json            the book picker's list
//   <code>.json           one book: names, intro, every chapter (text in all five
//                         reading languages, timing, footnotes, image blocks)
//   bible-intro.json, timeline.json   shared reference content
//
// Merged from the three old per-app generators (ntb-jonah, ntb-ruth, Esther):
// Esther's is the base (verse bridges, USFM English, intro typed into the SFM's
// front matter); Jonah's English-from-RTF and intro-from-RTF paths are kept
// behind each book's `sources` setting. Comments below are the originals.
// scripts/parity.mjs proves the output equals what the old generators produced.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = path.join(ROOT, 'public/data');
const BIBLE_INTRO_RTF_PATH = path.join(ROOT, 'shared/bible-intro.rtf');
const TIMELINE_PAGE_COUNT = 6;
const TRACKS = ['adx', 'bod', 'khg', 'eng', 'cmn'];
const haveAudio = (track, n) => process.env.NTB_ASSUME_ALL_AUDIO === '1' || fs.existsSync(path.join(ROOT, 'audio-src', BOOK.code, track, `chapter-${n}.mp3`));

// Current book (set by useBook before each build); the parsers below read these.
let BOOK, SRC_DIR;
let INLINE_IMAGES, COVER_IMAGES, ENGLISH_LABELS, ENGLISH_TITLES, CHINESE_LABELS, INDIC_CHAPTER_LABELS, NEPALI_TITLES, DURATIONS;

async function useBook(code) {
  const cfg = await import(pathToFileURL(path.join(ROOT, 'books', code, 'config.mjs')).href);
  BOOK = cfg.BOOK;
  SRC_DIR = path.join(ROOT, 'books', code, 'source');
  ({ INLINE_IMAGES, COVER_IMAGES, ENGLISH_LABELS, ENGLISH_TITLES, CHINESE_LABELS, INDIC_CHAPTER_LABELS, NEPALI_TITLES, DURATIONS } = cfg);
}

function fmtDuration(secs) {
  const total = Math.round(secs);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

// ---------------------------------------------------------------------------
// 1. Parse the Tibetan SFM
// ---------------------------------------------------------------------------
//
// Same shape as Jonah's own Tibetan source, with one real difference: Esther's
// chapters each carry MULTIPLE \s sub-headings (scene breaks within the
// chapter), not just one — Jonah's SFM only ever had one \s per chapter, so
// its parser could get away with letting each \s simply overwrite the last.
// Here that would leave sectionTitleBo as the chapter's LAST scene instead
// of its overall theme, so this version keeps only the FIRST \s per chapter
// (matching the same "first heading wins" choice made below for English/
// Chinese/Hindi, which have the identical multi-heading-per-chapter shape).

function parseSfm(raw) {
  const lines = raw.split('\n').map((l) => l.replace(/\r$/, ''));
  const chapters = {}; // { [n]: { label, section, verses: { [v]: string[] }, paragraphStarts: Set<v> } }
  let chapterNum = null;
  let verseNum = null;
  let pendingParagraph = false; // saw \p or \m, not yet attached to the next verse
  let sawSection = {};

  const ensureChapter = (n) => {
    if (!chapters[n]) chapters[n] = { label: '', section: '', verses: {}, notes: {}, bridges: {}, paragraphStarts: new Set() };
    return chapters[n];
  };

  // Footnotes (request #35): "\f + \ft note text\f*" sits right after the word
  // it explains. Each is lifted OUT of the verse text into `notes[v]` (a plain
  // array of strings, in order of appearance) and replaced in the text by a
  // `{{fn:N}}` marker — N is the index into that verse's notes. index.astro turns
  // each marker into a † caller that opens the note in a popup; nothing is
  // left in the body text itself (no brackets). Only the Tibetan text carries
  // them: the English/Chinese/Hindi/Nepali sources' own footnotes are different
  // texts' notes and stay stripped (see their parsers). A verse can have
  // several; poetry lines (\q1) share the verse's one notes array.
  const FOOTNOTE_RE = /\\f [+\-*] ?(.*?)\\f\*/gs;
  const extractFootnotes = (s, notes) =>
    s
      .replace(FOOTNOTE_RE, (_, inner) => {
        const note = inner
          .replace(/\\fr\s+\S+\s*/g, '') // verse-reference marker, if a source ever has one
          .replace(/\\f[a-z]+\*?\s?/g, '') // \ft, \fq, \fk ... — keep their text, drop the tags
          .trim();
        notes.push(note);
        return `{{fn:${notes.length - 1}}}`;
      })
      .trim();

  for (const rawLine of lines) {
    const line = rawLine;
    if (line.startsWith('\\c ')) {
      chapterNum = parseInt(line.slice(3).trim(), 10);
      ensureChapter(chapterNum);
      verseNum = null;
      pendingParagraph = false;
      continue;
    }
    if (chapterNum === null) continue; // skip \id, \h, \mt, \imt, \is1, \ipi front matter (see parseIntroFromSfm)

    if (line.startsWith('\\cl ')) {
      chapters[chapterNum].label = line.slice(4).trim();
      continue;
    }
    if (line.startsWith('\\s ')) {
      if (!sawSection[chapterNum]) {
        chapters[chapterNum].section = line.slice(3).trim();
        sawSection[chapterNum] = true;
      }
      continue;
    }
    if (line.startsWith('\\p') || line.startsWith('\\m')) {
      pendingParagraph = true; // attach to whichever verse comes next
      continue;
    }
    if (line.startsWith('\\v ')) {
      // "\v 11-12 text" is a verse BRIDGE (Esther 8:11-12 in this source) —
      // one block of text covering two verse numbers. Keyed by its first
      // number, with the last recorded in `bridges` (buildChapter() uses it
      // to label the block "11-12" and to merge the other languages' 11+12).
      // Before bridge support this regex only matched "\v N text", so the
      // whole bridged verse's text was silently dropped.
      const m = line.match(/^\\v (\d+)(?:-(\d+))? (.*)$/s);
      if (!m) continue;
      verseNum = parseInt(m[1], 10);
      if (m[2]) chapters[chapterNum].bridges[verseNum] = parseInt(m[2], 10);
      const vnotes = [];
      const text = extractFootnotes(m[3], vnotes);
      chapters[chapterNum].verses[verseNum] = [text];
      if (vnotes.length) chapters[chapterNum].notes[verseNum] = vnotes;
      if (pendingParagraph) {
        chapters[chapterNum].paragraphStarts.add(verseNum);
        pendingParagraph = false;
      }
      continue;
    }
    if (line.startsWith('\\q1')) {
      if (verseNum === null) continue;
      const vnotes = chapters[chapterNum].notes[verseNum] ?? [];
      const text = extractFootnotes(line.replace(/^\\q1\s?/, ''), vnotes);
      if (vnotes.length) chapters[chapterNum].notes[verseNum] = vnotes;
      if (text) chapters[chapterNum].verses[verseNum].push(text);
      continue;
    }
    // ignore blank lines / anything else
  }

  return chapters;
}

// ---------------------------------------------------------------------------
// 1b. Extract the book introduction straight out of the Tibetan SFM's own
//    front matter (before the first \c marker). Unlike Jonah — where the
//    introduction arrived as a separate RTF file requiring a whole Cocoa-
//    RTF Unicode decoder — Esther's \mt/\imt/\is1/\ipi introduction is typed
//    directly into 17ESTNTB.SFM as plain UTF-8 text, so no decoding step is
//    needed at all; this is a much simpler version of the same idea. The
//    output shape ({mainTitle, introTitle, sections}) is identical to
//    Jonah's intro.json, so content.config.ts's `intro` collection schema
//    and index.astro's openIntro() rendering carry over completely
//    unchanged — only how the data gets extracted differs.
// ---------------------------------------------------------------------------

function parseIntroFromSfm(raw) {
  const lines = raw.split('\n').map((l) => l.replace(/\r$/, '').trim());
  let mainTitle = '';
  let introTitle = '';
  const sections = [];

  for (const line of lines) {
    if (line.startsWith('\\c ')) break; // front matter ends at the first chapter marker
    let m;
    if ((m = line.match(/^\\mt\s+(.*)$/))) { mainTitle = m[1]; continue; }
    if ((m = line.match(/^\\imt\s+(.*)$/))) { introTitle = m[1]; continue; }
    if ((m = line.match(/^\\is1\s+(.*)$/))) { sections.push({ heading: m[1], paragraphs: [] }); continue; }
    if ((m = line.match(/^\\ipi\s+(.*)$/))) {
      if (sections.length) sections[sections.length - 1].paragraphs.push(m[1]);
      continue;
    }
  }

  return { mainTitle, introTitle, sections };
}

// ---------------------------------------------------------------------------
// 1c. Decode the NTB Bible introduction's RTF (ported from ntb-jonah — see
//    that project's CLAUDE.md for the full "grand slam" request history).
//    Cocoa/TextEdit export: non-ASCII characters are \uc0\uNNNN Unicode
//    escapes OR \'HH cp1252 hex escapes (curly quotes, en/em dashes, and a
//    non-breaking space that genuinely appears mid-paragraph in this exact
//    file — real bug caught on ntb-jonah, fixed here from the start rather
//    than rediscovered), a literal "\" is doubled to "\\" (so the \mt/\s/\p
//    markers typed as plain text survive un-escaping), and a lone "\"
//    before a real newline is Cocoa RTF's paragraph-break shorthand.
// ---------------------------------------------------------------------------

// Windows-1252 codepoints for the 0x80-0x9F byte range, where cp1252
// diverges from Latin-1/Unicode's direct byte->codepoint mapping — needed
// for decodeIntroRtf()'s `\'HH` branch below. Bytes outside this range
// (0x00-0x7F, 0xA0-0xFF) map directly to the same-valued Unicode codepoint
// in both cp1252 and Latin-1, so only these 32 need an explicit table.
const CP1252_HIGH = {
  0x80: 0x20ac, 0x82: 0x201a, 0x83: 0x0192, 0x84: 0x201e, 0x85: 0x2026,
  0x86: 0x2020, 0x87: 0x2021, 0x88: 0x02c6, 0x89: 0x2030, 0x8a: 0x0160,
  0x8b: 0x2039, 0x8c: 0x0152, 0x8e: 0x017d, 0x91: 0x2018, 0x92: 0x2019,
  0x93: 0x201c, 0x94: 0x201d, 0x95: 0x2022, 0x96: 0x2013, 0x97: 0x2014,
  0x98: 0x02dc, 0x99: 0x2122, 0x9a: 0x0161, 0x9b: 0x203a, 0x9c: 0x0153,
  0x9e: 0x017e, 0x9f: 0x0178,
};

function decodeIntroRtf(raw) {
  // Anchor on \f0\fs<size> generically — the Bible introduction RTF uses
  // \f0\fs32 (Jonah's own book-intro RTF used \f0\fs24; matching by regex
  // rather than hardcoding one value covers either).
  const bodyMatch = raw.match(/\\f0\\fs\d+/);
  const body = bodyMatch ? raw.slice(bodyMatch.index) : raw;

  let out = '';
  let i = 0;
  while (i < body.length) {
    if (body[i] === '\\' && body[i + 1] === '\\') {
      out += '\\';
      i += 2;
      continue;
    }
    if (body[i] === '\\') {
      const rest = body.slice(i, i + 30);
      let m;
      if ((m = rest.match(/^\\uc0/))) { i += m[0].length; continue; }
      if ((m = rest.match(/^\\'([0-9a-fA-F]{2})/))) {
        const byte = parseInt(m[1], 16);
        out += String.fromCharCode(CP1252_HIGH[byte] ?? byte);
        i += m[0].length;
        continue;
      }
      if ((m = rest.match(/^\\u(-?\d+) ?/))) {
        let code = parseInt(m[1], 10);
        if (code < 0) code += 65536; // RTF encodes >32767 codepoints as signed 16-bit
        out += String.fromCharCode(code);
        i += m[0].length;
        continue;
      }
      if (body[i + 1] === '\n') { out += '\n'; i += 2; continue; }
      if (body[i + 1] === '\r' && body[i + 2] === '\n') { out += '\n'; i += 3; continue; }
      if ((m = rest.match(/^\\[a-zA-Z]+-?\d*\s?/))) { i += m[0].length; continue; } // any other stray control word
      i += 1;
      continue;
    }
    if (body[i] === '{' || body[i] === '}') { i++; continue; } // group braces (only the final closing brace appears in the body)
    out += body[i];
    i++;
  }
  return out;
}

// The Bible introduction's own marker set is simpler than Jonah's book-intro
// RTF: one \mt (this document's own title — no \imt pairing, since there's
// no separate book-name/introduction-title split here) plus \s section
// headings and \p paragraphs (not \is1/\ipi — John's own marker choice for
// this document). Per his instructions (typed into the RTF's own front
// matter): \s section titles render gold, \mt and \p text render black —
// same visual treatment openIntro() already gives the book introduction.
function parseBibleIntroRtf(raw) {
  const text = decodeIntroRtf(raw);
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);

  let title = '';
  const sections = [];

  for (const line of lines) {
    let m;
    if ((m = line.match(/^\\mt\s+(.*)$/))) { title = m[1]; continue; }
    if ((m = line.match(/^\\s\s+(.*)$/))) { sections.push({ heading: m[1], paragraphs: [] }); continue; }
    if ((m = line.match(/^\\p\s+(.*)$/))) {
      if (sections.length) sections[sections.length - 1].paragraphs.push(m[1]);
      continue;
    }
    // ignore the RTF's own front-matter lines (toggle title/placement notes
    // above the \mt line) — none of them start with a recognized marker
  }

  return { title, sections };
}

// ---------------------------------------------------------------------------
// 2. Parse the English BSB USFM (bsb2usfm-generated) — plain USFM, not RTF
//    like Jonah's English source. Multiple \v markers can share one line
//    (unlike the Tibetan SFM's one-verse-per-line convention), so verses are
//    split out of the line with a lookahead regex; text with no leading \v
//    (e.g. \li1 genealogy lines in ch. 4) is a continuation of whichever
//    verse came before it. Footnotes (\f + ...\f*) are stripped whole;
//    \r (...) cross-reference lines and \b blank/poetry-break markers carry
//    no verse text and are skipped outright. Esther's chapters each have
//    multiple \s1 sub-headings (same shape as the Tibetan \s headings
//    above) — only the first is kept per chapter, as this book's overall
//    section title.
// ---------------------------------------------------------------------------

function parseBsbUsfm(raw) {
  const chapters = {}; // { [n]: { section: string, verses: { [v]: string } } }
  let chapterNum = null;
  let verseNum = null;
  let sawSection = {};

  const ensureChapter = (n) => {
    if (!chapters[n]) chapters[n] = { section: '', verses: {}, bridges: {} };
    return chapters[n];
  };

  const stripInline = (s) =>
    s
      .replace(/\\f \+.*?\\f\*/gs, '') // footnotes — whole note dropped
      .replace(/\\ref\s.*?\\ref\*/gs, '') // stray cross-refs (shouldn't survive outside \r lines, but just in case)
      .trim();

  for (const rawLine of raw.split('\n')) {
    const line = rawLine.replace(/\r$/, '').trim();
    if (!line) continue;

    let m = line.match(/^\\c\s+(\d+)/);
    if (m) {
      chapterNum = parseInt(m[1], 10);
      ensureChapter(chapterNum);
      verseNum = null;
      continue;
    }
    if (chapterNum === null) continue; // skip \id/\usfm/\h/\toc/\mt front matter

    if (line.startsWith('\\r ')) continue; // standalone cross-reference line, not verse text
    if (line.startsWith('\\b')) continue; // blank poetry-break line

    m = line.match(/^\\s1\s+(.*)$/);
    if (m) {
      if (!sawSection[chapterNum]) {
        chapters[chapterNum].section = m[1].trim();
        sawSection[chapterNum] = true;
      }
      continue;
    }

    // \p, \li1 (genealogy list lines), \q1/\q2 (poetry) may all be followed
    // by verse markers or plain continuation text on the same line.
    let rest = line;
    let m2;
    if ((m2 = rest.match(/^\\(p|li1)\b\s*(.*)$/))) {
      rest = m2[2];
    } else if ((m2 = rest.match(/^\\(q1|q2)\b\s*(.*)$/))) {
      rest = m2[2];
    }
    if (!rest) continue; // marker-only line (e.g. bare "\p")

    // rest may contain one or more "\v N text" segments, and/or leading
    // continuation text (belongs to the PREVIOUS verse) before the first \v.
    const parts = rest.split(/(?=\\v\s+\d+)/); // a "\v 11-12" bridge still splits correctly: it starts with \v + digits
    for (const part of parts) {
      const vm = part.match(/^\\v\s+(\d+)(?:-(\d+))?\s*(.*)$/s);
      if (vm) {
        verseNum = parseInt(vm[1], 10);
        if (vm[2]) chapters[chapterNum].bridges[verseNum] = parseInt(vm[2], 10);
        const text = stripInline(vm[3]);
        chapters[chapterNum].verses[verseNum] =
          (chapters[chapterNum].verses[verseNum] ? chapters[chapterNum].verses[verseNum] + ' ' : '') + text;
      } else {
        const text = stripInline(part);
        if (text && verseNum !== null) {
          chapters[chapterNum].verses[verseNum] += ' ' + text;
        }
      }
    }
  }

  for (const c of Object.values(chapters)) {
    for (const v of Object.keys(c.verses)) {
      c.verses[v] = c.verses[v].replace(/\s+/g, ' ').trim();
    }
  }

  return chapters;
}

// ---------------------------------------------------------------------------
// 2b. Parse the Chinese CUV USFM. Same \c/\v/\p/\s1 marker shape as Jonah's
//    Chinese source, plus inline \pn...\pn* proper-name tags and \add...
//    \add* translator-supplied-word tags (both stripped, keeping the
//    enclosed text) — but UNLIKE Jonah's Chinese source, this one has real
//    footnotes (\f - \fr...\f*, note the "-" instead of Jonah's/BSB's "+").
//    Jonah's version never needed to strip footnote CONTENT (only got away
//    with generically stripping bare tags) because its source had none —
//    reused as-is here, that generic tag-stripping would have left footnote
//    explanatory text merged into the verse, so footnotes are now stripped
//    whole, first. No poetry line breaks in this source, so cmn stays a
//    plain string per verse, same as Jonah's. Multiple \s1 per chapter, same
//    "keep only the first" treatment as Tibetan/English above.
// ---------------------------------------------------------------------------

function parseCmnUsfm(raw) {
  const chapters = {}; // { [n]: { section, verses: { [v]: string } } }
  let chapterNum = null;
  let verseNum = null;
  let buf = [];
  let sawSection = {};

  const flush = () => {
    if (chapterNum !== null && verseNum !== null && buf.length) {
      chapters[chapterNum].verses[verseNum] = buf.join('').trim();
    }
    buf = [];
  };

  for (const rawLine of raw.split('\n')) {
    const line = rawLine.trim();
    if (!line) continue;

    let m = line.match(/^\\c\s+(\d+)/);
    if (m) {
      flush();
      chapterNum = parseInt(m[1], 10);
      chapters[chapterNum] = { section: '', verses: {}, bridges: {} };
      verseNum = null;
      continue;
    }
    if (chapterNum === null) continue; // skip \id/\h/\toc/\mt front matter

    m = line.match(/^\\s1\s+(.*)$/);
    if (m) {
      if (!sawSection[chapterNum]) {
        chapters[chapterNum].section = m[1].trim();
        sawSection[chapterNum] = true;
      }
      continue;
    }
    m = line.match(/^\\v\s+(\d+)(?:-(\d+))?\s*(.*)$/);
    if (m) {
      flush();
      verseNum = parseInt(m[1], 10);
      if (m[2]) chapters[chapterNum].bridges[verseNum] = parseInt(m[2], 10); // verse bridge, e.g. Chinese Esther 1:13-14
      buf = [m[3]];
      continue;
    }
    if (line.startsWith('\\p') || line.startsWith('\\m')) continue;
    if (verseNum !== null) buf.push(line);
  }
  flush();

  // Strip whole footnotes first (\f followed by "+" or "-", both seen in
  // this source, through the matching \f*) — before the generic per-tag
  // stripping below, which only removes bare markers and would otherwise
  // leave a footnote's own explanatory text merged into the verse.
  // \pn/\pn*/\add/\add* (kept text, tags dropped) fall out of the same
  // generic pass. Whitespace is collapsed to nothing after, same as Jonah's
  // Chinese — meaningless in Chinese, unlike English/Tibetan word-spacing.
  for (const c of Object.values(chapters)) {
    for (const v of Object.keys(c.verses)) {
      c.verses[v] = c.verses[v]
        .replace(/\\f [+-].*?\\f\*/gs, '')
        .replace(/\\[a-zA-Z0-9]+\*?/g, '')
        .replace(/\s+/g, '');
    }
  }
  return chapters;
}

// ---------------------------------------------------------------------------
// 2c. Parse Hindi/Nepali USFM — identical to Jonah's own parseIndicUsfm.
//    Hindi's chapters carry multiple \s1 sub-headings too, so this gets the
//    same "first wins" fix as the other three languages above; Nepali's
//    source has no \s1 at all, same gap as Jonah's Nepali source (see
//    NEPALI_TITLES).
// ---------------------------------------------------------------------------

function stripIndicMarkup(s) {
  return s
    .replace(/\\f \+.*?\\f\*/gs, '') // footnotes — whole note dropped, incl. \fr/\ft/\fq content
    .replace(/\\(bdit|it)\*?/g, '') // inline emphasis tags — text kept, tags stripped
    .replace(/\s+/g, ' ')
    .trim();
}

function parseIndicUsfm(raw) {
  const chapters = {}; // { [n]: { section: string, verses: { [v]: string } } }
  let chapterNum = null;
  let verseNum = null;
  let buf = [];
  let sawSection = {};

  const flush = () => {
    if (chapterNum !== null && verseNum !== null && buf.length) {
      chapters[chapterNum].verses[verseNum] = stripIndicMarkup(buf.join(' '));
    }
    buf = [];
  };

  for (const rawLine of raw.split('\n')) {
    const line = rawLine.replace(/\r$/, '').trim();
    if (!line) continue;

    let m = line.match(/^\\c\s+(\d+)/);
    if (m) {
      flush();
      chapterNum = parseInt(m[1], 10);
      chapters[chapterNum] = { section: '', verses: {}, bridges: {} };
      verseNum = null;
      continue;
    }
    if (chapterNum === null) continue; // skip \id/\h/\toc/\mt/\is1/\ip front matter

    m = line.match(/^\\s1\s*(.*)$/);
    if (m) {
      if (!sawSection[chapterNum]) {
        chapters[chapterNum].section = m[1].trim();
        sawSection[chapterNum] = true;
      }
      continue;
    }
    m = line.match(/^\\v\s+(\d+)(?:-(\d+))?\s*(.*)$/);
    if (m) {
      flush();
      verseNum = parseInt(m[1], 10);
      if (m[2]) chapters[chapterNum].bridges[verseNum] = parseInt(m[2], 10); // verse bridge, e.g. Chinese Esther 1:13-14
      buf = [m[3]];
      continue;
    }
    m = line.match(/^\\q1\s?(.*)$/);
    if (m) {
      if (m[1] && verseNum !== null) buf.push(m[1]);
      continue;
    }
    if (line.startsWith('\\p') || line.startsWith('\\m')) continue;
    if (verseNum !== null) buf.push(line);
  }
  flush();
  return chapters;
}

// ---------------------------------------------------------------------------
// 3. Parse per-dialect verse-timing files — identical format/approach to
//    Jonah's own (see CLAUDE.md's "Verse-timing / read-along highlight").
//    adx/bod/khg came from John's forced-aligner exports, same three
//    filename conventions as Jonah (book code updated to 17_EST/17-EST).
//    eng/cmn have no such export, so their timing is generated locally
//    (scripts/english-timing/ and scripts/chinese-timing/: mlx-whisper
//    transcription + difflib alignment against this script's own parsed
//    verse text) and written to source-assets/timing/{eng,cmn}_17_EST_N.txt.
// ---------------------------------------------------------------------------

function findTimingFile(dialect, n) {
  const nn = String(n).padStart(2, '0');
  const code = BOOK.timingCode; // e.g. 17_EST
  const dashed = code.replace('_', '-'); // e.g. 17-EST
  const candidates = [
    `${dialect}_${code}_${n}.txt`,
    `${dialect}_${code}_${nn}.txt`,
    // John's bod timing files use hyphens throughout, zero-padded, with a
    // "-timing" suffix — e.g. bod-17-EST-01-timing.txt.
    `${dialect}-${dashed}-${n}-timing.txt`,
    `${dialect}-${dashed}-${nn}-timing.txt`,
  ];
  for (const name of candidates) {
    const p = path.join(SRC_DIR, 'timing', name);
    if (fs.existsSync(p)) return p;
  }
  return null;
}

function parseTiming(dialect, n) {
  const filePath = findTimingFile(dialect, n);
  if (!filePath) return null;

  const raw = fs.readFileSync(filePath, 'utf8');
  const verses = [];
  for (const line of raw.split('\n')) {
    const cols = line.split('\t');
    if (cols.length < 3) continue;
    const verse = parseInt(cols[2].trim(), 10);
    if (Number.isNaN(verse)) continue; // unnumbered sub-verse marker — skip
    verses.push({ verse, time: parseFloat(cols[0]) });
  }
  return verses.length ? verses : null;
}

// ---------------------------------------------------------------------------
// 4. Merge into per-chapter block lists and write JSON
// ---------------------------------------------------------------------------


function unescapeRtf(s) {
  const map = {
    "\\'93": '“', "\\'94": '”', // “ ”
    "\\'92": '’', "\\'91": '‘', // ’ ‘
    "\\'97": '—', "\\'96": '–', // — –
  };
  return s.replace(/\\'9[1-9]|\\'9[0-9a-f]|\\'[0-9a-f]{2}/gi, (m) => map[m] ?? m);
}

function parseBsb(raw) {
  const verses = {}; // { [c]: { [v]: string } }
  // Each verse line starts with the book's English name, e.g. "Jonah 1:1<TAB>text".
  const lineRe = new RegExp(String.raw`^(?:\\f0\\fs24 \\cf0 )?${BOOK.names.en} (\d+):(\d+)\t(.*?)\r?\\?$`);
  const lines = raw.split('\n');
  for (const line of lines) {
    const m = line.match(lineRe);
    if (!m) continue;
    const [, c, v, textRaw] = m;
    const text = unescapeRtf(textRaw).trim();
    if (!verses[c]) verses[c] = {};
    verses[c][v] = text;
  }
  return verses;
}


function parseIntro(raw) {
  const text = decodeIntroRtf(raw);
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);

  let mainTitle = '';
  let introTitle = '';
  const sections = [];

  for (const line of lines) {
    let m;
    if ((m = line.match(/^\\mt\s+(.*)$/))) { mainTitle = m[1]; continue; }
    if ((m = line.match(/^\\imt\s+(.*)$/))) { introTitle = m[1]; continue; }
    if ((m = line.match(/^\\is1\s+(.*)$/))) { sections.push({ heading: m[1], paragraphs: [] }); continue; }
    if ((m = line.match(/^\\ipi\s+(.*)$/))) {
      if (sections.length) sections[sections.length - 1].paragraphs.push(m[1]);
      continue;
    }
    // ignore any other front-matter marker (\rem, \is1/\ipi handled above)
  }

  return { mainTitle, introTitle, sections };
}


function buildChapter(n, sfmChapter, bsbChapter, cmnChapter, hiChapter, neChapter) {
  const verseNums = Object.keys(sfmChapter.verses)
    .map(Number)
    .sort((a, b) => a - b);

  const images = INLINE_IMAGES[n] ?? [];
  const imageAfter = new Map(images.map((img) => [img.after, img.file]));

  // Verse BRIDGES ("\v 11-12" — Esther 8:11-12 in Tibetan and Chinese,
  // Chinese-only 1:13-14): a block is keyed by the TIBETAN verse list, and
  // covers v..end where end is the Tibetan bridge's last number (or v).
  // Every other language's text for that block is its own text for each
  // covered number, joined; a language that bridges where Tibetan doesn't
  // (Chinese 1:13-14) simply has all the text under the first number and
  // nothing under the second, which then renders as an empty verse and is
  // skipped by the app (see verseText()/hasText in index.astro). Blocks
  // whose displayed number differs from the plain verse number (the bridge
  // itself, in whichever languages cover more than one number) carry a
  // per-language `labels` entry like "11-12".
  const langs = { en: bsbChapter, cmn: cmnChapter, hi: hiChapter, ne: neChapter };
  const blocks = [];
  for (const v of verseNums) {
    const sfmEnd = sfmChapter.bridges[v] ?? v;
    const block = {
      type: 'verse',
      number: v,
      bo: sfmChapter.verses[v],
      paragraphStart: sfmChapter.paragraphStarts.has(v),
      // Footnote texts for the {{fn:N}} markers in `bo` (Tibetan only; omitted
      // when the verse has none, so most blocks are unchanged).
      ...(sfmChapter.notes[v] ? { notes: sfmChapter.notes[v] } : {}),
    };
    const labels = {};
    if (sfmEnd > v) labels.bo = `${v}-${sfmEnd}`;
    let lastCovered = sfmEnd;
    for (const [lang, ch] of Object.entries(langs)) {
      const end = Math.max(sfmEnd, ch?.bridges?.[v] ?? v);
      const parts = [];
      for (let u = v; u <= end; u++) {
        // Don't re-include a verse the Tibetan list already gives its own block
        // (Chinese 1:13-14: 14 is its own Tibetan block, shown empty in Chinese).
        if (u > sfmEnd && sfmChapter.verses[u] !== undefined) continue;
        const t = ch?.verses[u];
        if (t) parts.push(t);
      }
      block[lang] = parts.join(' ');
      if (end > v && parts.length) labels[lang] = `${v}-${end}`;
      lastCovered = Math.max(lastCovered, sfmEnd);
    }
    if (Object.keys(labels).length) block.labels = labels;
    blocks.push(block);
    for (let u = v; u <= sfmEnd; u++) {
      if (imageAfter.has(u)) blocks.push({ type: 'image', file: imageAfter.get(u) });
    }
  }

  return {
    chapterNumber: n,
    order: n,
    labelBo: sfmChapter.label,
    sectionTitleBo: sfmChapter.section,
    labelEn: ENGLISH_TITLES ? ENGLISH_TITLES[n].label : ENGLISH_LABELS[n],
    sectionTitleEn: ENGLISH_TITLES ? ENGLISH_TITLES[n].section : (bsbChapter?.section ?? ''),
    labelCmn: CHINESE_LABELS[n],
    sectionTitleCmn: cmnChapter?.section ?? '',
    labelHi: INDIC_CHAPTER_LABELS[n],
    sectionTitleHi: hiChapter?.section ?? '',
    labelNe: INDIC_CHAPTER_LABELS[n],
    sectionTitleNe: NEPALI_TITLES[n],
    cover: COVER_IMAGES[n],
    verseCount: verseNums.length,
    // A track exists only if its mp3 is in audio-src/ (audio is not in git; it is
    // mirrored to R2). So a book/track that is held back or not yet recorded simply
    // reads as null here and the app doesn't offer it. NTB_ASSUME_ALL_AUDIO=1 skips
    // the check (used by parity.mjs, which compares against the old apps).
    audio: Object.fromEntries(TRACKS.map((t) => [t, haveAudio(t, n) ? `/audio/${BOOK.code}/${t}/chapter-${n}.mp3` : null])),
    duration: Object.fromEntries(TRACKS.map((t) => [t, haveAudio(t, n) ? fmtDuration(DURATIONS[n][t]) : null])),
    timing: Object.fromEntries(TRACKS.map((t) => [t, haveAudio(t, n) ? parseTiming(t, n) : null])),
    blocks,
  };
}


const read = (name, enc = 'utf8') => fs.readFileSync(path.join(SRC_DIR, name), enc);

async function buildBook(code) {
  await useBook(code);
  const S = BOOK.sources;
  const sfmRaw = read(S.sfm);
  const sfmChapters = parseSfm(sfmRaw);
  let bsbChapters;
  if (S.en.format === 'rtf') {
    // Jonah's English arrived as an RTF export — adapt its flat {c:{v:text}} map
    // to the {verses, section, bridges} shape the USFM parser returns.
    const flat = parseBsb(read(S.en.file, 'latin1'));
    bsbChapters = {};
    for (const [c, verses] of Object.entries(flat)) bsbChapters[c] = { section: '', verses, bridges: {} };
  } else {
    bsbChapters = parseBsbUsfm(read(S.en.file));
  }
  const cmnChapters = parseCmnUsfm(read(S.cmn));
  const hiChapters = parseIndicUsfm(read(S.hi));
  const neChapters = parseIndicUsfm(read(S.ne));
  const intro = S.intro.format === 'rtf' ? parseIntro(read(S.intro.file, 'latin1')) : parseIntroFromSfm(sfmRaw);

  const chapters = [];
  for (const n of Object.keys(sfmChapters).map(Number).sort((a, b) => a - b)) {
    chapters.push(buildChapter(n, sfmChapters[n], bsbChapters[n], cmnChapters[n], hiChapters[n], neChapters[n]));
  }
  const out = { code, order: BOOK.order, names: BOOK.names, intro, chapters };
  fs.writeFileSync(path.join(OUT_DIR, `${code}.json`), JSON.stringify(out));
  const images = chapters.reduce((a, c) => a + c.blocks.filter((b) => b.type === 'image').length, 0);
  const tracks = TRACKS.filter((t) => chapters.every((c) => c.timing[t]));
  console.log(`${code}: ${chapters.length} chapters, ${chapters.reduce((a, c) => a + c.verseCount, 0)} verses, ${images} inline images, timing: [${tracks.join(', ')}]`);
  return out;
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const all = fs.readdirSync(path.join(ROOT, 'books'), { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name);
  const wanted = process.argv.slice(2);
  const codes = wanted.length ? wanted : all;
  for (const code of codes) await buildBook(code);

  // Shared reference content + the picker's list, always rewritten from all books.
  const bibleIntro = parseBibleIntroRtf(fs.readFileSync(BIBLE_INTRO_RTF_PATH, 'latin1'));
  fs.writeFileSync(path.join(OUT_DIR, 'bible-intro.json'), JSON.stringify(bibleIntro));
  const timeline = { pages: Array.from({ length: TIMELINE_PAGE_COUNT }, (_, i) => ({ n: i + 1, file: `/img/timeline/page-${i + 1}.webp` })) };
  fs.writeFileSync(path.join(OUT_DIR, 'timeline.json'), JSON.stringify(timeline));
  const books = [];
  for (const code of all) {
    const cfg = await import(pathToFileURL(path.join(ROOT, 'books', code, 'config.mjs')).href);
    books.push({ code, order: cfg.BOOK.order, names: cfg.BOOK.names, chapters: Object.keys(cfg.DURATIONS).length, cover: cfg.COVER_IMAGES[1] });
  }
  books.sort((a, b) => a.order - b.order);
  fs.writeFileSync(path.join(OUT_DIR, 'books.json'), JSON.stringify(books));
  console.log(`books.json: ${books.map((b) => b.code).join(', ')}`);
}

main();
