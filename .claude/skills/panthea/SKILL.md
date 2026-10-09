---
name: panthea
description: The complete design of Panthea — the Bengali epic's world (island, 1000-floor tower minar, 1000-floor underworld patal), its canonical geometry and numbered segments (names come with the stories), and how every /panthea/ page is built. Load before touching anything under src/pages/panthea/, src/components/PantheaFloor.astro, src/data/panthea-tiers.js, src/stories/panthea/, or public/css/panthea.css — or when asked about Panthea's floors, tola, stor, segments, the maps, the floor plan, the elevator ride, or the floor-grid box.
---

# Panthea

The published section of the Panthea epic on kmbasad's site, at `/panthea/`. Bengali
throughout; this document is the English design record.

> This file is **working documentation, not site content**. It lives outside `src/` and
> `public/`, so it is never served and never appears on the webpage.

---

## 1. The world

An island alone in the open ocean. From its navel a thousand-floor tower (**মিনার**) rises
four kilometres into the air, and through its rock a thousand-floor underworld (**পাতাল**)
descends four kilometres. Between them, at sea level, one threshold: **গ্রাউন্ড**, floor zero.

The mirror is exact **in height**: tower floor *n* sits 4n m up, patal floor *n* sits 4n m
down — floor for floor, boundary for boundary, fourteen segments each way. The mirror is
**not** exact in plan: the tower is a flared spire, the underworld a flask. Above, the shape
is set by wind; below, by rock. That asymmetry is the world's central architectural idea and
should never be flattened.

2001 stops on one vertical axis, +1000 to −1000, with the roof (the Panthea home page) one
step above the top.

---

## 2. Canonical geometry

**`src/data/panthea-tiers.js` is the single source of truth.** Every drawing, caption, page
header and browser-side redraw derives from it. Never hardcode a dimension that this file
already exports — that is how the map and the captions drift apart.

| constant | value | meaning |
|---|---|---|
| `TOWER_FLOORS` / `PATAL_FLOORS` | 1000 | floors each way |
| `TOWER_FLOOR_M` / `PATAL_FLOOR_M` | 4 m | → `TOWER_HEIGHT_M` / `PATAL_DEPTH_M` = 4000 m |
| `CORE_DIAMETER_M` | 60 m | the spine — constant, summit to nadir |
| `CORE_GALLERY_M` | 20 m | minimum landing ring around the core |
| `TIP_DIAMETER_M` | 100 m | 60 + 2×20 — both extreme ends |
| `MINAR_BASE_M` | 1600 m | tower envelope where it meets ground |
| `ISLAND_DIAMETER_M` | 3000 m | the island, at the waterline |
| `ISLAND_SHORE_M` | 200 m | shore ring → flat crown is 2600 m |
| `WELL_MOUTH_M` | 600 m | the পাতাল's mouth through the crust |
| `PATAL_BELLY_M` | 1400 m | its widest floors … |
| `PATAL_BELLY_DEPTH_M` | 600 m | … at this depth |
| `MINAR_TAPER` | 1.6 | power curve exponent, up |
| `PATAL_TAPER` | 1.8 | power curve exponent, down |

`diameterAt(kind, m)` returns the envelope diameter at any distance from the ground plate.
Every silhouette on the site walks this one function.

### Why these numbers

1. **The spine sets the tips.** One 60 m drum runs the whole 8 km, holding 24 ropeless
   maglev guideways in a ring (12 climbing, 12 falling, ~20 m/s, ~7 minutes end to end)
   around a 16 m pressurised column of stairs, air, water and power. It never tapers — it is
   the datum the two worlds hang on, and the only thing touching all 2001 floors. Both ends
   close at 100 m because the core plus a 20 m walking gallery is the least a floor can be
   and still be a floor. That is the one plan dimension the two worlds share.
