// The paintings the Panthea lifts wear, one per ধাপ — shared by the home
// page's lift (painted in the browser) and the ধাপ strip beside the building
// (drawn at build time), so the strip's colours are the very paintings'.
// ── each lift is a painting ──
// The grid is always the regular ten by ten; what changes is the colour
// of its cells. Above the ground the seven lifts are Mondrian: a warm
// canvas white, heavy black lines, a few blocks of red, blue, yellow and
// black, placed differently in each. Beneath the ground the seven are
// Klee: magic squares of softly modulated colour, deepening from ochre
// and rose near the surface to violet and night indigo at the nadir.
// Every painting is seeded by its ধাপ, so a lift is always the same work.
export const seeded = (str) => {
  let h = 2166136261;
  for (const c of str) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
};
const hexRgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const toHex = (c) => '#' + c.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
const shade = (h, k) => toHex(hexRgb(h).map((v) => (k > 0 ? v + (255 - v) * k : v * (1 + k))));
export const luma = (h) => { const [r, g, b] = hexRgb(h); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };

export const M = { white: '#f4f1e8', red: '#c8302c', blue: '#1d4f9b', yellow: '#f2c53d', black: '#141518', grey: '#d8d6cf' };
export const mondrian = (key) => {
  const rnd = seeded(key);
  const cells = Array(100).fill(M.white);
  const inks = [M.red, M.blue, M.yellow, M.black, M.red, M.yellow, M.blue, M.grey];
  for (let i = inks.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [inks[i], inks[j]] = [inks[j], inks[i]]; }
  let painted = 0;
  for (let k = 0; k < 7 && painted < 34; k++) {
    const big = k < 2;                     // one or two large fields, the rest small
    const w = 1 + Math.floor(rnd() * (big ? 4 : 2)), h = 1 + Math.floor(rnd() * (big ? 4 : 2));
    const x = Math.floor(rnd() * (11 - w)), y = Math.floor(rnd() * (11 - h));
    for (let yy = y; yy < y + h; yy++)
      for (let xx = x; xx < x + w; xx++) {
        if (cells[yy * 10 + xx] === M.white) painted++;
        cells[yy * 10 + xx] = inks[k];
      }
  }
  return cells;
};

const KLEE = [
  ['#e3b46a', '#d58a5c', '#c46a4f', '#ecd09a', '#b98a4e', '#9f9a62'],   // ochre, rose, sand
  ['#cf8452', '#b9563f', '#8f8a4f', '#e0ad6e', '#a3683f', '#d7b48a'],   // terracotta, olive
  ['#b54f3e', '#8e3f4f', '#d0864f', '#6f5a7a', '#c99366', '#9b5b5a'],   // rust, plum
  ['#7b4a6c', '#a85a52', '#c9945a', '#5e5a8a', '#94687e', '#d3a46c'],   // plum, violet, ochre
  ['#5b4c84', '#8a5a86', '#b77a6a', '#3f5486', '#a08bb0', '#c99a72'],   // violet, rose
  ['#34497a', '#4f3f73', '#2f6b78', '#6d5a96', '#8a9ab8', '#a77b8a'],   // indigo, teal
  ['#1f2c55', '#2c2550', '#1d4f6b', '#3d3a6e', '#c99a4a', '#516892'],   // night, one gold
];
export const klee = (key, depth) => {
  const rnd = seeded(key);
  const pal = KLEE[depth];
  const a = 0.45 + rnd() * 0.5, b = 0.4 + rnd() * 0.5, p = rnd() * 6, q = rnd() * 6;
  const cells = [];
  for (let y = 0; y < 10; y++)
    for (let x = 0; x < 10; x++) {
      // a slow field of colour, broken a little by the hand
      const v = (Math.sin(x * a + p) + Math.cos(y * b + q) + 2) / 4 + (rnd() - 0.5) * 0.35;
      const i = Math.max(0, Math.min(pal.length - 1, Math.floor(v * pal.length)));
      cells.push(shade(pal[i], (rnd() - 0.5) * 0.16));
    }
  return cells;
};

// A ধাপ's painting by its key: t1…t7 above the ground (Mondrian), u1…u7
// beneath it (Klee, deepening with its index).
export const paintingOf = (key) =>
  key[0] === 'u' ? klee(key, Number(key.slice(1)) - 1) : mondrian(key);

// The two colours that carry a painting, most used first, leaving out the
// Mondrian's canvas white: what the strip shows of it.
export const voiceOf = (key) => {
  const counts = {};
  for (const c of paintingOf(key)) if (c !== M.white) counts[c] = (counts[c] || 0) + 1;
  const ranked = Object.entries(counts).sort((x, y) => y[1] - x[1]).map(([c]) => c);
  return { mondrian: key[0] !== 'u', main: ranked[0] || M.white, second: ranked[1] || ranked[0] || M.white };
};

