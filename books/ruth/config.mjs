// Per-book configuration for scripts/gen-books.mjs. The editorial maps below
// (illustration placement, cover images, chapter titles, durations) were moved
// verbatim out of the old ntb-ruth generator; comments are the originals.
// Image paths are URLs under /img/ruth/ (public/), not Astro asset imports.
const INLINE_DIR = '/img/ruth/inline';
const COVER_DIR = '/img/ruth/covers';

export const BOOK = {
  code: 'ruth',
  order: 8, // book number in the Protestant canon (for sorting the picker)
  timingCode: '08_RUT', // timing files are {track}_08_RUT_N.txt
  names: { bo: 'རུ་ཐི།', en: 'Ruth', cmn: '路得记', hi: 'रूत', ne: 'रूथ' },
  sources: {
    sfm: '08RUTNTB.SFM',
    en: {format:'usfm',file:'RUT_bsb.usfm'},
    cmn: '09-RUTcmn-cu89s.usfm',
    hi: '09-RUThin2017.usfm',
    ne: '09-RUTnpiulb.usfm',
    intro: {format:'sfm'},
  },
};

// Inline illustration placement. Unlike Jonah's page-sequence filenames
// (p1_Jon_01_02_RG.jpg), Ruth's illustrations are named directly by book/
// chapter/verse (08_Ru_01_02_RG.jpg = book 08, chapter 1, verse 2), so the
// mapping below is read straight off each filename — "after" is the cited
// verse, "before" is always the very next one. Not yet hand-verified
// against the printed PDF page-by-page the way Jonah's placements were
// (see "NTB Ruth_final copy.pdf" in source-assets/) — flag for Brett/John
// to confirm before treating this as final, same discipline as Jonah's.
export const INLINE_IMAGES = {
  1: [
    { after: 2, before: 3, file: `${INLINE_DIR}/08_Ru_01_02_RG.webp` },
    { after: 8, before: 9, file: `${INLINE_DIR}/08_Ru_01_08_RG.webp` },
    { after: 13, before: 14, file: `${INLINE_DIR}/08_Ru_01_13_RG.webp` },
    { after: 20, before: 21, file: `${INLINE_DIR}/08_Ru_01_20_RG.webp` },
  ],
  2: [
    { after: 2, before: 3, file: `${INLINE_DIR}/08_Ru_02_02_RG.webp` },
    { after: 8, before: 9, file: `${INLINE_DIR}/08_Ru_02_08_RG.webp` },
    { after: 13, before: 14, file: `${INLINE_DIR}/08_Ru_02_13_RG.webp` },
    { after: 19, before: 20, file: `${INLINE_DIR}/08_Ru_02_19_RG.webp` },
    { after: 22, before: 23, file: `${INLINE_DIR}/08_Ru_02_22_RG.webp` },
  ],
  3: [
    { after: 2, before: 3, file: `${INLINE_DIR}/08_Ru_03_02_RG.webp` },
    { after: 8, before: 9, file: `${INLINE_DIR}/08_Ru_03_08_RG.webp` },
    { after: 13, before: 14, file: `${INLINE_DIR}/08_Ru_03_13_RG.webp` },
  ],
  4: [
    { after: 2, before: 3, file: `${INLINE_DIR}/08_Ru_04_02_RG.webp` },
    { after: 5, before: 6, file: `${INLINE_DIR}/08_Ru_04_05_RG.webp` },
    { after: 14, before: 15, file: `${INLINE_DIR}/08_Ru_04_14_RG.webp` },
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
};

// English chapter label — Ruth's BSB source (unlike Jonah's RTF) DOES carry
// real \s1 section headings, so sectionTitleEn comes straight from
// parseBsbUsfm's own section field below, no editorial titles needed. Only
// the "Chapter N" label itself needs one, same "no \cl-equivalent marker"
// gap as Chinese/Hindi/Nepali.
export const ENGLISH_LABELS = { 1: 'Chapter 1', 2: 'Chapter 2', 3: 'Chapter 3', 4: 'Chapter 4' };

export const CHINESE_LABELS = { 1: '第一章', 2: '第二章', 3: '第三章', 4: '第四章' };

export const INDIC_CHAPTER_LABELS = { 1: 'अध्याय 1', 2: 'अध्याय 2', 3: 'अध्याय 3', 4: 'अध्याय 4' };

// Nepali's source has no \s1 section titles at all (same gap as Jonah's
// Nepali source) — editorial titles, provisionally translated by Claude to
// match the same theme as the Hindi/English titles for each chapter; flag
// for John/Brett to confirm wording, same caveat as every other provisional
// translation in this project.
export const NEPALI_TITLES = {
  1: 'एलीमेलेकको परिवार मोआबमा जानु',
  2: 'रूतले बोअजलाई भेट्नु',
  3: 'रूतको उद्धारको आश्वासन',
  4: 'बोअजले रूतलाई उद्धार गर्नु',
};

// Dialect audio durations in seconds, read with ffprobe from the source
// MP3s (adx/bod/khg = Amdo/Central/Kham). eng was split from a single
// whole-book file John supplied (BSB_08_Rut_H.mp3) via a local Whisper-
// transcription + text-alignment pass; cmn arrived pre-split by chapter
// (read by Jason Chen) and only needed re-encoding — see CLAUDE.md's
// "Verse-timing" section for how both were generated, and how to redo
// either if the source audio ever changes.
export const DURATIONS = {
  1: { adx: 404.1, bod: 263.6, khg: 238.6, eng: 235.7, cmn: 239.6 },
  2: { adx: 455.4, bod: 295.8, khg: 277.2, eng: 271.3, cmn: 239.2 },
  3: { adx: 315.5, bod: 210.5, khg: 197.4, eng: 191.4, cmn: 189.9 },
  4: { adx: 396.1, bod: 273.0, khg: 250.5, eng: 256.1, cmn: 219.2 },
};

// Real bug, caught while adding Chinese chapter 1's duration (239.6s):
// rounding the leftover seconds independently of the minutes can carry a
// value of 60 (e.g. 239.6 -> 3m, round(59.6)=60 -> "3:60"). Round the total
// to the nearest second FIRST, then split into minutes/seconds, so the
// carry lands in the right place.