2. **Above, the limit is wind, not weight.** At 4 km, high-strength concrete would need a
   base only ~1.8× the crown's area to carry the load; overturning is the real constraint.
   Hence the 1600 m base (1 : 2.5 against height) and a p = 1.6 power curve — a flared root,
   a long gentle spire, and a continuously changing diameter so wind never settles into one
   vortex-shedding frequency. The wide lower plates read as **rings and light-wells, not
   slabs**: no habitable room sits 800 m from a window.
3. **Below, the limit is rock.** ~106 MPa of vertical stress at 4 km. The well is only 600 m
   because the tower's foundation ring must land on solid ground outside it, and because a
   mouth that size still drops daylight into the patal's upper floors. It swells to a 1400 m belly at 600 m
   depth — where rock is strong and unloaded — then tapers as stress climbs. A flask, not a
   cone.
4. **The island is wider than the tower's foot, deliberately.** 3000 m against 1600 m: a base
   that size needs solid ground with room to spare, and the surplus ring is where the
   jetties and docks are. Because the ground plate is drawn at the island's full width, it
   necessarily overruns the 1600 m dimension bracket — so **both figures are labelled
   separately** (`দ্বীপ ৩০০০ মিটার` set inside the plate, `ব্যাস ১৬০০ মিটার` bracketed below),
   or the plate reads as a drawing error. The island is widest at the waterline and tapers
   away from it in both directions by the shore ring.

---

## 3. The twenty-eight segments

`SHARES = [100, 95, 90, 85, 80, 75, 75, 70, 70, 65, 60, 50, 45, 40]` — sums to 1000, no
segment over 100 floors, tapering toward the extremes because higher/deeper floors are
smaller and need fewer of them to read as a neighbourhood. The same spans run both ways,
counted outward from গ্রাউন্ড.

**The segments are unnamed (2026-10-09).** Each one is only its number — `bn` is
`স্তর <n>` and the slug is positional (`t1…t14` up, `p1…p14` down). The author is writing
the stories afresh and the segments will be **named gradually as the stories name them**;
add a name only when he gives it, and then only to that one segment (in `TOWER_NAMES` /
`PATAL_NAMES` in `panthea-tiers.js`). The earlier mythic-loanword names, their glosses and
epithets, and the old private workshop are **retired, not to be revived**.

| # | floors | metres (up / down) | ব্যাস up | ব্যাস down |
|---|---|---|---|---|
| 1 | 1–100 | 0–400 | 1600 → 1367 | 600 → 1293 |
| 2 | 101–195 | 400–780 | 1367 → 1160 | 1293 → 1279 *(belly 1400 at 600)* |
| 3 | 196–285 | 780–1140 | 1160 → 977 | 1279 → 1052 |
| 4 | 286–370 | 1140–1480 | 977 → 816 | 1052 → 858 |
| 5 | 371–450 | 1480–1800 | 816 → 676 | 858 → 694 |
| 6 | 451–525 | 1800–2100 | 676 → 556 | 694 → 556 |
| 7 | 526–600 | 2100–2400 | 556 → 446 | 556 → 435 |
| 8 | 601–670 | 2400–2680 | 446 → 355 | 435 → 337 |
| 9 | 671–740 | 2680–2960 | 355 → 274 | 337 → 254 |
| 10 | 741–805 | 2960–3220 | 274 → 210 | 254 → 192 |
| 11 | 806–865 | 3220–3460 | 210 → 161 | 192 → 147 |
| 12 | 866–915 | 3460–3660 | 161 → 129 | 147 → 121 |
| 13 | 916–960 | 3660–3840 | 129 → 109 | 121 → 105 |
| 14 | 961–1000 | 3840–4000 | 109 → 100 | 105 → 100 |

Note the belly falls **inside পাতাল segment 2**, so Panthea's widest floors are underground,
not up the tower.

---

## 4. The level axis

One number, `+1000 … 0 … −1000`, is what lets a ride cross গ্রাউন্ড without a special case.

