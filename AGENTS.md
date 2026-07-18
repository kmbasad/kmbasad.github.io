# AGENTS.md

Guidance for AI coding agents working in this repository. Assumes no prior
knowledge of the project.

## Project overview

Personal website for **Khan Muhammad Bin Asad** (astronomer at CASSA, IUB),
hosted on GitHub Pages at `https://kmbasad.github.io`. **Wholly public.** A
static site built with **Astro 5** (`astro.config.mjs` sets only `site`; it is
a GitHub *user* site served at the domain root, so no `base` prefix — absolute
paths like `/css/...` and `/js/...` resolve against `public/`).

The site's work is written in **Bengali** (UI labels, titles, and content);
code comments and docs are in English. Four sections:

- **Panthea** (`/panthea/`) — the published stories of the Panthea epic
  (Bengali). Currently a placeholder listing page (`src/pages/panthea/index.astro`).
- **Pangea** (`/pangea/`) — land of the archive: canonical Bengali texts (Alaol's *Sapta Paykar*,
  modernized, some chapters with parallel English).
- **Translations** (`/translations/`) — world literature rendered into Bangla:
  Hafez's *Divan*, Dante's *Inferno*, Ovid's *Metamorphoses*.
- **Trellises** (`/trellises/`) — interactive matrix readings: philosophy/theology
  (Consciousness, God) and film (Ray, Kiarostami, Chan-wook), with essays.

> The **private workshop** for the Panthea project (drafts, world-bible,
> copyrighted source texts, the former `knb/` — now gitignored) lives in a
> **separate** vault at `../Panthea`, not in this repo. Only finished,
> public-intended work belongs here.

## Build and dev commands

```bash
npm install      # once
npm run dev      # local dev server (http://localhost:4321)
npm run build    # static build → dist/
npm run preview  # serve the built dist/
```

- The only runtime dependency is `astro`. No framework integrations, no
  content collections, no MDX — pages are plain `.astro` files.
- **There is no test suite, linter, formatter, or typecheck script.**
  `tsconfig.json` extends `astro/tsconfigs/strict` but nothing enforces it in
  CI. Verification = `npm run build` succeeding plus eyeballing the page in
  `npm run preview` / dev server.
- `dist/` and `.astro/` are gitignored build output; never edit them by hand.

## Deployment

Automatic via `.github/workflows/deploy.yml` (the official `withastro/action`)
**on push to `main`** (or manual `workflow_dispatch`). Feature branches do not
deploy. There is no staging environment.

## Architecture

Astro provides the **layout, routing, and build**; the site keeps its
**bespoke vanilla-JS engines** from the pre-Astro era, loaded at runtime as
unprocessed scripts. The engines `fetch()` Markdown data files from `public/`
at runtime, so **a data file must sit at the exact path the page's config
expects** (paths mirror page URLs).

### Layout

- **`src/layouts/Base.astro`** — the shared shell used by every page:
  server-rendered top nav (Bengali labels for the 4 sections + home + theme
  toggle), pre-paint theme init (`localStorage('kmba-theme')` → `data-theme`
  on `<html>`), Bengali webfonts (Noto Serif Bengali, Tiro Bangla), the global
  design system `/css/style.css`, and `/js/site.js`.
- Props: `title`, `description`, `section` (active-nav key), `bodyClass`,
  `styles` (extra stylesheet hrefs), and breadcrumb props `navTitle`,
  `navParentHref`/`navParentLabel`, `navGrandParentHref`/`navGrandParentLabel`.
  Per-page `<script>`/config and extra `<link>`s go in the **`head` slot**.

### Pages and shared data

- **`src/pages/`** — one `.astro` file per route; routes map 1:1 to
  directories (`pangea/`, `translations/<work>/`, `trellises/<name>.astro`, …).
- **`src/data/`** — shared content lists consumed by pages:
  - `translation-works.js`, `pangea-works.js` — work listings (Bengali titles).
  - `alaol-chapters.js` — the 10 Alaol chapters in reading order, shared by
    the Pangea work-landing and the dynamic chapter route; the `hasEn` flag
    drives `noSource` on the chapter page.

