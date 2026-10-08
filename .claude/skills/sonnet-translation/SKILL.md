---
name: sonnet-translation
description: How the author's Bangla verse translations of sonnet sequences are made and published on this site — Shakespeare's Sonnets done 2026-10-09, Rossetti's House of Life next. Load before translating, revising, completing or aligning any sonnet, before touching public/translations/sonnets/**, the `type: sonnet` builder in md-loader.js, or line-scoped word-lists — or when asked about the author's translation style, matrabritta counting, or how to run the translation agents.
---

# Sonnet translation

The author (Khan Muhammad Bin Asad) translates sonnet sequences into Bangla verse and publishes
them in the Translations section. This skill holds the **form**, the **author's style**, the
**pipeline** (sheet → `.md` → site), the **agent workflow** and the **lessons** from the
Shakespeare run. The ghazal skill (Hafez) is a sibling: same machinery, different form.

## 1 · The form — non-negotiable

- **One Bangla line per English line.** Line 1 ↔ line 1 … line 14 ↔ line 14. Never redistribute
  sense across lines (it breaks the parallel table and the hover alignment).
- **Matrabritta, 18 matras per line.** Open syllable = 1, closed = 2, counted incrementally
  (every vowel 1, ঐ ঔ ৈ ৌ 2, every syllable-closing consonant +1). Count with
  `scripts/matra.py` — a Python port of the site's own scanner (`book.js` `matraBreaks`).
  - A **new** line must read **18**.
  - An **edited** line must keep **the original line's count** — not "18". The author's own
    lines mostly read 18 but ~25% read 17/19 (loan-words like বিউটির, final syllables); the
    counter is advisory on those, and preserving the author's count is what keeps his rhythm.
  - NFC-normalise before counting (Sheets stores ো/ৌ as ে+া). The consonant class is written
    by code point — a literal য় in a regex class may be stored decomposed and the nukta then
    counts as a consonant (the bug that cost an hour on 2026-10-09).
- **The English rhyme scheme reproduced in Bangla.** Shakespeare: abab cdcd efef gg (99 is 15
  lines ababa…, 126 is six couplets). Rossetti (Petrarchan): abba abba + a sestet (cdecde /
  cdcdcd…) — two rhymes across the octave, much tighter than Shakespeare; plan for it. The
  author rhymes on the final syllable sound, usually the last two. **Never change a rhyme word
  unless the replacement rhymes as well with its partner.**
- Punctuation follows the English line; a sonnet's last line ends with ।; ’ for apostrophes,
  ‘ ’ for quotes.

## 2 · The author's style — read `references/style.md` before writing a line

In one breath: **formal, modern, standard চলিত, every line as understandable to a modern reader
as the English is.** তুমি for *thou* (never আপনি). No colloquial verb forms (দিছ, পাইছি,
বলবা, রাখতেছি, ভাসায়ে, কইরো, আইসো…). No old poetic forms (কভু, নাহি, হেরি, তব, মম, নর,
যবে, সনে, মাঝারে, তরে, লাগি, কহে, আঁখি, হৃদি, মোরে, তোমারে, যাহা/তাহা, কেহ, হেথা/সেথা).
No Hindustani coinages (-ওয়ালা agent nouns). No dictionary words where a clear one fits.
English words in Bangla script (মিউজ, গ্রেইস, হার্ট, বিউটি, উইল, মিস্ট্রেস, আর্ট, ইউজ/এবিউজ)
are the author's deliberate signature — keep them where they carry a rhyme or the idea
(Will/will, art/আর্ট, the use/user pun of 2, 4, 9, 21); replace a casual one (প্লিজ, হ্যালো,
গিফট, লস, ফলো, টর্চার) that is not a rhyme word with a Bangla word of the same count.

## 3 · The site side

