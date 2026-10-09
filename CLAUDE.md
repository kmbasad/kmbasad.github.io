# CLAUDE.md

Guidance for Claude Code working in this repository.

## What this site is

Personal website for **Khan Muhammad Bin Asad** (astronomer at CASSA, IUB), hosted on GitHub
Pages. **Wholly public.** Built with **Astro** (static output). Four sections:

- **Panthea** — the published stories of the Panthea epic (written in Bengali).
- **Pangea** — land of the archive: canonical Bengali texts (e.g. Alaol's *Sapta Paykar*, modernized with parallel English).
- **Translations** — world literature rendered into Bangla (Hafez's *Divan*, Dante's *Inferno*, Ovid's *Metamorphoses*, Shakespeare's *Sonnets*).
- **Trellises** — interactive matrix readings: philosophy/theology (চেতনা, খোদা) and film (Ray, Kiarostami, Chan-wook), each a **7×7**, all in Bangla, with an essay.

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
    paints each matrix as a Mondrian of the Paris years (`paintKlee`: the early Mondrian, the 1913-14 Paris grids coloured with the vivid palette of his Domburg years, every cell filled, about half the groups light (off-white, greys, cream, pale tints of the trellis's colours) and the rest solid from its own nine-colour palette, never white with a few primary blocks (the later manner, rejected), the 7×7 cut into irregular rectangles of one to six cells, heavy charcoal lines round each rectangle and fine ones inside it; no diagonal marker; cells numbered row-then-column in Bangla from ১১ to ৭৭; a cell under the pointer brightens and lifts as a whole; the 7×7 is the painting, the header row and column are thin signposts — names only, upright in the column, a bar of the row's or column's deep tone facing the matrix, which on hover or selection fills the whole label with that tone, the name in light type, while the matrix recedes except that row or column (`.k-focus` / `.k-lit`); details open in the panel), and renders the per-trellis
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
    `translation-table.css`, `panthea.css`, `book.css`.

    **The palette — Lapis & Gold** (defined once in `style.css`'s `:root`, everything else
    derives from it): a cool chalk ground (`--bg #ebeff6`, the accent at ~7% over white) with
    near-white reading surfaces (`--surface`, `--tt-paper`) lifted off it, navy-black ink
    (`--text #0e1a2b`), **lapis** `--accent #1d4f9b` for all structure and interaction (links,
    active nav, matrix cells, the Panthea beacon), and **gold** `--accent-2
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

**The top row of the home page's painting.** The site's palette now comes from Mondrian's
*Composition in Blue, Gray and Pink* (1913) — tokens `--t-*` in `style.css` (`--t-line` soft
charcoal, `--t-slate`, `--t-cream`, and a tint plus a deeper `-d` tint for each room: blue,
pink, ochre, sage), page ground `--bg` the painting's pale grey-blue. The author's painters are
Mondrian and Paul Klee: think from them for any colour or layout decision. The bar is thin
(`--nav-h` 40px, 36px scrolled), closed by a charcoal rule, and **hinged at its exact centre
on the mark** — the way home, in a wide cream cell of its own (`--mark-w`, `.nav-inner` is a
grid `1fr auto 1fr`, the mark the middle column) — which divides it into two fields that
cannot be mistaken for each other:

- **left: the site, painted** (`.nav-site`) — the four rooms' cells, **all one width**
  (`--room-w`) whatever their names, each **filled edge to edge with its own tint**
  (`.room-blue/-pink/-ochre/-sage`, set in `Base.astro` by `TINTS`), the chosen room in the
  deeper tint with a charcoal bar on its foot; charcoal lines between the cells, full height.
  Right-aligned against the mark, so the rooms and the mark never move from page to page.
  Left of the rooms, to the screen's edge, **one solid plane of lavender grey** (`.nav-paint`,
  `--t-lav`): calmer than any room's tint, and a broad plane answering the slate on the right.
  (A strip of many small planes there was tried and rejected as too busy.)
- **right: this page, a slate field** (`.nav-page`, the bar's background is ground on the left
  half and `--t-slate` on the right) — the trail in light grey, lavender chevrons, the current
  page in pale ochre, the TOC key in lavender. On the home, where there is no trail, it shows
  the site's name (`.nav-site-name`).

**Phones (<=760px)** — left-aligned: the mark's cell, the slate field, and a **burger** at the
end that brings the **sheet** (`.nav-sheet`, outside `<nav>`) down over the whole screen: the
home and the four rooms as planes of the painting, each in its tint, the current one deeper.
`setupNav()` in `site.js` wires it (`html.sheet-open`, Esc closes). There is no tab bar. Page
changes **crossfade** with the bar held still (`@view-transition`, Chrome only).

**The site home** (`src/pages/index.astro` + `public/css/home.css`) is one screen, one
painting in that 1913 manner: a seeded field of irregular planes generated at build time
(`compose()`), dense at the centre and fading at the edges, with reserved planes carrying the
page — the name and tagline, the four rooms (each in its tint, deepening and lifting on hover),
the contact links. Phones get their own taller composition with the same planes stacked.

- **The mark** is the site's one piece of identity: a graduated limb with a dot at the zenith,
  drawn at three sizes from the same geometry — `public/favicon.svg` (+ the two PNGs rendered
  from it), the nav mark (`markTicks` in `Base.astro`), and the home page's full instrument
  (72 graduations, `.home-plate` in `index.astro`). On the bar it is chalk with a gold zenith;
  its dial turns a quarter-turn across the page's scroll, plus a kick on hover.
- **The breadcrumb** carries the page's identity, **in every section**, as the **whole trail
  from the section root** (প্যান্থিয়া › ধাপ ৩ › তলা ২৫১; অনুবাদ › work › part). A **text page has
  no in-page title at all** — the name is in the bar and nowhere else. (An **index or listing
  page keeps its `h1`**.) Ancestors are quiet grey words, stepped apart by drawn
  chevrons; the current page is the **yellow cell** (`.nav-here` / `.nav-cur`),
  then — when the page has সূচি targets — a thin gold divider and the **সূচি** in light lapis;
  the whole gilt word opens the TOC. Ancestors bow out ≤1100px; the gilt word stays. Two
  **slots** let a section put its own controls in: `nav-crumbs` (Panthea's ধাপ key; it draws
  its own trailing `<NavChevron />`) and `nav-here` (must still contain `.nav-cur`).
- **One type size** for the whole bar (`--nav-fs`: 15px, 14.5px scrolled), all Tiro.
- **Heights.** `--nav-h` (40px) at rest, `--nav-h-min` (36px) once scrolled; `--nav-now` is
  the live one, switched by `.nav-tight` on `<html>`. Anything full-height beside the bar uses
  `var(--nav-now)`; anything that *sticks under* the bar uses `var(--nav-h-min)`. Never
  hardcode the nav height.
- **Scroll source.** Some pages lock the viewport and scroll an inner column instead. Mark
  that column `data-page-scroll` and the bar reads it (`.book-text-panel` does).
- **Type.** The chrome uses `--bn-display` (Tiro Bangla first), the page uses `--bn-font`
  (Noto Serif Bengali first). Tiro has one weight — never ask it for 500.
- **Mobile reading is one column site-wide**: every section's phone styles consume the
  `--m-read-pad` / `--m-read-fs` / `--m-read-lh` tokens from `style.css` — never restate the
  numbers. The margin is kindle-thin, **prose justifies, and a verse line never breaks**: on
  the collapsed one-column verse page the bn cells are `nowrap` and the fitter at the foot of
  `translation-table.js` sets `--verse-fs` (shrinking from `--m-read-fs`, floor 12.5px) so the
  page's longest line fits the screen. **Text precedes design on phones**: a trellis's essay
  sits above its matrix; `buildTOC` sorts targets by visual position.

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
  number grid. **`type: sonnet`** (Shakespeare, `public/translations/sonnets/<part>/<part>.md`,
  four parts ঊষা/দিবা/সন্ধ্যা/নিশা = sonnets 1–38/39–77/78–115/116–154, one dynamic route
  `src/pages/translations/sonnets/[part].astro`): a number in the `#` column opens a sonnet,
  blank rows inside it are the quatrain breaks; `buildSonnet` draws a centred gold numeral
  head row (`tr.sonnet-head`, the সূচি target, `॥ ১ ॥` on phones), the rhyme letters of the
  scheme (abab cdcd efef gg; 99 is 15 lines, 126 is 12) in the margin column, a stepped-in
  closing couplet, and **an empty বাংলা cell as a dotted leader** (`.bn-missing`) — a sonnet
  not yet translated stays in the file with its English and shows as a gap; a head with no
  Bangla is dimmed. `dictLang: 'en'` gives the শব্দকোষ Wiktionary English + Shakespeare's
  Words/Etymonline/OED. The text came from the author's Google Sheet "শেকস্পিয়ারের সনেটধারা"
  (one verse line per row; a verse line is **18 matras of matrabritta**, the English rhyme
  scheme reproduced in Bangla, register formal modern চলিত); the `.md` files are now the
  hand-edited source of truth. Renders the parallel table: Bangla · source · line-no (small, English
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
  `## Columns`/`## Rows`/`## Cells`; খোদা's file (`god/`) carries two — দার্শনিক and নবি — and
  the engine auto-splits them into the one `mountId`). **Every trellis is 7×7 and all Bangla**
  (Dhaka register; God is খোদা). **The diagonal is meaningful**: row *i*'s defining concern is
  column *i* (gold cells) — cut or add a row and its paired column together. **Uniform orientation: the header column
  (rows axis) is the subjects/persons/titles; the header row (cols axis) is the
  properties/events.** `essay` (`essay.md`) is rendered into `#essay-mount` if non-empty (its
  section auto-collapses when blank). Cells are keyed `### RC` where `R` = row index, `C` = col
  index. The essay is plain paragraphs (a `# Title`, one intro line, no subheadings) about what
  the grid *reveals*, and cites cells inline as `[words](#RC)` — `[words](#2-RC)` for the second
  matrix — which `renderEssay` turns into `a.cell-ref` links that open that cell's panel over
  the essay.

### The in-place editor (dev only)

On `npm run dev`, **Ctrl+click any text on any page** and it becomes editable where it stands:
a caret appears at the click and nothing else changes. **Ctrl+Enter** writes it back to its
source file and the page stays put (the dev server's reload is held back), **Esc** cancels,
Enter adds a line only inside a multi-line verse. One client, `src/dev/edit.js`, loaded by
`Base.astro` in DEV only; one integration, `inPlaceEditor` in `astro.config.mjs`, with two
endpoints. **Verses** (Translations, Pangea) go by `data-mdline`: the clicked cell, Bangla *or*
the source column (Pangea's English, OCR'd Bangla, a sonnet's English), is written into those
exact `.md` table lines. **Everything else** (essays, trellis panels, Panthea stories, text
written straight into an `.astro` page) is rendered back to Markdown (`*em*`, `**strong**`,
cell links via `data-ref`) and found once in the page's own sources, then in the site's
(`public/{translations,pangea,trellises}`, `src/{stories,pages,components,layouts,data}`);
several matches are refused unless exactly one is a whole line, heading label or quoted value.
None of it ships: no endpoint, no script and no `data-md` attribute in the production build.

## Page patterns

- **Translation page** — one `<BookReader title={…} work={…} …/>` (`src/components/BookReader.astro`) inside
  `Base` with `bodyClass="book-page"` and `styles={['/css/translation-table.css',
  '/css/book.css']}`. The component renders **only the poem**: the parallel table in its own
  scroll column (`data-page-scroll`) and the শব্দকোষ dictionary aside — no chapter head; the
  work's name lives in the menubar breadcrumb, the TOC behind the সূচি key. It loads
  `md-loader.js` + `translation-table.js` + `book.js` with the `config` prop as `TRANS_CONFIG`
  (`src`, `dict?`, `dictLang: 'la'|'it'|'fa'|'en'`, `meters?: { matra: [8,16], feet: true }`,
  `marginSections?`, `tocStyle?`, `toc`). Desktop is a two-pane reading room — the শব্দকোষ
  **folds** (its ×; a tab on the page's right edge reopens it) and **resizes** by dragging
  the seam (`.book-dict-grip`; double-click restores, ←/→ nudge), both remembered in
  localStorage by `setupPanelGeometry()` in `book.js`; below 900px the শব্দকোষ becomes a
  bottom sheet, and phones read the Bangla alone. A `dict` word-list may be **line-scoped**:
  a three-column row `| sonnet.line | bn | src |` pairs words within that one line only —
  rows carry `data-key="sonnet.line"` and `translation-table.js` aligns such a row from
  `window.TT_DICT_LINES[key]` alone (the Sonnets use this; the older works keep page-wide
  two-column lists). Editable in place on `npm run dev` (see *The in-place editor*). (`book-i-prose.md` beside the Metamorphoses source is an
  unrendered archive of the literal prose crib from the retired books workshop.)
- **Reading pages, common to all translations:** the page's title is its own again —
  `BookReader`'s `title`/`work` props render it: on a wide screen (>=1200px) upright in a
  narrow spine column at the text's left, under a short ochre bar, fixed while the poem
  scrolls; below that, compact at the top of the page. The menubar therefore drops the title
  on reading pages and keeps the trail and the contents key (`body.book-page .nav-cur` hidden).
  **Every page**, the home and every index included, ends with **one footer**,
  `src/components/SiteFoot.astro`, rendered by `Base.astro` as the last thing in `<body>`: a thin
  full-width slate bar at the very bottom — the author's name in English far left, the licence
  (© CC BY-NC-SA) far right, and in the middle three small cells: previous, back to the top,
  next (a page passes `footPrev` / `footNext` to `Base`; a missing one is dimmed). Never place it
  yourself. Its height is `--foot-h` (style.css): a page that holds itself to one screen (the
  home, the Panthea home, the reading room) subtracts it so the foot is always in view; on a
  scrolling page it closes the page, and on a short one it is pushed to the screen's bottom. No contents link (that is
  in the bar). Author and licence live in `src/data/site.js`; the trellises' order in
  `src/data/trellis-order.js`.
  The **dictionary panel starts folded on every visit** (only its width is remembered), and a
  sparing Mondrian runs down the screen's edges (`MondrianEdge`).
- **Numbers on reading pages** are in **Bangla digits** and always in the **same place, the
  margin column**: line numbers for works counted by line (Metamorphoses, Inferno), and a
  poem's own number (`.pnum`) beside its first line for works counted by poem (ghazals,
  sonnets — no head rows, no rhyme letters). On phones a poem's number rises above its first
  line as a centred ॥ number ॥. The gap between units — ghazal to ghazal, sonnet to sonnet,
  verse paragraph to verse paragraph — is one token, `--tt-unit-gap` (translation-table.css).
- **Pangea chapter** — empty `<table class="tt-table">` inside a centred `.pangea-page` (narrow
  blended column, no image panel); set `TRANS_CONFIG` (`noSource: true` for Bengali-only chapters);
  load `md-loader.js` + `translation-table.js`. The Alaol chapters use the dynamic route
  `src/pages/pangea/alaol-sapta-paykar/[chapter].astro` (`getStaticPaths` over
  `src/data/alaol-chapters.js`, whose `hasEn` flag drives `noSource`); prev/next/index footer nav
  is rendered from the chapter list. Three-level breadcrumb (chapter — সপ্ত পয়কর — প্যাঞ্জিয়া),
  no in-page title, and a সূচি for free from the `## headings` in the `.md` (a chapter with
  fewer than two of them simply gets no সূচি key).
- **Panthea** — **প্যান্থিয়া is the one name for the whole building** (no মিনার, no পাতাল in
  anything a reader sees). Seven ধাপ of exactly 100 floors each way, signed like the floors:
  ধাপ ১…৭ above the ground (তলা ১…৭০০), ধাপ −১…−৭ beneath (তলা −১…−৭০০), **no zero floor**.
  Floors are named word-first like the ধাপ: **তলা ২৫১**, **তলা −৫**. (`minar/` and `patal/`
  survive only as internal URL folders.) All geometry is `src/data/panthea-tiers.js` (load the `panthea` skill).
  **The home** (`src/pages/panthea/index.astro`) is only a navigator and exactly **one screen,
  never a scroll**: two halves of equal width on the bare page (no frames), meeting at the
  centre — the building in section on the left (`PantheaSection.astro`, `variant="map"`, with
  only a faint **scale of the cosmos** at its left: a slide rule in powers of ten, the human
  (1 m, exponent ০) at the ground, ২৭ at the summit (the observable universe), −২৭ at the nadir,
  a mirror held at the human, each ধাপ the same 27/7 of a power; only the exponents are written,
  small, every third power, under a lone log₁₀ — no words, no metres, no floor numbers. Hidden on
  phones. A ধাপ colour strip, a cubit scale and named ends (the Planck length) were tried and
  dropped. The lift paintings live in `src/data/lift-paintings.js`),
  and on the right the title প্যান্থিয়া over the pressed ধাপ as a **10×10 lift matrix**
  (cells touching, hairline-divided) (one row per decade, last digit
  fixed by column; hover a floor → its গল্প's title + synopsis in the caption beneath and a
  gold line at its true height on the building; press → that floor). **A floor page**
  (`PantheaFloor.astro`) is the story alone in one centred column, with the same section drawn
  small top-right as the only other thing (`variant="inset"`, your ধাপ outlined, your floor a
  gold hairline; pressing a ধাপ there opens the home on it, `/panthea/#t3`). The story is
  **pure Markdown** in `src/stories/panthea/{minar,patal}/<n>.md` (a পাতাল floor without the
  minus), rendered at build time; its frontmatter `title` / `synopsis` are what the home's lift
  shows, and a floor with a file is lit gold there. Missing file → the stub line. Conventions:
  first paragraph = lede, `*…*` inside a heading = small tag, `>` blockquote = coda; the
  container's `data-toc-scan="h2, h3"` is Panthea's whole সূচি. The breadcrumb reads
  `প্যান্থিয়া › [↑ ধাপ ৩ ↓] › [↑ তলা ২৫১ ↓]` — the ধাপ word drops the floor grid, its arrows cross ধাপ,
  the gilt word's arrows step one তলা, ctrl+↑/↓ rides; the home is the roof, with a single ↓.
- **Trellis** — the whole page is `<TrellisPage title="…" />` (`src/components/TrellisPage.astro`):
  a `.trellis-hero` holding `#trellis-mount` and a প্রবন্ধ ↓ cue, then
  `.trellis-essay > #essay-mount`, with `TRELLIS_CONFIG` set and `trellis.js` loaded. No in-page title. **On desktop the matrix is the hero**: exactly one
  screen under the bar at rest (`100svh - --nav-h`), full width, the grid's cells sized by JS
  (`fit` → `--fs-cell-w/-h`, the same arithmetic as pseudo-fullscreen) so the 7×7 fills it; the
  essay is one scroll below. **A file with several matrices becomes a slider** in the hero
  (`.mx-slider`: tabs named by each `# Title`, ‹ › and ←/→, a scroll-snap track so swipes and
  the সূচি's scrollIntoView work natively; phones turn it by the tabs only). Each matrix's
  `# Title` is its সূচি label; `h2.matrix-title` is no longer drawn. Phones keep reading-first
  (essay above, natural-size grid after).
- **The Trellises index** (`src/pages/trellises/index.astro`) carries no instructions: under
  its `h1` a one-line description, and a key that slides open a reading panel (from the
  right; full screen on phones) with the fuller account of the idea, philosophy and poetry of
  the 7×7 trellises. Both come from `src/stories/trellises/about.md` — frontmatter `lede`
  (the one-liner), `more` (the key's label), `title` (the panel's heading), then plain
  paragraphs.
- **Section pages are paintings** (`src/components/Painting.astro` + `public/css/painting.css`):
  each section's index is composed after one painting, fixed as the page's background — Pangea
  after Mondrian's *Composition with Large Red Plane, Yellow, Black, Gray and Blue* (1921), the
  Translations after *Composition with Red, Blue and Yellow* (1930), the Trellises after Klee's
  *Castle and Sun* (1928, a seeded mosaic), the Panthea home with a faint *Broadway Boogie
  Woogie* behind its navigator. The content is **not** spread over the planes (a section will
  hold dozens of works): it is a **list in one long white plane of the painting** (the sheet,
  `sheet: { d: [x, w], p: [x, w] }`), bounded by the painting's lines, scrolling over the still
  painting; each entry wears a small block of one of the painting's colours (`--m`). A new
  work is one more `<li>` — or, for data-driven lists, one more entry in the data file.
  **Every index page does this**, the works' own indexes too: their paintings live in
  `src/data/compositions.js` (Metamorphoses after the 1921 *Large Blue Plane*, the Divan after
  *Composition with Yellow, Blue and Red*, the Sonnets after *Composition No. 10*, the Divine
  Comedy in three zones red/grey/blue-gold, Alaol's *Sapta Paykar* in its seven pavilion
  colours, each day's chapter wearing its pavilion's colour). Reading pages with a centred
  column (Pangea chapters, Panthea floors) carry a sparing Mondrian at the screen's edges
  (`src/components/MondrianEdge.astro`, wide screens only).
- **Fonts:** every Bangla word is **Noto Serif Bengali** (`--bn-font`, `--bn-display`; every
  Latin stack carries it too); the menubar alone is **Tiro Bangla** (`--bn-bar`). Anek Bangla
  and Galada were tried and rejected. The author would like *Charukola* (Chandan Acharja,
  Charu Chandan) for the bar, but its web copy is licensed for preview and print only: use it
  only once he has the designer's permission.
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