- `levelKind(l)` → `'minar' | 'bhumi' | 'patal'`; `levelFloor(l)` → `Math.abs(l)`
- `levelOf(kind, floor)`, `levelHref(l)`, `levelTitle(l)`, `levelSegment(l)`
- `l > LEVEL_MAX` → `/panthea/` — **the home page is the roof**, one step above তলা ১০০০

---

## 5. Routes

| route | source |
|---|---|
| `/panthea/` | `src/pages/panthea/index.astro` — the two section maps |
| `/panthea/bhumi/` | `src/pages/panthea/bhumi.astro` → `PantheaFloor` |
| `/panthea/minar/<1–1000>/` | `src/pages/panthea/minar/[floor].astro` → `PantheaFloor` |
| `/panthea/patal/<1–1000>/` | `src/pages/panthea/patal/[floor].astro` → `PantheaFloor` |

~2001 statically generated pages.

---

## 6. Page anatomy — shared by home and floors

Both use the identical two-panel shell. Do not let them drift apart.

```
.pn-wrap                 grid: minmax(320px,720px) | minmax(0,1fr)
├─ .pn-right             col 1 — the story. Carries the divider hairline.
└─ .pn-left              col 2 — the design panel. Sticky, height-locked,
                         overflow hidden: it NEVER scrolls, and everything
                         inside is sized to fit entirely within it.
                         └─ .pn-views   the panel's own view keys, overlaid
                                        along its foot when it has >1 view
```

Two panels and nothing else. The design panel never scrolling is a hard rule — the maps,
overlays and glyph must all be sized to fit, not scrolled to.

**There is no bar under the menubar.** `.pn-topbar` / `.pn-titlebar` / `.pn-designbar` are
gone: a second menubar under the first was saying what the breadcrumb could say. Do not
reintroduce one.

### All of Panthea's chrome is the breadcrumb

A floor page reads **`[↑ স্তর ↓] › [↑ number ↓]`** (প্যান্থিয়া itself is not drawn — `Base.astro`
filters the section root out of every ladder on the site, since the left cluster already
carries it):

- **The স্তর key** (`.pn-seg-key` inside `.pn-key-group`) wears its স্তর's colour chip and name
  and drops the glass floor grid (§9). Its two arrows cross the স্তর's own boundary — one press
  lands on the nearest floor of the neighbouring স্তর, so they are exact inverses. Worked in
  level space, which makes মিনার and পাতাল the same sum. On গ্রাউন্ড the whole crumb is
  **hidden, not removed** (`.pn-seg-crumb.pnf-off`) — the ride crosses গ্রাউন্ড in place and has
  to bring it back.
- **The gilt key** holds `↑ .nav-cur ↓`: the arrows step one তলা, and `.nav-cur` is the **bare
  number** — the স্তর beside it already says which world you are in. `navTitle` still gets the
  full `তলা ৫০০`, so the tab title reads properly; only the drawn key is bare.
- **Both arrow pairs are lapis, full-height and wide.** They are the way through 2001 pages;
  they must stay easy to hit, not whispered in grey.
- The floor grid is **fixed-positioned and hung under the স্তর key by JS** (`placeSeg`), because
  `.nav-page-info` clips its overflow. It re-places on scroll and resize, and closes when the
  car moves.
- **No Panthea সূচি button.** The story container carries `data-toc-scan="h2, h3"` and the
  site-wide সূচি in `site.js` builds the menu into the gilt key. No headings → no সূচি key,
  which is every floor's state until its Markdown is written. Do not reintroduce a local TOC.

**The home is the roof**, and gets the same gilt key — `প্যান্থিয়া` with a single ↓ to তলা ১০০০
and no ↑. Its two maps are the design panel's two views, so their keys float over the map's
foot in `.pn-views`; a floor panel has one view and renders none.

**The home's story panel is currently empty** — `src/stories/panthea/index.md` does not
exist, so it renders the same stub every unwritten floor shows. The panel itself stays;
the home is structurally identical to a floor page.

---

## 7. The home page maps

Two SVG slides in `.pn-slider` (`data-active` 0/1), tabs in the design bar.

