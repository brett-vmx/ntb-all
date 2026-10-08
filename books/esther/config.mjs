// Per-book configuration for scripts/gen-books.mjs. The editorial maps below
// (illustration placement, cover images, chapter titles, durations) were moved
// verbatim out of the old Esther generator; comments are the originals.
// Image paths are URLs under /img/esther/ (public/), not Astro asset imports.
const INLINE_DIR = '/img/esther/inline';
const COVER_DIR = '/img/esther/covers';

export const BOOK = {
  code: 'esther',
  order: 17, // book number in the Protestant canon (for sorting the picker)
  timingCode: '17_EST', // timing files are {track}_17_EST_N.txt
  names: { bo: 'ཨེས་སི་ཐེར།', en: 'Esther', cmn: '以斯帖记', hi: 'एस्तेर', ne: 'एस्तर' },
  sources: {
    sfm: '17ESTNTB.SFM',
    en: {format:'usfm',file:'EST.bsb.usfm'},
    cmn: '17-ESTcmn-cu89s.usfm',
    hi: '17-ESThin2017.usfm',
    ne: '17-ESTnpiulb.usfm',
    intro: {format:'sfm'},
  },
};

// Inline illustration placement. Like Ruth's (and unlike Jonah's page-
// sequence filenames), Esther's illustrations are named directly by book/
// chapter/verse (17_Es_01_05_RG.jpg = book 17, chapter 1, verse 5), so the
// mapping below is read straight off each filename — "after" is the cited
// verse, "before" is always the very next one (documentation only; nothing
// reads it). John's 45 final illustrations are a trimmed subset of the 53
// that his Claude-Cowork "placement report" .docx files originally
// proposed (those reports' own constructed filenames, `17_Est_…`, don't
// match the real ones and aren't used by anything). The PDF model
// (NTB Esther_final.pdf) only embeds 28 images, so it can't confirm all of
// these either — flag for Brett/John to confirm before treating this as
// final. Chapter 10 has no illustration.
export const INLINE_IMAGES = {
  1: [
    { after: 5, before: 6, file: `${INLINE_DIR}/17_Es_01_05_RG.webp` },
    { after: 8, before: 9, file: `${INLINE_DIR}/17_Es_01_08_RG.webp` },
    { after: 13, before: 14, file: `${INLINE_DIR}/17_Es_01_13_RG.webp` },
    { after: 21, before: 22, file: `${INLINE_DIR}/17_Es_01_21_RG.webp` },
  ],
  2: [
    { after: 3, before: 4, file: `${INLINE_DIR}/17_Es_02_03_RG.webp` },
    { after: 8, before: 9, file: `${INLINE_DIR}/17_Es_02_08_RG.webp` },
    { after: 17, before: 18, file: `${INLINE_DIR}/17_Es_02_17_RG.webp` },
    { after: 22, before: 23, file: `${INLINE_DIR}/17_Es_02_22_RG.webp` },
  ],
  3: [
    { after: 1, before: 2, file: `${INLINE_DIR}/17_Es_03_01_RG.webp` },
    { after: 2, before: 3, file: `${INLINE_DIR}/17_Es_03_02_RG.webp` },
    { after: 3, before: 4, file: `${INLINE_DIR}/17_Es_03_03_RG.webp` },
    { after: 4, before: 5, file: `${INLINE_DIR}/17_Es_03_04_RG.webp` },
    { after: 12, before: 13, file: `${INLINE_DIR}/17_Es_03_12_RG.webp` },
  ],
  4: [
    { after: 1, before: 2, file: `${INLINE_DIR}/17_Es_04_01_RG.webp` },
    { after: 2, before: 3, file: `${INLINE_DIR}/17_Es_04_02_RG.webp` },
    { after: 8, before: 9, file: `${INLINE_DIR}/17_Es_04_08_RG.webp` },
    { after: 9, before: 10, file: `${INLINE_DIR}/17_Es_04_09_RG.webp` },
    { after: 13, before: 14, file: `${INLINE_DIR}/17_Es_04_13_RG.webp` },
    { after: 15, before: 16, file: `${INLINE_DIR}/17_Es_04_15_RG.webp` },
  ],
  5: [
    { after: 1, before: 2, file: `${INLINE_DIR}/17_Es_05_01_RG.webp` },
    { after: 2, before: 3, file: `${INLINE_DIR}/17_Es_05_02_RG.webp` },
    { after: 4, before: 5, file: `${INLINE_DIR}/17_Es_05_04_RG.webp` },
    { after: 5, before: 6, file: `${INLINE_DIR}/17_Es_05_05_RG.webp` },
    { after: 9, before: 10, file: `${INLINE_DIR}/17_Es_05_09_RG.webp` },
    { after: 12, before: 13, file: `${INLINE_DIR}/17_Es_05_12_RG.webp` },
  ],
  6: [
    { after: 1, before: 2, file: `${INLINE_DIR}/17_Es_06_01_RG.webp` },
    { after: 5, before: 6, file: `${INLINE_DIR}/17_Es_06_05_RG.webp` },
    { after: 7, before: 8, file: `${INLINE_DIR}/17_Es_06_07_RG.webp` },
    { after: 8, before: 9, file: `${INLINE_DIR}/17_Es_06_08_RG.webp` },
    { after: 10, before: 11, file: `${INLINE_DIR}/17_Es_06_10_RG.webp` },
    { after: 12, before: 13, file: `${INLINE_DIR}/17_Es_06_12_RG.webp` },
  ],
  7: [
    { after: 1, before: 2, file: `${INLINE_DIR}/17_Es_07_01_RG.webp` },
    { after: 3, before: 4, file: `${INLINE_DIR}/17_Es_07_03_RG.webp` },
    { after: 6, before: 7, file: `${INLINE_DIR}/17_Es_07_06_RG.webp` },
    { after: 7, before: 8, file: `${INLINE_DIR}/17_Es_07_07_RG.webp` },
  ],
  8: [
    { after: 2, before: 3, file: `${INLINE_DIR}/17_Es_08_02_RG.webp` },
    { after: 3, before: 4, file: `${INLINE_DIR}/17_Es_08_03_RG.webp` },
    { after: 7, before: 8, file: `${INLINE_DIR}/17_Es_08_07_RG.webp` },
    { after: 10, before: 11, file: `${INLINE_DIR}/17_Es_08_10_RG.webp` },
    { after: 13, before: 14, file: `${INLINE_DIR}/17_Es_08_13_RG.webp` },
    { after: 15, before: 16, file: `${INLINE_DIR}/17_Es_08_15_RG.webp` },
  ],
  9: [
    { after: 5, before: 6, file: `${INLINE_DIR}/17_Es_09_05_RG.webp` },
    { after: 14, before: 15, file: `${INLINE_DIR}/17_Es_09_14_RG.webp` },
    { after: 20, before: 21, file: `${INLINE_DIR}/17_Es_09_20_RG.webp` },
    { after: 22, before: 23, file: `${INLINE_DIR}/17_Es_09_22_RG.webp` },
  ],
};

