// Comments — served ONLY by the dev server (the inPlaceEditor integration in
// astro.config.mjs serves this file and /__edit/comments; Base.astro loads it
// in DEV). The production build never references or ships any of it.
//
// The author's notes to Claude, pinned to the words they are about:
//
//   select any text        → a "Comment" key appears by the selection; it opens
//                            a small note (Ctrl+Enter saves, Esc cancels)
//   hover commented words  → the note, with edit / resolve / delete
//   the key at bottom left → every comment: this page, all open, done
//
// Comments live in docs/comments.json (gitignored). Each pins its words by
// the quote itself plus a little text before and after it, so it finds them
// again after a reload; a comment whose words have gone is listed as such.
// Claude works through the open ones and marks each done with a reply
// (scripts/comments.mjs); a done comment leaves the page and stays in "Done".
// The words are marked with the CSS Custom Highlight API, so the page's DOM
// (and the in-place editor, and every engine) never sees them.
(() => {
  if (!('highlights' in CSS)) return;
  const API = '/__edit/comments';
  const JUMP = 'kmba-comment-jump';
  const CTX = 40;   // characters of context kept on either side of a quote
  const UI = '[data-cm-ui]';

  const style = document.createElement('style');
  style.textContent = `
    ::highlight(cm) { background-color: rgba(29, 79, 155, 0.14); text-decoration: underline 2px rgba(29, 79, 155, 0.55); text-underline-offset: 3px; }
    ::highlight(cm-hot) { background-color: rgba(29, 79, 155, 0.3); }
    .cm-ui { font: 13px/1.45 system-ui, sans-serif; color: #f3f1ea; }
    .cm-ui button {
      font: inherit; color: inherit; background: #3d424c; border: 0; border-radius: 3px;
      padding: 4px 9px; cursor: pointer;
    }
    .cm-ui button:hover { background: #505662; }
    .cm-ui button.cm-primary { background: #1d4f9b; }
    .cm-ui button.cm-primary:hover { background: #2a62b8; }
    .cm-bn { font-family: var(--bn-font, serif); }
    .cm-add {
      position: fixed; z-index: 10001; padding: 5px 10px; border-radius: 4px;
      background: #1d4f9b; box-shadow: 0 2px 10px rgba(0,0,0,.25); cursor: pointer; user-select: none;
    }
    .cm-box {
      position: fixed; z-index: 10001; width: min(26rem, calc(100vw - 16px));
      background: #2b2f37; border-radius: 4px; box-shadow: 0 6px 24px rgba(0,0,0,.3); padding: 10px 12px;
    }
    .cm-box .cm-q { color: #c9cdd6; font-size: 15px; margin-bottom: 6px; max-height: 4.5em; overflow: hidden; }
    .cm-box .cm-q::before { content: '“'; } .cm-box .cm-q::after { content: '”'; }
    .cm-box textarea {
      display: block; width: 100%; box-sizing: border-box; min-height: 5.5em; resize: vertical;
      font: 15px/1.5 var(--bn-font, serif); color: #111317; background: #fcfcfb;
      border: 0; border-radius: 3px; padding: 6px 8px;
    }
    .cm-box .cm-row { display: flex; gap: 6px; justify-content: flex-end; align-items: center; margin-top: 8px; }
    .cm-box .cm-row .cm-hint { margin-right: auto; color: #9aa1ad; font-size: 11px; }
    .cm-card .cm-note { font-size: 15px; white-space: pre-wrap; color: #fcfcfb; }
    .cm-card .cm-meta { color: #9aa1ad; font-size: 11px; margin-top: 4px; }
    .cm-key {
      position: fixed; left: 12px; bottom: 12px; z-index: 10000; padding: 7px 12px; border-radius: 4px;
      background: #2b2f37; box-shadow: 0 2px 10px rgba(0,0,0,.25); cursor: pointer; user-select: none;
    }
    .cm-key b { display: inline-block; min-width: 1.4em; text-align: center; margin-left: 6px;
      background: #1d4f9b; border-radius: 9px; padding: 0 5px; font-weight: 600; }
    .cm-key.is-empty b { background: #505662; }
    .cm-panel {
      position: fixed; left: 12px; bottom: 54px; z-index: 10000; width: min(28rem, calc(100vw - 24px));
      max-height: min(70vh, 40rem); display: flex; flex-direction: column;
      background: #2b2f37; border-radius: 4px; box-shadow: 0 6px 24px rgba(0,0,0,.3);
    }
    .cm-tabs { display: flex; gap: 4px; padding: 8px 8px 6px; border-bottom: 1px solid #3d424c; }
    .cm-tabs button.is-on { background: #1d4f9b; }
    .cm-list { overflow: auto; padding: 4px 0; }
    .cm-item { padding: 8px 12px; border-bottom: 1px solid #353a43; cursor: pointer; }
    .cm-item:hover { background: #333842; }
    .cm-item .cm-q { color: #c9cdd6; font-size: 14px; }
    .cm-item .cm-q::before { content: '“'; } .cm-item .cm-q::after { content: '”'; }
    .cm-item .cm-note { font-size: 14px; margin-top: 2px; white-space: pre-wrap; }
    .cm-item .cm-reply { font-size: 13px; margin-top: 4px; color: #b8d4a8; white-space: pre-wrap; }
    .cm-item .cm-reply::before { content: 'Claude: '; font-weight: 600; }
    .cm-item .cm-meta { color: #9aa1ad; font-size: 11px; margin-top: 4px; display: flex; gap: 8px; align-items: center; }
    .cm-item .cm-meta button { padding: 1px 7px; font-size: 11px; }
    .cm-item.is-lost .cm-q { text-decoration: line-through; opacity: .6; }
    .cm-empty { padding: 14px 12px; color: #9aa1ad; }
  `;
  document.head.appendChild(style);

  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const ui = (cls, html) => {
    const el = document.createElement('div');
    el.className = 'cm-ui ' + cls;
    el.setAttribute('data-cm-ui', '');
    el.setAttribute('data-no-edit', '');
    if (html != null) el.innerHTML = html;
    document.body.appendChild(el);
    return el;
  };
  const when = (iso) => {
    const d = new Date(iso);
    return isNaN(d) ? '' : d.toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  };
  const here = () => location.pathname;

  // ── the page's text, flattened, with a way back to its nodes ────────────
  const SKIP_TEXT = 'script, style, noscript, template, ' + UI;
  function textIndex() {
    const nodes = [], starts = [];
    let full = '';
    const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
      acceptNode: (n) => (n.parentElement && n.parentElement.closest(SKIP_TEXT)
        ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT),
    });
    let n;
    while ((n = w.nextNode())) { nodes.push(n); starts.push(full.length); full += n.data; }
    return { nodes, starts, full };
  }
  // a node + offset → its place in the flat text (an element boundary: the
  // first text node after it)
  function offsetOf(ix, node, off) {
    if (node.nodeType === 3) {
      const k = ix.nodes.indexOf(node);
      return k < 0 ? -1 : ix.starts[k] + off;
    }
    const r = document.createRange();
    r.setStart(node, off);
    for (let k = 0; k < ix.nodes.length; k++) {
      if (r.comparePoint(ix.nodes[k], 0) >= 0) return ix.starts[k];
    }
    return ix.full.length;
  }
  // a span of the flat text → a DOM Range
  function rangeAt(ix, from, to) {
    // the last node starting at or before `from`; the last starting before `to`
    const find = (pos, end) => {
      let lo = 0, hi = ix.starts.length - 1;
      while (lo < hi) {
        const mid = (lo + hi + 1) >> 1;
        if (ix.starts[mid] < pos || (!end && ix.starts[mid] === pos)) lo = mid; else hi = mid - 1;
      }
      return lo;
    };
    const a = find(from, false), b = find(to, true);
    const r = document.createRange();
    r.setStart(ix.nodes[a], Math.min(from - ix.starts[a], ix.nodes[a].data.length));
    r.setEnd(ix.nodes[b], Math.min(to - ix.starts[b], ix.nodes[b].data.length));
    return r;
  }
  const tailMatch = (a, b) => { let k = 0; while (k < a.length && k < b.length && a[a.length - 1 - k] === b[b.length - 1 - k]) k++; return k; };
  const headMatch = (a, b) => { let k = 0; while (k < a.length && k < b.length && a[k] === b[k]) k++; return k; };

  // find a comment's words: every place its quote occurs, the one whose
  // surrounding text agrees best with what was around it when it was made
  function locate(ix, c) {
    let best = -1, score = -1, i = ix.full.indexOf(c.quote);
    while (i >= 0) {
      const s = tailMatch(ix.full.slice(Math.max(0, i - CTX), i), c.prefix || '') +
                headMatch(ix.full.slice(i + c.quote.length, i + c.quote.length + CTX), c.suffix || '');
      if (s > score) { score = s; best = i; }
      i = ix.full.indexOf(c.quote, i + 1);
    }
    return best < 0 ? null : rangeAt(ix, best, best + c.quote.length);
  }

  // ── state ────────────────────────────────────────────────────────────────
  let all = [];                 // every comment, every page
  const ranges = new Map();     // id → Range, this page's open comments that were found
  let observer = null, timer = 0;

  const api = (body) => fetch(API, {
    method: body ? 'POST' : 'GET',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  }).then((r) => (r.ok ? r.json() : r.text().then((t) => Promise.reject(new Error(t)))));

  const load = () => api().then((d) => { all = d.comments || []; anchor(); });
  const save = (body) => api(body).then((d) => { all = d.comments || []; anchor(); })
    .catch((e) => toast('Comment not saved: ' + e.message));

  const openHere = () => all.filter((c) => c.page === here() && c.status !== 'done');

  function anchor() {
    observer && observer.disconnect();
    ranges.clear();
    const mine = openHere();
    if (mine.length) {
      const ix = textIndex();
      for (const c of mine) { const r = locate(ix, c); if (r) ranges.set(c.id, r); }
    }
    CSS.highlights.set('cm', new Highlight(...ranges.values()));
    renderKey();
    if (panel && !panel.hidden) renderPanel();
    landJump();
    observe();
  }

  // the page builds itself after load (md-loader, trellis.js) and the editor
  // changes text: find the words again once things settle
  function observe() {
    observer = observer || new MutationObserver((recs) => {
      if (recs.every((r) => {
        const el = r.target.nodeType === 1 ? r.target : r.target.parentElement;
        return el && el.closest(UI);
      })) return;
      clearTimeout(timer);
      timer = setTimeout(anchor, 400);
    });
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
  }

  // ── a small toast (never an alert: it would block the page) ─────────────
  let toastEl = null, toastT = 0;
  function toast(msg) {
    toastEl = toastEl || ui('cm-add', '');
    Object.assign(toastEl.style, { left: '50%', bottom: '16px', transform: 'translateX(-50%)', background: '#963020', pointerEvents: 'none' });
    toastEl.textContent = msg;
    toastEl.hidden = false;
    clearTimeout(toastT);
    toastT = setTimeout(() => { toastEl.hidden = true; }, 5000);
  }

  // ── select → "Comment" ──────────────────────────────────────────────────
  let addKey = null, pending = null;
  function selectionAnchor() {
    const sel = getSelection();
    if (!sel || sel.isCollapsed || !sel.rangeCount) return null;
    const r = sel.getRangeAt(0);
    const host = r.commonAncestorContainer.nodeType === 1 ? r.commonAncestorContainer : r.commonAncestorContainer.parentElement;
    if (!host || host.closest(UI) || host.closest('[contenteditable="true"], input, textarea')) return null;
    const ix = textIndex();
    const a = offsetOf(ix, r.startContainer, r.startOffset);
    const b = offsetOf(ix, r.endContainer, r.endOffset);
    if (a < 0 || b <= a) return null;
    // trim the selection's own white space
    let from = a, to = b;
    while (from < to && /\s/.test(ix.full[from])) from++;
    while (to > from && /\s/.test(ix.full[to - 1])) to--;
    if (to <= from) return null;
    const quote = ix.full.slice(from, to);
    const el = host.closest('[data-mdline], [data-key], [id]');
    return {
      quote,
      prefix: ix.full.slice(Math.max(0, from - CTX), from),
      suffix: ix.full.slice(to, to + CTX),
      rect: r.getBoundingClientRect(),
      where: {
        mdline: el && el.closest('[data-mdline]') ? el.closest('[data-mdline]').getAttribute('data-mdline') : undefined,
        key: el && el.closest('[data-key]') ? el.closest('[data-key]').getAttribute('data-key') : undefined,
        id: el && el.closest('[id]') ? el.closest('[id]').id : undefined,
        src: window.TRANS_CONFIG && window.TRANS_CONFIG.src ? new URL(window.TRANS_CONFIG.src, location.href).pathname : undefined,
      },
    };
  }

  let selT = 0;
  function onSelection() {
    clearTimeout(selT);
    selT = setTimeout(() => {
      if (box && !box.hidden) return;
      const a = selectionAnchor();
      if (!a) { if (addKey) addKey.hidden = true; return; }
      pending = a;
      if (!addKey) {
        addKey = ui('cm-add', 'Comment');
        // keep the selection: act on mousedown, before it collapses
        addKey.addEventListener('mousedown', (e) => { e.preventDefault(); e.stopPropagation(); compose(pending); });
      }
      addKey.hidden = false;
      placeKey(a.rect);
    }, 120);
  }
  function placeKey(rect) {
    addKey.style.top = (rect.top - 34 > 8 ? rect.top - 34 : rect.bottom + 8) + 'px';
    addKey.style.left = Math.max(8, Math.min(rect.right - 40, innerWidth - 110)) + 'px';
  }
  document.addEventListener('selectionchange', onSelection);
  // the key rides with the selection as the page scrolls
  addEventListener('scroll', () => {
    hideCard();
    if (!addKey || addKey.hidden) return;
    const sel = getSelection();
    if (!sel.rangeCount || sel.isCollapsed) { addKey.hidden = true; return; }
    const rect = sel.getRangeAt(0).getBoundingClientRect();
    if (pending) pending.rect = rect;
    placeKey(rect);
  }, { passive: true });

  // ── the note: write one, or edit one ────────────────────────────────────
  let box = null;
  function compose(a, existing) {
    if (addKey) addKey.hidden = true;
    hideCard(true);
    box = box || ui('cm-box', '');
    box.innerHTML =
      '<div class="cm-q cm-bn">' + esc(existing ? existing.quote : a.quote) + '</div>' +
      '<textarea placeholder="A note for Claude…"></textarea>' +
      '<div class="cm-row"><span class="cm-hint">Ctrl+Enter saves · Esc cancels</span>' +
      '<button data-a="cancel">Cancel</button><button class="cm-primary" data-a="save">Save</button></div>';
    const ta = box.querySelector('textarea');
    ta.value = existing ? existing.note : '';
    box.hidden = false;
    const rect = a ? a.rect : (ranges.get(existing.id) || { getBoundingClientRect: () => ({ top: innerHeight / 2, bottom: innerHeight / 2, left: 16 }) }).getBoundingClientRect();
    const h = box.offsetHeight;
    box.style.left = Math.max(8, Math.min(rect.left, innerWidth - box.offsetWidth - 8)) + 'px';
    box.style.top = (rect.bottom + 8 + h < innerHeight ? rect.bottom + 8 : Math.max(8, rect.top - h - 8)) + 'px';
    ta.focus();
    const done = (ok) => {
      const note = ta.value.trim();
      box.hidden = true;
      if (!ok || !note) return;
      if (existing) save({ op: 'update', id: existing.id, patch: { note } });
      else {
        save({ op: 'add', comment: {
          page: here(), title: document.title, quote: a.quote, prefix: a.prefix, suffix: a.suffix,
          where: a.where, note,
        } });
        getSelection().removeAllRanges();
      }
    };
    box.onkeydown = (e) => {
      e.stopPropagation();
      if (e.key === 'Escape') { e.preventDefault(); done(false); }
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); done(true); }
    };
    box.onclick = (e) => {
      const b = e.target.closest('button');
      if (b) done(b.dataset.a === 'save');
    };
  }

  // ── hover the marked words: the note ────────────────────────────────────
  let card = null, cardFor = null, hideT = 0, rafMove = 0;
  function hit(x, y) {
    for (const [id, r] of ranges) {
      for (const q of r.getClientRects()) {
        if (x >= q.left - 1 && x <= q.right + 1 && y >= q.top - 1 && y <= q.bottom + 1) return id;
      }
    }
    return null;
  }
  addEventListener('mousemove', (e) => {
    if (rafMove || !ranges.size) return;
    rafMove = requestAnimationFrame(() => {
      rafMove = 0;
      if (box && !box.hidden) return;
      if (e.target.closest && e.target.closest(UI)) { clearTimeout(hideT); return; }
      const id = hit(e.clientX, e.clientY);
      if (id) showCard(id); else hideCard();
    });
  }, { passive: true });

  function showCard(id) {
    clearTimeout(hideT);
    if (cardFor === id && card && !card.hidden) return;
    const c = all.find((x) => x.id === id), r = ranges.get(id);
    if (!c || !r) return;
    card = card || ui('cm-box cm-card', '');
    card.innerHTML =
      '<div class="cm-note cm-bn">' + esc(c.note) + '</div>' +
      '<div class="cm-meta">' + esc(when(c.created)) + '</div>' +
      '<div class="cm-row"><button data-a="edit">Edit</button><button data-a="del">Delete</button>' +
      '<button class="cm-primary" data-a="done" title="mark it done yourself">Resolve</button></div>';
    card.onclick = (e) => {
      const b = e.target.closest('button');
      if (!b) return;
      hideCard(true);
      if (b.dataset.a === 'edit') compose(null, c);
      if (b.dataset.a === 'del') save({ op: 'delete', id: c.id });
      if (b.dataset.a === 'done') save({ op: 'update', id: c.id, patch: { status: 'done', reply: c.reply || '(resolved by you)' } });
    };
    card.hidden = false;
    cardFor = id;
    CSS.highlights.set('cm-hot', new Highlight(r));
    const q = r.getBoundingClientRect(), h = card.offsetHeight;
    card.style.left = Math.max(8, Math.min(q.left, innerWidth - card.offsetWidth - 8)) + 'px';
    card.style.top = (q.top - h - 6 > 8 ? q.top - h - 6 : q.bottom + 6) + 'px';
  }
  function hideCard(now) {
    if (!card || card.hidden) return;
    clearTimeout(hideT);
    const go = () => { card.hidden = true; cardFor = null; CSS.highlights.delete('cm-hot'); };
    if (now === true) go(); else hideT = setTimeout(go, 300);
  }

  // ── the key and the list ────────────────────────────────────────────────
  let key = null, panel = null, tab = 'page';
  function renderKey() {
    if (!key) {
      key = ui('cm-key', '');
      key.addEventListener('click', () => {
        if (!panel) { panel = ui('cm-panel', ''); panel.hidden = true; }
        panel.hidden = !panel.hidden;
        if (!panel.hidden) renderPanel();
      });
    }
    const n = openHere().length, total = all.filter((c) => c.status !== 'done').length;
    key.classList.toggle('is-empty', !n);
    key.innerHTML = 'Comments<b>' + n + '</b>' + (total > n ? ' <span style="color:#9aa1ad">· ' + total + ' open in all</span>' : '');
    key.title = 'Select text anywhere to comment';
  }

  function renderPanel() {
    const page = openHere(), open = all.filter((c) => c.status !== 'done'),
      done = all.filter((c) => c.status === 'done').sort((a, b) => (b.resolved || '').localeCompare(a.resolved || ''));
    const list = tab === 'page' ? page : tab === 'open' ? open : done;
    const item = (c) => {
      const lost = c.page === here() && c.status !== 'done' && !ranges.has(c.id);
      return '<div class="cm-item' + (lost ? ' is-lost' : '') + '" data-id="' + esc(c.id) + '">' +
        '<div class="cm-q cm-bn">' + esc(c.quote.length > 140 ? c.quote.slice(0, 140) + '…' : c.quote) + '</div>' +
        '<div class="cm-note cm-bn">' + esc(c.note) + '</div>' +
        (c.status === 'done' && c.reply ? '<div class="cm-reply cm-bn">' + esc(c.reply) + '</div>' : '') +
        '<div class="cm-meta"><span>' + esc(tab === 'page' ? when(c.created) : (c.title || c.page).split(' — ')[0] + ' · ' + when(c.created)) +
        (lost ? ' · its words are no longer on the page' : '') + '</span>' +
        (c.status === 'done'
          ? '<button data-a="reopen">Reopen</button>'
          : '<button data-a="done">Resolve</button><button data-a="del">Delete</button>') +
        '</div></div>';
    };
    panel.innerHTML =
      '<div class="cm-tabs">' +
      '<button data-t="page"' + (tab === 'page' ? ' class="is-on"' : '') + '>This page (' + page.length + ')</button>' +
      '<button data-t="open"' + (tab === 'open' ? ' class="is-on"' : '') + '>All open (' + open.length + ')</button>' +
      '<button data-t="done"' + (tab === 'done' ? ' class="is-on"' : '') + '>Done (' + done.length + ')</button>' +
      '</div><div class="cm-list">' +
      (list.length ? list.map(item).join('') : '<div class="cm-empty">' +
        (tab === 'done' ? 'Nothing done yet.' : 'No open comments. Select any text to add one.') + '</div>') +
      '</div>';
    panel.onclick = (e) => {
      const t = e.target.closest('[data-t]');
      if (t) { tab = t.dataset.t; renderPanel(); return; }
      const it = e.target.closest('.cm-item');
      if (!it) return;
      const c = all.find((x) => x.id === it.dataset.id);
      const b = e.target.closest('button');
      if (b) {
        if (b.dataset.a === 'done') save({ op: 'update', id: c.id, patch: { status: 'done', reply: c.reply || '(resolved by you)' } });
        if (b.dataset.a === 'reopen') save({ op: 'update', id: c.id, patch: { status: 'open' } });
        if (b.dataset.a === 'del') save({ op: 'delete', id: c.id });
        return;
      }
      if (c.page === here()) goTo(c.id);
      else if (c.status !== 'done') { try { sessionStorage.setItem(JUMP, c.id); } catch (err) {} location.href = c.page; }
      else location.href = c.page;
    };
  }

  function goTo(id) {
    const r = ranges.get(id);
    if (!r) return;
    const q = r.getBoundingClientRect();
    scrollTo({ top: scrollY + q.top - innerHeight * 0.35, behavior: 'smooth' });
    CSS.highlights.set('cm-hot', new Highlight(r));
    setTimeout(() => { if (cardFor !== id) CSS.highlights.delete('cm-hot'); }, 1600);
  }

  // arriving from the list on another page: go to the words once found
  function landJump() {
    let id = null;
    try { id = sessionStorage.getItem(JUMP); } catch (e) {}
    if (!id || !ranges.has(id)) return;
    try { sessionStorage.removeItem(JUMP); } catch (e) {}
    setTimeout(() => goTo(id), 200);
  }

  addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (panel && !panel.hidden) panel.hidden = true;
      if (addKey) addKey.hidden = true;
      hideCard(true);
    }
  });

  load();
  document.addEventListener('content-ready', () => setTimeout(anchor, 100));
  // Claude resolves comments in the file while the page is open: look again
  // when the tab comes back into view
  document.addEventListener('visibilitychange', () => { if (!document.hidden) load(); });
})();
