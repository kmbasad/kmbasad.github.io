// প্যান্থিয়া — the name of the whole construction: an island in the open sea,
// a 700-floor mountain-tower (মিনার, 2.8 km high) rising from it, its ১ তলা on
// the ground, and a 700-floor underworld (পাতাল, 2.8 km deep) mirrored straight
// beneath it from −১ তলা down. There is no zero floor. The section is an exact reflection in *height*: tower floor
// n sits at 4n metres up, patal floor n at 4n metres down — floor for floor,
// boundary for boundary. In *plan* the two worlds are not twins; see the
// geometry note below.
//
// Both worlds are divided into seven ধাপ of a hundred floors each. The segments carry only
// their numbers for now; they will be named as the stories are written.
//
// This file is the single source of truth: the map-TOC SVGs on /panthea/, the
// floor routes (/panthea/minar/[floor], /panthea/patal/[floor])
// and the floor-page headers all derive from it.

export const bnDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
export const toBn = (n) => String(n).replace(/\d/g, (d) => bnDigits[d]);

// Seven ধাপ each way of exactly one hundred floors, so that every ধাপ's lift
// is a ten-by-ten panel: 700 floors up, 700 down.
export const SEG_FLOORS = 100;
export const SEG_COUNT = 7;
export const TOWER_FLOORS = SEG_COUNT * SEG_FLOORS;  // 700 floors above ground
export const PATAL_FLOORS = SEG_COUNT * SEG_FLOORS;  // 700 floors below ground
export const TOWER_FLOOR_M = 4;    // metres per tower floor  → 2800 m summit
export const PATAL_FLOOR_M = 4;    // metres per patal floor  → 2800 m nadir

export const TOWER_HEIGHT_M = TOWER_FLOORS * TOWER_FLOOR_M;  // 2800
export const PATAL_DEPTH_M = PATAL_FLOORS * PATAL_FLOOR_M;   // 2800

// ── Plan geometry — the section, designed rather than assumed ──
// Circular in plan at every level, so a floor is fully described by one
// number: its envelope diameter, measured at the floor's mid-height. The
// profile is not a straight cone. Four things set it, and none of them is a
// straight line:
//
//   1. THE SPINE. One shaft runs the whole 5.6 km, summit to nadir — a 60 m
//      drum holding 24 ropeless maglev guideways in a ring (12 climbing, 12
//      falling, cars circulating in a loop, ~20 m/s → under five minutes
//      end to end) around a 16 m pressurised column of stairs, air, water, power.
//      Nothing else in প্যান্থিয়া touches every floor. It never tapers: it is
//      the datum the two worlds are hung on.
//   2. THE TIP FOLLOWS FROM THE SPINE. Both ends close at 100 m — the core
//      plus a 20 m landing gallery all round, the least a floor can be and
//      still be a floor. The summit crown and the nadir's last cell are the same
//      size, and that is the one plan dimension the two worlds share.
//   3. ABOVE, THE LIMIT IS WIND, NOT WEIGHT. At 2.8 km, gravity is not what
//      shapes a tower — with modern high-strength concrete the base need only
//      be some 1.8× the crown's area to carry it. Overturning is. So the
//      মিনার stands on a 1120 m base (1 : 2.5 against its height, stout by any
//      standard) and tapers on a power curve, p = 1.6: a flared root that
//      stiffens the first kilometre, a long gentle spire above, and a
//      continuously changing diameter that never lets the wind settle into
//      one shedding frequency. The wide lower plates are read as rings and
//      light-wells, not slabs — no habitable room sits 560 m from a window.
//   4. BELOW, THE LIMIT IS ROCK. Free span at depth is governed by the
//      overburden: ~74 MPa of vertical stress at 2.8 km. So the পাতাল is not
//      the মিনার upside down. It opens as a 420 m well through the island's
//      crust — narrow, because the tower's foundation ring has to land on
//      solid ground outside it, and because a well that size still drops
//      daylight into the patal's upper floors — then swells beneath the crust
//      to a 980 m belly at 420 m depth, where the rock is strong and unloaded,
//      and tapers away from there as stress climbs. A flask, not a cone.
//
//   (When the building went from 1000 floors each way to 700, every plan
//   dimension but the spine and the tip was scaled by the same 0.7, so the
//   proportions above, and the drawn shape, are unchanged.)
export const CORE_DIAMETER_M = 60;    // the spine — constant, summit to nadir
export const CORE_GALLERY_M = 20;     // minimum landing ring around it
export const TIP_DIAMETER_M = CORE_DIAMETER_M + 2 * CORE_GALLERY_M;  // 100
export const MINAR_BASE_M = 1120;     // envelope where the tower meets ground
// The island is wider than the tower's foot, and deliberately: the base has
// to land on solid ground with room to spare, and the shore ring is where the
// jetties and docks are.
export const ISLAND_DIAMETER_M = 2100;  // the island the whole thing stands on
export const ISLAND_SHORE_M = 140;      // the shore ring, widest at the waterline
export const WELL_MOUTH_M = 420;      // the পাতাল's mouth through the crust
export const PATAL_BELLY_M = 980;     // its widest floors …
export const PATAL_BELLY_DEPTH_M = 420;  // … at this depth
const MINAR_TAPER = 1.6;
const PATAL_TAPER = 1.8;