// Homepage / chapter-card cover images. Default is the first inline image
// tagged for that chapter (same default Jonah used for 3 of its 4
// chapters) — overridden per Brett's request for chapters 1 and 3, which
// use their 2nd and 3rd inline images respectively instead. The actual
// square-cropped webp files live in src/assets/chapters/covers/ (center-
// cropped from the corresponding source-assets/images/*.jpg, 800x800,
// Pillow) — this map just points at the filename, it doesn't do the
// cropping; re-crop by hand from a different source image if a cover
// choice changes again.
export const COVER_IMAGES = {
  1: `${COVER_DIR}/chapter-1.webp`,
  2: `${COVER_DIR}/chapter-2.webp`,
  3: `${COVER_DIR}/chapter-3.webp`,
  4: `${COVER_DIR}/chapter-4.webp`,
  5: `${COVER_DIR}/chapter-5.webp`,
  6: `${COVER_DIR}/chapter-6.webp`,
  7: `${COVER_DIR}/chapter-7.webp`,
  8: `${COVER_DIR}/chapter-8.webp`,
  9: `${COVER_DIR}/chapter-9.webp`,
  10: `${COVER_DIR}/chapter-10.webp`,
};

// English chapter label — Esther's BSB source (unlike Jonah's RTF) DOES carry
// real \s1 section headings, so sectionTitleEn comes straight from
// parseBsbUsfm's own section field below, no editorial titles needed. Only
// the "Chapter N" label itself needs one, same "no \cl-equivalent marker"
// gap as Chinese/Hindi/Nepali.
export const ENGLISH_LABELS = { 1: 'Chapter 1', 2: 'Chapter 2', 3: 'Chapter 3', 4: 'Chapter 4', 5: 'Chapter 5', 6: 'Chapter 6', 7: 'Chapter 7', 8: 'Chapter 8', 9: 'Chapter 9', 10: 'Chapter 10' };

