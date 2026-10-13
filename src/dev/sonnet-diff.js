// sonnet-diff.js — dev only: what Claude changed in the author's sonnets.
//
// Loaded by src/pages/translations/sonnets/[part].astro on `npm run dev`.
// Compares every verse row (data-key "sonnet.line") with the author's own
// line from his sheet "শেকস্পিয়ারের সনেটধারা" (docs/sonnets-original.json,
// served by the dev integration at /__edit/sonnets-original.json):
//
//   · an edited line: the words Claude put in are marked in the line, and on
//     hover a card shows the author's line over Claude's, his dropped words in
//     red, Claude's in yellow (the bar can also set every original under its line);
//   · a new line (blank in the sheet, or 138/139's pasted copy of 136):
//     the whole line is washed;
//   · in the rail's number grid, sonnets holding either are marked.
//
//   Alt+↓ / Alt+↑   the next / previous changed line
//   the bar at the bottom left: counts, the same steps, originals inline, hide/show
//
// It recomputes whenever a line's text changes (the in-place editor), so a
// line edited back to the author's own stops being marked. Nothing here ships.

(() => {
  const ORIG_URL = '/__edit/sonnets-original.json';
  const KEY_OFF = 'dv-sonnet-diff-off';
  const KEY_INLINE = 'dv-sonnet-diff-inline';
  if (!('highlights' in CSS)) return;

  const style = document.createElement('style');
  style.textContent = `
    ::highlight(dv-ins) { background-color: rgba(255, 196, 0, 0.5); color: inherit; }
    body:not(.dv-off) .tt-table tr.dv-edit > td.bn { box-shadow: inset 4px 0 0 #d9a400; }
    body:not(.dv-off) .tt-table tr.dv-new > td.bn {
      box-shadow: inset 4px 0 0 #c2185b; background-color: rgba(194, 24, 91, 0.09);
    }
    .tt-table tr.dv-orig > td { padding-top: 0; padding-bottom: 0.35rem; background: transparent; }
    .tt-table tr.dv-orig > td.dv-orig-bn {
      box-shadow: inset 4px 0 0 rgba(217, 164, 0, 0.35);
      font-family: var(--bn-font); font-size: 0.82em; line-height: 1.6;
      color: #6b6f78; white-space: normal;
    }
    .dv-orig-bn::before {
      content: 'yours'; font: 600 10px/1 system-ui, sans-serif; letter-spacing: 0.06em;
      text-transform: uppercase; color: #a67c00; margin-right: 0.6em; vertical-align: 0.2em;
    }
    .dv-orig-bn .dv-del { background: rgba(214, 69, 65, 0.18); color: #9b2c25; border-radius: 2px; }
    body:not(.dv-off) #rail-toc a.dv-s-edit { box-shadow: inset 0 -3px 0 #d9a400; }
    body:not(.dv-off) #rail-toc a.dv-s-new  { box-shadow: inset 0 -3px 0 #c2185b; }
    body.dv-off tr.dv-orig { display: none; }
    .dv-bar {
      position: fixed; left: 12px; bottom: 54px; z-index: 9999; display: flex; gap: 6px;
      align-items: center; padding: 6px 8px 6px 12px; background: #2b2f37; color: #f3f1ea;
      font: 12px/1.2 system-ui, sans-serif; border-radius: 4px; box-shadow: 0 2px 10px rgba(0,0,0,.25);
    }
    .dv-bar b { font-weight: 600; }
    .dv-bar .dv-sw { display: inline-block; width: 9px; height: 9px; margin: 0 4px 0 8px; vertical-align: -1px; }
    .dv-bar button {
      font: inherit; color: inherit; background: #3d424c; border: 0; border-radius: 3px;
      padding: 4px 8px; cursor: pointer;
    }
    .dv-bar button:hover { background: #505662; }
    .dv-card {
      position: fixed; z-index: 9998; max-width: min(46rem, calc(100vw - 16px)); pointer-events: none;
      background: #fffdf6; border-left: 3px solid #2b2f37; padding: 8px 12px 9px;
      box-shadow: 0 4px 18px rgba(0,0,0,.18); opacity: 0; visibility: hidden; transition: opacity .12s;
    }
    .dv-card.is-on { opacity: 1; visibility: visible; }
    .dv-card .dv-k { font: 600 10px/1.4 system-ui, sans-serif; letter-spacing: .06em; text-transform: uppercase; color: #6b6f78; margin-bottom: 4px; }
    .dv-card .dv-l { display: flex; gap: 10px; align-items: baseline; }
    .dv-card .dv-who { flex: 0 0 3.6em; font: 600 10px/1 system-ui, sans-serif; text-transform: uppercase; letter-spacing: .06em; color: #a67c00; }
    .dv-card .dv-bn { font-family: var(--bn-font); font-size: 1.05rem; line-height: 1.7; color: #2b2f37; }
    .dv-card .dv-none { font: italic 13px/1.7 system-ui, sans-serif; color: #8a8f99; }
    .dv-card .dv-del { background: rgba(214, 69, 65, 0.2); color: #9b2c25; border-radius: 2px; }
    .dv-card .dv-ins { background: rgba(255, 196, 0, 0.5); border-radius: 2px; }
    tr.dv-flash > td.bn { outline: 2px solid #1d4f9b; outline-offset: -2px; }
  `;
  document.head.appendChild(style);

  // words (Bangla letters with ZWNJ/ZWJ and ’ inside them, or Latin) or single marks
  const TOKEN = /[ঀ-৿‌‍’'A-Za-z0-9]+|\S/g;
  const tokens = (s) => [...s.matchAll(TOKEN)].map((m) => ({ t: m[0], i: m.index, j: m.index + m[0].length }));

  // which tokens of a and of b are outside their longest common subsequence
  function diff(a, b) {
    const n = a.length, m = b.length;
    const L = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));
    for (let i = n - 1; i >= 0; i--)
      for (let j = m - 1; j >= 0; j--)
        L[i][j] = a[i].t === b[j].t ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
    const delA = new Set(), insB = new Set();
    let i = 0, j = 0;
    while (i < n && j < m) {
      if (a[i].t === b[j].t) { i++; j++; }
      else if (L[i + 1][j] >= L[i][j + 1]) delA.add(i++);
      else insB.add(j++);
    }
    while (i < n) delA.add(i++);
    while (j < m) insB.add(j++);
    return { delA, insB };
  }

  // a character range of an element's textContent → a DOM Range over its text nodes
  function rangeIn(el, from, to) {
    const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    const r = document.createRange();
    let pos = 0, started = false, node;
    while ((node = w.nextNode())) {
      const len = node.data.length;
      if (!started && from < pos + len) { r.setStart(node, from - pos); started = true; }
      if (started && to <= pos + len) { r.setEnd(node, to - pos); return r; }
      pos += len;
    }
    return null;
  }

  const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  let ORIG = null, changed = [], bar = null, card = null, observer = null, timer = 0;
  const info = new Map();   // a changed row → { origHtml?, curHtml }

  const isOn = (k) => { try { return !!localStorage.getItem(k); } catch (e) { return false; } };
  const setOn = (k, v) => { try { localStorage.setItem(k, v ? '1' : ''); } catch (e) {} };

  // a line with the given tokens wrapped in <span class=cls>
  function marked(text, toks, set, cls) {
    let html = '', last = 0;
    toks.forEach((x, k) => {
      html += esc(text.slice(last, x.i));
      html += set.has(k) ? '<span class="' + cls + '">' + esc(x.t) + '</span>' : esc(x.t);
      last = x.j;
    });
    return (html + esc(text.slice(last))).trim();
  }
  const tbody = () => document.querySelector('.tt-table tbody');

  function compute() {
    const tb = tbody();
    if (!tb || !ORIG) return;
    observer && observer.disconnect();
    tb.querySelectorAll('tr.dv-orig').forEach((r) => r.remove());
    const ranges = [];
    const sonEdit = new Set(), sonNew = new Set();
    changed = [];
    info.clear();
    hideCard();
    const inline = isOn(KEY_INLINE);
    let nEdit = 0, nNew = 0;
    for (const tr of tb.querySelectorAll('tr[data-key]')) {
      tr.classList.remove('dv-edit', 'dv-new');
      const key = tr.dataset.key, td = tr.querySelector('td.bn');
      if (!td || !(key in ORIG)) continue;
      const cur = (td.textContent || '').normalize('NFC');
      const orig = ORIG[key];
      if (!cur.trim()) continue;
      if (!orig) {
        tr.classList.add('dv-new'); nNew++; sonNew.add(tr.dataset.sonnet); changed.push(tr);
        info.set(tr, { curHtml: esc(cur.trim()) });
        continue;
      }
      const a = tokens(orig), b = tokens(cur);
      if (a.map((x) => x.t).join(' ') === b.map((x) => x.t).join(' ')) continue;
      tr.classList.add('dv-edit'); nEdit++; sonEdit.add(tr.dataset.sonnet); changed.push(tr);
      const { delA, insB } = diff(a, b);
      for (const k of insB) { const r = rangeIn(td, b[k].i, b[k].j); if (r) ranges.push(r); }
      const origHtml = marked(orig, a, delA, 'dv-del'), curHtml = marked(cur, b, insB, 'dv-ins');
      info.set(tr, { origHtml, curHtml });
      if (!inline) continue;
      const o = document.createElement('tr');
      o.className = 'dv-orig';
      o.setAttribute('data-no-edit', '');
      const cols = tr.children.length;
      o.innerHTML = '<td class="dv-orig-bn">' + origHtml + '</td>' + '<td></td>'.repeat(Math.max(0, cols - 1));
      tr.after(o);
    }
    if (document.body.classList.contains('dv-off')) CSS.highlights.delete('dv-ins');
    else CSS.highlights.set('dv-ins', new Highlight(...ranges));
    markRail(sonEdit, sonNew);
    renderBar(nEdit, nNew, sonEdit.size, sonNew.size);
    observe();
  }

  function markRail(sonEdit, sonNew) {
    document.querySelectorAll('#rail-toc a[href^="#s"]').forEach((a) => {
      const n = a.getAttribute('href').slice(2);
      a.classList.toggle('dv-s-new', sonNew.has(n));
      a.classList.toggle('dv-s-edit', !sonNew.has(n) && sonEdit.has(n));
    });
  }

  function renderBar(nEdit, nNew, sEdit, sNew) {
    if (!bar) {
      bar = document.createElement('div');
      bar.className = 'dv-bar';
      bar.setAttribute('data-no-edit', '');
      document.body.appendChild(bar);
      bar.addEventListener('click', (e) => {
        const b = e.target.closest('button');
        if (!b) return;
        if (b.dataset.go) step(+b.dataset.go);
        else if (b.dataset.inline != null) { setOn(KEY_INLINE, !isOn(KEY_INLINE)); compute(); }
        else toggle();
      });
    }
    const off = document.body.classList.contains('dv-off');
    bar.innerHTML =
      '<span><b>Claude</b><span class="dv-sw" style="background:#d9a400"></span>' + nEdit +
      ' edited (' + sEdit + ' sonnets)<span class="dv-sw" style="background:#c2185b"></span>' + nNew +
      ' new (' + sNew + ')</span>' +
      '<button data-go="-1" title="Alt+↑">↑</button><button data-go="1" title="Alt+↓">↓</button>' +
      '<button data-inline title="your original under every changed line">' +
      (isOn(KEY_INLINE) ? 'originals: shown' : 'originals: on hover') + '</button>' +
      '<button>' + (off ? 'show' : 'hide') + '</button>';
  }

  function toggle() {
    const off = document.body.classList.toggle('dv-off');
    setOn(KEY_OFF, off);
    compute();
  }

  // the hover card: fixed above (or below) the line, so nothing on the page moves
  function showCard(tr) {
    const d = info.get(tr);
    if (!d || document.body.classList.contains('dv-off')) return;
    if (!card) {
      card = document.createElement('div');
      card.className = 'dv-card';
      card.setAttribute('data-no-edit', '');
      document.body.appendChild(card);
    }
    const n = tr.dataset.key;
    const pasted = /^13[89]\./.test(n);
    card.innerHTML = d.origHtml
      ? '<div class="dv-k">' + n + ' · Claude changed your line</div>' +
        '<div class="dv-l"><span class="dv-who">yours</span><span class="dv-bn">' + d.origHtml + '</span></div>' +
        '<div class="dv-l"><span class="dv-who">Claude</span><span class="dv-bn">' + d.curHtml + '</span></div>'
      : '<div class="dv-k">' + n + ' · new, Claude\'s translation</div>' +
        '<div class="dv-l"><span class="dv-who">yours</span><span class="dv-none">' +
        (pasted ? 'a pasted copy of sonnet 136 (not a translation of this one)' : 'nothing (blank in your sheet)') +
        '</span></div>' +
        '<div class="dv-l"><span class="dv-who">Claude</span><span class="dv-bn"><span class="dv-ins">' + d.curHtml + '</span></span></div>';
    const r = (tr.querySelector('td.bn') || tr).getBoundingClientRect();
    card.style.left = Math.max(8, Math.min(r.left, innerWidth - card.offsetWidth - 8)) + 'px';
    const h = card.offsetHeight;
    card.style.top = (r.top - h - 6 > 8 ? r.top - h - 6 : r.bottom + 6) + 'px';
    card.classList.add('is-on');
  }
  function hideCard() { card && card.classList.remove('is-on'); }

  document.addEventListener('mouseover', (e) => {
    const tr = e.target.closest && e.target.closest('.tt-table tr.dv-edit, .tt-table tr.dv-new');
    if (tr) showCard(tr); else hideCard();
  });
  addEventListener('scroll', hideCard, { passive: true });

  // the next changed line below (or above) the screen's upper third
  function step(dir) {
    if (!changed.length) return;
    const y = innerHeight * 0.33;
    let k;
    if (dir > 0) k = changed.findIndex((tr) => tr.getBoundingClientRect().top > y + 2);
    else { k = -1; changed.forEach((tr, i) => { if (tr.getBoundingClientRect().top < y - 2) k = i; }); }
    if (k < 0) k = dir > 0 ? 0 : changed.length - 1;
    const tr = changed[k];
    scrollTo({ top: scrollY + tr.getBoundingClientRect().top - y, behavior: 'smooth' });
    tr.classList.add('dv-flash');
    setTimeout(() => tr.classList.remove('dv-flash'), 900);
  }

  // recompute when a verse's text changes (the editor, the word-span wrapper)
  function observe() {
    const tb = tbody();
    if (!tb) return;
    observer = observer || new MutationObserver((recs) => {
      if (recs.every((r) => r.target.closest && r.target.closest('tr.dv-orig'))) return;
      clearTimeout(timer);
      timer = setTimeout(compute, 250);
    });
    observer.observe(tb, { childList: true, subtree: true, characterData: true });
  }

  addEventListener('keydown', (e) => {
    if (!e.altKey || e.ctrlKey || e.metaKey) return;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      step(e.key === 'ArrowDown' ? 1 : -1);
    }
  });

  // the rail's grid is rebuilt on every content-ready; mark it again after
  document.addEventListener('content-ready', () => setTimeout(compute, 50));

  try { if (localStorage.getItem(KEY_OFF)) document.body.classList.add('dv-off'); } catch (e) {}

  fetch(ORIG_URL).then((r) => r.json()).then((o) => {
    ORIG = o;
    if (tbody() && tbody().querySelector('tr[data-key]')) compute();
    else document.addEventListener('md-loader-done', () => setTimeout(compute, 50), { once: true });
  });
})();
