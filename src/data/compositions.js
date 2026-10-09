// The paintings behind the index pages (rendered by src/components/Painting.astro).
// Each work's index is composed after a Mondrian chosen for what the work is;
// the list of its parts sits in the long white plane (`sheet`) the composition
// leaves for it. Planes are [x, y, w, h] in percent of the screen: `d` on a
// wide screen, `p` on a phone, where the painting is a strip down the right
// edge beside the sheet. A plane with no part in the phone strip is parked
// under the sheet (UNDER), where the sheet simply covers it. `marks` are the
// colours the list's entries wear, in turn.

const R = '#c8302c', B = '#1f3f8a', Y = '#efc93a', K = '#141518';
const W = '#f2efe6', W2 = '#ebe7dc', G = '#c9c8c2', G2 = '#d9d8d2';
const UNDER = [0, 0, 40, 40];

export const compositions = {
  // Ovid — "Composition with Large Blue Plane, Red, Black, Yellow and Gray"
  // (1921): a great blue for the sea-changes, the list beside it
  metamorphoses: {
    label: 'Mondrian, Composition with Large Blue Plane, Red, Black, Yellow and Gray (1921)',
    sheet: { d: [22, 40], p: [0, 86] },
    marks: [B, R, Y, K],
    planes: [
      { bg: B, d: [0, 0, 22, 58], p: [86, 0, 14, 40] },
      { bg: W, d: [0, 58, 22, 22], p: UNDER },
      { bg: K, d: [0, 80, 22, 20], p: [86, 82, 14, 18] },
      { bg: W, d: [22, 0, 40, 100], p: UNDER },
      { bg: G, d: [62, 0, 24, 30], p: UNDER },
      { bg: R, d: [86, 0, 14, 30], p: [86, 40, 14, 20] },
      { bg: W2, d: [62, 30, 38, 40], p: UNDER },
      { bg: Y, d: [62, 70, 16, 30], p: [86, 60, 14, 22] },
      { bg: G2, d: [78, 70, 22, 30], p: UNDER },
    ],
  },

  // Hafez — "Composition with Yellow, Blue and Red" (1937-42): a dense
  // lattice of white planes, a garden screen, and a few colours in it
  divan: {
    label: 'Mondrian, Composition with Yellow, Blue and Red (1937-42)',
    sheet: { d: [30, 40], p: [0, 86] },
    marks: [R, Y, B],
    planes: [
      { bg: R, d: [0, 0, 18, 22], p: [86, 0, 14, 25] },
      { bg: W, d: [0, 22, 18, 48], p: UNDER },
      { bg: W2, d: [0, 70, 10, 30], p: UNDER },
      { bg: K, d: [10, 70, 8, 8], p: UNDER },
      { bg: W, d: [10, 78, 20, 22], p: UNDER },
      { bg: W2, d: [18, 0, 12, 70], p: UNDER },
      { bg: W, d: [30, 0, 40, 100], p: UNDER },
      { bg: W2, d: [70, 0, 30, 18], p: [86, 50, 14, 20] },
      { bg: Y, d: [88, 18, 12, 14], p: [86, 25, 14, 25] },
      { bg: W, d: [70, 18, 18, 52], p: UNDER },
      { bg: W2, d: [88, 32, 12, 38], p: UNDER },
      { bg: W, d: [70, 70, 18, 30], p: UNDER },
      { bg: B, d: [88, 70, 12, 30], p: [86, 70, 14, 30] },
    ],
  },

  // Shakespeare — "Composition No. 10" (1939-42): sparse, measured,
  // lined; a sonnet's discipline, one red and one blue
  sonnets: {
    label: 'Mondrian, Composition No. 10 (1939-42)',
    sheet: { d: [34, 40], p: [0, 86] },
    marks: [R, B, K],
    planes: [
      { bg: W, d: [0, 0, 22, 60], p: [86, 0, 14, 40] },
      { bg: R, d: [0, 60, 12, 40], p: [86, 40, 14, 30] },
      { bg: W2, d: [12, 60, 22, 40], p: UNDER },
      { bg: W2, d: [22, 0, 12, 30], p: UNDER },
      { bg: K, d: [22, 30, 12, 6], p: UNDER },
      { bg: W, d: [22, 36, 12, 24], p: UNDER },
      { bg: W, d: [34, 0, 40, 100], p: UNDER },
      { bg: W, d: [74, 0, 26, 50], p: UNDER },
      { bg: B, d: [74, 50, 14, 22], p: [86, 70, 14, 30] },
      { bg: W2, d: [88, 50, 12, 50], p: UNDER },
      { bg: W, d: [74, 72, 14, 28], p: UNDER },
    ],
  },

  // Dante — three zones: the red of the Inferno, the grey of Purgatory,
  // the blue and gold of Paradise, read down the left as the journey goes
  'divine-comedy': {
    label: 'After Mondrian: a composition in three zones for the Commedia',
    sheet: { d: [24, 46], p: [0, 86] },
    marks: [R, G, B],
    planes: [
      { bg: R, d: [0, 0, 24, 45], p: [86, 0, 14, 35] },
      { bg: G, d: [0, 45, 24, 30], p: [86, 35, 14, 25] },
      { bg: K, d: [0, 75, 10, 25], p: UNDER },
      { bg: W, d: [10, 75, 14, 25], p: UNDER },
      { bg: W, d: [24, 0, 46, 100], p: UNDER },
      { bg: W2, d: [70, 0, 30, 25], p: UNDER },
      { bg: Y, d: [70, 25, 12, 20], p: [86, 60, 14, 12] },
      { bg: B, d: [82, 25, 18, 45], p: [86, 72, 14, 28] },
      { bg: W, d: [70, 45, 12, 55], p: UNDER },
      { bg: W2, d: [82, 70, 18, 30], p: UNDER },
    ],
  },

  // Alaol, Sapta Paykar — the seven pavilions are seven colours (black,
  // yellow, green, red, blue, sandal, white), so the painting is in seven
  'alaol-sapta-paykar': {
    label: 'After Mondrian: seven planes for the seven pavilions',
    sheet: { d: [26, 46], p: [0, 86] },
    marks: ['#8f8d86'],
    // each day's chapter wears its own pavilion's colour (by the slug's
    // colour word); the prologue, Bahram's story and the epilogue are grey
    pavilions: { black: K, yellow: '#e3b62f', green: '#3f7a4a', red: R, blue: B, sandal: '#c9a26b', white: '#f4f1e8' },
    planes: [
      { bg: K, d: [0, 0, 26, 16], p: [86, 0, 14, 14] },
      { bg: '#e3b62f', d: [0, 16, 14, 26], p: [86, 14, 14, 14] },
      { bg: '#3f7a4a', d: [14, 16, 12, 26], p: [86, 28, 14, 14] },
      { bg: R, d: [0, 42, 26, 30], p: [86, 42, 14, 15] },
      { bg: W, d: [0, 72, 26, 28], p: [86, 86, 14, 14] },
      { bg: W, d: [26, 0, 46, 100], p: UNDER },
      { bg: B, d: [72, 0, 28, 30], p: [86, 57, 14, 15] },
      { bg: '#c9a26b', d: [72, 30, 16, 34], p: [86, 72, 14, 14] },
      { bg: W2, d: [88, 30, 12, 34], p: UNDER },
      { bg: W, d: [72, 64, 28, 36], p: UNDER },
    ],
  },
};

export const INK = K;
