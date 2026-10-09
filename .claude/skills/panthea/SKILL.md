---
name: panthea
description: The complete design of Panthea — the Bengali epic's world (island, 700-floor tower minar, 700-floor underworld patal, seven dhap of 100 floors each way, no zero floor), its canonical geometry, and how every /panthea/ page is built (the one-screen home navigator with its lift panel, the centred story pages with the section inset). Load before touching anything under src/pages/panthea/, src/components/Panthea*.astro, src/data/panthea-tiers.js, src/stories/panthea/, or public/css/panthea.css — or when asked about Panthea's floors, tola, dhap, the section drawing, the lift, the inset, the elevator ride, or the floor-grid box.
---

# Panthea

The published section of the Panthea epic on kmbasad's site, at `/panthea/`. Bengali
throughout; this document is the English design record.

> This file is **working documentation, not site content**. It lives outside `src/` and
> `public/`, so it is never served.

**Design rules the author has laid down (2026-10-09), all binding:**
- **No boxes, ever.** No panels, cards, frames or bordered stages around content; each page is
  one thing on the background, regions separated by space alone.
- **One type scale per page.** Never huge headings beside tiny labels.
- **Nothing written on the building.** The section drawing carries no labels on or along the
  structure — only the one scale (exponents only) in its left margin. No sky, sea, island or rock around it: just
  the building on the bare page. No decorative marks that mean nothing (no beacon dots, no
  strata lines).
- **Beauty first, modern, immersive** — and always check it in Chrome before reporting.

---

## 1. The world

An island alone in the open ocean. From its navel one building, **প্যান্থিয়া**, rises 700 floors (2.8 km)
and descends 700 more straight beneath the ground (2.8 km). **There is no zero
floor**: তলা ১ stands on the ground, তলা −১ hangs directly beneath it.

The mirror is exact **in height** (4 m a floor both ways) and **not** in plan: the tower is a
flared spire, the underworld a flask. Above, the shape is set by wind; below, by rock. Never
flatten that asymmetry.

**Naming.** **প্যান্থিয়া is the one name for the whole building** — never call its parts
মিনার or পাতাল in anything a reader sees (those words survive only in code: `kind`, the URL
folders `minar/` `patal/`, comments). Seven **ধাপ** (`SEG_WORD`) each way, each exactly **100
floors**, so every ধাপ's lift is 10 × 10, and the ধাপ are **signed like the floors**: ধাপ ১…৭
above the ground, ধাপ −১…−৭ beneath. Floors are named word-first: **ধাপ ৩ · তলা ২৫১**, and
below **ধাপ −১ · তলা −৫** (Unicode minus `MINUS`). Ranges read `তলা ২০১ থেকে ৩০০`. The ধাপ carry
only their numbers; name one only when the author gives the name (`TOWER_NAMES` /
`PATAL_NAMES`). The author's word for a story is **গল্প** (never কাহিনি). The old স্তর,
গ্রাউন্ড / bhumi / ground zero, the 14 segments and the 1000-floor building are **retired**.

---

## 2. Canonical geometry — `src/data/panthea-tiers.js`

The single source of truth: every drawing, label and the elevator ride derive from it. Never
hardcode a number it exports.

| constant | value | meaning |
|---|---|---|
| `SEG_COUNT` × `SEG_FLOORS` | 7 × 100 | → `TOWER_FLOORS` = `PATAL_FLOORS` = 700 |
| `TOWER_FLOOR_M` / `PATAL_FLOOR_M` | 4 m | → 2800 m each way |
| `CORE_DIAMETER_M` | 60 m | the spine, constant summit to nadir |
| `TIP_DIAMETER_M` | 100 m | 60 + 2 × 20 m gallery — both extreme ends |
| `MINAR_BASE_M` | 1120 m | the tower's foot (1 : 2.5 against its height) |
| `WELL_MOUTH_M` | 420 m | the mouth through the crust, under the tower |
| `PATAL_BELLY_M` / `_DEPTH_M` | 980 m at 420 m | its widest floors |
| `ISLAND_DIAMETER_M` / `_SHORE_M` | 2100 / 140 m | the island (not drawn any more) |
| `MINAR_TAPER` / `PATAL_TAPER` | 1.6 / 1.8 | power-curve exponents |

