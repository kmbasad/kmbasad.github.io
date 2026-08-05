// প্যান্থিয়া — the name of the whole construction: an island in the open sea,
// a 1000-floor mountain-tower (মিনার, 4 km high) rising from it, the ground
// floor (গ্রাউন্ড) at sea level, and a 1000-floor underworld (পাতাল, 4 km deep)
// mirrored beneath. The section is an exact reflection in *height*: tower floor
// n sits at 4n metres up, patal floor n at 4n metres down — floor for floor,
// boundary for boundary. In *plan* the two worlds are not twins; see the
// geometry note below.
//
// Both worlds are divided into fourteen segments that thin toward the
// extremes (wide neighbourhoods near the ground, small ones at summit and
// nadir), so no segment holds more than 100 floors. Segment names are
// modern-mythic loanwords written in Bengali letters; the two endpoints are
// the astronomer's pair — জেনিথ at the summit, নাদির at the bottom.
//
// This file is the single source of truth: the map-TOC SVGs on /panthea/, the
// floor routes (/panthea/minar/[floor], /panthea/patal/[floor], /panthea/bhumi)
// and the floor-page headers all derive from it.

export const bnDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
export const toBn = (n) => String(n).replace(/\d/g, (d) => bnDigits[d]);

export const TOWER_FLOORS = 1000;  // floors above ground
export const PATAL_FLOORS = 1000;  // floors below ground
export const TOWER_FLOOR_M = 4;    // metres per tower floor  → 4000 m summit
export const PATAL_FLOOR_M = 4;    // metres per patal floor  → 4000 m nadir

export const TOWER_HEIGHT_M = TOWER_FLOORS * TOWER_FLOOR_M;  // 4000
export const PATAL_DEPTH_M = PATAL_FLOORS * PATAL_FLOOR_M;   // 4000

// ── Plan geometry — the section, designed rather than assumed ──
// Circular in plan at every level, so a floor is fully described by one
// number: its envelope diameter, measured at the floor's mid-height. The
// profile is not a straight cone. Four things set it, and none of them is a
// straight line:
//
//   1. THE SPINE. One shaft runs the whole 8 km, summit to nadir — a 60 m
//      drum holding 24 ropeless maglev guideways in a ring (12 climbing, 12
//      falling, cars circulating in a loop, ~20 m/s → some seven minutes end
//      to end) around a 16 m pressurised column of stairs, air, water, power.
//      Nothing else in প্যান্থিয়া touches every floor. It never tapers: it is
//      the datum the two worlds are hung on.
//   2. THE TIP FOLLOWS FROM THE SPINE. Both ends close at 100 m — the core
//      plus a 20 m landing gallery all round, the least a floor can be and
//      still be a floor. জেনিথ's crown and নাদির's last cell are the same
//      size, and that is the one plan dimension the two worlds share.
//   3. ABOVE, THE LIMIT IS WIND, NOT WEIGHT. At 4 km, gravity is not what
//      shapes a tower — with modern high-strength concrete the base need only
//      be some 1.8× the crown's area to carry it. Overturning is. So the
//      মিনার stands on a 1600 m base (1 : 2.5 against its height, stout by any
//      standard) and tapers on a power curve, p = 1.6: a flared root that
//      stiffens the first kilometre, a long gentle spire above, and a
//      continuously changing diameter that never lets the wind settle into
//      one shedding frequency. The wide lower plates are read as rings and
//      light-wells, not slabs — no habitable room sits 800 m from a window.
//   4. BELOW, THE LIMIT IS ROCK. Free span at depth is governed by the
//      overburden: ~106 MPa of vertical stress at 4 km. So the পাতাল is not
//      the মিনার upside down. It opens as a 600 m well through the island's
//      crust — narrow, because the tower's foundation ring has to land on
//      solid ground outside it, and because a well that size still drops
//      daylight into লিম্বো — then swells beneath the crust to a 1400 m belly
//      at 600 m depth, where the rock is strong and unloaded, and tapers away
//      from there as stress climbs. A flask, not a cone.
export const CORE_DIAMETER_M = 60;    // the spine — constant, summit to nadir
export const CORE_GALLERY_M = 20;     // minimum landing ring around it
export const TIP_DIAMETER_M = CORE_DIAMETER_M + 2 * CORE_GALLERY_M;  // 100
export const MINAR_BASE_M = 1600;     // envelope where the tower meets ground
// The island is wider than the tower's foot, and deliberately: a 1600 m base
// has to land on solid ground with room to spare, and the শোর ring is where
// মারিনা's jetties are. So the ground plate is the widest thing in the section
// and outreaches the ১৬০০ that the base is dimensioned at — every drawing
// labels the two separately rather than letting the plate read as an overrun.
export const ISLAND_DIAMETER_M = 3000;  // the island the whole thing stands on
export const ISLAND_SHORE_M = 200;      // the shore ring: the island is widest
                                        // at the waterline and tapers by this
                                        // much to its flat crown (2600 m) and,
                                        // going the other way, to its
                                        // submerged flank
