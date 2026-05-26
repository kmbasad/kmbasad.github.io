# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this site is

Personal website for Khan Muhammad Bin Asad (astronomer at CASSA), hosted on GitHub Pages. Three sections:

- **Creations** — original essays and interactive matrices (philosophy of mind, theology)
- **Translations** — world literature rendered into Bangla (Hafez's Divan from Persian, Dante's Inferno from Italian, Metamorphoses from Latin, Divan-e-Shams from Sanskrit/Persian)
- **Visions** — readings of film and visual art (Park Chan-wook, Kiarostami), also using matrix pages

## Development

Pure static site — no build step, no bundler, no framework. To preview locally:

```bash
python3 -m http.server 8080
# then open http://localhost:8080
```

All paths are absolute (`/css/style.css`, `/js/nav.js`) so the server must serve from root.

## Architecture

### JS modules

- **`js/nav.js`** — injects the top nav bar into every page by detecting the current URL path. Every HTML page loads this via `<script defer src="/js/nav.js">`.

- **`js/tsv-loader.js`** — fetches a TSV and builds the translation table DOM. Configured per-page via `window.TSV_CONFIG` set inline before the script loads:
  ```js
  window.TSV_CONFIG = {
    src: 'filename.tsv',        // relative to the HTML page
    type: 'ghazal',             // or 'tercet'
    dictSrc: 'words.tsv',       // optional word-alignment dictionary
    sections: {                 // ghazal only — section heading anchors
      <firstGhazalNum>: { id: 'anchor-id', label: 'Ghazals …' },
    }
  };
  ```
  - `ghazal` type: 4 cols (Bangla, ghazal-number, Persian/source, transliteration). Rows come in pairs per couplet; blank rows separate ghazals.
  - `tercet` type: 4 cols (Bangla, line-number, Italian/source, English). Blank rows separate tercets.

- **`js/translation-table.js`** — adds interactive word-correspondence highlighting to any `.tt-table`. Wraps tokens in `<span class="w" data-w="KEY">` and highlights matches on hover/click. Uses punctuation-anchored proportional alignment (not character-level DP) because cross-script pairs have no character similarity.

- **`js/matrix.js`** — renders interactive grid matrices. Despite the `.md` extension, matrix source files are tab-separated trellis tables (see "Matrix cell format" below); the extension is just a convention so editors apply markdown highlighting to the rich cell bodies. Two initialization modes:
  ```js
  // Single matrix:
  window.MATRIX_CONFIG = { src: 'file.md', mountId: 'id' };

  // Multiple matrices on one page:
  window.GOD_DATA = [
    { src: 'god-philosophers.md', mountId: 'god-philosophers-mount' },
    { src: 'god-prophets.md',     mountId: 'god-prophets-mount' }
  ];

  // Optional essay rendered into <div id="essay-mount">:
  window.ESSAY_SRC = 'file.md';   // GOD_ESSAY_SRC is accepted as a legacy alias
  ```
  The essay markdown's first heading becomes the page title/subtitle; remaining paragraphs render inside `.essay-body`.

- **`js/parallel.js`** — parallel reading layout (used by the parallel CSS).

### Matrix cell format

The matrix source file (`.md` by convention, tab-separated content) follows the layout below. Within any cell, `\n\n` separates logical sections. Column/row headers are richer than plain text:

- **Corner cell** (row 0, col 0): `Label\nSize` — a `\n` (not `\n\n`) separates display label from size hint (e.g. `Property ↓ · Thinker →\n10 × 10`).
- **Column header** (row 0, col N+1): `name\n\ndates\n\nculture\n\nshort\n\nlong` — `name` is always first; if the second part contains digits it's treated as dates; third part (no digits) is culture. Panel shows short + long as essay body.
- **Row header** (col 0, row N+1): `name\n\ndesc\n\nshort_if_<80chars\n\nlong` — displayed in side column and panel synthesis view.
- **Data cell**: `short_label\n\nlong_html_or_markdown` — first part is the button label; rest is expanded in the panel.

### CSS

- **`css/style.css`** — shared across all pages; defines the design system (CSS vars, nav, cards, listing, writing system `.essay`/`.poem`, translation table layout `.tt-table`, `.tt-wrap`).
- **`css/translation-table.css`** — column-specific styles for translation tables (`.bn`, `.fa`, `.it`, `.tl`, `.ln-col`) and word highlight classes (`.source-word`, `.word-highlight`, `.line-highlight`).
- **`css/matrix.css`** — matrix grid styles.
- **`css/parallel.css`** — parallel reading layout styles.

### Data files (TSV)

TSV files live alongside their `index.html`. They are fetched at runtime — not bundled.

Older matrix pages still have a sibling `.tsv` alongside the `.md`; the `.md` is the live source loaded by `matrix.js`. Translation pages still use `.tsv`.

**Scripts** (one-off, paths hardcoded — read before running):
- `scripts/json_to_tsv.py` — converts a structured JSON source file to matrix TSV format.
- `scripts/tsv_to_md.py` — converts a trellis TSV into the `.md` form that `matrix.js` loads (each cell becomes a heading section so Ctrl+F works on the raw file).
- `scripts/update_tsv_corners.py` — rewrites the corner cell (row 0, col 0) of specified TSV files.

### Page patterns

**Translation page** — empty `<table class="tt-table"><thead><tr></tr></thead><tbody></tbody></table>` in the HTML; `tsv-loader.js` fills it at runtime from the TSV. Always needs both `tsv-loader.js` and `translation-table.js`.

**Matrix page** — one or more `<div id="...-mount"></div>` placeholders; `matrix.js` fills them from TSV via `MATRIX_CONFIG` (single) or `GOD_DATA` (multiple). Used by both Creations and Visions sections.

**Writing page** (essays/poems) — content is static HTML using `.writing-col > .writing-stack > .essay` or `.poem` structure.

## Adding new content

- **New translation**: create a folder under `translations/`, add `index.html` following an existing translation page, place the `.tsv` alongside it, set `window.TSV_CONFIG` inline.
- **New matrix creation or vision**: place the trellis `.md` in the creation/vision folder, set `window.MATRIX_CONFIG` (or `GOD_DATA` for multiple matrices) plus an optional `window.ESSAY_SRC`, load `matrix.js`.
- **New section listing**: update the parent `index.html` listing using `.listing-box > .listing-item` structure.

## Working notes

The `knb/` directory holds source PDFs and working notes for upcoming pieces. It is untracked (no `.gitignore` entry — just never committed) and is not linked from the live site. Treat it as scratch input, not publishable content, and don't `git add` it without asking.