When the building shrank from 1000 floors to 700, every plan dimension but the spine and tip
was scaled by 0.7, so proportions and the drawn shape are unchanged. `diameterAt(kind, m)`
gives the envelope at any distance from the ground; `floorDiameter`, `floorMetres` per floor.

**The level axis.** One number, `+700 … +1, −1 … −700` — no zero. `levelKind`,
`levelFloor`, `levelOf`, `levelHref`, `levelTitle` (`তলা ২৫১`), `levelNum` (`২৫১` / `−৫`),
`levelSegment`. **All stepping goes through `levelAdd(l, n)`**, which skips the missing zero
and clamps: that is what lets ↑/↓ and the ride pass from +1 to −1. `l > LEVEL_MAX` is the
roof, `/panthea/` (the home).

**The section drawing's mapping** (`GLYPH`, `glyphY`, `glyphHalf`, `glyphOutline`): height true
and equal both ways (2800 m = 210 units each side, `Y_SUMMIT` 40 → `Y_GROUND` = `Y_MOUTH` 250 →
`Y_NADIR` 460); width exaggerated by `SECTION_WIDEN` = 1.6 so the spire stays a spire.

---

## 3. Routes

| route | source |
|---|---|
| `/panthea/` | `src/pages/panthea/index.astro` — the navigator |
| `/panthea/minar/<1–700>/` | `minar/[floor].astro` → `PantheaFloor` |
| `/panthea/patal/<1–700>/` | `patal/[floor].astro` → `PantheaFloor` (the number without its minus) |

`/panthea/#t3` / `#u5` opens the home on that ধাপ (`t` = above the ground, `u` = beneath it).

---

## 4. The section — `src/components/PantheaSection.astro`

The building and nothing else, summit to nadir: the tower in glass (cylinder-shaded per ধাপ,
a ten-floor line texture, hazing with height), the part beneath the ground in stone darkening with depth and lit
the same way, a darker seam at every ধাপ boundary, the spine through all of it. **One drawing,
two sizes:**