export const WELL_MOUTH_M = 600;      // the পাতাল's mouth in the ground plate
export const PATAL_BELLY_M = 1400;    // its widest floors …
export const PATAL_BELLY_DEPTH_M = 600;  // … at this depth
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

// A floor's own diameter, measured at its mid-height. গ্রাউন্ড is the ground
// plate itself: the tower's full base, with the well's mouth cut out of it.
export const floorDiameter = (kind, floor) =>
  kind === 'bhumi'
    ? MINAR_BASE_M
    : Math.round(diameterAt(kind, (floor - 0.5) * (kind === 'patal' ? PATAL_FLOOR_M : TOWER_FLOOR_M)));

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
// The whole construction is one shaft of 2001 stops, so it is one number:
// +1000 at জেনিথ's last floor, 0 at গ্রাউন্ড, −1000 at নাদির's, with the roof
// (the Panthea home) one step above the top. Both the ↑/↓ links and the
// ctrl+arrow elevator ride step along it, which is what lets a ride pass
// through গ্রাউন্ড into the other world without a special case.
export const LEVEL_MAX = TOWER_FLOORS;
export const LEVEL_MIN = -PATAL_FLOORS;
export const levelKind = (l) => (l > 0 ? 'minar' : l < 0 ? 'patal' : 'bhumi');
export const levelFloor = (l) => Math.abs(l);
export const levelOf = (kind, floor) =>
  kind === 'minar' ? floor : kind === 'patal' ? -floor : 0;
export const levelHref = (l) =>
  l > LEVEL_MAX ? '/panthea/'
  : l > 0 ? `/panthea/minar/${l}/`
  : l === 0 ? '/panthea/bhumi/'
  : `/panthea/patal/${-l}/`;