- Data: `public/translations/<work>/<part>/<part>.md` — frontmatter `type: sonnet`, `lang: en`,
  then a GFM table `| বাংলা | ইংলিশ | # |`: the number in `#` on a sonnet's first row, blank
  rows for the quatrain breaks, **an empty বাংলা cell = untranslated line** (rendered as a
  dotted leader, the sonnet head dimmed). `buildSonnet` in `md-loader.js` draws the numbered
  head (the সূচি target), rhyme letters in the margin, the stepped couplet; rows carry
  `data-key="sonnet.line"`.
- Hover matching: `<part>-words.md`, **line-scoped** three-column rows `| sonnet.line | bn | en |`
  (page-wide two-column pairs are the older works' format and are wrong for English — তোমার
  would light every *thy* on the page). `translation-table.js` aligns a keyed row from
  `window.TT_DICT_LINES[key]` alone.
- Page: `src/pages/translations/<work>/[part].astro` over `translationWorks` parts
  (`src/data/translation-works.js`), `BookReader` with `dictLang: 'en'`, `dict`, `tocStyle:
  'grid'`, prev/next. See CLAUDE.md § Page patterns.

## 4 · The pipeline (`scripts/`, run with `python3 -I`, a venv with openpyxl)

Work in a scratch dir (`export SONNET_WORK=…`) holding `data/`, `out/`, `align/`:
1. `parse_sheet.py sheet.xlsx data/sonnets.json` — the author's sheet (one verse line per
   row, number in A on the first row, B Bangla, C English, blank row = stanza gap) → JSON +
   an audit (empty / partial / duplicated / bracketed sonnets).
2. Agents write **overlays** into `out/`: polish format `{"n": {"i": "line"}}` (0-based line
   index, changed lines only) or full format `{"n": [14 lines]}`. Applied in filename order —
   later files override earlier (`new_*` < `polish_*` < `zz_deep_*` < `zz_fix_*`).
3. `gen_md.py REPO` — JSON + overlays → the four `<part>.md` (NFC, BOM/ZW cleanup, pasted
   duplicates blanked). Re-run after every batch; the `.md` is then the source of truth.
4. `mk_align_src.py REPO` → `align/src_NN_*.json` chunks (~240 lines each) for the alignment
   agents (`references/alignment.md`), who write `align/out_NN.json`
   `{"n.l": [["bn token","en token"],…]}` with tokens copied verbatim.
5. `gen_words.py REPO` → `<part>-words.md`; pairs whose token is no longer in the line are
   dropped, so after a revision pass re-align the changed lines (`out_10.json` replaces).
6. `npm run build`, check headlessly (`google-chrome --headless=new --dump-dom URL` → count
   `data-sonnet` rows, `bn-missing`, `data-w="DICT_` spans), commit, push to `main`.

Validate every overlay before merging: parse as JSON, count every line (edited = original's
count; new = 18), grep the result for কভু/-ওয়ালা/colloquial forms.

## 5 · Agent workflow and budget

- **Opus is the mastermind** and does the bulk. **Fable only for very small, heavy-thinking
  tasks** (a stubborn octave, a disputed reading), sparingly — the author's usage window is
  finite and Fable burned it fast on 2026-10-09 without a proportionate gain.
- Batches of ~35–40 sonnets per agent; write output incrementally; agents verify counts
  themselves with `matra.py` in batched calls; each returns a 3–5 line report listing what it
  could not fix within count and rhyme — relay those to the author.
- Passes, in order: (1) **write** the missing sonnets in the author's voice (read ~10
  neighbouring sonnets first); (2) **deep pass** — sense against the English with the glosses
  (Shakespeare's Words, Wiktionary, Etymonline; public-domain notes), register, modern ear,
  loan-words, elegance; (3) **align**; (4) re-align what (2) changed.
- Never read or imitate another Bangla translation of the work. Source texts must be public
  domain (Shakespeare 1609, Rossetti 1881).
- Ship early: the site can go live with gaps marked (dotted leaders) and improve per push.

## 6 · Review flags to hand the author at the end

Lines the agents judged still loose but could not better within count and rhyme; the
author's own lines the counter reads ≠ 18; any rhyme-bound word that misreads the source.
