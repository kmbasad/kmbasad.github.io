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
  server-rendered top nav (Bengali labels for the 4 sections + home; the site
  is light-themed only — there is no dark mode or theme toggle), Bengali webfonts (Noto Serif Bengali, Tiro Bangla), the global
  design system `/css/style.css`, and `/js/site.js`.
- Props: `title`, `description`, `section` (active-nav key), `bodyClass`,
  `styles` (extra stylesheet hrefs), and breadcrumb props `navTitle`,
  `navParentHref`/`navParentLabel`, `navGrandParentHref`/`navGrandParentLabel`.
  Per-page `<script>`/config and extra `<link>`s go in the **`head` slot**.

### Pages and shared data

- **`src/pages/`** — one `.astro` file per route; routes map 1:1 to
  directories (`pangea/`, `translations/<work>/`, `trellises/<name>.astro`, …).
- **`src/data/`** — shared content lists consumed by pages:
  - `translation-works.js` — the Translations **naming source of truth**:
    work/part/canticle titles render the listing pages *and* the reading
    pages' breadcrumbs, so a name changed there changes everywhere at once.
  - `pangea-works.js` — Pangea work listing (Bengali titles).
  - `alaol-chapters.js` — the 10 Alaol chapters in reading order, shared by
    the Pangea work-landing and the dynamic chapter route; the `hasEn` flag
    drives `noSource` on the chapter page.
- **Naming rules.** Titles are Bangla, and every page's `<title>` is its
  whole breadcrumb read outward, ending at the site's name:
  `h1 — parent — grandparent — যৌথ অচেতন`. `Base.astro` derives this from
  the nav props; a page with no breadcrumb passes `title` = its h1; home
  gets the bare **যৌথ অচেতন**, which appears only there in the tab — never
  in the on-page breadcrumb. The সূচি dropdown never scrolls — past 14
  entries it folds into 2 columns, past 30 into 3.

### Runtime engines (`public/js/`)

Served verbatim at the site root (like everything under `public/`):

- **`translation-table.js`** — the shared parallel-table renderer (Bangla ·
  source · line-no columns, word-alignment hover-highlighting).
- **`md-loader.js`** — its data loader; builds the parallel table from
  Markdown for **both** the Translations and Pangea sections, stamping each
  verse row with `data-mdline` (its line number in the source .md — the
  dev-only editor saves back through it). (Pangea was migrated off TSV to
  Markdown; `tsv-loader.js` and the `.tsv` sources are gone — do not
  resurrect the TSV pipeline.)
- **`book.js`** — the Translations reading engine: the শব্দকোষ dictionary
  panel (click a source-language word → Wiktionary REST lookup filtered to
  that language, plus external links — Logeion/Whitaker/Perseus for `la`,
  Treccani/WordReference for `it`, Vajehyab/Steingass for `fa`; a bottom
  sheet below 900px); the **মিটার স্ক্যান** bar at the head of that panel,
  from `TRANS_CONFIG.meters` (বাংলা: matrabritta matra dividers over the
  Bangla; লাতিন: dactylic-hexameter foot boundaries over the Latin — both
  inserted at text-node level so the `.w` hover-highlight spans survive
  toggling); and the আগের/সূচিপত্র/পরের footer
  nav (from `TRANS_CONFIG.toc`/`prev`/`next`) + Ctrl←/→ keys. Styled by
  `book.css`. (The old image panel is gone — illustrations will return in
  another form.)
- **`trellis.js`** — renders the Trellises matrices and the per-trellis essay;
  loads `trellis-flora.js` itself to paint the woven-vine layer. Stamps each
  matrix and the essay with `id` + `data-toc`, then fires `content-ready`.
- **`site.js`** — the menubar behaviour (`setupNav`: the glide rail, the
  narrow-on-scroll shelf, the progress edge, the mobile menu sheet) and the
  **সূচি** key — see *The সূচি*, below. All of it is enhancement; the bar
  works without JS.

Stylesheets in `public/css/`: `style.css` (design system), `home.css`,
`translation-table.css`, `book.css`, `trellis.css`, `trellis-flora.css`.

**The menubar.** A glass shelf, sticky on every page, in this order: the mark
(far left, links home — there is no হোম link), the breadcrumb immediately
beside it, and the four section names pushed to the far right by
`.nav-right { margin-left: auto }`. Heights
are tokens — `--nav-h` 50px, `--nav-h-min` 42px when scrolled, `--nav-now` the
live one via `.nav-tight` on `<html>`. Full-height panels beside the bar use
`--nav-now`; anything sticking under it uses `--nav-h-min`. An inner scroll
column marked `data-page-scroll` drives the bar on pages that lock the
viewport. Chrome type is `--bn-display` (Tiro Bangla); ≤760px the names fold
into `.nav-sheet`. All bar text shares one size (`--nav-fs`: 16.5px, 15.5px
scrolled). The left cluster carries the page's identity, in every section:
ancestor links are glass keys (hairline border, soft radius) stepped apart by
drawn gold SVG chevrons (`src/components/NavChevron.astro`), and the current
page is the one gilt key (`.nav-here`, gold hairline frame) holding the title
in `.nav-cur` plus — on pages with সূচি targets — an inner divider and the সূচি
action in lapis. site.js injects the সূচি into the gilt key and makes the whole
key the trigger; the dropdown is positioned under it on open. Ancestors hide
≤900px; the gilt key stays. The mark is also `public/favicon.svg` — one
drawing.