// ── The locator glyph on floor pages ──
// Its constants and its two mappings live here, not in the component, because
// the elevator ride redraws the same glyph in the browser: a floor rendered at
// build time and a floor scrubbed to with ctrl+↑ must land on identical
// geometry.
export const PLAN_R = 496;   // the plan circle's radius in its own viewBox
export const GLYPH = {
  CX: 150,
  Y_SUMMIT: 40,
  Y_GROUND: 250,
  Y_MOUTH: 260,
  Y_NADIR: 460,
  U: 108 / (MINAR_BASE_M / 2),   // glyph units per metre of radius
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

// Floors per segment, ground outward — sums to 1000, max 100, gently tapering.
const SHARES = [100, 95, 90, 85, 80, 75, 75, 70, 70, 65, 60, 50, 45, 40];

const spansFrom = (shares) => {
  let lo = 1;
  return shares.map((s) => {
    const span = [lo, lo + s - 1];
    lo += s;
    return span;
  });
};

const TOWER_SPANS = spansFrom(SHARES);  // 1–100 … 961–1000
const PATAL_SPANS = spansFrom(SHARES);  // 1–100 … 961–1000

// ── উপরে — the fourteen segments of the tower, sea to summit ──
const TOWER_NAMES = [
  { slug: 'marina',    bn: 'মারিনা',      originBn: 'লাতিন — সমুদ্রের',            epithetBn: 'জেটি আর নোনা হাওয়া' },
  { slug: 'triton',    bn: 'ট্রাইটন',     originBn: 'গ্রিক সাগর-দেবতা',            epithetBn: 'ঢেউয়ের ওপরের শহর' },
  { slug: 'monsoon',   bn: 'মনসুন',       originBn: 'আরবি মৌসিম থেকে',            epithetBn: 'বৃষ্টির কোমরবন্ধ' },
  { slug: 'nimbus',    bn: 'নিম্বাস',      originBn: 'লাতিন — মেঘ ও জ্যোতি',        epithetBn: 'মেঘের ভিতরের মহল্লা' },
  { slug: 'iris',      bn: 'আইরিস',       originBn: 'গ্রিক রংধনু-দেবী',            epithetBn: 'মেঘছাদের রং' },
  { slug: 'zephyr',    bn: 'জেফির',       originBn: 'গ্রিক পশ্চিমা হাওয়া',         epithetBn: 'হালকা হাওয়ার দেশ' },
  { slug: 'atlas',     bn: 'অ্যাটলাস',    originBn: 'আকাশ-বহা টাইটান',            epithetBn: 'মিনারের মেরুদণ্ড' },
  { slug: 'aurora',    bn: 'অরোরা',       originBn: 'লাতিন ভোরের দেবী',           epithetBn: 'প্রথম আলোর তলা' },
  { slug: 'solaris',   bn: 'সোলারিস',     originBn: 'লাতিন — সূর্যের',             epithetBn: 'রোদের রাজ্য' },
  { slug: 'hyperion',  bn: 'হাইপেরিয়ন',   originBn: 'আলোর টাইটান',               epithetBn: 'উঁচু আলোর বন' },
  { slug: 'boreal',    bn: 'বোরিয়াল',     originBn: 'লাতিন — উত্তুরে, মেরুর',      epithetBn: 'তুষারের সীমান্ত' },
  { slug: 'stratos',   bn: 'স্ট্রাটোস',    originBn: 'গ্রিক — স্তর, ঊর্ধ্বাকাশ',     epithetBn: 'পাতলা বাতাসের স্তর' },
  { slug: 'olympus',   bn: 'অলিম্পাস',    originBn: 'দেবতাদের পর্বত',             epithetBn: 'গম্বুজের পাড়া' },
  { slug: 'zenith',    bn: 'জেনিথ',       originBn: 'আরবি সামত — মাথার ওপরের বিন্দু', epithetBn: 'মুকুট ও বিকন' },
];

// ── নিচে — the fourteen segments of the underworld, mouth to nadir ──
const PATAL_NAMES = [
  { slug: 'limbo',      bn: 'লিম্বো',       originBn: 'লাতিন — কিনারা',             epithetBn: 'ধার-করা আলোর দালান' },
  { slug: 'catacomb',   bn: 'ক্যাটাকম্ব',   originBn: 'লাতিন — ভূগর্ভ সমাধিপথ',     epithetBn: 'খিলানের গোলকধাঁধা' },
  { slug: 'lethe',      bn: 'লেথে',        originBn: 'গ্রিক বিস্মৃতির নদী',         epithetBn: 'আর্কাইভের নীরবতা' },
  { slug: 'styx',       bn: 'স্টিক্স',      originBn: 'গ্রিক শপথের নদী',            epithetBn: 'কালো ক্যানালের পারাপার' },
  { slug: 'pluto',      bn: 'প্লুটো',       originBn: 'রোমান গভীরের দেবতা',         epithetBn: 'খনির ঐশ্বর্য' },
  { slug: 'necropolis', bn: 'নেক্রোপলিস',  originBn: 'গ্রিক — মৃতদের নগর',         epithetBn: 'ধূসর মেট্রোপলিস' },
  { slug: 'terminus',   bn: 'টার্মিনাস',    originBn: 'রোমান সীমান্ত-দেবতা',        epithetBn: 'শেষ চেকপয়েন্ট' },
  { slug: 'geyser',     bn: 'গিজার',       originBn: 'নর্স গেইসির থেকে',           epithetBn: 'স্টিমের ফোয়ারা' },
  { slug: 'inferno',    bn: 'ইনফার্নো',    originBn: 'লাতিন — আগুনের গহ্বর',       epithetBn: 'প্রথম আগুন' },
  { slug: 'vulcan',     bn: 'ভলকান',       originBn: 'রোমান কামার-দেবতা',          epithetBn: 'ফাউন্ড্রির জেলা' },
  { slug: 'magma',      bn: 'ম্যাগমা',      originBn: 'গ্রিক — গলিত মণ্ড',           epithetBn: 'গলন্ত নদী' },
  { slug: 'obsidian',   bn: 'ওবসিডিয়ান',   originBn: 'আগ্নেয় কালো কাচ',           epithetBn: 'কাচের খিলান' },
  { slug: 'abyss',      bn: 'অ্যাবিস',      originBn: 'গ্রিক — অতল',                epithetBn: 'সিল-করা শূন্য' },
  { slug: 'nadir',      bn: 'নাদির',       originBn: 'আরবি নাজির — পায়ের নিচের বিন্দু', epithetBn: 'শেষ বিন্দু' },
];

const buildSegments = (names, spans, floorM) =>
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
      metresBn: `${toBn(metres[0])}–${toBn(metres[1])} মিটার`,
    };
  });

export const towerSegments = buildSegments(TOWER_NAMES, TOWER_SPANS, TOWER_FLOOR_M);
export const patalSegments = buildSegments(PATAL_NAMES, PATAL_SPANS, PATAL_FLOOR_M);

export const ground = {
  slug: 'bhumi',
  bn: 'গ্রাউন্ড',
  originBn: 'তলা ০ — দ্বীপ',
  epithetBn: 'সব পথের মোহনা',
};

export const towerSegmentOf = (floor) =>
  towerSegments.find((s) => floor >= s.floors[0] && floor <= s.floors[1]);
export const patalSegmentOf = (floor) =>
  patalSegments.find((s) => floor >= s.floors[0] && floor <= s.floors[1]);

// the level axis, named: the roof sits one step above জেনিথ's last floor
export const levelTitle = (l) =>
  l > LEVEL_MAX ? 'ছাদ'
  : l > 0 ? `তলা ${toBn(l)}`
  : l === 0 ? ground.bn
  : `পাতাল ${toBn(-l)}`;
export const levelSegment = (l) =>
  l > 0 ? towerSegmentOf(l) : l < 0 ? patalSegmentOf(-l) : null;