export const CHINESE_LABELS = { 1: '第一章', 2: '第二章', 3: '第三章', 4: '第四章', 5: '第五章', 6: '第六章', 7: '第七章', 8: '第八章', 9: '第九章', 10: '第十章' };

export const INDIC_CHAPTER_LABELS = { 1: 'अध्याय 1', 2: 'अध्याय 2', 3: 'अध्याय 3', 4: 'अध्याय 4', 5: 'अध्याय 5', 6: 'अध्याय 6', 7: 'अध्याय 7', 8: 'अध्याय 8', 9: 'अध्याय 9', 10: 'अध्याय 10' };

// Nepali's source has no \s1 section titles at all (same gap as Jonah's
// Nepali source) — editorial titles, provisionally translated by Claude to
// match the same theme as the Hindi/English titles for each chapter; flag
// for John/Brett to confirm wording, same caveat as every other provisional
// translation in this project.
export const NEPALI_TITLES = {
  1: 'वश्तीलाई रानीको पदबाट हटाइयो',
  2: 'एस्तर रानी बनाइनु',
  3: 'हामानले यहूदीहरूविरुद्ध षड्यन्त्र रच्नु',
  4: 'मोर्दकैले एस्तरलाई यहूदीहरूलाई सहायता गर्न आग्रह गर्नु',
  5: 'एस्तरले राजा र हामानका लागि भोज तयार गर्नु',
  6: 'मोर्दकैले सम्मान पाउनु',
  7: 'हामानलाई झुन्ड्याइनु',
  8: 'यहूदीहरूको प्रतिरोध',
  9: 'यहूदीहरूले आफ्ना शत्रुमाथि विजय पाउनु',
  10: 'अहासूरस र मोर्दकैका कामहरू',
};

// Dialect audio durations in seconds, read with ffprobe from the MP3s in
// public/audio (adx/bod/khg = Amdo/Central/Kham; eng = English, the BSB
// reading from biblestudytools.com/audio-bible/bsb/esther/, one file per
// chapter, already 44.1kHz mono 64kbps so copied as-is). Esther's Chinese
// cmn = Chinese (CUV), Wordproject's recording (wordproject.org/bibles/audio/
// 04_chinese/b17.htm), copied as-is (22.05kHz mono 24kbps — not re-encoded).
export const DURATIONS = {
  1: { adx: 418.8, bod: 257.2, khg: 251.6, eng: 217.2, cmn: 248.8 },
  2: { adx: 471.7, bod: 289.7, khg: 277.0, eng: 243.0, cmn: 278.6 },
  3: { adx: 295.0, bod: 186.9, khg: 185.4, eng: 165.7, cmn: 197.5 },
  4: { adx: 288.7, bod: 184.7, khg: 177.5, eng: 165.7, cmn: 186.0 },
  5: { adx: 239.9, bod: 156.3, khg: 152.1, eng: 143.8, cmn: 167.2 },
  6: { adx: 259.3, bod: 171.5, khg: 164.4, eng: 142.2, cmn: 167.1 },
  7: { adx: 200.3, bod: 129.4, khg: 122.3, eng: 112.4, cmn: 138.2 },
  8: { adx: 362.7, bod: 231.5, khg: 222.9, eng: 196.8, cmn: 222.0 },
  9: { adx: 510.4, bod: 330.8, khg: 328.3, eng: 297.4, cmn: 341.2 },
  10: { adx: 57.7, bod: 40.1, khg: 37.3, eng: 33.8, cmn: 36.8 },
};

// Real bug, caught while adding Chinese chapter 1's duration (239.6s):
// rounding the leftover seconds independently of the minutes can carry a
// value of 60 (e.g. 239.6 -> 3m, round(59.6)=60 -> "3:60"). Round the total
// to the nearest second FIRST, then split into minutes/seconds, so the
// carry lands in the right place.