// crib.js — dev only: a literal English line beside each line of the original.
//
// Loaded by BookReader.astro on `npm run dev`. The author reads the Greek (or
// Latin) poorly and English well, so to check a Bangla line against its
// original he needs that original's sense line by line. The crib lives
// outside the site, in docs/cribs/<work>/<part>.tsv (`N<TAB>english`, N = the
// original's line number), served by the dev integration at
// /__edit/crib?src=<the page's .md path>; a page without a crib gets nothing.
//
//   hover a line (mouse): a card under it, overlaid on the page (nothing
//     moves), the line's English with the lines either side faint, since a
//     sentence runs on;
//   tap a Bangla line (touch, where the original column is hidden): the same
//     card fixed at the screen's foot; tap it or elsewhere to close.
//
// It re-reads the crib when the table is rebuilt, so an updated crib shows on
// the next load. Nothing here ships.

(() => {
  const cfg = window.TRANS_CONFIG || {};
  if (!cfg.src) return;
  const mdPath = new URL(cfg.src, location.href).pathname;
  let crib = null;

  const style = document.createElement('style');
  style.textContent = `
    .dv-crib { position: absolute; z-index: 40; max-width: 34rem; min-width: 18rem;
      background: var(--paper, #fcfcfb); border-left: 3px solid var(--tint-d, #a97c18);
      box-shadow: 0 6px 24px rgba(17, 19, 23, 0.14); padding: 0.55rem 0.9rem 0.6rem;
      font: 0.98rem/1.5 "Spectral", Georgia, serif; color: var(--read-ink, #2b2f37);
      pointer-events: none; }
    .dv-crib[hidden] { display: none; }
    .dv-crib p { margin: 0; }
    .dv-crib .dv-n { font: 600 0.7rem/1 system-ui, sans-serif; color: var(--accent-2, #a97c18);
      letter-spacing: 0.04em; margin-right: 0.5rem; }
    .dv-crib .dv-side { color: #8b8f97; font-size: 0.88rem; }
    .dv-crib .dv-here { margin: 0.15rem 0; }
    .dv-crib.dv-foot { position: fixed; z-index: 3000; left: 0; right: 0; bottom: 0; max-width: none;
      border-left: none; border-top: 3px solid var(--tint-d, #a97c18); pointer-events: auto;
      padding: 0.7rem 16px calc(0.8rem + env(safe-area-inset-bottom)); }
    .tt-table tr.dv-crib-row td { background-color: var(--tt-hover, rgba(29,79,155,0.05)); }
  `;
  document.head.appendChild(style);

  const card = document.createElement('div');
  card.className = 'dv-crib';
  card.hidden = true;
  document.body.appendChild(card);

  const BN = '\u09e6\u09e7\u09e8\u09e9\u09ea\u09eb\u09ec\u09ed\u09ee\u09ef';
  const toInt = (s) => {
    const d = String(s).replace(/[\u09e6-\u09ef]/g, (c) => BN.indexOf(c)).replace(/\D/g, '');
    return d ? parseInt(d, 10) : null;
  };
  const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

  // each verse row's original line number: the margin's number where it
  // stands (a verse paragraph's first row), else one more than the row before
  function numberRows() {
    let n = null;
    document.querySelectorAll('.tt-table tr[data-mdline]').forEach((tr) => {
      const ln = tr.querySelector('td.ln-col');
      const own = ln ? toInt(ln.textContent.replace(ln.querySelector('.ln-sec')?.textContent || '', '')) : null;
      n = own != null ? own : n != null ? n + 1 : null;
      if (n != null) tr.dataset.cribN = String(n);
    });
  }

  function load() {
    fetch('/__edit/crib?src=' + encodeURIComponent(mdPath))
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { crib = d && Object.keys(d).length ? d : null; if (crib) numberRows(); })
      .catch(() => {});
  }

  let lit = null;
  function show(tr, foot) {
    const n = +tr.dataset.cribN;
    if (!crib || !n || !crib[n]) return hide();
    const side = (k) => (crib[k] ? `<p class="dv-side"><span class="dv-n">${k}</span>${esc(crib[k])}</p>` : '');
    card.innerHTML = side(n - 1) +
      `<p class="dv-here"><span class="dv-n">${n}</span>${esc(crib[n])}</p>` + side(n + 1);
    card.classList.toggle('dv-foot', !!foot);
    if (lit) lit.classList.remove('dv-crib-row');
    lit = tr; tr.classList.add('dv-crib-row');
    card.hidden = false;
    if (!foot) {
      // under the row, at the original's column (the Bangla's when it is hidden)
      const cell = tr.querySelector('td.it, td.en, td.fa');
      const anchor = cell && cell.offsetParent ? cell : tr.querySelector('td.bn') || tr;
      const r = tr.getBoundingClientRect(), a = anchor.getBoundingClientRect();
      const w = Math.min(Math.max(a.width, 288), window.innerWidth - 32);
      card.style.width = w + 'px';
      card.style.left = Math.max(16, Math.min(a.left, window.innerWidth - w - 16)) + scrollX + 'px';
      card.style.top = r.bottom + scrollY + 6 + 'px';
    } else {
      card.style.width = card.style.left = card.style.top = '';
    }
  }
  function hide() {
    card.hidden = true;
    if (lit) { lit.classList.remove('dv-crib-row'); lit = null; }
  }

  // a mouse hovers; a finger taps (pointerType tells them apart, whatever
  // the screen's size)
  let touch = false;
  document.addEventListener('pointerdown', (e) => { touch = e.pointerType !== 'mouse'; }, true);
  document.addEventListener('pointerover', (e) => {
    if (e.pointerType !== 'mouse' || !crib) return;
    touch = false;
    const tr = e.target.closest && e.target.closest('.tt-table tr[data-crib-n]');
    if (tr) { if (tr !== lit) show(tr, false); } else if (lit) hide();
  });
  document.addEventListener('click', (e) => {
    if (!touch || !crib) return;
    if (card.contains(e.target)) return hide();
    if (getSelection && String(getSelection()).length) return;   // a comment being made
    const tr = e.target.closest && e.target.closest('.tt-table tr[data-crib-n]');
    if (tr && tr !== lit) show(tr, true); else hide();
  });
  addEventListener('scroll', () => { if (lit && !touch) hide(); }, { passive: true });

  document.addEventListener('md-loader-done', load);
  if (document.querySelector('.tt-table tr[data-mdline]')) load();
})();
