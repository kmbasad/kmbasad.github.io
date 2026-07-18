# CLAUDE.md

Guidance for Claude Code working in this repository.

## What this site is

Personal website for **Khan Muhammad Bin Asad** (astronomer at CASSA, IUB), hosted on GitHub
Pages. **Wholly public.** Built with **Astro** (static output). Four sections:

- **Panthea** — the published stories of the Panthea epic (written in Bengali).
- **Pangea** — land of the archive: canonical Bengali texts (e.g. Alaol's *Sapta Paykar*, modernized with parallel English).
- **Translations** — world literature rendered into Bangla (Hafez's *Divan*, Dante's *Inferno*, Ovid's *Metamorphoses*).
- **Trellises** — interactive matrix readings: philosophy/theology (Consciousness, God) and film (Ray, Kiarostami, Chan-wook), with essays.

> The **private workshop** for the Panthea project (drafts, world-bible, copyrighted source
> texts, the former `knb/`) lives in a **separate** vault at `../Panthea`, not in this repo.
> Only finished, public-intended work belongs here.

## Development

```bash
npm install      # once
npm run dev      # local dev server (http://localhost:4321)
npm run build    # static build → dist/
npm run preview  # serve the built dist/
```

Deployment is automatic via `.github/workflows/deploy.yml` (the official `withastro/action`)
**on push to `main`**. Feature branches (e.g. `astro-revamp`) do not deploy.

## Architecture

Astro provides the **layout, routing, and content**; the site keeps its **bespoke vanilla-JS
engines** from the pre-Astro era, loaded at runtime.

- **`src/layouts/Base.astro`** — the shared shell: server-rendered top nav (the 4 sections +
  KMBA brand + theme toggle), pre-paint theme init, Bengali webfonts (Noto Serif Bengali, Tiro
  Bangla), the global design system (`/css/style.css`), and `/js/site.js`. Props: `title`,
  `description`, `section` (active-nav key), `bodyClass`, `styles` (extra stylesheet hrefs).
  Per-page `<script>`/config and extra `<link>`s go in the **`head` slot**.

- **`public/`** — served verbatim at the site root. Holds:
  - **`public/js/`** — the bespoke engines: `trellis.js` (renders the **Trellises** matrices; it
    loads `trellis-flora.js` itself to paint the woven-vine layer, and renders the per-trellis
    essay), `translation-table.js` (the shared parallel-table renderer with word-alignment
    hover-highlighting), its data loader `md-loader.js` (builds the parallel table from Markdown
    for **both** the **Translations** and the **Pangea** sections), and `site.js` (theme toggle,
    auto-TOC, sticky header — the non-nav remnant of the old `nav.js`). (Pangea was migrated off
    TSV to Markdown; the old `tsv-loader.js` and the `.tsv` sources have been removed.)
  - **`public/css/`** — `style.css` (design system), `home.css`, `trellis.css`,
    `translation-table.css`, `trellis-flora.css`.
  - **content data** — `.md` files under paths that mirror their page URL: **Translations** are
    Markdown (`public/translations/<work>/<part>/<part>.md`, plus an optional `<part>-words.md`
    word-list for hover-highlighting); each **Trellis** folder holds exactly two uniformly-named
    files — `public/trellises/<name>/trellis.md` (the matrix data — one or more matrices) and
    `public/trellises/<name>/essay.md` (the essay, may be empty); **Pangea** parallel text is now
    Markdown too (`public/pangea/alaol-sapta-paykar/<chapter>/<chapter>.md`), in the same previewable
    GFM-table format as the translations. The engines `fetch()`
    these at runtime, so a data file must sit at the path the page's config expects.

- **`src/pages/`** — one `.astro` file per route. `src/data/` holds shared content lists
  (e.g. `alaol-chapters.js`, used by both the Pangea landing and the dynamic chapter route).

### Loading the bespoke engines from an Astro page

Astro processes `<script>` by default; the vanilla engines must be left **unprocessed** and
the `window.*_CONFIG` global must be set **before** the engine loads:

```astro
<!-- static config -->
<script is:inline>window.TSV_CONFIG = { src: 'book-i.tsv', type: 'tercet' };</script>
<script is:inline src="/js/tsv-loader.js"></script>
<script is:inline src="/js/translation-table.js"></script>
```

For a **dynamic** value (e.g. a chapter slug), use `define:vars` instead of `is:inline`:

```astro
<script define:vars={{ src: `${chapter}.tsv` }}>
  window.TSV_CONFIG = { src, type: 'tercet' };
</script>
```

CSS that styles **runtime-injected** DOM (matrix cells, essay bodies) must be global — an
external `/css/*.css` link, or `<style is:global>` (scoped styles won't match injected nodes).

### Config shapes (unchanged from the engines)

- **Translation & Pangea (Markdown)** — `window.TRANS_CONFIG = { src, dict?, noSource? }`, loaded
  by `md-loader.js`. Renders the parallel table: Bangla · source · line-no (small, English
  numerals). The `.md` is a **real, previewable GFM table** — frontmatter (`title`,
  `type: tercet|ghazal`, `lang: it|la|fa|en`), then `| বাংলা | মূল | # |` rows with a header +
  `|---|` delimiter row (the loader skips both). A `# Title` line renders a prominent chapter
  title; `## heading :: gloss` lines render section-heading rows (and feed the right-side TOC);
  `*(metre)*` in the first cell renders a prosody-marker row. `noSource: true` (Pangea chapters
  with no translation) drops the middle column → 2-col `| বাংলা | # |`. The legacy `bangla :: src`
  line format is still accepted. `dict` is a Markdown word-list feeding hover cross-highlighting.
  Both the **Translations** and **Pangea** sections use this one loader and format.
- **Trellis** — `window.TRELLIS_CONFIG = { data, essay, mountId }`, loaded by `trellis.js`.
  `data` (`trellis.md`) holds **one or more** matrices (each is a `# Title` + `axes:` block +
  `## Columns`/`## Rows`/`## Cells`; god's file carries two — philosophers and prophets — and
  the engine auto-splits them into the one `mountId`). **Uniform orientation: the header column
  (rows axis) is the subjects/persons/titles; the header row (cols axis) is the
  properties/events.** `essay` (`essay.md`) is rendered into `#essay-mount` if non-empty (its
  section auto-collapses when blank). Cells are keyed `### RC` where `R` = row index, `C` = col
  index.

## Page patterns

- **Translation page** — empty `<table class="tt-table">` inside `.trans-page.wide`; set
  `TRANS_CONFIG`; load `md-loader.js` + `translation-table.js`. Data is Markdown (see above).
- **Pangea chapter** — empty `<table class="tt-table">` inside a centred `.pangea-page` (narrow
  blended column, no image panel); set `TRANS_CONFIG` (`noSource: true` for Bengali-only chapters);
  load `md-loader.js` + `translation-table.js`. The Alaol chapters use the dynamic route
  `src/pages/pangea/alaol-sapta-paykar/[chapter].astro` (`getStaticPaths` over
  `src/data/alaol-chapters.js`, whose `hasEn` flag drives `noSource`); prev/next/index footer nav
  is rendered from the chapter list.
- **Trellis** — `<div id="trellis-mount">` inside `.page-section`, then a
  `<section class="trellis-essay"><div id="essay-mount"></div></section>`; set `TRELLIS_CONFIG`
  (`{ data: 'trellis.md', essay: 'essay.md', mountId: 'trellis-mount' }`); load `trellis.js` (it
  pulls in `trellis-flora.js`). All five trellis pages share this exact shape.
- **Section / work listing** — `.page-header > .breadcrumb` then `.listing-box > a.listing-item`.

## Adding new content

1. Put the data file under `public/<section>/<…>/` mirroring the intended URL.
2. Add a `src/pages/<section>/<…>.astro` using `Base` + the matching page pattern above.
3. Add the item to its section/work listing page.
4. `npm run build` and check.

## Scripts

`scripts/` holds one-off Python content-prep pipelines (e.g. the Alaol chapter-splitter). Dev
tooling only — not served, not part of the build. Read before running; paths are hardcoded.
Note: the Pangea `.md` files are now the hand-edited source of truth (e.g. the prologue's English
was tightened by hand), so there is no live TSV→MD regeneration step to re-run.
