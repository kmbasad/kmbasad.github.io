(function () {
  'use strict';

  var reduceMotion = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ── Menubar ──────────────────────────────────────────────────────────────
     All of this is enhancement — without JS the bar is a plain, working set
     of links:
       · the glide rail rests under the active section and follows the pointer
       · the shelf narrows and firms up once the paper has moved under it,
         and stays put on every page — it never hides
       · --p carries how far through the page you are: the progress edge
         along the shelf, and the quarter-turn of the mark's dial
       · below the fold breakpoint the names open as a full sheet            */

  function setupNav() {
    var nav = document.getElementById('site-nav');
    if (!nav) return;

    /* — the glide rail — */
    var wrap   = nav.querySelector('.nav-links-wrap');
    var glide  = wrap && wrap.querySelector('.nav-glide');
    var items  = wrap ? Array.prototype.slice.call(wrap.querySelectorAll('.nav-links a')) : [];
    var active = wrap ? wrap.querySelector('.nav-links a.active') : null;

    function moveGlide(el, instant) {
      if (!glide) return;
      if (!el) { glide.classList.remove('is-on'); return; }
      var prev = glide.style.transition;
      if (instant) glide.style.transition = 'none';
      glide.style.width = el.offsetWidth + 'px';
      glide.style.transform = 'translate3d(' + el.offsetLeft + 'px,0,0)';
      glide.classList.add('is-on');
      if (instant) {
        /* flush, then hand the transition back */
        void glide.offsetWidth;
        glide.style.transition = prev;
      }
    }

    if (glide && items.length) {
      moveGlide(active, true);

      items.forEach(function (a) {
        a.addEventListener('mouseenter', function () { moveGlide(a); });
        a.addEventListener('focus', function () { moveGlide(a); });
      });
      wrap.addEventListener('mouseleave', function () { moveGlide(active); });
      wrap.addEventListener('focusout', function () { moveGlide(active); });

      window.addEventListener('resize', function () { moveGlide(active, true); }, { passive: true });
      /* Bengali webfonts land after first paint and change every width. */
      if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(function () { moveGlide(active, true); });
      }
    }

    /* — the bar answers the scroll —
       It narrows and firms up as soon as the paper moves, and draws how far
       through the page you are along its edge. It stays put throughout.

       Not every page scrolls the window: the dual-panel translation pages
       lock the viewport and scroll the text column instead. Any element
       marked [data-page-scroll] is treated as that page's scroller, and
       whichever one last moved is the one the bar reads. */
    var docEl = document.documentElement;
    var panel = document.querySelector('[data-page-scroll]');
    var src = null;                         /* null = the window */
    var lastY = window.scrollY;
    var queued = false;

    /* The state flip is synchronous — reading a scroll offset is free, and
       the bar should never look a frame behind the page. */
    function onScroll(e) {
      var t = e && e.target;
      src = (t && t.nodeType === 1 && t !== docEl && t !== document.body) ? t : null;
      var y = src ? src.scrollTop : window.scrollY;
      lastY = y < 0 ? 0 : y;

      nav.classList.toggle('is-scrolled', lastY > 6);
      docEl.classList.toggle('nav-tight', lastY > 6);

      if (!queued) { queued = true; requestAnimationFrame(readProgress); }
    }

    /* The part that costs a layout read is throttled to a frame. */
    function readProgress() {
      queued = false;
      var span = src
        ? src.scrollHeight - src.clientHeight
        : docEl.scrollHeight - window.innerHeight;
      var p = span > 40 ? Math.min(1, lastY / span) : 0;
      nav.style.setProperty('--p', p.toFixed(4));
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    if (panel) panel.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    /* On phones the four section names live in the fixed tab bar at the
       foot of the screen (built in Base.astro) — pure CSS, nothing to wire. */
  }

  /* ── সূচি — the table of contents in the menubar ──────────────────────────
     Site-wide and section-neutral. It scans for [data-toc] elements; if ≥ 2
     are found a সূচি key appears inside the page's gilt key (or, on a page
     with no breadcrumb, loose in the bar's right cluster), opening a frosted
     panel that hangs under the shelf. Two shapes: a list of section names,
     or — when the page asks for the grid style (the ghazals) — a grid of bare
     numbers. Scroll-spy marks where you are; a click sails there.

     Where the targets come from is each section's own business:
       · md-loader.js stamps them on section rows and ghazal heads
         (Translations, and the Alaol chapters in Pangea);
       · trellis.js stamps them on each matrix and on the essay (মাচা);
       · a container marked [data-toc-scan="h2, h3"] has its own headings
         stamped here — all a page of build-time prose needs (Panthea);
       · or a page simply writes id + data-toc into its own markup.
     The contract is the same everywhere: data-toc is the label, and the
     element carries the id the panel scrolls to. Anything injected after
     load must dispatch `content-ready` to be picked up.                      */

  var tocItems = [];   // [{id, target, a}]
  var tocOpen = false;
  var rafPending = false;
  var activeIdx = -1;
  var tocKey = null;
  var tocMenu = null;
  var tocHere = null;  /* the gilt key, when the page has one */

  function setActive(id) {
    var idx = -1;
    for (var i = 0; i < tocItems.length; i++) {
      if (tocItems[i].id === id) { idx = i; break; }
    }
    if (idx < 0 || idx === activeIdx) return;
    activeIdx = idx;
    tocItems.forEach(function (it, i) {
      it.a.classList.toggle('is-active', i === idx);
      it.a.classList.toggle('is-past', i < idx);
      if (i === idx) it.a.setAttribute('aria-current', 'true');
      else it.a.removeAttribute('aria-current');
    });
  }

  // Scroll-spy: active = last target whose top has passed 20% viewport
  function spy() {
    if (!tocItems.length) return;
    var line = window.innerHeight * 0.2;
    var cur = tocItems[0].id;
    for (var i = 0; i < tocItems.length; i++) {
      if (tocItems[i].target.getBoundingClientRect().top - line <= 0) {
        cur = tocItems[i].id;
      } else {
        break;
      }
    }
    setActive(cur);
  }

  function onTocScroll() {
    if (rafPending || !tocItems.length) return;
    rafPending = true;
    requestAnimationFrame(function () { spy(); rafPending = false; });
  }

  function setOpen(next) {
    if (next === tocOpen || !tocKey || !tocMenu) return;
    tocOpen = next;
    tocKey.setAttribute('aria-expanded', tocOpen ? 'true' : 'false');
    tocKey.classList.toggle('is-open', tocOpen);
    if (tocOpen) {
      if (window.innerWidth > 760) {
        /* Hang the panel under the gilt key, aligned on the key's LEFT edge —
           the key sits beside the mark at the left of the shelf, and the bar's
           inner row is centred within a max-width, so a viewport-pinned panel
           would drift. Unhide first: the width must be real to clamp against. */
        var anchor = tocHere || tocKey;
        tocMenu.style.left = '0px';
        tocMenu.style.right = 'auto';
        tocMenu.style.maxWidth = (window.innerWidth - 20) + 'px';
        tocMenu.hidden = false;
        var box = anchor.getBoundingClientRect();
        var left = Math.max(10, Math.min(box.left, window.innerWidth - tocMenu.offsetWidth - 10));
        tocMenu.style.left = left + 'px';
        tocMenu.style.maxWidth = (window.innerWidth - left - 10) + 'px';
      } else {
        /* Phone: the stylesheet pins the panel to the foot of the screen as
           a bottom sheet — clear anything a wider open left behind. */
        tocMenu.style.left = '';
        tocMenu.style.right = '';
        tocMenu.style.maxWidth = '';
        tocMenu.hidden = false;
      }
      requestAnimationFrame(function () {
        if (tocMenu) tocMenu.classList.add('is-open');
      });
      spy();
      var cur = tocMenu.querySelector('.is-active');
      if (cur) cur.scrollIntoView({ block: 'nearest' });
    } else {
      var closing = tocMenu;
      closing.classList.remove('is-open');
      setTimeout(function () { if (!tocOpen) closing.hidden = true; },
        reduceMotion ? 0 : 180);
    }
  }

  /* [data-toc-scan="h2, h3"] — a container whose own headings are its
     contents. The label is the heading's text with any inline tag stripped
     (Panthea's headings carry an <em> floor-range that has no place in a
     one-line menu entry). */
  var scanned = 0;
  function stampScanned() {
    document.querySelectorAll('[data-toc-scan]').forEach(function (box) {
      var sel = box.getAttribute('data-toc-scan') || 'h2, h3';
      box.querySelectorAll(sel).forEach(function (h) {
        if (!h.id) h.id = 'toc-' + (++scanned);
        if (h.hasAttribute('data-toc')) return;
        var label = h.cloneNode(true);
        label.querySelectorAll('em, .pn-range').forEach(function (r) { r.remove(); });
        h.setAttribute('data-toc', label.textContent.trim());
      });
    });
  }

  /* Builds the key and the panel. Safe to run again whenever the page's
     content changes — it tears its own DOM down first, and every listener
     that outlives a build is registered once, in boot(). */
  function buildTOC() {
    if (tocKey && tocKey.parentNode) tocKey.parentNode.removeChild(tocKey);
    if (tocMenu && tocMenu.parentNode) tocMenu.parentNode.removeChild(tocMenu);
    if (tocHere) tocHere.classList.remove('has-toc');
    tocKey = tocMenu = tocHere = null;
    tocItems = [];
    tocOpen = false;
    activeIdx = -1;

    stampScanned();

    var targets = Array.from(document.querySelectorAll('[data-toc]'));
    var bar = document.querySelector('.nav-inner');
    if (targets.length < 2 || !bar) return;

    /* List and spy in VISUAL order, not DOM order — phones seat a trellis's
       essay above its matrix, and the menu must read the way the page does. */
    targets.sort(function (a, b) {
      return a.getBoundingClientRect().top - b.getBoundingClientRect().top;
    });

    var grid = document.body.dataset.tocStyle === 'grid' ||
      !!(window.TRANS_CONFIG && window.TRANS_CONFIG.tocStyle === 'grid');

    tocKey = document.createElement('button');
    tocKey.id = 'site-toc-key';
    tocKey.className = 'toc-key';
    tocKey.type = 'button';
    tocKey.setAttribute('aria-expanded', 'false');
    tocKey.setAttribute('aria-controls', 'site-toc-menu');
    tocKey.innerHTML = 'সূচি<span class="toc-key-caret" aria-hidden="true">▾</span>';
    /* the সূচি belongs to the current page — it joins the title inside the
       gilt key, and the whole key becomes the trigger */
    var here = bar.querySelector('.nav-here');
    if (here) {
      tocHere = here;
      here.appendChild(tocKey);
      here.classList.add('has-toc');
      if (!here.dataset.tocWired) {
        here.dataset.tocWired = '1';
        here.addEventListener('click', function (e) {
          if (tocKey && !e.target.closest('#site-toc-key')) {
            e.stopPropagation();
            setOpen(!tocOpen);
          }
        });
      }
    } else {
      /* No breadcrumb on this page — but the সূচি still belongs to the left
         cluster, never to the section names on the right. Sit it directly
         after the mark, where the gilt key would have been. */
      var mark = bar.querySelector('.nav-mark');
      if (mark && mark.nextSibling) bar.insertBefore(tocKey, mark.nextSibling);
      else bar.insertBefore(tocKey, bar.firstChild);
    }
    tocKey.addEventListener('click', function (e) {
      e.stopPropagation();
      setOpen(!tocOpen);
    });

    tocMenu = document.createElement('nav');
    tocMenu.id = 'site-toc-menu';
    tocMenu.className = 'toc-menu' + (grid ? ' toc-menu--grid' : '');
    tocMenu.setAttribute('aria-label', 'সূচিপত্র');
    tocMenu.hidden = true;

    var list = document.createElement('ol');
    list.className = 'toc-menu__list';

    tocItems = targets.map(function (target) {
      var a = document.createElement('a');
      a.className = 'toc-menu__link';
      a.href = '#' + target.id;
      a.textContent = target.getAttribute('data-toc');

      a.addEventListener('click', function (e) {
        e.preventDefault();
        setOpen(false);
        target.scrollIntoView({
          behavior: reduceMotion ? 'auto' : 'smooth', block: 'start',
        });
        history.replaceState(null, '', '#' + target.id);
        setActive(target.id);
      });

      var li = document.createElement('li');
      li.appendChild(a);
      list.appendChild(li);

      return { id: target.id, target: target, a: a };
    });

    tocMenu.appendChild(list);
    /* never a scrollbar: a long list folds into columns instead */
    if (!grid) {
      if (tocItems.length > 30) tocMenu.classList.add('toc-menu--cols3');
      else if (tocItems.length > 14) tocMenu.classList.add('toc-menu--cols2');
    }
    document.body.appendChild(tocMenu);

    spy();
  }

  /* ── Boot ─────────────────────────────────────────────────────────────── */

  function boot() {
    setupNav();
    buildTOC();

    /* `content-ready` is the site-wide "the page's content changed, rebuild
       the chrome" signal — fired by md-loader.js and trellis.js once their
       fetched markup is in the DOM, and by any page that shows or hides its
       own সূচি targets. (`md-loader-done` stays as md-loader's own event:
       book.js and the dev verse editor listen for it.) */
    document.addEventListener('content-ready', buildTOC);

    /* Registered once, not per build: a rebuild replaces the key and the
       panel, so handlers bound inside buildTOC would pile up and the stale
       copies would fight the live one over tocOpen. */
    document.addEventListener('click', function (e) {
      if (tocOpen && !e.target.closest('#site-toc-menu')) setOpen(false);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && tocOpen) { setOpen(false); tocKey.focus(); }
    });
    window.addEventListener('scroll', onTocScroll, { passive: true });
    window.addEventListener('resize', onTocScroll, { passive: true });
    /* Pages that lock the viewport scroll an inner column instead —
       the spy must listen to it too (getBoundingClientRect works for both). */
    var tocPanel = document.querySelector('[data-page-scroll]');
    if (tocPanel) tocPanel.addEventListener('scroll', onTocScroll, { passive: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
}());
