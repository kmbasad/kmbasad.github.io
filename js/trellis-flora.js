/* ═══════════════════════════════════════════════════════════════════════════
   TRELLIS FLORA — woven-trellis ink layer
   ═══════════════════════════════════════════════════════════════════════════
   Geometry — the matrix IS the trellis. Every border is a vine.

   Main diagonal vine (thickest)
     A stair-step path that traces the BOTTOM and LEFT borders of every
     diagonal cell, climbing from the bottom-right corner of cell (N-1, N-1)
     up to the top-left corner of (0,0), then continuing into the axis-legend
     corner cell.

   Row branches (medium)
     From the upper-left of every diagonal cell (i, i), a branch zigzags
     leftward through row i — alternating sawtooth along the cells' top and
     bottom borders — until it reaches the row's header cell.

   Column branches (medium)
     From the upper-left of every diagonal cell (i, i), a branch zigzags
     upward through column i — alternating sawtooth along left and right
     borders — until it reaches the column's header cell.

   Leaves and flowers (foliage layer)
     Each cell gets 1–3 leaf/flower stems that branch off the nearest vine
     border and curl into the cell interior. Entry points + targets are
     deterministically randomized so the cells never look identical.

   Everything draws BEHIND the cells (z-index 0). Cells are slightly
   translucent so the trellis reads as a botanical ground beneath them.    */

