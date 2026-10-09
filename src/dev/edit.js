// In-place editor — served ONLY by the dev server (the inPlaceEditor
// integration in astro.config.mjs; Base.astro loads it in DEV, and the
// production build never references or ships this file).
//
//   Ctrl+click any text   → it becomes editable where it stands: a caret
//                           appears at the click, nothing else changes
//   Ctrl+Enter (⌘+Enter)  → save into its source file, stay in place
//   Esc                   → cancel, put the original back
//   Enter                 → a new line, only in a verse that spans lines
//
// Two ways back to the source:
//   · a verse (Translations, Pangea): its row carries data-mdline, so the
//     clicked cell — বাংলা, or the source language beside it — is written
//     into those exact lines of the .md;
//   · everything else (essays, trellis panels, Panthea, page text): the
//     element's text, rendered back to Markdown, is found once in the page's
//     own sources (or the site's) and replaced.
(() => {
  const EDITABLE = [
    'p', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'figcaption',
    'dt', 'dd', 'td', 'th', 'summary',
    '.panel-short', '.panel-prop', '.panel-name', '.panel-meta',
    '.section-title', '.section-intro', '.th-name', '.prop-name', '.prop-desc',
    '.title', '.work-title', '.macha-cue',
  ].join(', ');
  const NEVER = 'nav, .nav-sheet, .cell-btn, .toc-panel, .mx-tabs, script, style, [data-no-edit]';
  const RESTORE = 'kmba-edit-restore';

  // ── the page's own sources, tried before the whole site ─────────────────
  const hints = () => {
    const out = [];
    const t = window.TRANS_CONFIG, m = window.TRELLIS_CONFIG;
    if (t && t.src) out.push(new URL(t.src, location.href).pathname);
    if (m && m.data) out.push(new URL(m.data, location.href).pathname);
    if (m && m.essay) out.push(new URL(m.essay, location.href).pathname);
    document.querySelectorAll('[data-md]').forEach((el) => {
      out.push('@stories/panthea/' + el.getAttribute('data-md'));
    });
    return out;
  };

  // ── rendered DOM → the Markdown it came from ────────────────────────────
  const SKIP = ['cell-ref-num', 'm-sep', 'f-sep', 'bn-missing', 'th-num'];
  const toMd = (node) => {
    if (node.nodeType === 3) return node.data;
    if (node.nodeType !== 1) return '';
    if (SKIP.some((c) => node.classList.contains(c))) return '';
    if (node.tagName === 'BR') return '\n';
    const inner = [...node.childNodes].map(toMd).join('');
    switch (node.tagName) {
      case 'EM': case 'I': return inner.trim() ? '*' + inner + '*' : inner;
      case 'STRONG': case 'B': return inner.trim() ? '**' + inner + '**' : inner;
      case 'A':
        if (node.classList.contains('cell-ref') && node.dataset.ref) {
          return '[' + inner + '](#' + node.dataset.ref + ')';
        }
        return inner;
      default: return inner;
    }
  };
  const toPlain = (node) => {
    const c = node.cloneNode(true);
    c.querySelectorAll(SKIP.map((s) => '.' + s).join(',')).forEach((x) => x.remove());
    c.querySelectorAll('br').forEach((br) => br.replaceWith('\n'));
    return c.textContent;
  };
  const flat = (s) => s.replace(/ /g, ' ').replace(/\s+/g, ' ').trim();
  const lines = (s) => s.replace(/ /g, ' ').split('\n').map((x) => x.replace(/\s+/g, ' ').trim());
  const escHtml = (s) => s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

  // ── a small toast, bottom-left; never an alert (it would block the page) ─
  let toastEl = null, toastT = 0;
  const toast = (msg, bad) => {
    if (!toastEl) {
      toastEl = document.createElement('div');
      toastEl.setAttribute('data-no-edit', '');
      Object.assign(toastEl.style, {
        position: 'fixed', left: '16px', bottom: '16px', zIndex: 9999, maxWidth: '520px',
        padding: '8px 14px', borderRadius: '8px', font: '14px/1.5 var(--bn-font, serif)',
        background: 'rgba(14,26,43,.9)', color: '#fff', pointerEvents: 'none',
        transition: 'opacity .3s', opacity: '0',
      });
      document.body.appendChild(toastEl);
    }
    toastEl.textContent = msg;
    toastEl.style.background = bad ? 'rgba(150,30,30,.94)' : 'rgba(14,26,43,.9)';
    toastEl.style.opacity = '1';
    clearTimeout(toastT);
    toastT = setTimeout(() => { toastEl.style.opacity = '0'; }, bad ? 6000 : 1800);
  };

  // ── caret at the point that was clicked ─────────────────────────────────
  const caretAt = (x, y) => {
    let r = null;
    if (document.caretRangeFromPoint) r = document.caretRangeFromPoint(x, y);
    else if (document.caretPositionFromPoint) {
      const p = document.caretPositionFromPoint(x, y);
      if (p) { r = document.createRange(); r.setStart(p.offsetNode, p.offset); }
    }
    if (!r) return;
    r.collapse(true);
    const s = getSelection();
    s.removeAllRanges();
    s.addRange(r);
  };

  let editing = null;   // { el, mode, origHTML, origMd, origPlain, file, mdLines, col }

  const stop = (keep) => {
    if (!editing) return;
    const { el, origHTML } = editing;
    editing = null;
    el.removeAttribute('contenteditable');
    if (!keep) el.innerHTML = origHTML;
  };

  const start = (el, ev) => {
    const td = el.closest('td');
    const tr = td && td.closest('tr');
    const ml = td && (td.dataset.mdline || (tr && tr.dataset.mdline));
    const cfg = window.TRANS_CONFIG;

    if (td && ml && cfg && cfg.src && !td.classList.contains('ln-col')) {
      // a verse cell: plain text, one line per source line
      const cells = [...tr.children].filter((c) => c.tagName === 'TD' && !c.classList.contains('ln-col'));
      const mdLines = ml.split(',').filter(Boolean).map(Number);
      editing = {
        el: td, mode: 'lines', origHTML: td.innerHTML, mdLines,
        col: Math.max(0, cells.indexOf(td)),
        file: new URL(cfg.src, location.href).pathname,
      };
      td.innerHTML = lines(toPlain(td)).filter((x, i, a) => x || a.length === 1).map(escHtml).join('<br>');
    } else {
      editing = {
        el, mode: 'text', origHTML: el.innerHTML,
        origMd: flat(toMd(el)), origPlain: flat(toPlain(el)),
      };
    }
    editing.el.contentEditable = 'true';
    editing.el.spellcheck = false;
    editing.el.focus({ preventScroll: true });
    caretAt(ev.clientX, ev.clientY);
  };

  const save = async () => {
    const ed = editing;
    if (!ed) return;
    const restore = { path: location.pathname, y: scrollY, t: Date.now() };
    const pane = document.querySelector('[data-page-scroll]');
    if (pane) restore.pane = pane.scrollTop;
    try { sessionStorage.setItem(RESTORE, JSON.stringify(restore)); } catch {}

    let r;
    try {
      if (ed.mode === 'lines') {
        const parts = lines(ed.el.innerText);
        const kept = ed.mdLines.length === 1 ? [parts.join(' ').trim()] : parts.filter(Boolean);
        if (kept.length !== ed.mdLines.length) {
          toast(`লাইন সংখ্যা মেলে না: ${kept.length} ≠ ${ed.mdLines.length}`, true);
          return;
        }
        r = await fetch('/__edit/lines', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            f: ed.file,
            edits: ed.mdLines.map((line, i) => ({ line, col: ed.col, text: kept[i] })),
          }),
        });
      } else {
        const md = flat(toMd(ed.el)), plain = flat(toPlain(ed.el));
        if (md === ed.origMd) { stop(true); toast('কোনো বদল নেই'); return; }
        const pairs = [{ old: ed.origMd, new: md }];
        if (ed.origPlain !== ed.origMd) pairs.push({ old: ed.origPlain, new: plain });
        r = await fetch('/__edit/text', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ hints: hints(), pairs }),
        });
      }
      const msg = await r.text();
      if (!r.ok) throw new Error(msg);
      stop(true);
      toast('সংরক্ষিত' + (ed.mode === 'text' && msg ? ' · ' + msg : ''));
    } catch (err) {
      try { sessionStorage.removeItem(RESTORE); } catch {}
      toast('সংরক্ষণ হয়নি: ' + (err && err.message ? err.message : err), true);
    }
  };

  // ── Ctrl+click: enter (capture phase, so links and panels never fire) ───
  document.addEventListener('click', (ev) => {
    const t = ev.target instanceof Element ? ev.target : null;
    if (!t) return;

    if (editing && editing.el.contains(t)) {
      // clicks inside the text being edited only move the caret
      ev.preventDefault();
      ev.stopPropagation();
      return;
    }
    if (!(ev.ctrlKey || ev.metaKey) || t.closest(NEVER)) return;
    const el = t.closest(EDITABLE);
    if (!el || !/\S/.test(el.textContent || '') && !el.querySelector('.bn-missing')) return;

    ev.preventDefault();
    ev.stopPropagation();
    if (editing) {
      if (editing.el === el) return;
      if (editing.el.innerHTML !== editing.origHTML && editing.mode === 'text') {
        toast('আগে Ctrl+Enter দিয়ে সংরক্ষণ বা Esc দিয়ে বাতিল করুন', true);
        editing.el.focus({ preventScroll: true });
        return;
      }
      stop(false);
    }
    start(el, ev);
  }, true);

  // ── keys while editing: ours first, and none reach the site's shortcuts ─
  window.addEventListener('keydown', (e) => {
    if (!editing) return;
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); stop(false); return; }
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault(); e.stopPropagation(); save(); return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      if (editing.mode === 'lines' && editing.mdLines.length > 1) {
        document.execCommand('insertLineBreak');
      }
    }
    e.stopPropagation();
  }, true);

  // paste as plain text, on one line
  document.addEventListener('paste', (e) => {
    if (!editing || !editing.el.contains(e.target)) return;
    e.preventDefault();
    const text = (e.clipboardData && e.clipboardData.getData('text/plain')) || '';
    document.execCommand('insertText', false, text.replace(/\s+/g, ' '));
  }, true);

  // ── if the dev server reloaded anyway, return to the same place ─────────
  try {
    const s = JSON.parse(sessionStorage.getItem(RESTORE) || 'null');
    sessionStorage.removeItem(RESTORE);
    if (s && s.path === location.pathname && Date.now() - s.t < 15000) {
      const back = () => {
        window.scrollTo(0, s.y);
        const pane = document.querySelector('[data-page-scroll]');
        if (pane && s.pane != null) pane.scrollTop = s.pane;
      };
      back();
      ['md-loader-done', 'content-ready'].forEach((ev) =>
        document.addEventListener(ev, () => requestAnimationFrame(back), { once: true }));
      window.addEventListener('load', () => setTimeout(back, 50), { once: true });
    }
  } catch {}
})();
