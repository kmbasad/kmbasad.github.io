# CLAUDE.md

Guidance for Claude Code working in this repository.

## What this site is

Personal website for **Khan Muhammad Bin Asad** (astronomer at CASSA, IUB), hosted on GitHub
Pages. **Wholly public.** Built with **Astro** (static output). Four sections:

- **Panthea** — the published stories of the Panthea epic (written in Bengali).
- **Canon** — canonical Bengali texts (e.g. Alaol's *Sapta Paykar*, modernized with parallel English).
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
  - **`public/js/`** — the bespoke engines: `matrix.js` (renders trellis matrices; it loads
    `trellis-flora.js` itself to paint the woven-vine layer), `tsv-loader.js` +
    `translation-table.js` (parallel translation tables with word-alignment highlighting), and
    `site.js` (theme toggle, auto-TOC, sticky header — the non-nav remnant of the old `nav.js`).
  - **`public/css/`** — `style.css` (design system), `home.css`, `matrix.css`,
    `translation-table.css`, `trellis-flora.css`.
  - **content data** — the `.tsv` (translation/parallel) and `.md` (matrix/essay) files, under
    paths that mirror their page URL (e.g. `public/canon/alaol-sapta-paykar/<chapter>/<chapter>.tsv`,
    `public/trellises/god/god-philosophers.md`). The engines `fetch()` these at runtime, so a
    data file must sit at the path the page's config expects.

- **`src/pages/`** — one `.astro` file per route. `src/data/` holds shared content lists
  (e.g. `alaol-chapters.js`, used by both the Canon landing and the dynamic chapter route).

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

- **Translation table** — `window.TSV_CONFIG = { src, type, dictSrc?, sections? }`. `type` is
  `'tercet'` (4 cols: Bangla, line-no, source, English) or `'ghazal'` (4 cols: Bangla,
  ghazal-no, Persian, transliteration). `dictSrc` adds a word-alignment dictionary TSV.
- **Matrix / trellis** — `window.MATRIX_CONFIG = { src, mountId }` for one matrix, or
  `window.GOD_DATA = [{ src, mountId }, …]` for several. `window.ESSAY_SRC = 'file.md'` renders
  an essay into `#essay-mount`. Matrix source files are tab-separated tables with a `.md`
  extension (the first heading of the essay file becomes the page title/subtitle).

## Page patterns

- **Translation / Canon chapter** — empty `<table class="tt-table">` inside
  `.trans-page.wide` (add `tt-prose` for prose like Alaol); set `TSV_CONFIG`; load
  `tsv-loader.js` + `translation-table.js`. The Alaol chapters use the dynamic route
  `src/pages/canon/alaol-sapta-paykar/[chapter].astro` (`getStaticPaths` over `src/data/alaol-chapters.js`).
- **Trellis** — one or more `<div id="…-mount">` inside `.page-section`; set `MATRIX_CONFIG`
  (or `GOD_DATA`) + optional `ESSAY_SRC`; load `matrix.js` (it pulls in `trellis-flora.js`).
- **Section / work listing** — `.page-header > .breadcrumb` then `.listing-box > a.listing-item`.

## Adding new content

1. Put the data file under `public/<section>/<…>/` mirroring the intended URL.
2. Add a `src/pages/<section>/<…>.astro` using `Base` + the matching page pattern above.
3. Add the item to its section/work listing page.
4. `npm run build` and check.

## Scripts

`scripts/` holds one-off Python content-prep pipelines (TSV/MD conversion, the Alaol
chapter-splitter). Dev tooling only — not served, not part of the build. Read before running;
paths are hardcoded.
