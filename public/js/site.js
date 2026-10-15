(function () {
  'use strict';

  var reduceMotion = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var root = document.documentElement;
  var CONTENTS = 'সূচি';
  var MENU = 'মেনু';
  var CLOSE = 'বন্ধ';

  /* ~ The masthead ~
     It opens the page and scrolls away with it; nothing to wire there but
     the burger (phones), which brings the rooms down as a sheet over the
     whole screen, the masthead held above it so the same burger closes it. */
  function setupMast() {
    /* --leaf-top: where the masthead ends on screen right now (0 once it has
       scrolled away). The leaves that open from the right (the dictionary,
       a trellis's cell) start there, so they never cover the masthead. */
    var mast = document.querySelector('.mast');
    if (mast) {
      var leafTop = function () {
        root.style.setProperty('--leaf-top', Math.max(0, Math.round(mast.getBoundingClientRect().bottom)) + 'px');
      };
      window.addEventListener('scroll', leafTop, { passive: true });
      window.addEventListener('resize', leafTop, { passive: true });
      leafTop();
    }

    var burger = document.querySelector('.mast-burger');
    var sheet = document.getElementById('nav-sheet');
    if (!burger || !sheet) return;
    var setSheet = function (open) {
      root.classList.toggle('sheet-open', open);
      burger.setAttribute('aria-expanded', String(open));
      burger.setAttribute('aria-label', open ? CLOSE : MENU);
      sheet.setAttribute('aria-hidden', String(!open));
    };
    burger.addEventListener('click', function () {
      setSheet(!root.classList.contains('sheet-open'));
    });
    sheet.addEventListener('click', function (e) {
      if (e.target.closest('a') || e.target === sheet) setSheet(false);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && root.classList.contains('sheet-open')) {
        setSheet(false);
        burger.focus();
      }
    });
    window.matchMedia('(min-width: 761px)').addEventListener('change', function (m) {
      if (m.matches) setSheet(false);
    });
  }

  /* ~ The reading rail ~
     Beside the text on a wide screen it simply sticks (CSS). Below that it is
     a sheet: the floating key brings it up, the scrim, Esc or a jump puts it
     away. --p on <html> is how far through the page you are: the hairline
     along the screen's top and the ring on the key both draw it.

     Some pages scroll an inner column rather than the window; such a column
     is marked [data-page-scroll], and whichever scroller last moved is the
     one read. */
  var railKey = null;

  function setRail(open) {
    if (!railKey) return;
    root.classList.toggle('rail-open', open);
    railKey.setAttribute('aria-expanded', String(open));
  }

  function setupRail() {
    railKey = document.querySelector('.rail-key');
    var scrim = document.querySelector('.rail-scrim');
    if (railKey) {
      railKey.addEventListener('click', function () {
        setRail(!root.classList.contains('rail-open'));
      });
      if (scrim) scrim.addEventListener('click', function () { setRail(false); });
      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && root.classList.contains('rail-open')) {
          setRail(false);
          railKey.focus();
        }
      });
      window.matchMedia('(min-width: 1100px)').addEventListener('change', function (m) {
        if (m.matches) setRail(false);
      });
      /* a link inside the sheet leaves for another page, or jumps; either way
         the sheet goes */
      var rail = document.getElementById('rail');
      if (rail) rail.addEventListener('click', function (e) {
        if (e.target.closest('a')) setRail(false);
      });
    }

    if (!document.body.classList.contains('has-rail')) return;

    /* reading down, the contents key steps out of the text's way, as a
       reader's toolbar does; a scroll back up, or the page's end, brings
       it back (chrome.css, phones and tablets) */
    var src = null;
    var queued = false;
    var lastY = 0;
    function read() {
      queued = false;
      var y = src ? src.scrollTop : window.scrollY;
      var span = src ? src.scrollHeight - src.clientHeight
                     : root.scrollHeight - window.innerHeight;
      var p = span > 40 ? Math.max(0, Math.min(1, y / span)) : 0;
      root.style.setProperty('--p', p.toFixed(4));
      var dy = y - lastY;
      if (Math.abs(dy) > 6) {
        root.classList.toggle('reading-down', dy > 0 && y > 160 && p < 0.985);
        lastY = y;
      }
    }
    function onScroll(e) {
      var t = e && e.target;
      src = (t && t.nodeType === 1 && t !== root && t !== document.body) ? t : null;
      if (!queued) { queued = true; requestAnimationFrame(read); }
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    var col = document.querySelector('[data-page-scroll]');
    if (col) col.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  /* ~ The contents (sūci), in the rail ~
     Site-wide and section-neutral. It scans for [data-toc] elements; if two
     or more are found they are listed in the rail under the page's name, in
     one of two shapes: a list of names, or (the ghazals, the sonnets) a grid
     of bare numbers. Scroll-spy marks where you are; a click sails there.

     Where the targets come from is each section's own business:
       md-loader.js stamps them on section rows and ghazal heads;
       trellis.js stamps them on each matrix and on the essay;
       a container marked [data-toc-scan="h2, h3"] has its own headings
         stamped here (all a page of build-time prose needs: Panthea);
       or a page simply writes id + data-toc into its own markup.
     The contract is the same everywhere: data-toc is the label, and the
     element carries the id the rail scrolls to. Anything injected after load
     must dispatch `content-ready` to be picked up. */

  var tocItems = [];   // [{id, target, a}]
  var activeIdx = -1;
  var rafPending = false;

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
    keepInView(tocItems[idx].a);
    drawLine();
  }

  /* the reading line: a hairline down the rail's edge beside the contents,
     inked from the first entry to the one you are reading */
  var lineFill = null;
  function drawLine() {
    if (!lineFill || activeIdx < 0) return;
    var a = tocItems[activeIdx].a;
    lineFill.style.height = (a.offsetTop + a.offsetHeight / 2) + 'px';
  }

  var BN = '\u09e6\u09e7\u09e8\u09e9\u09ea\u09eb\u09ec\u09ed\u09ee\u09ef';
  function bnNum(n) {
    var t = (n < 10 ? '0' : '') + n;
    return t.replace(/\d/g, function (d) { return BN[+d]; });
  }

  /* the rail scrolls on its own when the contents are long: keep the
     current entry in sight without moving the page */
  function keepInView(a) {
    var box = document.getElementById('rail');
    if (!box || box.scrollHeight <= box.clientHeight) return;
    var r = a.getBoundingClientRect(), b = box.getBoundingClientRect();
    if (r.top < b.top + 40) box.scrollTop -= (b.top + 40 - r.top);
    else if (r.bottom > b.bottom - 40) box.scrollTop += (r.bottom - b.bottom + 40);
  }

  // Scroll-spy: active = the last target whose top has passed 20% of the screen
  function spy() {
    if (!tocItems.length) return;
    var line = window.innerHeight * 0.2;
    var cur = null, first = null;
    var w = window.innerWidth;
    for (var i = 0; i < tocItems.length; i++) {
      var r = tocItems[i].target.getBoundingClientRect();
      /* a slide turned away sideways (a trellis's other matrix) is not where
         you are, however high it stands */
      if ((r.left + r.right) / 2 < 0 || (r.left + r.right) / 2 > w) continue;
      if (first === null) first = tocItems[i].id;
      if (r.top - line <= 0) cur = tocItems[i].id;
      else break;
    }
    if (cur === null) cur = first || tocItems[0].id;
    setActive(cur);
  }

  function onTocScroll() {
    if (rafPending || !tocItems.length) return;
    rafPending = true;
    requestAnimationFrame(function () { spy(); rafPending = false; });
  }

  /* [data-toc-scan="h2, h3"]: a container whose own headings are its
     contents, each labelled by its text with any inline tag stripped. */
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

  /* Builds the rail's contents. Safe to run again whenever the page's content
     changes: it empties its own box first. */
  function buildTOC() {
    var box = document.getElementById('rail-toc');
    tocItems = [];
    activeIdx = -1;
    stampScanned();
    if (!box) return;
    box.innerHTML = '';

    var targets = Array.from(document.querySelectorAll('[data-toc]'));
    if (targets.length < 2) { box.hidden = true; return; }

    /* listed in VISUAL order, not DOM order: phones seat a trellis's essay
       above its matrix, and the list must read the way the page does */
    targets.sort(function (a, b) {
      return a.getBoundingClientRect().top - b.getBoundingClientRect().top;
    });

    var grid = document.body.dataset.tocStyle === 'grid' ||
      !!(window.TRANS_CONFIG && window.TRANS_CONFIG.tocStyle === 'grid');
    box.classList.toggle('is-grid', grid);
    box.setAttribute('aria-label', CONTENTS);

    var label = document.createElement('h2');
    label.className = 'rail-label';
    label.textContent = CONTENTS;
    box.appendChild(label);

    var list = document.createElement('ol');
    lineFill = null;
    if (!grid) {
      var line = document.createElement('span');
      line.className = 'rail-line';
      line.setAttribute('aria-hidden', 'true');
      lineFill = document.createElement('span');
      lineFill.className = 'rail-line-fill';
      line.appendChild(lineFill);
      list.appendChild(line);
    }
    tocItems = targets.map(function (target, i) {
      var a = document.createElement('a');
      a.href = '#' + target.id;
      if (grid) {
        a.textContent = target.getAttribute('data-toc');
      } else {
        var t = document.createElement('span');
        t.className = 'rt-text';
        t.textContent = target.getAttribute('data-toc');
        var n = document.createElement('span');
        n.className = 'rt-num';
        n.textContent = bnNum(i + 1);
        a.appendChild(t);
        a.appendChild(n);
      }
      a.addEventListener('click', function (e) {
        e.preventDefault();
        setRail(false);
        target.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
        history.replaceState(null, '', '#' + target.id);
        setActive(target.id);
      });
      var li = document.createElement('li');
      li.appendChild(a);
      list.appendChild(li);
      return { id: target.id, target: target, a: a };
    });
    box.appendChild(list);
    box.hidden = false;
    spy();
    drawLine();
  }

  /* ~ Boot ~ */

  function boot() {
    setupMast();
    setupRail();
    buildTOC();

    /* `content-ready` is the site-wide "the page's content changed, rebuild
       the chrome" signal, fired by md-loader.js and trellis.js once their
       fetched markup is in, and by any page that shows or hides its own
       contents targets. */
    document.addEventListener('content-ready', buildTOC);

    /* A link to a place only built after load (a matrix, a ghazal, a
       sonnet: #mx-1, #g12, #s40) lands nowhere on first paint. Once the
       content is in, go there: once, and only if the reader has not
       scrolled meanwhile. */
    var wantHash = location.hash && location.hash.length > 1 ? location.hash.slice(1) : '';
    var startY = window.scrollY;
    document.addEventListener('content-ready', function goToHash() {
      if (!wantHash) return;
      var el = document.getElementById(decodeURIComponent(wantHash));
      if (!el) return;
      document.removeEventListener('content-ready', goToHash);
      var col = document.querySelector('[data-page-scroll]');
      if ((col ? col.scrollTop : window.scrollY) !== startY && window.scrollY !== startY) return;
      el.scrollIntoView({ block: 'start' });
      wantHash = '';
    });
    if (wantHash && document.getElementById(decodeURIComponent(wantHash)))
      document.dispatchEvent(new CustomEvent('content-ready'));

    window.addEventListener('scroll', onTocScroll, { passive: true });
    /* any inner scroller too: a slider turning sideways moves the reader */
    document.addEventListener('scroll', onTocScroll, { passive: true, capture: true });
    window.addEventListener('resize', onTocScroll, { passive: true });
    window.addEventListener('resize', drawLine, { passive: true });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(drawLine);
    var col = document.querySelector('[data-page-scroll]');
    if (col) col.addEventListener('scroll', onTocScroll, { passive: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
}());