- `variant="map"` — the home's left half, with **one scale in its left margin, the scale of
  the cosmos**: a slide rule in powers of ten (a tick at every power, finer ticks at 2…9 within
  each so it reads logarithmic at a glance, a longer tick at each ধাপ seam). The ground is the
  human, 1 m (exponent ০); the summit 10^27 m, the observable universe; the nadir 10^-27 m, by
  the same twenty-seven powers: a mirror held at the human, who stands at its exact centre
  (Pascal's two infinities). Each ধাপ is 27/7 of a power (about ×7,200). **Only the exponents are
  written** (০, ±৩ … ±২৭, haloed in the page's ground so they read over the painting) under a
  lone *log₁₀* — no words, no `10^`, no metres or floor numbers. It sits well out from the
  building (the svg is `overflow: visible`) and is hidden on phones. Its font is in drawing
  units, re-reckoned by the home's script from the drawn height (`--pn-unit-fs`). Rejected:
  the Planck length at the bottom (not observable, and breaks the symmetry), named ends, a metre
  ruler, a তলা scale, a cubit scale, a ধাপ colour strip. A gold bracket marks the chosen ধাপ;
  the gold `.pn-probe` line marks the hovered floor.
- `variant="inset"` — a floor page's corner, bare, with your ধাপ outlined (`.pn-here`) and your
  floor a gold hairline (`.pn-hair`).

Each ধাপ is an invisible `polygon.pn-band` (`data-world`, `data-index`, `data-key`,
`data-y0`/`y1`) that shows itself on hover. The svg uses `preserveAspectRatio="xMidYMid
slice"`: on a narrow column it gives up its margins, never its height.

---

## 5. The home — one screen, never a scroll

Two halves of **equal width** on the bare page, no frames, meeting at the centre line (the
building against the inner edge of its half, the lift opening from the inner edge of its own).
On phones the halves are 26 : 74 and the matrix is still 10 × 10 (its numbers below the ground
drop their minus there; the heading says ধাপ −n).

**The lift** (right half): the title **প্যান্থিয়া**, the ধাপ (`ধাপ −২`, gold) and a meta
line; then a **true 10 × 10 matrix** — square cells touching, divided only by hairlines
(the grid's 1px gap over a hairline ground) — one row per decade, the last digit's column
fixed, highest row on top above the ground, shallowest on top beneath it; then the caption.
Touched, a cell lights lapis from within, its number white, and lifts a hair; a floor with a
গল্প is lit gold. Choosing a ধাপ lights the numbers in a wave the way the building runs (up
above the ground, down beneath it) — only the numbers animate, never the cells' paper. Hover → the caption tells the floor (`তলা ২৫১`), its গল্প's
title and synopsis, and the probe line appears on the building; press → that floor (on touch:
first press reads, second goes). Keys: ↑/↓ walk the ধাপ, ctrl+↓ drops to তলা ৭০০, Esc clears.

Story data: build-time glob of `src/stories/panthea/**.md` frontmatter (`title`, `synopsis`)
into a JSON script tag `#pn-stories`, keyed by level.

---

## 6. A floor page — `src/components/PantheaFloor.astro`

The story alone, centred (`.pn-page`, 680px column), and the section inset fixed top-right —
on screens under 1000px it floats into the column's corner and the text runs round it.
Pressing a ধাপ in the inset goes to the home on that ধাপ.

**All chrome is the breadcrumb**, in the page's (gold) half of the lapis bar:
`প্যান্থিয়া › [↑ ধাপ ৩ ↓] › [↑ তলা ২৫১ ↓]`. The ধাপ word (with its colour
dot) drops the floor-grid box (`.pn-floors--drop`, fixed-positioned under it by `place()`,
a bottom sheet on phones); its arrows cross to the neighbouring ধাপ's nearest floor. The gilt
word's arrows step one তলা; `.nav-cur` holds `তলা ২৫১` (the full name). Arrows are light-lapis
glyphs (`--bar-lapis`) with a soft disc on hover — no frames. The home is the roof: gilt word প্যান্থিয়া with a
single ↓.

**The elevator ride** (ctrl+↑/↓): one tap steps a floor; hold and the car accelerates to ~120
floors a second, straight from তলা ১ to −১, scrubbing in place — `.nav-cur`, the ধাপ word and
its arrows, the inset's lit band and hairline — from the same exported functions the build
used; only the floor you release on is navigated to. The floor-grid chips rebuild only when
the ধাপ changes.

**Story text**: pure Markdown, `src/stories/panthea/{minar,patal}/<n>.md`, rendered at build
time; frontmatter `title` + `synopsis` feed the home's lift. Missing file → `এই তলার গল্প এখনো
লেখা হয়নি।`. First paragraph = lede; `*…*` inside a heading = small tag; `>` = coda. The
container's `data-toc-scan="h2, h3"` is Panthea's whole সূচি. Editable in place on
`npm run dev` (Ctrl+click), like every text on the site.

---

## 7. Files

| file | role |
|---|---|
| `src/data/panthea-tiers.js` | geometry, ধাপ, level axis, section mapping |
| `src/components/PantheaSection.astro` | the building in section, both sizes |
| `src/pages/panthea/index.astro` | the home: section + lift + its script |
| `src/components/PantheaFloor.astro` | every floor: story, inset, breadcrumb keys, ride |
| `src/pages/panthea/{minar,patal}/[floor].astro` | thin route wrappers |
| `public/css/panthea.css` | all Panthea styling (`--pn-t1…7`, `--pn-u1…7` ধাপ colours) |
| `src/stories/panthea/**.md` | the গল্প |

## 8. Working rules

- **Derive, never hardcode** — if `panthea-tiers.js` has the number, compute from it.
- **Verify in Chrome** (the claude-in-chrome tools against `npm run dev`, or headless
  `google-chrome --screenshot`), at desktop, laptop (1366×768) and phone (390×844), before
  reporting. The home must never scroll at any of them.
- **Bengali numerals** in all user-facing text (`toBn`, `levelNum`); Latin digits only in code.
- **তলা, not তল**; **গল্প, not কাহিনি**; **ধাপ, not স্তর**.
