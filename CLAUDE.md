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

- **`src/layouts/Base.astro`** — the shared shell: the menubar (below), Bengali webfonts
  (Noto Serif Bengali, Tiro Bangla), the favicon links, the global design system
  (`/css/style.css`), and `/js/site.js`. Props: `title`, `description`, `section` (active-nav
  key), `bodyClass`, `styles` (extra stylesheet hrefs), and the breadcrumb props `navTitle`,
  `navParentHref`/`navParentLabel`, `navGrandParentHref`/`navGrandParentLabel`.
  Per-page `<script>`/config and extra `<link>`s go in the **`head` slot**.

- **`public/`** — served verbatim at the site root. Holds:
  - **`public/js/`** — the bespoke engines: `trellis.js` (renders the **Trellises** matrices; it
    loads `trellis-flora.js` itself to paint the woven-vine layer, and renders the per-trellis
    essay), `translation-table.js` (the shared parallel-table renderer with word-alignment
    hover-highlighting), its data loader `md-loader.js` (builds the parallel table from Markdown
    for **both** the **Translations** and the **Pangea** sections; stamps each verse row with
    `data-mdline`, its line number in the source .md), `book.js` (the **Translations** reading
    engine: the শব্দকোষ dictionary panel — click a source-language word → Wiktionary REST lookup
    filtered to that language, plus links out to Logeion/Whitaker/Perseus (la), Treccani (it),
    Vajehyab/Steingass (fa); the **মিটার স্ক্যান** bar at the head of that panel — a বাংলা
    button for matrabritta matra dividers over the Bangla and a লাতিন button for
    dactylic-hexameter feet over the Latin, both inserted at text-node level so the
    hover-highlight spans survive; and the footer আগের/সূচিপত্র/পরের nav + Ctrl←/→ keys), and
    `site.js` (menubar behaviour + the **সূচি** key — see *The সূচি* below). The site is
    **light-themed only**: no dark mode, no theme toggle, no `data-theme` attribute. (Pangea was
    migrated off TSV to Markdown; the old `tsv-loader.js` and the `.tsv` sources have been
    removed. The old image-panel book layout is gone too — illustrations will return in
    another form later.)
  - **favicon** — `favicon.svg` (the mark), plus `favicon-32.png` / `apple-touch-icon.png`
    rendered from it with headless Chrome. Redraw all three together.
  - **`public/css/`** — `style.css` (design system), `home.css`, `trellis.css`,
    `translation-table.css`, `trellis-flora.css`, `panthea.css`, `book.css`.

    **The palette — Lapis & Gold** (defined once in `style.css`'s `:root`, everything else
    derives from it): a cool chalk ground (`--bg #ebeff6`, the accent at ~7% over white) with
    near-white reading surfaces (`--surface`, `--tt-paper`) lifted off it, navy-black ink
    (`--text #0e1a2b`), **lapis** `--accent #1d4f9b` for all structure and interaction (links,
    active nav, matrix cells, the flora vine, the Panthea beacon), and **gold** `--accent-2
    #a97c18` for marginalia and emphasis only — line numbers, section headings, a trellis's
    diagonal, the zenith crown. Gold is never a surface and never a paragraph. Warm browns,
    cream and terracotta are gone; the only warm values left in the CSS are the gold family.
    Recolour by editing the tokens, not the rules.
  - **content data** — `.md` files under paths that mirror their page URL: **Translations** are
    Markdown (`public/translations/<work>/<part>/<part>.md`, plus an optional `<part>-words.md`
    word-list for hover-highlighting); each **Trellis** folder holds exactly two uniformly-named
    files — `public/trellises/<name>/trellis.md` (the matrix data — one or more matrices) and
    `public/trellises/<name>/essay.md` (the essay, may be empty); **Pangea** parallel text is now
    Markdown too (`public/pangea/alaol-sapta-paykar/<chapter>/<chapter>.md`), in the same previewable
    GFM-table format as the translations. The engines `fetch()`
    these at runtime, so a data file must sit at the path the page's config expects.