(function () {
  'use strict';

  const NS = 'http://www.w3.org/2000/svg';

  // ── SVG helpers ────────────────────────────────────────────────────────
  function el(tag, attrs, parent) {
    const n = document.createElementNS(NS, tag);
    if (attrs) for (const k in attrs) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  }
  function group(transform, parent) {
    return el('g', transform ? { transform } : {}, parent);
  }

  // Deterministic procedural noise — same inputs give same output
  function noise(a, b) {
    const x = Math.sin(a * 12.9898 + b * 78.233) * 43758.5453;
    return x - Math.floor(x);
  }
  // Same noise but offset, for paired "randoms"
  function noise2(a, b) {
    const x = Math.sin(a * 39.346 + b * 11.135) * 7919.617;
    return x - Math.floor(x);
  }

  // ── Botanical paths ────────────────────────────────────────────────────
  const LEAF_5  = "M12 0 C13 4 16 5 21 4 C20 9 21 12 24 14 C20 14 17 15 16 19 C14 17 13 18 12 30 C11 18 10 17 8 19 C7 15 4 14 0 14 C3 12 4 9 3 4 C8 5 11 4 12 0 Z";
  const LEAF_5V = "M12 4 L12 27 M12 10 L7 14 M12 10 L17 14";
  const LEAF_3  = "M10 0 C12 4 15 5 19 6 C18 10 18 13 20 16 C16 15 14 17 13 20 C11 17 10 18 10 26 C10 18 9 17 7 20 C6 17 4 15 0 16 C2 13 2 10 1 6 C5 5 8 4 10 0 Z";
  const LEAF_3V = "M10 4 L10 22";
  const LEAF_1  = "M8 0 C9 3 12 4 15 5 C14 8 14 11 16 13 C13 13 11 14 10 16 C9 14 8 14 8 20 C8 14 7 14 6 16 C5 14 3 13 0 13 C2 11 2 8 1 5 C4 4 7 3 8 0 Z";
  const LEAF_W  = "M6 0 C8 4 11 8 11 16 C11 21 9 24 6 28 C3 24 1 21 1 16 C1 8 4 4 6 0 Z";
  const LEAF_WV = "M6 4 L6 24";
  // Round / clover-ish small leaf
  const LEAF_R  = "M7 0 C10 1 13 3 14 7 C14 11 11 14 7 16 C3 14 0 11 0 7 C1 3 4 1 7 0 Z";

  function drawLeaf(parent, x, y, size, angle, sense, kind) {
    let path, veins, W, H;
    if (kind === 5)      { path = LEAF_5; veins = LEAF_5V; W = 24; H = 30; }
    else if (kind === 3) { path = LEAF_3; veins = LEAF_3V; W = 20; H = 26; }
    else if (kind === 4) { path = LEAF_W; veins = LEAF_WV; W = 12; H = 28; }
    else if (kind === 6) { path = LEAF_R; veins = null;    W = 14; H = 16; }
    else                 { path = LEAF_1; veins = null;    W = 16; H = 20; }
    const s = size / H;
    const g = group(
      `translate(${x}, ${y}) rotate(${angle}) scale(${sense * s}, ${s}) translate(${-W / 2}, 0)`,
      parent
    );
    const cls = (kind === 5 || kind === 3) ? 'flora-leaf' : 'flora-leaf-small';
    el('path', { class: cls, d: path }, g);
    if (veins && size >= 13) el('path', { class: 'flora-vein', d: veins }, g);
    return g;
  }

  function drawFlower(parent, x, y, size, petals) {
    petals = petals || 5;
    const s = size / 16;
    const g = group(`translate(${x}, ${y}) scale(${s})`, parent);
    g.setAttribute('class', 'flora-flower-wrap');
    const inner = el('g', { class: 'flora-flower' }, g);
    for (let i = 0; i < petals; i++) {
      const aDeg = i * (360 / petals) - 90;
      const aRad = aDeg * Math.PI / 180;
      const px = Math.cos(aRad) * 5.5;
      const py = Math.sin(aRad) * 5.5;
      el('ellipse', {
        cx: px,
        cy: py,
        rx: 4.5,
        ry: 2.6,
        transform: `rotate(${aDeg} ${px} ${py})`,
      }, inner);
    }
    el('circle', { cx: 0, cy: 0, r: 1.4, class: 'flora-flower-eye' }, inner);
    return inner;
  }

  function drawBud(parent, x, y, size, angle) {
    const s = size / 10;
    const g = group(`translate(${x}, ${y}) rotate(${angle || 0}) scale(${s})`, parent);
    el('path', {
      class: 'flora-bud',
      d: 'M0 0 C -2 -3 -2 -7 0 -10 C 2 -7 2 -3 0 0 Z',
    }, g);
    el('circle', { cx: 0, cy: 0, r: 1.0, class: 'flora-flower-eye' }, g);
    return g;
  }

  // ── Rect lookups (table-scroll local coords) ───────────────────────────
  function rectInScroll(tableScroll, target) {
    if (!target) return null;
    const r = target.getBoundingClientRect();
    const t = tableScroll.getBoundingClientRect();
    return {
      x: r.left - t.left + tableScroll.scrollLeft,
      y: r.top - t.top + tableScroll.scrollTop,
      w: r.width,
      h: r.height,
    };
  }
  function cellRectRC(tableScroll, ri, ci) {
    const btn = tableScroll.querySelector(`.cell-btn[data-ri="${ri}"][data-ci="${ci}"]`);
    return btn ? rectInScroll(tableScroll, btn.closest('td')) : null;
  }
  function rowHeaderRect(tableScroll, ri) {
    const tr = tableScroll.querySelectorAll('tbody tr')[ri];
    return tr ? rectInScroll(tableScroll, tr.querySelector('th')) : null;
  }
  function colHeaderRect(tableScroll, ci) {
    const th = tableScroll.querySelectorAll('thead th')[ci + 1]; // +1 because first th is corner
    return th ? rectInScroll(tableScroll, th) : null;
  }
  function cornerCellRect(tableScroll) {
    return rectInScroll(tableScroll, tableScroll.querySelector('.corner-th'));
  }

  // ── Wobble: turn a straight segment into an organic-feeling curve ──
  //
  // Given current path `d`, current cursor (cx, cy), target (tx, ty), and a
  // jitter magnitude in px, append SVG commands that arrive at (tx, ty) via
  // a sequence of Beziers with perpendicular waypoint+control-point jitter.
  // Returns the new {d, x, y}.                                              */
  function wobbleTo(d, cx, cy, tx, ty, mag, seed) {
    const dx = tx - cx, dy = ty - cy;
    const len = Math.hypot(dx, dy);
    if (len < 6) {
      return { d: d + ` L ${tx} ${ty}`, x: tx, y: ty };
    }
    const ux = dx / len, uy = dy / len;     // unit tangent
    const px = -uy,        py = ux;          // unit perpendicular
    const N = Math.max(2, Math.round(len / 26));
    let prevX = cx, prevY = cy;
    let out = d;
    for (let k = 1; k <= N; k++) {
      const t = k / N;
      let wx = cx + dx * t;
      let wy = cy + dy * t;
      // Waypoint perpendicular jitter (not on the final point — keep
      // endpoints exact so adjacent segments connect cleanly)
      if (k < N) {
        const jw = (noise(seed + k * 0.73, k * 1.31) - 0.5) * mag * 2;
        wx += px * jw;
        wy += py * jw;
      }
      // Control point: midpoint between prev and waypoint, then offset
      const mx = (prevX + wx) / 2;
      const my = (prevY + wy) / 2;
      const jc = (noise(seed + k * 1.51, k * 0.89) - 0.5) * mag * 1.6;
      const cpx = mx + px * jc;
      const cpy = my + py * jc;
      out += ` Q ${cpx} ${cpy}, ${wx} ${wy}`;
      prevX = wx; prevY = wy;
    }
    return { d: out, x: tx, y: ty };
  }

  // Convenience: append a wobbly segment, mutating a small cursor object.
  function wobble(state, tx, ty, mag, seed) {
    const r = wobbleTo(state.d, state.x, state.y, tx, ty, mag, seed);
    state.d = r.d; state.x = r.x; state.y = r.y;
  }
  function drawPegs(parent, tableScroll, nRows, nCols) {
    for (let r = 0; r < nRows - 1; r++) {
      for (let c = 0; c < nCols - 1; c++) {
        const cell = cellRectRC(tableScroll, r, c);
        if (!cell) continue;
        el('circle', {
          class: 'flora-peg',
          cx: cell.x + cell.w,
          cy: cell.y + cell.h,
          r: 1.8,
        }, parent);
      }
    }
  }

  // ── Build the main diagonal vine: stair-step bottom + left borders of
  //    every diagonal cell, then curve into the corner cell.
  //    Each border segment wobbles organically.                            */
  function buildMainStem(diagCells, cornerRect) {
    if (diagCells.length === 0) return '';
    const last = diagCells[diagCells.length - 1];

    // Root: extend slightly past the bottom-right of the last diagonal cell
    const rootX = last.x + last.w + 14;
    const rootY = last.y + last.h + 18;
    const state = { d: `M ${rootX} ${rootY}`, x: rootX, y: rootY };
    // Enter at bottom-right corner of (N-1, N-1)
    wobble(state, last.x + last.w, last.y + last.h, 7, 1.1);

    for (let i = diagCells.length - 1; i >= 0; i--) {
      const cell = diagCells[i];
      // LEFT along bottom border (wobbly)
      wobble(state, cell.x, cell.y + cell.h, 7, i * 3.7 + 2);
      // UP along left border (wobbly)
      wobble(state, cell.x, cell.y, 7, i * 3.7 + 5);
    }

    // Continue into corner cell — meander through 2–3 waypoints
    if (cornerRect) {
      const tx = cornerRect.x + cornerRect.w * (0.38 + noise(11, 17) * 0.18);
      const ty = cornerRect.y + cornerRect.h * (0.50 + noise(13, 19) * 0.20);
      // Two-stage meander
      const midX = (state.x + tx) / 2 + (noise(21, 7) - 0.5) * 18;
      const midY = (state.y + ty) / 2 + (noise(23, 11) - 0.5) * 14;
      wobble(state, midX, midY, 3, 41);
      wobble(state, tx, ty, 3, 43);
      // Terminus curl
      state.d += ` q -6 -4, -3 -10`;
    }

    return state.d;
  }

  // ── Row branch leftward from cell (i, i) ──
  //    Zigzag through row i, alternating bottom-wrap and top-wrap per cell.
  function buildRowBranch(diagCells, i, tableScroll, rowHeader) {
    if (i === 0) return '';
    const startCell = diagCells[i];
    const state = {
      d: `M ${startCell.x} ${startCell.y}`,
      x: startCell.x,
      y: startCell.y,
    };

    let lastCell = null;
    let lastSide = null; // 'top' or 'bottom' — which border the last segment was on

    for (let k = 0; k < i; k++) {
      const c = i - 1 - k;
      const cell = cellRectRC(tableScroll, i, c);
      if (!cell) break;
      lastCell = cell;
      const seedBase = i * 17 + c * 23;
      if (k % 2 === 0) {
        // bottom-wrap: DOWN right border + LEFT bottom border
        wobble(state, cell.x + cell.w, cell.y + cell.h, 5.5, seedBase + 1);
        wobble(state, cell.x,          cell.y + cell.h, 5.5, seedBase + 2);
        lastSide = 'bottom';
      } else {
        // top-wrap: UP right border + LEFT top border
        wobble(state, cell.x + cell.w, cell.y, 5.5, seedBase + 3);
        wobble(state, cell.x,          cell.y, 5.5, seedBase + 4);
        lastSide = 'top';
      }
    }

    // Irregular entry into row header — wandering meander with a flourish
    if (rowHeader && lastCell) {
      meanderIntoHeader(state, rowHeader, /*horizontal=*/true, i);
    }

    return state.d;
  }

  // ── Column branch upward from cell (i, i) ──
  //    Zigzag through col i, alternating left-side and right-side wraps.
  function buildColBranch(diagCells, i, tableScroll, colHeader) {
    if (i === 0) return '';
    const startCell = diagCells[i];
    const state = {
      d: `M ${startCell.x} ${startCell.y}`,
      x: startCell.x,
      y: startCell.y,
    };

    let lastCell = null;
    for (let k = 0; k < i; k++) {
      const r = i - 1 - k;
      const cell = cellRectRC(tableScroll, r, i);
      if (!cell) break;
      lastCell = cell;
      const seedBase = i * 31 + r * 13;
      if (k % 2 === 0) {
        // left-side wrap: UP left border + RIGHT top border
        wobble(state, cell.x,          cell.y, 5.5, seedBase + 1);
        wobble(state, cell.x + cell.w, cell.y, 5.5, seedBase + 2);
      } else {
        // right-side wrap: UP right border + LEFT top border
        wobble(state, cell.x + cell.w, cell.y, 5.5, seedBase + 3);
        wobble(state, cell.x,          cell.y, 5.5, seedBase + 4);
      }
    }

    if (colHeader && lastCell) {
      meanderIntoHeader(state, colHeader, /*horizontal=*/false, i);
    }

    return state.d;
  }

  // ── Meander into a header cell — two wandering waypoints, ending at a
  //    randomized spot in the header. Adds character to the entries so they
  //    don't all look like the same C-curve into the same point.  ─────────
  function meanderIntoHeader(state, header, horizontal, seed) {
    // End point — randomized within header (avoid the very edges)
    const endX = header.x + header.w * (horizontal
      ? 0.30 + noise(seed * 2.7, 5) * 0.50
      : 0.30 + noise(seed * 2.7, 5) * 0.55);
    const endY = header.y + header.h * (horizontal
      ? 0.30 + noise(seed * 3.1, 7) * 0.55
      : 0.45 + noise(seed * 3.1, 7) * 0.40);

    // Two waypoints for irregular wander
    const w1x = state.x + (endX - state.x) * (0.30 + noise(seed * 1.3, 11) * 0.15)
              + (horizontal ? 0 : (noise(seed, 9) - 0.5) * 18);
    const w1y = state.y + (endY - state.y) * (0.30 + noise(seed * 1.7, 13) * 0.15)
              + (horizontal ? (noise(seed, 19) - 0.5) * 18 : 0);
    const w2x = state.x + (endX - state.x) * (0.62 + noise(seed * 2.3, 17) * 0.16)
              + (horizontal ? 0 : (noise(seed, 23) - 0.5) * 14);
    const w2y = state.y + (endY - state.y) * (0.62 + noise(seed * 2.9, 19) * 0.16)
              + (horizontal ? (noise(seed, 29) - 0.5) * 14 : 0);

    wobble(state, w1x, w1y, 3, seed * 7 + 1);
    wobble(state, w2x, w2y, 3, seed * 7 + 3);
    wobble(state, endX, endY, 2.5, seed * 7 + 5);

    // Tiny curl at the terminus
    const curlA = horizontal ? -1 : -1;
    state.d += ` q ${curlA * 5} -4, ${curlA * 2} -9`;
  }

  // ── Per-cell leaf/flower stems penetrating into the cell ──
  //    Each cell gets 1–3 small stems from a randomized point on the nearest
  //    vine border, curling inward to a random target inside the cell, with
  //    a leaf/flower/bud at the target.                                    */
  function drawCellFlora(stemParent, leafParent, flowerParent, cell, r, c) {
    // 2–5 flora per cell so the trellis feels lush
    const nFlora = 2 + Math.floor(noise(r * 2.7, c * 3.1) * 3.6);

    // Safe region for endpoints inside the cell:
    //   Cell padding is 9px L/R top, 18px bottom; text wraps over the upper
    //   ~70% of the cell. We aim flora at the bottom 35% + the side strips.
    for (let k = 0; k < nFlora; k++) {
      const ka = noise(r * 5 + k * 1.3, c * 7 + k * 0.7);
      const kb = noise(c * 4 + k * 1.9, r * 6 + k * 2.3);
      const kc = noise2(r + k, c + k * 0.5);
      const kd = noise2(c + k * 0.7, r + k * 1.1);

      // Pick which border the stem grows from — weighted toward bottom + sides
      // (top is rarer because cell text starts at top-left)
      let edge;
      const e = ka;
      if      (e < 0.55) edge = 'bottom';   // 55%
      else if (e < 0.78) edge = (kb < 0.5 ? 'left' : 'right');  // 23%
      else if (e < 0.92) edge = 'corner-bl';  // 14%
      else               edge = 'top';        // 8%

      // Source on the chosen border (with offset variance)
      let sx, sy;
      if (edge === 'bottom') {
        sx = cell.x + cell.w * (0.12 + kc * 0.76);
        sy = cell.y + cell.h;
      } else if (edge === 'left') {
        sx = cell.x;
        sy = cell.y + cell.h * (0.35 + kc * 0.55);
      } else if (edge === 'right') {
        sx = cell.x + cell.w;
        sy = cell.y + cell.h * (0.35 + kc * 0.55);
      } else if (edge === 'corner-bl') {
        sx = cell.x;
        sy = cell.y + cell.h;
      } else { // top
        sx = cell.x + cell.w * (0.4 + kc * 0.55);
        sy = cell.y;
      }

      // Target inside the cell — bottom band, with horizontal random
      const txRand = 0.15 + kd * 0.70;
      let tx = cell.x + cell.w * txRand;
      let ty = cell.y + cell.h * (0.62 + kb * 0.30);

      // For 'top' source, route into the top-right band (away from text)
      if (edge === 'top') {
        tx = cell.x + cell.w * (0.7 + kd * 0.25);
        ty = cell.y + cell.h * (0.18 + kb * 0.15);
      } else if (edge === 'left' || edge === 'right') {
        // Keep target in lower half
        ty = cell.y + cell.h * (0.55 + kb * 0.35);
      }

      // Draw the connector stem — a smooth S-curve
      const dx = tx - sx, dy = ty - sy;
      const cp1x = sx + dx * (0.15 + kc * 0.25);
      const cp1y = sy + dy * 0.45 + (kd - 0.5) * 8;
      const cp2x = tx - dx * (0.20 + kd * 0.25);
      const cp2y = ty - dy * 0.30 + (kc - 0.5) * 8;
      el('path', {
        class: 'flora-stemlet',
        d: `M ${sx} ${sy} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${tx} ${ty}`,
      }, stemParent);

      // Pick endpoint type: 35% flower / 50% leaf / 15% bud
      const type = ka * 0.6 + kb * 0.4;  // re-mix
      const sense = (kd > 0.5) ? 1 : -1;
      const angle = (kc * 360) - 180;

      if (type > 0.78) {
        drawFlower(flowerParent, tx, ty, 8 + ka * 4, kb > 0.6 ? 6 : 5);
      } else if (type > 0.60) {
        // 3-lobed
        drawLeaf(leafParent, tx, ty, 13 + ka * 5, angle, sense, 3);
      } else if (type > 0.40) {
        // willow long leaf
        drawLeaf(leafParent, tx, ty, 12 + ka * 5, angle, sense, 4);
      } else if (type > 0.20) {
        // small standard leaf
        drawLeaf(leafParent, tx, ty, 10 + ka * 4, angle, sense, 1);
      } else if (type > 0.10) {
        // round leaf
        drawLeaf(leafParent, tx, ty, 11 + ka * 3, angle, sense, 6);
      } else {
        drawBud(leafParent, tx, ty, 7 + ka * 3, angle);
      }
    }
  }

  // ── Larger leaf clusters at each diagonal cell — markers of the spine ──
  function drawDiagonalSignature(leafParent, flowerParent, cell, i) {
    const n = noise(i, i * 1.7);
    const sideX = (i % 2 === 0 ? -1 : 1);
    // Main leaf
    const mainAngle = sideX > 0 ? -45 + n * 16 : 45 - n * 16;
    drawLeaf(leafParent,
      cell.x + cell.w * (sideX > 0 ? 0.78 : 0.22),
      cell.y + cell.h * 0.65,
      22 + n * 4, mainAngle, sideX, 3);
    // Secondary smaller leaf
    drawLeaf(leafParent,
      cell.x + cell.w * (sideX > 0 ? 0.30 : 0.70),
      cell.y + cell.h * 0.78,
      14 + n * 3, -mainAngle * 0.8, -sideX, 1);
    // Flower
    drawFlower(flowerParent,
      cell.x + cell.w * 0.5,
      cell.y + cell.h * (0.42 + n * 0.18),
      11);
  }

  // ── Decorate one matrix container ──────────────────────────────────────
  // By default, every .matrix-container picks up the woven v3 trellis.
  // Opt-out per mount by setting data-flora="off" on the mount or the
  // container itself.                                                       */
  function decorate(container) {
    if (container.dataset.floraDecorated === '1') return;

    let variant = container.dataset.flora;
    if (!variant && container.parentElement) variant = container.parentElement.dataset.flora;
    if (variant === 'off') return;
    if (!variant) variant = 'v3';
    if (!['v1', 'v2', 'v3'].includes(variant)) variant = 'v3';

    container.dataset.flora = variant;
    container.dataset.floraDecorated = '1';

    setTimeout(() => build(container, variant), 16);
  }

  function build(container, variant) {
    const tableScroll = container.querySelector('.table-scroll');
    const table = container.querySelector('table');
    if (!tableScroll || !table) return;
    const firstRow = table.querySelector('tbody tr');
    if (!firstRow) return;
    const nCols = firstRow.querySelectorAll('td').length;
    const nRows = table.querySelectorAll('tbody tr').length;

    // Cleanup prior layer
    tableScroll.querySelectorAll('.trellis-flora-svg').forEach((s) => s.remove());

    const W = table.offsetWidth;
    const H = table.offsetHeight;
    const svg = el('svg', {
      class: 'trellis-flora-svg',
      width: W,
      height: H,
      viewBox: `0 0 ${W} ${H}`,
    });
    if (getComputedStyle(tableScroll).position === 'static') {
      tableScroll.style.position = 'relative';
    }
    tableScroll.appendChild(svg);

    // Layer order (back → front)
    const pegLayer    = el('g', { class: 'flora-pegs' }, svg);
    const branchLayer = el('g', { class: 'flora-branches' }, svg);
    const stemLayer   = el('g', { class: 'flora-stem-layer' }, svg);
    const stemletLayer = el('g', { class: 'flora-stemlets' }, svg);
    const leafLayer   = el('g', { class: 'flora-leaves' }, svg);
    const flowerLayer = el('g', { class: 'flora-flowers' }, svg);

    drawPegs(pegLayer, tableScroll, nRows, nCols);

    // Diagonal cell rects
    const diagCells = [];
    for (let i = 0; i < Math.min(nRows, nCols); i++) {
      const c = cellRectRC(tableScroll, i, i);
      if (c) diagCells.push(c);
    }
    if (diagCells.length === 0) return;

    // Row + column branches — drawn first so the main stem sits on top
    for (let i = 1; i < diagCells.length; i++) {
      const rowHeader = rowHeaderRect(tableScroll, i);
      const colHeader = colHeaderRect(tableScroll, i);
      const rowD = buildRowBranch(diagCells, i, tableScroll, rowHeader);
      const colD = buildColBranch(diagCells, i, tableScroll, colHeader);
      if (rowD) el('path', { class: 'flora-branch', d: rowD }, branchLayer);
      if (colD) el('path', { class: 'flora-branch', d: colD }, branchLayer);
    }

    // Main diagonal vine
    const corner = cornerCellRect(tableScroll);
    const stemD = buildMainStem(diagCells, corner);
    el('path', { class: 'flora-stem', d: stemD }, stemLayer);

    // A terminus flower inside the corner cell
    if (corner) {
      drawFlower(flowerLayer,
        corner.x + corner.w * 0.36,
        corner.y + corner.h * 0.40,
        12);
    }

    // Diagonal signatures (main leaves + flower per diagonal cell)
    diagCells.forEach((c, i) => drawDiagonalSignature(leafLayer, flowerLayer, c, i));

    // Per-cell flora — every off-diagonal cell receives 1-3 stems
    for (let r = 0; r < nRows; r++) {
      for (let c = 0; c < nCols; c++) {
        if (r === c) continue;
        const cell = cellRectRC(tableScroll, r, c);
        if (cell) drawCellFlora(stemletLayer, leafLayer, flowerLayer, cell, r, c);
      }
    }

    // Rebuild on container resize
    if (!container._floraResize) {
      let t = 0;
      const ro = new ResizeObserver(() => {
        clearTimeout(t);
        t = setTimeout(() => {
          container.dataset.floraDecorated = '0';
          decorate(container);
        }, 120);
      });
      ro.observe(tableScroll);
      container._floraResize = ro;
    }
  }

  // ── Entry point ────────────────────────────────────────────────────────
  function init() {
    document.querySelectorAll('.matrix-container').forEach(decorate);
    const obs = new MutationObserver((muts) => {
      muts.forEach((m) => {
        m.addedNodes.forEach((n) => {
          if (!(n instanceof Element)) return;
          if (n.classList && n.classList.contains('matrix-container')) {
            decorate(n);
          } else if (n.querySelectorAll) {
            n.querySelectorAll('.matrix-container').forEach(decorate);
          }
        });
      });
    });
    obs.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