// Envelope diameter at any distance from the ground plate (metres, always
// positive — `kind` says which way). Every drawing on the site derives its
// silhouette from this one function, so plan, section and caption agree.
export const diameterAt = (kind, m) => {
  if (kind === 'patal') {
    const z = Math.min(Math.max(m, 0), PATAL_DEPTH_M);
    if (z <= PATAL_BELLY_DEPTH_M)
      return (
        WELL_MOUTH_M +
        (PATAL_BELLY_M - WELL_MOUTH_M) * Math.sin((Math.PI / 2) * (z / PATAL_BELLY_DEPTH_M))
      );
    return (
      TIP_DIAMETER_M +
      (PATAL_BELLY_M - TIP_DIAMETER_M) *
        ((PATAL_DEPTH_M - z) / (PATAL_DEPTH_M - PATAL_BELLY_DEPTH_M)) ** PATAL_TAPER
    );
  }
  const h = Math.min(Math.max(m, 0), TOWER_HEIGHT_M);
  return TIP_DIAMETER_M + (MINAR_BASE_M - TIP_DIAMETER_M) * (1 - h / TOWER_HEIGHT_M) ** MINAR_TAPER;
};

// A floor's own diameter, measured at its mid-height.
export const floorDiameter = (kind, floor) =>
  Math.round(diameterAt(kind, (floor - 0.5) * (kind === 'patal' ? PATAL_FLOOR_M : TOWER_FLOOR_M)));

// Where a floor sits on its own axis — its mid-height above ground / below it.
export const floorMetres = (kind, floor) =>
  (floor - 0.5) * (kind === 'patal' ? PATAL_FLOOR_M : TOWER_FLOOR_M);

// The profile sampled between two metre marks — the drawings walk this to
// build curved outlines instead of straight-sided trapezia.
export const profileSamples = (kind, from, to, steps = 10) =>
  Array.from({ length: steps + 1 }, (_, i) => {
    const m = from + ((to - from) * i) / steps;
    return { m, d: diameterAt(kind, m) };
  });

// ── The level axis ──
// The whole construction is one shaft of 1400 stops, so it is one number:
// +700 at the summit down to +1, the floor on the ground, then −1 straight
// beneath it down to −700 at the nadir. There is no zero. The roof (the
// Panthea home) sits one step above the top.
//
// Stepping goes through levelAdd, which skips the zero that is not there:
// that is what lets the ↑/↓ links and the ctrl+arrow ride pass from +1 to −1
// without a special case anywhere else.
export const LEVEL_MAX = TOWER_FLOORS;
export const LEVEL_MIN = -PATAL_FLOORS;
export const levelKind = (l) => (l > 0 ? 'minar' : 'patal');
export const levelFloor = (l) => Math.abs(l);
export const levelOf = (kind, floor) => (kind === 'patal' ? -floor : floor);
// 0 … 1399, nadir to summit
const levelIndex = (l) => (l > 0 ? l + PATAL_FLOORS - 1 : l + PATAL_FLOORS);
const indexLevel = (i) => (i >= PATAL_FLOORS ? i - PATAL_FLOORS + 1 : i - PATAL_FLOORS);
export const levelAdd = (l, n) =>
  indexLevel(Math.min(PATAL_FLOORS + TOWER_FLOORS - 1, Math.max(0, levelIndex(l) + n)));
export const levelHref = (l) =>
  l > LEVEL_MAX ? '/panthea/'
  : l > 0 ? `/panthea/minar/${l}/`
  : `/panthea/patal/${-l}/`;