### Runtime engines (`public/js/`)

Served verbatim at the site root (like everything under `public/`):

- **`translation-table.js`** — the shared parallel-table renderer (Bangla ·
  source · line-no columns, word-alignment hover-highlighting).
- **`md-loader.js`** — its data loader; builds the parallel table from
  Markdown for **both** the Translations and Pangea sections. (Pangea was
  migrated off TSV to Markdown; `tsv-loader.js` and the `.tsv` sources are
  gone — do not resurrect the TSV pipeline.)
- **`book.js`** — for translation pages with artwork: pannable/zoomable image
  panel + slider (from `TRANS_CONFIG.images`), and Previous/Index/Next footer
  nav (from `TRANS_CONFIG.toc`/`prev`/`next`). Styled by `book.css`.
- **`trellis.js`** — renders the Trellises matrices and the per-trellis essay;
  loads `trellis-flora.js` itself to paint the woven-vine layer.
- **`site.js`** — theme toggle, auto-TOC, sticky header (the non-nav remnant
  of the old `nav.js`).

Stylesheets in `public/css/`: `style.css` (design system), `home.css`,
`translation-table.css`, `book.css`, `trellis.css`, `trellis-flora.css`.

### Loading the engines from an Astro page

Astro processes `<script>` by default; the vanilla engines must be left
**unprocessed** (`is:inline`), and the `window.*_CONFIG` global must be set
**before** the engine loads:

```astro
<script is:inline>
  window.TRANS_CONFIG = { src: 'inferno-01.md', dict: 'inferno-01-words.md' };
</script>
<script is:inline src="/js/md-loader.js"></script>
<script is:inline src="/js/translation-table.js"></script>
```

For a **dynamic** value (e.g. a chapter slug), use `define:vars` instead of
`is:inline` (see `src/pages/pangea/alaol-sapta-paykar/[chapter].astro`).

CSS that styles **runtime-injected** DOM (matrix cells, essay bodies, table
rows) must be global — an external `/css/*.css` link, or `<style is:global>`;
Astro-scoped styles won't match injected nodes.

### Config shapes

- **Translation & Pangea (Markdown)** — `window.TRANS_CONFIG = { src, dict?,
  noSource?, images?, toc?, prev?, next? }`, consumed by `md-loader.js`
  (+ `book.js` for `images`/nav). Renders the parallel table:
  Bangla · source · line-no (small, English numerals). `noSource: true`
  (Pangea chapters with no translation) drops the middle column → 2-col
  `| বাংলা | # |`.
- **Trellis** — `window.TRELLIS_CONFIG = { data, essay, mountId }`, consumed
  by `trellis.js`.

### Content data formats (`public/`)

Data files live under paths mirroring their page URL.

- **Translations** — `public/translations/<work>/<part>/<part>.md`, plus an
  optional `<part>-words.md` word-list (`dict`) for hover-highlighting, and an
  optional `img/` folder for the artwork panel. The `.md` is a **real,
  previewable GFM table**: frontmatter (`title`, `type: tercet|ghazal`,
  `lang: it|la|fa|en`), then `| বাংলা | মূল | # |` rows with a header +
  `|---|` delimiter row (the loader skips both). A `# Title` line renders a
  prominent chapter title; `## heading :: gloss` lines render section-heading
  rows (and feed the right-side TOC); `*(metre)*` in the first cell renders a
  prosody-marker row. The legacy `bangla :: src` line format is still
  accepted. The `-words.md` word-list is a two-column GFM table
  (`| bangla | source |`, frontmatter `type: words`).
  - **Book left-panel artwork (canonical size):** all AI-generated (and any
    new) images for `.book-img-panel` must be exactly **`1200 × 1280` px**
    (width × height, ratio ≈ 0.9375). That matches the desktop panel
    (`50vw` × `100vh − 52px` nav) on a 16:9 display so cover-fit shows the
    full frame with negligible crop. Export as WebP. Do not use the source
    engraving’s native portrait ratio; recompose/outpaint to this size.
