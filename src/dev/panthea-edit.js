// Panthea in-browser story editor — served ONLY by the dev server (see the
// pantheaEditor integration in astro.config.mjs; the production build never
// references or ships this file).
//
//   Ctrl+double-click the story  → its Markdown opens in place, scrolled to
//                                  the paragraph you clicked
//   Ctrl+Enter (or ⌘+Enter)      → save to src/stories/panthea/… and reload,
//                                  scrolled back to the paragraph being edited
//   Esc                          → cancel, restore the rendered text
(() => {
  const story = document.querySelector('.pn-story[data-md]');
  if (!story) return;
  const file = story.dataset.md;
  const KEY = 'pn-edit-restore';
  const BLOCKS = 'p, h2, h3, blockquote, li';

  // markdown line ≈ rendered block text, once syntax marks and whitespace go
  const norm = (s) => (s || '').replace(/[#>*_`]/g, '').replace(/\s+/g, ' ').trim();

  // ── after a Ctrl+Enter reload: scroll the preview back to the edited spot ──
  try {
    const saved = JSON.parse(sessionStorage.getItem(KEY) || 'null');
    if (saved && saved.file === file) {
      sessionStorage.removeItem(KEY);
      if (saved.frag) {
        for (const b of story.querySelectorAll(BLOCKS)) {
          if (norm(b.textContent).startsWith(saved.frag)) {
            b.scrollIntoView({ block: 'center' });
            break;
          }
        }
      }
    }
  } catch {}

  // find the char offset in the md source of the line matching a block's text
  const offsetOf = (md, anchor) => {
    if (!anchor) return 0;
    let off = 0;
    for (const line of md.split('\n')) {
      const nl = norm(line);
      if (nl && nl.startsWith(anchor)) return off;
      off += line.length + 1;
    }
    return 0;
  };

  let editing = false;

  story.addEventListener('dblclick', async (ev) => {
    if (!ev.ctrlKey || editing) return;
    editing = true;

    const block = ev.target instanceof Element ? ev.target.closest(BLOCKS) : null;
    const anchor = block ? norm(block.textContent).slice(0, 40) : '';

    let md;
    try {
      const r = await fetch(`/__panthea/raw?f=${encodeURIComponent(file)}`);
      if (!r.ok) throw new Error(await r.text());
      md = await r.text();
    } catch (e) {
      editing = false;
      alert(`could not load ${file}: ${e}`);
      return;
    }

    // seamless: the story text itself becomes editable — no box, no inner
    // scrollbar. The textarea grows to its content and the page's own
    // scrollbar (far right) stays the only one.
    const rendered = Array.from(story.childNodes);
    const ta = document.createElement('textarea');
    ta.value = md;
    ta.spellcheck = false;
    Object.assign(ta.style, {
      display: 'block',
      boxSizing: 'border-box',
      width: '100%',
      padding: '0',
      margin: '0',
      border: 'none',
      outline: 'none',
      background: 'transparent',
      color: 'inherit',
      font: 'inherit',
      textAlign: 'left',
      overflow: 'hidden',
      resize: 'none',
    });
    story.replaceChildren(ta);

    const fit = () => {
      ta.style.height = 'auto';
      ta.style.height = ta.scrollHeight + 'px';
    };
    fit();
    ta.addEventListener('input', fit);

    // caret on the clicked paragraph, and scroll the page so that line stays
    // right where the click happened
    const idx = offsetOf(md, anchor);
    ta.focus({ preventScroll: true });
    ta.setSelectionRange(idx, idx);
    const lineH = parseFloat(getComputedStyle(ta).lineHeight) || 34;
    const line = md.slice(0, idx).split('\n').length - 1;
    const caretY = ta.getBoundingClientRect().top + line * lineH;
    window.scrollBy(0, caretY - ev.clientY);

    ta.addEventListener('keydown', async (e) => {
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        // remember the caret's (or the previous non-blank) line for the reload
        const v = ta.value;
        const ls = v.lastIndexOf('\n', ta.selectionStart - 1) + 1;
        let le = v.indexOf('\n', ta.selectionStart);
        if (le === -1) le = v.length;
        let frag = norm(v.slice(ls, le));
        if (!frag) {
          const before = v.slice(0, ls).split('\n').map(norm).filter(Boolean);
          frag = before[before.length - 1] || '';
        }
        sessionStorage.setItem(KEY, JSON.stringify({ file, frag: frag.slice(0, 40) }));
        try {
          const r = await fetch('/__panthea/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ f: file, content: ta.value }),
          });
          if (!r.ok) throw new Error(await r.text());
          location.reload(); // dev server re-renders the md → the preview
        } catch (err) {
          alert(`save failed: ${err}`);
        }
      } else if (e.key === 'Escape') {
        story.replaceChildren(...rendered);
        editing = false;
      }
    });
  });
})();