// ── The section: one drawing, summit to nadir ──
// The home page's navigator and every floor page's corner inset are the SAME
// drawing at two sizes (src/components/PantheaSection.astro), and the elevator
// ride redraws it in the browser — so its constants and mappings live here:
// a floor rendered at build time and a floor scrubbed to with ctrl+↑ must land
// on identical geometry.
//
// Height is true and the same both ways — 2800 m is 210 units up and 210 down,
// meeting at the ground line. Width is exaggerated by SECTION_WIDEN: at true
// scale the crown is a hairline nobody could point at, at 2.5× the tower turns
// squat. 1.6 keeps the spire a spire.
const SECTION_V = 210 / TOWER_HEIGHT_M;   // units per metre, vertically
export const SECTION_WIDEN = 1.6;
// The tower's ১ তলা stands on the ground line (Y_GROUND) and the পাতাল's −১
// hangs straight under it (Y_MOUTH, the same line): no floor between.
export const GLYPH = {
  CX: 150,
  Y_SUMMIT: 40,
  Y_GROUND: 250,
  Y_MOUTH: 250,
  Y_NADIR: 460,
  U: SECTION_V * SECTION_WIDEN,   // units per metre of radius
};
export const glyphY = (kind, m) =>
  kind === 'patal'
    ? GLYPH.Y_MOUTH + (m / PATAL_DEPTH_M) * (GLYPH.Y_NADIR - GLYPH.Y_MOUTH)
    : GLYPH.Y_GROUND - (m / TOWER_HEIGHT_M) * (GLYPH.Y_GROUND - GLYPH.Y_SUMMIT);
export const glyphHalf = (kind, m) => (diameterAt(kind, m) / 2) * GLYPH.U;

const rnd = (n) => Math.round(n * 10) / 10;

// walk the profile up one flank and back down the other
export const glyphOutline = (kind, m0, m1, steps = 24) => {
  const left = [], right = [];
  for (let i = 0; i <= steps; i++) {
    const m = m0 + ((m1 - m0) * i) / steps;
    const y = rnd(glyphY(kind, m)), h = glyphHalf(kind, m);
    left.push(`${rnd(GLYPH.CX - h)},${y}`);
    right.push(`${rnd(GLYPH.CX + h)},${y}`);
  }
  return [...left, ...right.reverse()].join(' ');
};

// Floors per ধাপ, ground outward: a hundred each, seven each way.
const SHARES = Array(SEG_COUNT).fill(SEG_FLOORS);

const spansFrom = (shares) => {
  let lo = 1;
  return shares.map((s) => {
    const span = [lo, lo + s - 1];
    lo += s;
    return span;
  });
};

const TOWER_SPANS = spansFrom(SHARES);  // 1–100 … 601–700
const PATAL_SPANS = spansFrom(SHARES);  // 1–100 … 601–700

// The ধাপ carry only their numbers, signed like the floors: প্যান্থিয়া is
// the one name for the whole building, so the ধাপ above the ground are ধাপ
// ১…৭ and those beneath it ধাপ −১…−৭. A ধাপ is named only when its stories
// name it. Slugs are positional (t1…t7 up, p1…p7 down).
export const SEG_WORD = 'ধাপ';
export const MINUS = '−';
const numbered = (prefix, sign) => SHARES.map((_, i) => ({
  slug: `${prefix}${i + 1}`,
  bn: `${SEG_WORD} ${sign}${toBn(i + 1)}`,
}));
const TOWER_NAMES = numbered('t', '');
const PATAL_NAMES = numbered('p', MINUS);

const buildSegments = (names, spans, floorM, floorBn) =>
  names.map((n, i) => {
    const floors = spans[i];
    const metres = [(floors[0] - 1) * floorM, floors[1] * floorM];
    return {
      ...n,
      index: i + 1,
      floors,
      count: floors[1] - floors[0] + 1,
      metres,
      floorsBn: `${toBn(floors[0])}–${toBn(floors[1])}`,
      floorsLabel: `তলা ${floorBn(floors[0])} থেকে ${floorBn(floors[1])}`,
      metresBn: `${toBn(metres[0])}–${toBn(metres[1])} মিটার`,
    };
  });

// a floor's number as it is written: those beneath the ground carry the minus
export const towerSegments = buildSegments(TOWER_NAMES, TOWER_SPANS, TOWER_FLOOR_M, (f) => toBn(f));
export const patalSegments = buildSegments(PATAL_NAMES, PATAL_SPANS, PATAL_FLOOR_M, (f) => MINUS + toBn(f));

export const towerSegmentOf = (floor) =>
  towerSegments.find((s) => floor >= s.floors[0] && floor <= s.floors[1]);
export const patalSegmentOf = (floor) =>
  patalSegments.find((s) => floor >= s.floors[0] && floor <= s.floors[1]);

// the level axis, named as the ধাপ are, word then number: তলা ২৫১ beside
// ধাপ ৩, and beneath the ground তলা −৫. The roof is ছাদ.
export const levelNum = (l) => (l < 0 ? MINUS + toBn(-l) : toBn(l));
export const levelTitle = (l) => (l > LEVEL_MAX ? 'ছাদ' : `তলা ${levelNum(l)}`);
export const levelSegment = (l) => (l > 0 ? towerSegmentOf(l) : patalSegmentOf(-l));