- **`src/pages/`** — one `.astro` file per route. `src/data/` holds shared content lists
  (e.g. `alaol-chapters.js`, used by both the Pangea landing and the dynamic chapter route;
  `translation-works.js` is the **naming source of truth** for the Translations section —
  work/part/canticle titles render the listing pages *and* the breadcrumbs, so a name changed
  there changes everywhere at once). **Titles are Bangla, and every page's `<title>` is its whole
  breadcrumb read outward, ending at the site's name**: `h1 — parent — grandparent — যৌথ অচেতন`
  (derived automatically in `Base.astro` from the nav props; a page with no breadcrumb passes
  `title` = its h1; home gets the bare **যৌথ অচেতন**, which appears only there in the tab —
  never in the on-page breadcrumb).

### The menubar

A glass shelf, sticky on **every** page, holding three things in this order: the **mark**
(far left, links home), the **breadcrumb** for where you are — immediately beside the mark, so
the two read as one cluster: whose site, then which page — and the four **section names**,
pushed to the **far right** (`.nav-right { margin-left: auto }`, which is what drives the whole
bar's shape). **The সূচি is part of the breadcrumb and therefore always on the left**, never
out among the section names; on a page with no breadcrumb `site.js` still sits it beside the
mark. Behaviour lives in `setupNav()` in `site.js` and is pure enhancement — without JS it is a
plain list of links.

- **The mark** is the site's one piece of identity: a graduated limb with a dot at the zenith,
  drawn at three sizes from the same geometry — `public/favicon.svg` (+ the two PNGs rendered
  from it), the nav mark (`markTicks` in `Base.astro`), and the watermark behind the menu
  sheet. The home page prints the full instrument (72 graduations, `.home-plate` in
  `index.astro`). Its dial turns a quarter-turn across the page's scroll, plus a kick on hover.
  There is no হোম link — the mark is the way home, and it goes lapis on the home page.
- **The glide rail** (`.nav-glide`) is the only state indicator: it rests under the active
  section and follows the pointer. JS measures and moves it, and re-measures once the Bengali
  webfonts land.
- **The breadcrumb** (left, beside the mark) carries the page's identity, **in every section**.
  A **text page has no in-page title at all** — no chapter head, no `h1`: the name is in the
  bar and nowhere else. (An **index or listing page keeps its `h1`** — it is a destination you
  arrive at, and the heading tops the list under it.)
  **The ladder never shows the section root.** প্যান্থিয়া / প্যাঞ্জিয়া / অনুবাদ / মাচা are
  already in the left cluster with the glide rail under the active one, so `Base.astro` filters
  any ancestor whose href is one of the four (`SECTION_ROOTS`) out of the drawn crumbs — pages
  still *pass* their full ladder, and it still reaches the tab title, where there is no such
  cluster to read it from. A page therefore shows at most work › part.
  Two **slots** let a section put its own controls in the bar: `nav-crumbs` steps in an extra
  crumb after the ancestors (it need not be a link — Panthea's স্তর key opens a floor grid; it
  draws its own trailing `<NavChevron />`), and `nav-here` replaces the gilt key's contents,
  which must still contain `.nav-cur`.
  Everything on the bar shares **one type size** (`--nav-fs`: 16.5px,
  15.5px scrolled — section names and breadcrumb alike, all Tiro). Ancestor links are glass
  keys (hairline border, soft radius, surface wash; lapis on hover) stepped apart by drawn
  **gold SVG chevrons**. The current page is the one **gilt key** (`.nav-here`, gold hairline
  frame): the title in `.nav-cur`, then — when the page has সূচি targets — a thin
  inner divider and the **সূচি** action in lapis; `site.js` injects the সূচি there and makes
  the whole gilt key the trigger (press it anywhere → the TOC opens). The dropdown hangs
  directly under the gilt key (positioned by JS on open); ancestors hide ≤900px, the gilt key
  stays. A page with **no** breadcrumb (the section roots) puts a bare সূচি key beside the mark
  instead — still on the left, never among the section names.
- **Heights.** `--nav-h` (50px) at rest, `--nav-h-min` (42px) once scrolled; `--nav-now` is
  the live one, switched by `.nav-tight` on `<html>`. Anything full-height beside the bar uses
  `var(--nav-now)` (the dual-panel translation pages); anything that *sticks under* the bar
  uses `var(--nav-h-min)`, because sticking only ever happens after the bar has narrowed.
  Never hardcode the nav height again.
- **Scroll source.** Some pages lock the viewport and scroll an inner column instead. Mark
  that column `data-page-scroll` and the bar reads it (`.book-text-panel` does).
- **Type.** The chrome uses `--bn-display` (Tiro Bangla first), the page uses `--bn-font`
  (Noto Serif Bengali first). Tiro has one weight — never ask it for 500.
- **Small screens** (≤760px): the section names leave the shelf for **the tab bar**
  (`.tab-bar` in `Base.astro`) — the four rooms fixed to the foot of the screen, app-wise,
  on the same glass as the shelf; the active room wears the lapis and a short rail dropped
  from the bar's top hairline (the glide rail's echo). It lives **outside** `<nav>` (the
  nav's `backdrop-filter` would otherwise contain its fixed position). `--tab-h` is its
  height; below the fold breakpoint `<body>` carries that much bottom padding so no page
  ends under it, and the breadcrumb gets the whole shelf (`max-width: none`). There is no
  hamburger and no menu sheet — pure CSS, nothing to wire. **Mobile reading is one column
  site-wide**: every section's phone styles consume the `--m-read-pad` / `--m-read-fs` /
  `--m-read-lh` tokens from `style.css` — never restate the numbers. The margin is
  kindle-thin (the text fills the window), **prose justifies, and a verse line never
  breaks**: on the collapsed one-column verse page the bn cells are `nowrap` and the fitter
  at the foot of `translation-table.js` sets `--verse-fs` (shrinking from `--m-read-fs`,
  floor 12.5px) so the page's longest line fits the screen — one size per page, re-run on
  `md-loader-done`, font load, and resize. **Text precedes design on phones**: Panthea's
  story sits above the map/plan plate (grid-row swap in `panthea.css`), and a trellis's
  essay above its matrix (the `.trellis-page` wrapper + flex order in `trellis.css`);
  `buildTOC` sorts targets by visual position so the সূচি reads the way the page does.

### The সূচি

**One implementation, `buildTOC()` in `site.js`, for the whole site.** It scans the document
for `[data-toc]` elements; ≥ 2 and a **সূচি** key appears — **always in the left cluster with
the breadcrumb**: inside the gilt key, or beside the mark on a page with no breadcrumb —
opening a frosted panel that hangs under the shelf, aligned on the gilt key's **left** edge
(JS sets `left` on open and clamps it to the viewport — desktop only). The dropdown
**never scrolls** — past 14 entries the list folds into 2 columns, past 30 into 3 — or, with
the grid style, becomes a 6-across grid of bare numbers (`tocStyle="grid"` on `Base`, which
emits `data-toc-style` on `<body>`; `window.TRANS_CONFIG.tocStyle` still works, and is what
the ghazals use). **On phones (≤760px) the same panel is a bottom sheet instead**: full
width at the foot of the screen, grab-bar at its head, at most 2 columns, and it *does*
scroll when long — `site.js` skips the dropdown positioning below the fold breakpoint and
the stylesheet pins it down. Scroll-spy marks the active entry, on the window or on a
`data-page-scroll` column alike.

**The contract on a target:** `data-toc` is its label, and it carries the `id` the panel
scrolls to. Its own text is never read. Four ways one gets stamped:

- `md-loader.js` — section rows and ghazal heads (Translations, and the Alaol chapters);
- `trellis.js` — each `.matrix-container` (label = the matrix's `# Title`) and the essay (মাচা);
- **`data-toc-scan="h2, h3"`** on a container — `site.js` stamps that container's own headings,
  labelling each from its text with any `em` stripped. All a page of build-time prose needs
  (Panthea's `.pn-story`);
- or the page just writes `id` + `data-toc` into its own markup.

**Anything injected or hidden after load must `document.dispatchEvent(new
CustomEvent('content-ready'))`** — that is the site-wide "content changed, rebuild the chrome"
signal, and the only thing that makes a late `[data-toc]` visible to the bar. `md-loader-done`
still fires too, but it is md-loader's own event, for `book.js` and the dev verse editor.
`buildTOC` tears its own DOM down and rebuilds, so it is safe to run repeatedly; every listener
that outlives a build is registered once, in `boot()` — do not move them back inside.

A সূচি jump must clear the sticky bar: `[data-toc]` carries a global `scroll-margin-top` of
`--nav-h-min + 12px`, and a page with its own sticky rule under the bar adds that rule's height
in its own stylesheet (`.pn-story h2/h3`).

### Loading the bespoke engines from an Astro page

Astro processes `<script>` by default; the vanilla engines must be left **unprocessed** and
the `window.*_CONFIG` global must be set **before** the engine loads:

```astro
<!-- static config -->
<script is:inline>window.TRANS_CONFIG = { src: 'inferno-01.md' };</script>
<script is:inline src="/js/md-loader.js"></script>
<script is:inline src="/js/translation-table.js"></script>
```

For a **dynamic** value (e.g. a chapter slug), use `define:vars` instead of `is:inline`:

```astro
<script is:inline define:vars={{ src: `${chapter}.md` }}>
  window.TRANS_CONFIG = { src };
</script>
```

CSS that styles **runtime-injected** DOM (matrix cells, essay bodies) must be global — an
external `/css/*.css` link, or `<style is:global>` (scoped styles won't match injected nodes).

### Config shapes (unchanged from the engines)

- **Translation & Pangea (Markdown)** — `window.TRANS_CONFIG = { src, dict?, noSource?,
  dictLang?, meters?, marginSections?, tocStyle?, toc?/prev?/next? }`, loaded by
  `md-loader.js` (`dictLang` + `meters` + the nav keys are read by `book.js`; `tocStyle` by
  `site.js`). `marginSections: true` (Metamorphoses) renders `## headings` not as rows but as
  small gold labels in the line-number column of each section's first verse (`.ln-sec`, row
  class `tt-secstart` — on phones the label surfaces as a centred line above the verse);
  without it (Alaol) headings stay full `tt-section` rows. Ghazal builds stamp every ghazal
  with `data-toc` = its Bangla numeral, which with `tocStyle: 'grid'` renders the সূচি as a
  number grid. Renders the parallel table: Bangla · source · line-no (small, English
  numerals). The `.md` is a **real, previewable GFM table** — frontmatter (`title`,
  `type: tercet|ghazal`, `lang: it|la|fa|en`), then `| বাংলা | মূল | # |` rows with a header +
  `|---|` delimiter row (the loader skips both). A `# Title` line renders a prominent chapter
  title; `## heading :: gloss` lines render section-heading rows (and feed the সূচি menu);
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

- **Translation page** — one `<BookReader …/>` (`src/components/BookReader.astro`) inside
  `Base` with `bodyClass="book-page"` and `styles={['/css/translation-table.css',
  '/css/book.css']}`. The component renders **only the poem**: the parallel table in its own
  scroll column (`data-page-scroll`) and the শব্দকোষ dictionary aside — no chapter head; the
  work's name lives in the menubar breadcrumb, the TOC behind the সূচি key. It loads
  `md-loader.js` + `translation-table.js` + `book.js` with the `config` prop as `TRANS_CONFIG`
  (`src`, `dict?`, `dictLang: 'la'|'it'|'fa'`, `meters?: { matra: [8,16], feet: true }`,
  `marginSections?`, `tocStyle?`, `toc`). Desktop is a two-pane reading room; below
  900px the শব্দকোষ becomes a bottom sheet, and phones read the Bangla alone. **Dev-only
  in-browser verse editing** (the `transEditor` integration in `astro.config.mjs` +
  `src/dev/trans-edit.js`): on `npm run dev`, Ctrl+double-click a বাংলা cell to edit it in
  place (rows carry `data-mdline`, their line in the source .md), Ctrl+Enter saves back to
  `public/translations/**.md` and reloads at the same scroll position, Esc cancels — none of
  it ships in the production build. (`book-i-prose.md` beside the Metamorphoses source is an
  unrendered archive of the literal prose crib from the retired books workshop.)
- **Pangea chapter** — empty `<table class="tt-table">` inside a centred `.pangea-page` (narrow
  blended column, no image panel); set `TRANS_CONFIG` (`noSource: true` for Bengali-only chapters);
  load `md-loader.js` + `translation-table.js`. The Alaol chapters use the dynamic route
  `src/pages/pangea/alaol-sapta-paykar/[chapter].astro` (`getStaticPaths` over
  `src/data/alaol-chapters.js`, whose `hasEn` flag drives `noSource`); prev/next/index footer nav
  is rendered from the chapter list. Three-level breadcrumb (chapter — সপ্ত পয়কর — প্যাঞ্জিয়া),
  no in-page title, and a সূচি for free from the `## headings` in the `.md` (a chapter with
  fewer than two of them simply gets no সূচি key).
- **Panthea story text** — the prose panel of every Panthea page is **pure Markdown** in
  `src/stories/panthea/` (`index.md` for the home; optional `bhumi.md`, `minar/<n>.md`,
  `patal/<n>.md` per floor — missing file → the empty-floor stub line), rendered **at build
  time** (imported in `index.astro` / globbed in `PantheaFloor.astro`). Conventions instead of
  HTML: first paragraph = lede, `*…*` inside a heading = the small floor-range tag
  (`### মারিনা *তলা ১–১০০*`), a `>` blockquote = the italic coda — styled in
  `public/css/panthea.css`. **Dev-only in-browser editing** (the `pantheaEditor` integration in
  `astro.config.mjs` + `src/dev/panthea-edit.js`): on `npm run dev`, Ctrl+double-click a story
  panel to open its Markdown in place at the clicked paragraph, Ctrl+Enter saves to disk and
  reloads at the same spot, Esc cancels. None of this ships in the production build — no
  endpoints, no `data-md` attribute, no editor script. The story container carries
  `data-toc-scan="h2, h3"`, which is the whole of Panthea's সূচি — a floor whose Markdown does
  not exist has no headings and so no সূচি key.
- **Panthea chrome** — there is **no second bar under the menubar**; the old `.pn-topbar` is
  gone and every Panthea page is two panels only (story left, design right). All navigation is
  in the breadcrumb: a floor page reads `[↑ স্তর ↓] › [↑ number ↓]` — the স্তর key opens the
  floor grid and its arrows cross into the neighbouring স্তর, the gilt key's arrows step one
  তলা, and `.nav-cur` holds the **bare number** (the স্তর beside it says which world; `navTitle`
  still carries the full `তলা ৫০০` so the tab reads properly). The home is the roof and gets
  the same gilt key with a single ↓. Both arrow pairs are lapis, full-height and wide — they
  are the way through 2001 pages. A design panel with more than one view floats its view keys
  over its own foot (`.pn-views`, the home's মিনার/পাতাল) rather than taking a bar.
- **Trellis** — `<div id="trellis-mount">` inside `.page-section`, then a
  `<section class="trellis-essay"><div id="essay-mount"></div></section>`; set `TRELLIS_CONFIG`
  (`{ data: 'trellis.md', essay: 'essay.md', mountId: 'trellis-mount' }`); load `trellis.js` (it
  pulls in `trellis-flora.js`). All five trellis pages share this exact shape, and none has an
  in-page title. Each matrix's `# Title` becomes its সূচি label and is **drawn** (as
  `h2.matrix-title`) only when its file holds more than one matrix — গড, which has two; a lone
  matrix already wears the page's name in the breadcrumb.
- **Section / work listing** — `.page-header > .breadcrumb` then `.listing-box > a.listing-item`.
  Listing and index pages are the ones that **keep** their `h1.work-title`.

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