- **Pangea** — same loader and format as Translations:
  `public/pangea/alaol-sapta-paykar/<chapter>/<chapter>.md`. Chapters without
  English use the 2-col form. **The Pangea `.md` files are the hand-edited
  source of truth** — there is no regeneration step.
- **Trellises** — each folder `public/trellises/<name>/` holds exactly two
  uniformly-named files: `trellis.md` (matrix data) and `essay.md` (the essay,
  may be empty — its section auto-collapses when blank). `trellis.md` holds
  **one or more** matrices, each a `# Title` + `axes:` block + `## Columns` /
  `## Rows` / `## Cells` (god's file carries two — philosophers and prophets —
  and the engine auto-splits them into the one `mountId`). **Uniform
  orientation: the header column (rows axis) is the
  subjects/persons/titles; the header row (cols axis) is the
  properties/events.** Cells are keyed `### RC` where `R` = row index, `C` =
  col index.

## Page patterns

- **Translation page** — `.book-layout` with an empty
  `.book-img-panel` (left) and `.book-text-panel > .book-text-body > table.tt-table`
  (right); styles `translation-table.css` + `book.css`; set `TRANS_CONFIG`
  (`src`, `dict?`, `images?`, `toc?`); load `md-loader.js`,
  `translation-table.js`, `book.js`. See
  `src/pages/translations/divine-comedy/inferno-01.astro`.
- **Pangea chapter** — empty `table.tt-table` inside a centred `.pangea-page`
  (narrow blended column, no image panel); server-rendered prev/next/index
  footer nav; set `TRANS_CONFIG` (`noSource: true` for Bengali-only chapters);
  load `md-loader.js` + `translation-table.js`. The Alaol chapters use the
  dynamic route `src/pages/pangea/alaol-sapta-paykar/[chapter].astro`
  (`getStaticPaths` over `src/data/alaol-chapters.js`).
- **Trellis** — `<div id="trellis-mount">` inside `.page-section`, then
  `<section class="trellis-essay"><div id="essay-mount"></div></section>`;
  set `TRELLIS_CONFIG` (`{ data: 'trellis.md', essay: 'essay.md', mountId:
  'trellis-mount' }`); load `trellis.js` (it pulls in `trellis-flora.js`). All
  five trellis pages share this exact shape.
- **Section / work listing** — `.page-header > .breadcrumb` then
  `.listing-box > a.listing-item`.

## Adding new content

1. Put the data file under `public/<section>/<…>/` mirroring the intended URL.
2. Add a `src/pages/<section>/<…>.astro` using `Base` + the matching page
   pattern above.
3. Add the item to its section/work listing page (and to the relevant
   `src/data/*.js` list if one exists).
4. `npm run build` and check the output.

## Code style

- **Vanilla, dependency-free JS** in the engines: ES5-style IIFEs,
  `'use strict'`, `var`, `function` — match that idiom; do not introduce
  modules, TypeScript, or build steps for `public/js/`.
- No framework components beyond `.astro` files; no client-side framework.
- Content, UI labels, and titles are Bengali; code comments in English.
- Keep edits minimal and consistent with the surrounding file.

## Scripts

`scripts/` holds one-off Python content-prep pipelines (the Alaol
chapter-splitter, TSV converters from the pre-Markdown era, etc.). Dev tooling
only — not served, not part of the build. **Read before running; paths are
hardcoded**, and several reference the removed TSV workflow or the private
`knb/` directory — most are historical. Do not re-run them against the
hand-edited Pangea `.md` files.

## Security considerations

- The repo is **wholly public** and deployed publicly on every push to
  `main` — never commit private workshop material (Panthea drafts, copyrighted
  source texts); `knb/` is gitignored for this reason.
- Content data is static Markdown fetched at runtime; the engines inject HTML,
  so treat the `.md` data files as trusted input (they are — they ship in the
  same repo).
- Do not add dependencies without need; the site currently has exactly one.