**The ladder never shows the section root.** The four section names are already
in the left cluster with the glide rail under the active one, so `Base.astro`
filters any ancestor whose href is one of them (`SECTION_ROOTS`) out of the
drawn crumbs. Pages still pass their whole ladder — it feeds the tab title,
which has no such cluster to read from. Two slots let a section add its own
controls: **`nav-crumbs`** steps in an extra crumb after the ancestors (it need
not be a link, and draws its own trailing `<NavChevron />`), and
**`nav-here`** replaces the gilt key's contents, which must still contain
`.nav-cur`. Panthea is the only user of both.

**Where a page's title lives.** A **text page has no in-page title at all** —
no chapter head, no `h1`; its name is in the breadcrumb and nowhere else. An
**index or listing page keeps its `h1`**. The lone exception is a গীতবিতান
song page, whose `h1` is the song's first line, which the bar's serial
(`পূজা ১২৩`) cannot carry.

**The সূচি.** One implementation — `buildTOC()` in `site.js` — for the whole
site. ≥ 2 `[data-toc]` elements in the document and a সূচি key appears —
**always in the left cluster with the breadcrumb**: inside the gilt key, or
beside the mark on a page with no breadcrumb; never out among the section
names — opening a panel, aligned on the gilt key's left edge, that
**never scrolls**: past 14 entries the list folds into 2
columns, past 30 into 3, or with the grid style it becomes a 6-across grid of
bare numbers (`tocStyle="grid"` on `Base` → `data-toc-style` on `<body>`;
`window.TRANS_CONFIG.tocStyle` also still works — the ghazals use it).
Scroll-spy marks the active entry, on the window or a `data-page-scroll`
column alike. On a target, `data-toc` is the label and the `id` is where the
panel scrolls; the element's own text is never read. Targets are stamped by
`md-loader.js` (section rows, ghazal heads), by `trellis.js` (matrices, the
essay), by `site.js` itself for any container carrying
**`data-toc-scan="h2, h3"`** (Panthea's `.pn-story`), or written straight into
the markup (গীতবিতান's 22 পর্যায়). **Content injected or hidden after load must
dispatch `content-ready`** — the site-wide rebuild signal. (`md-loader-done`
also still fires, but it is md-loader's own event, for `book.js` and the dev
verse editor.) `buildTOC` tears down and rebuilds, so it is safe to re-run;
listeners that outlive a build are registered once in `boot()` — leave them
there.

**Palette — Lapis & Gold.** One light theme, defined in `style.css`'s `:root`:
cool chalk ground `--bg #ebeff6`, near-white reading surfaces, navy-black ink
`--text #0e1a2b`, lapis `--accent #1d4f9b` for structure and interaction, gold
`--accent-2 #a97c18` for marginalia and emphasis only. Per-area token sets
(`--tt-*`, `--flora-*`, `--pn-*`, `--cell-*`/`--diag-*`) all derive from those
two pigments. Recolour tokens, not rules.

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
  noSource?, dictLang?, meters?, marginSections?, tocStyle?, toc?, prev?,
  next? }`, consumed by `md-loader.js` (+ `book.js` for
  `dictLang`/`meters`/nav on Translations pages; `tocStyle` by `site.js`).
  Renders the parallel table: Bangla · source · line-no (small, English
  numerals). `noSource: true` (Pangea chapters with no translation) drops
  the middle column → 2-col `| বাংলা | # |`. `marginSections: true`
  (Metamorphoses) renders `## headings` not as rows but as small gold
  `.ln-sec` labels in the line-number column of each section's first verse
  (row class `tt-secstart`; on phones the label becomes a centred line above
  the verse) — without it (Alaol) headings stay full `tt-section` rows.
  Ghazal builds stamp every ghazal with `data-toc` = its Bangla numeral,
  which with `tocStyle: 'grid'` renders the সূচি as a number grid.
- **Trellis** — `window.TRELLIS_CONFIG = { data, essay, mountId }`, consumed
  by `trellis.js`.

### Content data formats (`public/`)

Data files live under paths mirroring their page URL.

- **Translations** — `public/translations/<work>/<part>/<part>.md`, plus an
  optional `<part>-words.md` word-list (`dict`) for hover-highlighting. The
  `.md` is a **real, previewable GFM table**: frontmatter (`title`,
  `type: tercet|ghazal`, `lang: it|la|fa|en`), then `| বাংলা | মূল | # |` rows
  with a header + `|---|` delimiter row (the loader skips both). A `# Title`
  line renders a prominent chapter title; `## heading :: gloss` lines render
  section-heading rows (and feed the সূচি menu); `*(metre)*` in the
  first cell renders a prosody-marker row. The legacy `bangla :: src` line
  format is still accepted. The `-words.md` word-list is a two-column GFM
  table (`| bangla | source |`, frontmatter `type: words`). The `img/`
  folders hold the canto artwork, currently unrendered (the image panel is
  retired; the plates will return in another form).
  (`book-i-prose.md` beside the Metamorphoses source is an unrendered
  archive of the literal prose crib from the retired books workshop.)
- **Pangea** — same loader and format as Translations:
  `public/pangea/alaol-sapta-paykar/<chapter>/<chapter>.md`. Chapters without
  English use the 2-col form. **The Pangea `.md` files are the hand-edited
  source of truth** — there is no regeneration step.
- **Trellises** — each folder `public/trellises/<name>/` holds exactly two
  uniformly-named files: `trellis.md` (matrix data) and `essay.md` (the essay,
  may be empty — its section auto-collapses when blank). `trellis.md` holds
  **one or more** matrices, each a `# Title` + `axes:` block + `## Columns` /
  `## Rows` / `## Cells` (god's file carries two — দার্শনিক and নবি — and the
  engine auto-splits them into the one `mountId`). The `# Title` is user-facing
  now: it is the matrix's সূচি label, so write it in Bangla. **Uniform
  orientation: the header column (rows axis) is the
  subjects/persons/titles; the header row (cols axis) is the
  properties/events.** Cells are keyed `### RC` where `R` = row index, `C` =
  col index.

## Page patterns

- **Translation page** — one `<BookReader …/>` (`src/components/BookReader.astro`)
  inside `Base` with `bodyClass="book-page"` and styles `translation-table.css`
  + `book.css`. The component renders **only the poem**: the parallel table in
  its own scroll column (`data-page-scroll`) and the শব্দকোষ aside — no
  chapter head (the work's name lives in the menubar breadcrumb; the TOC
  behind the সূচি key). It loads `md-loader.js` + `translation-table.js` +
  `book.js` with its `config` prop as `TRANS_CONFIG` (`src`, `dict?`,
  `dictLang: 'la'|'it'|'fa'`, `meters?`, `marginSections?`, `tocStyle?`,
  `toc`). **Dev-only
  verse editing** (the `transEditor` integration in `astro.config.mjs` +
  `src/dev/trans-edit.js`, mirroring the Panthea editor): on `npm run dev`,
  Ctrl+double-click a বাংলা cell edits it in place, Ctrl+Enter saves back to
  `public/translations/**.md` (via `data-mdline`) and reloads at the same
  scroll position, Esc cancels — none of it ships in the production build.
  See `src/pages/translations/divine-comedy/inferno-01.astro`.
- **Pangea chapter** — empty `table.tt-table` inside a centred `.pangea-page`
  (narrow blended column, no image panel); server-rendered prev/next/index
  footer nav; set `TRANS_CONFIG` (`noSource: true` for Bengali-only chapters);
  load `md-loader.js` + `translation-table.js`. The Alaol chapters use the
  dynamic route `src/pages/pangea/alaol-sapta-paykar/[chapter].astro`
  (`getStaticPaths` over `src/data/alaol-chapters.js`). Three-level
  breadcrumb, no in-page title, সূচি for free from the `## headings`.
- **Panthea page** — home and floor pages share one shell (`.pn-wrap`): two
  panels, story left and design right, and **no bar under the menubar**. All
  navigation is breadcrumb — `[↑ স্তর ↓] › [↑ number ↓]` on a floor, a single ↓
  on the home (it is the roof). `.nav-cur` holds the bare number and is what
  the elevator ride scrubs. The story container carries `data-toc-scan="h2, h3"`
  for the সূচি. A design panel with more than one view floats its keys over its
  own foot (`.pn-views`). See the `panthea` skill before touching any of it.
- **Trellis** — `<div id="trellis-mount">` inside `.page-section`, then
  `<section class="trellis-essay"><div id="essay-mount"></div></section>`;
  set `TRELLIS_CONFIG` (`{ data: 'trellis.md', essay: 'essay.md', mountId:
  'trellis-mount' }`); load `trellis.js` (it pulls in `trellis-flora.js`). All
  five trellis pages share this exact shape, and none has an in-page title.
  A matrix's `# Title` is its সূচি label, and is drawn (`h2.matrix-title`)
  only when its file holds more than one matrix — গড alone.
- **Section / work listing** — `.page-header > .breadcrumb` then
  `.listing-box > a.listing-item`. These are the pages that **keep** their
  `h1.work-title`.

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