- `viewBox="0 0 560 620"`, `CX = 280`
- **One scale for both maps**: `U = 116 / (MINAR_BASE_M / 2)` units per metre of radius, so
  no silhouette can drift from the printed diameters
- Tower: `T_BASE = 540` (sea) → `T_TOP = 48` (summit). Patal: `P_TOP = 78` → `P_BOT = 566`
- Metre scale in the left gutter, তলা scale at the far right, segment numbers set between the
  boundary lines hugging the slope
- Each of the 14 bands is a polygon walked along the real profile (12 samples), tinted
  `pn-band-t1…14` / `pn-band-u1…14`, and is itself the hover/click target
- The spine is drawn as one rect the full height; a beacon dot at the crown, a nadir dot below
- Ground plate: island width with the shore bevel; on the পাতাল slide the well's mouth is cut
  out of its middle (two polygons). Clicking it goes to `/panthea/bhumi/`
- Dimension brackets at both extreme ends; the island's own figure sits **inside** the plate
  (the plate's edges are its end serifs) — see §2.4

---

## 8. The floor page design panel

- **`.pnf-circle`** — the plan. `viewBox="0 0 1000 1000"`, `PLAN_R = 496`. The envelope circle
  is the **same size on every page**; what changes is the core circle inside it, drawn to that
  floor's own scale. So the core is a speck on the ground plate and nearly fills the crown —
  the drawing itself tells you how high you are. গ্রাউন্ড additionally shows the well's mouth.
- **`.pnf-locator`** — the side glyph, `viewBox="0 0 300 500"`, constants in `GLYPH`. Both
  silhouettes traced from the same profile, the segment band tinted, the floor a bright
  hairline, the spine running through. The sea line spans the full frame; the গ্রাউন্ড band is
  drawn at `MINAR_BASE_M` (1600 m) because it is the গ্রাউন্ড *floor's* own diameter, matching
  the ব্যাস caption. The 3000 m island is **not** drawn here — the inset is too narrow to carry
  it without shrinking the tower it exists to locate you in.
- **`.pnf-diameter`** — `ব্যাস N মিটার`, the well-mouth line on গ্রাউন্ড only, and a scale bar of
  fixed length worth a different number of metres on every floor. Its value is re-measured
  from the real rendered width on load and on resize (`ResizeObserver`), because the panel's
  drawn size depends on the viewport.

---

## 9. The floor-grid glass box

**One box with two homes.** Everything visual lives in `.pn-floors`; the modifiers say only
where it is anchored. Keep it that way — home and floor pages must not have separate boxes.

- `.pn-slider .pn-floors` — pinned into the map's corner. মিনার top-left, পাতাল bottom-left,
  each anchored on the side its world runs away from. The anchored edge stays put; the free
  edge moves with the row count.
- `.pn-floors--drop` — dropped from the স্তর key in the menubar breadcrumb. Anchoring and
  z-index only: `position: fixed`, placed under the key by `placeSeg()` in the component,
  because `.nav-page-info` clips its overflow.

**Sizing is derived, not chosen.** Width `432px`; with `box-sizing: border-box` that is
432 − 2 border − 24 padding = **378px of grid**, which takes exactly **ten 36px columns +
nine 4px gaps** and cannot take an eleventh. Ten columns is what makes a 100-floor segment
exactly ten rows with no orphan. Height is `auto`, so the box is as tall as its rows.

Two traps, both hit once already:

1. **The track minimum must be 36px.** `১০০০` is the only four-digit chip on the site (the summit
   and nadir segments only) and needs 36px; a 34px track left it hanging outside its column.
2. **`.pn-chips` must name both overflow axes** (`overflow: hidden auto`). A lone
   `overflow-y: auto` promotes the still-`visible` x axis to `auto`, and then a fraction of a
   pixel of grid rounding hangs a horizontal scrollbar under the numbers.

`.pn-chip-here` lights the floor you are actually on.

**The স্তর key** (`.pn-seg-key`, in the breadcrumb — §6) sits between its two স্তর-stepping
arrows wearing its segment's colour chip and name. On গ্রাউন্ড the whole crumb is hidden, not
removed — the elevator crosses গ্রাউন্ড in place and must be able to bring it back.

---

## 10. The elevator ride

`ctrl+↑` / `ctrl+↓`. One tap steps a floor; hold and the car accelerates from a floor every
140 ms up to ~120 a second, running straight through গ্রাউন্ড into the other world. A page load
per floor would be unridable, so **the ride is scrubbed in place**: the name in the menubar
breadcrumb (`.nav-cur` — one `textContent` write, which is all it can afford at that speed;
`body.pn-riding` turns it lapis), the plan's core and well, the dimensions, the locator's band
and hairline, and the স্তর key with its arrows and floor grid all redraw from the same exported
functions the build used. Only the floor you release on is actually navigated to.

Because a floor rendered at build time and a floor scrubbed to in the browser must land on
identical geometry, the glyph's constants and mappings live in `panthea-tiers.js`, not in the
component.

Performance rule: the 100 chips rebuild **only when the segment changes**; the here-mark moves
every step. At 120 floors a second there is no redrawing that list per step.

---

## 11. Story text

Pure Markdown in `src/stories/panthea/`, rendered at build time — never at runtime.

- `index.md` (home), `bhumi.md`, `minar/<n>.md`, `patal/<n>.md` — **all optional**
- Missing file → the empty stub line, which is the current state of every page including home
- Conventions instead of HTML: first paragraph is the lede; `*…*` inside a heading is the
  small floor-range tag; a `>` blockquote is the italic coda
- `h2`/`h3` become the page's সূচি entries — the container carries `data-toc-scan="h2, h3"`
  and `site.js` stamps them, dropping the `*…*` tag from the menu label (§6)
- Styled in `public/css/panthea.css` under `.pn-story` / `.pn-prose`

**Dev-only in-browser editing** (`pantheaEditor` in `astro.config.mjs` + `src/dev/panthea-edit.js`):
on `npm run dev`, Ctrl+double-click a story panel to open its Markdown in place at the clicked
paragraph; Ctrl+Enter saves to disk and reloads at the same spot; Esc cancels. **None of it
ships** — no endpoints, no `data-md` attribute, no editor script in the production build.

---

## 12. Files

| file | role |
|---|---|
| `src/data/panthea-tiers.js` | **single source of truth** — geometry, segments, level axis, glyph constants |
| `src/pages/panthea/index.astro` | home: both maps, the slider, the 28 floor-grid boxes |
| `src/components/PantheaFloor.astro` | every floor page: plan, locator, the breadcrumb keys, the ride |
| `src/components/NavChevron.astro` | the drawn chevron every breadcrumb step is set apart by |
| `src/pages/panthea/bhumi.astro`, `minar/[floor].astro`, `patal/[floor].astro` | thin route wrappers |
| `public/css/panthea.css` | all Panthea styling |
| `src/stories/panthea/**.md` | the prose |
| `src/dev/panthea-edit.js` + `astro.config.mjs` | dev-only editor |

---

## 13. Working rules

- **Derive, never hardcode.** If a number exists in `panthea-tiers.js`, compute from it. Magic
  numbers in the drawings have already caused three separate bugs (a ground plate 2621 m wide
  that matched nothing, a glyph bar at 1778 m contradicting its own 1600 m caption, and the
  scrollbar above).
- **Verify visually.** These are drawings; arithmetic alone has been wrong more than once.
  Headless Chrome is available (`google-chrome --headless --screenshot`) — building a small
  harness that pulls the real CSS and the real built markup catches what reasoning misses.
- **Bengali numerals** in all user-facing text (`toBn`); Latin digits only in code.
- **তলা, not তল.**
- The design panel never scrolls; the floor-grid box never gets a horizontal scrollbar.
- Home and floor pages share their shell, their box, and their story mechanism. Changes to one
  should be made in the shared rule, not duplicated.
