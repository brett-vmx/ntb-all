// Per-book configuration for scripts/gen-books.mjs. The editorial maps below
// (illustration placement, cover images, chapter titles, durations) were moved
// verbatim out of the old ntb-jonah generator; comments are the originals.
// Image paths are URLs under /img/jonah/ (public/), not Astro asset imports.
const INLINE_DIR = '/img/jonah/inline';
const COVER_DIR = '/img/jonah/covers';

export const BOOK = {
  code: 'jonah',
  order: 32, // book number in the Protestant canon (for sorting the picker)
  timingCode: '32_JON', // timing files are {track}_32_JON_N.txt
  names: { bo: 'ཡོ་ནཱ།', en: 'Jonah', cmn: '约拿书', hi: 'योना', ne: 'योना' },
  sources: {
    sfm: '32JONNTB.SFM',
    en: {format:'rtf',file:'Jonah_BSB.rtf'},
    cmn: '33-JONcmn-cu89s.usfm',
    hi: '33-JONhin2017.usfm',
    ne: '33-JONnpiulb.usfm',
    intro: {format:'rtf',file:'NTB_Jonah_Introduction.rtf'},
  },
};

// Inline illustration placement, verified against NTB Jonah_final copy.pdf —
// each image sits between the two verses named, matching the printed layout.
export const INLINE_IMAGES = {
  1: [
    { after: 2, before: 3, file: `${INLINE_DIR}/p1_Jon_01_02_RG.webp` },
    { after: 5, before: 6, file: `${INLINE_DIR}/p2_Jon_01_03_RG.webp` },
    { after: 8, before: 9, file: `${INLINE_DIR}/32_Jon_01_04_RG.webp` },
    { after: 15, before: 16, file: `${INLINE_DIR}/p3_Jon_01_05_RG.webp` },
  ],
  2: [{ after: 6, before: 7, file: `${INLINE_DIR}/p5_Jon_01_06_RG.webp` }],
  3: [{ after: 7, before: 8, file: `${INLINE_DIR}/p7_Jon_03_02_RG.webp` }],
  4: [
    { after: 6, before: 7, file: `${INLINE_DIR}/p8_Jon_04_02_RG.webp` },
    { after: 9, before: 10, file: `${INLINE_DIR}/p9_Jon_04_03_RG.webp` },
  ],
};

// Homepage / chapter-card cover images. Chapter 2 uses p5 per client direction;
// the rest use the first inline image tagged for that chapter.
export const COVER_IMAGES = {
  1: `${COVER_DIR}/chapter-1.webp`,
  2: `${COVER_DIR}/chapter-2.webp`,
  3: `${COVER_DIR}/chapter-3.webp`,
  4: `${COVER_DIR}/chapter-4.webp`,
};

// English chapter label + section title, shown in the modal when the reader's
// text-language setting is English. These are editorial titles (not in the
// SFM or BSB source — English translations don't carry section headings) —
// short study-Bible-style outline titles matching each Tibetan sectionTitleBo.
export const ENGLISH_TITLES = {
  1: { label: 'Chapter 1', section: 'Jonah Flees from the LORD' },
  2: { label: 'Chapter 2', section: "Jonah's Prayer" },
  3: { label: 'Chapter 3', section: 'Jonah Goes to Nineveh' },
  4: { label: 'Chapter 4', section: "Jonah's Anger at the LORD's Compassion" },
};

// Chinese chapter label — the CUV source has no \cl-equivalent "Chapter N"
// line (unlike the Tibetan SFM), so this is a small editorial addition, same
// spirit as ENGLISH_TITLES's label. sectionTitleCmn comes straight from the
// CUV source's own \s1 lines instead (see parseCmnUsfm) — no translation
// needed there.
export const CHINESE_LABELS = { 1: '第一章', 2: '第二章', 3: '第三章', 4: '第四章' };

// Hindi/Nepali chapter label — same "no \cl marker" gap as Chinese, and the
// same word ("अध्याय", chapter) works unchanged in both languages, so one
// map covers both instead of duplicating identical values twice.
export const INDIC_CHAPTER_LABELS = { 1: 'अध्याय 1', 2: 'अध्याय 2', 3: 'अध्याय 3', 4: 'अध्याय 4' };

// Hindi's USFM source carries its own \s1 section titles (used as-is, no
// translation needed — see parseIndicUsfm). Nepali's source has none at all
// (unlike Hindi/Chinese), so these are editorial titles, provisionally
// translated by Claude to match the same theme as the Hindi/English titles —
// flag for John/Brett to confirm wording, same caveat as the About page's
// provisional English/Chinese translations.
export const NEPALI_TITLES = {
  1: 'परमेश्‍वरको आज्ञाको उल्लङ्घन',
  2: 'योनाको प्रार्थना',
  3: 'आज्ञाको पालना',
  4: 'योनाको रिस र परमेश्‍वरको दया',
};

// Dialect audio durations in seconds, read with ffprobe from the source MP3s
// (adx/bod/khg = Amdo/Central-Lhasa/Kham per John's note: bod=Central, adx=Amdo, khg=Kham).
// eng/cmn added when Brett supplied BSB (English) and ElevenLabs-generated
// CUV (Chinese) audio — see "Chinese and English integration" in CLAUDE.md.
export const DURATIONS = {
  1: { adx: 271.4, bod: 177.9, khg: 182.7, eng: 154.5, cmn: 164.8 },
  2: { adx: 136.7, bod: 92.6, khg: 90.5, eng: 72.0, cmn: 77.8 },
  3: { adx: 148.4, bod: 98.8, khg: 99.6, eng: 85.6, cmn: 82.2 },
  4: { adx: 168.9, bod: 115.4, khg: 112.7, eng: 99.7, cmn: 110.2 },
};
