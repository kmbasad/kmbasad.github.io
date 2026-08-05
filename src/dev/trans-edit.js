// Translations in-browser verse editor — served ONLY by the dev server (see
// the transEditor integration in astro.config.mjs; the production build never
// references or ships this file).
//
//   Ctrl+double-click a বাংলা verse cell → the cell becomes editable in place
//                                          (a ghazal couplet edits as two lines)
//   Ctrl+Enter (or ⌘+Enter)              → save the line(s) back into the
//                                          public/translations/**.md source;
//                                          the dev server reloads the page and
//                                          the scroll position is restored
//   Esc (or clicking away)               → cancel, restore the rendered text
//
// Rows carry data-mdline (stamped by md-loader.js): the absolute line
// number(s) of this verse inside the fetched .md file.
(() => {
  const cfg = window.TRANS_CONFIG;
  if (!cfg || !cfg.src) return;
  const file = new URL(cfg.src, location.href).pathname;
  const KEY = 'tt-edit-restore';

  const panel = () => document.querySelector('[data-page-scroll]');

  // ── after a save-triggered reload: return to the edited spot ──
  try {
    const saved = JSON.parse(sessionStorage.getItem(KEY) || 'null');
    if (saved && saved.file === file) {
      sessionStorage.removeItem(KEY);
      const restore = () => {
        const p = panel();
        if (p && p.scrollHeight > p.clientHeight) p.scrollTop = saved.top;
        else window.scrollTo(0, saved.top);
      };
      document.addEventListener('md-loader-done', () => requestAnimationFrame(restore), { once: true });
    }
  } catch {}

  let editing = null; // { cell, origHTML, lines }

  // the cell's verse text, prosody separators dropped, <br> → newline
  const cleanText = (cell) => {
    const clone = cell.cloneNode(true);
    clone.querySelectorAll('.m-sep, .f-sep').forEach((el) => el.remove());
    clone.querySelectorAll('br').forEach((br) => br.replaceWith('\n'));
    return clone.textContent
      .replace(/\u00a0/g, ' ')
      .split('\n')
      .map((s) => s.replace(/\s+/g, ' ').trim())
      .join('\n')
      .trim();
  };

  const cancel = () => {
    if (!editing) return;
    const { cell, origHTML } = editing;
    editing = null;
    cell.removeAttribute('contenteditable');
    cell.style.whiteSpace = '';
    cell.style.outline = '';
    cell.style.borderRadius = '';
    cell.innerHTML = origHTML;
  };

  document.addEventListener('dblclick', (ev) => {
    if (!ev.ctrlKey) return;
    const cell = ev.target instanceof Element ? ev.target.closest('.tt-table td.bn') : null;
    if (!cell) return;
    const tr = cell.closest('tr');
    const lines = (tr?.dataset.mdline || '').split(',').filter(Boolean).map(Number);
    if (!lines.length) return;
    if (editing) cancel();
    ev.preventDefault();
    getSelection()?.removeAllRanges();

    editing = { cell, origHTML: cell.innerHTML, lines };
    cell.textContent = cleanText(cell);
    try {
      cell.contentEditable = 'plaintext-only';
    } catch {
      cell.contentEditable = 'true';
    }
    cell.spellcheck = false;
    cell.style.whiteSpace = 'pre-wrap';
    cell.style.outline = '1.5px solid var(--accent, #1d4f9b)';
    cell.style.borderRadius = '4px';
    cell.focus();
    const range = document.createRange();
    range.selectNodeContents(cell);
    range.collapse(false);
    const sel = getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
  });

  document.addEventListener('keydown', async (e) => {
    if (!editing) return;
    const { cell, lines } = editing;

    if (e.key === 'Escape') {
      e.preventDefault();
      cancel();
      return;
    }

    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      const parts = cell.innerText
        .replace(/\u00a0/g, ' ')
        .split('\n')
        .map((s) => s.replace(/\s+/g, ' ').trim())
        .filter(Boolean);
      if (parts.length !== lines.length) {
        alert(`লাইন সংখ্যা মেলে না: ${parts.length} ≠ ${lines.length}`);
        return;
      }
      const p = panel();
      sessionStorage.setItem(KEY, JSON.stringify({
        file,
        top: p && p.scrollHeight > p.clientHeight ? p.scrollTop : window.scrollY,
      }));
      try {
        const r = await fetch('/__trans/save-lines', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            f: file,
            edits: lines.map((line, i) => ({ line, bn: parts[i] })),
          }),
        });
        if (!r.ok) throw new Error(await r.text());
        editing = null;
        // the dev server full-reloads on the public/ write; belt and braces:
        setTimeout(() => location.reload(), 600);
      } catch (err) {
        sessionStorage.removeItem(KEY);
        alert(`সংরক্ষণ ব্যর্থ: ${err}`);
      }
    }
  });

  // clicking away = cancel (only Ctrl+Enter commits)
  document.addEventListener('focusout', (e) => {
    if (editing && e.target === editing.cell) {
      setTimeout(() => {
        if (editing && document.activeElement !== editing.cell) cancel();
      }, 120);
    }
  });
})();
