/* book.js — pannable/zoomable image panel + image slider for translation pages */
(function () {
  'use strict';

  var MQ_DESKTOP = window.matchMedia('(min-width: 900px)');

  /* ── Transform helpers ─────────────────────────────────────────────────── */

  function applyXform(img, s) {
    img.style.transform =
      'translate3d(' + s.tx.toFixed(2) + 'px,' + s.ty.toFixed(2) + 'px,0)' +
      ' scale(' + s.scale.toFixed(5) + ')';
  }

  /* Scale image to cover the panel, centred. */
  function fitCover(img, panel, s) {
    var pw = panel.clientWidth;
    var ph = panel.clientHeight;
    var iw = img.naturalWidth;
    var ih = img.naturalHeight;
    if (!pw || !ph || !iw || !ih) return;
    var cover = Math.max(pw / iw, ph / ih);
    s.minScale = cover;
    s.scale    = cover;
    s.tx = (pw - iw * cover) / 2;
    s.ty = (ph - ih * cover) / 2;
    applyXform(img, s);
  }

  /* Keep image covering the panel (no empty edges). */
  function clamp(s, iw, ih, pw, ph) {
    var w  = iw * s.scale;
    var h  = ih * s.scale;
    var x0 = w > pw ? 0              : (pw - w) / 2;
    var x1 = w > pw ? pw - w         : (pw - w) / 2;
    var y0 = h > ph ? 0              : (ph - h) / 2;
    var y1 = h > ph ? ph - h         : (ph - h) / 2;
    s.tx = Math.min(x0, Math.max(x1, s.tx));
    s.ty = Math.min(y0, Math.max(y1, s.ty));
  }

  /* ── Pan + zoom (desktop) ──────────────────────────────────────────────── */

  function setupPanZoom(panel, getImg, getState) {

    /* Mouse drag → pan */
    panel.addEventListener('mousedown', function (e) {
      if (!MQ_DESKTOP.matches || e.button !== 0) return;
      var s   = getState();
      var ox  = e.clientX - s.tx;
      var oy  = e.clientY - s.ty;
      panel.classList.add('is-dragging');

      function move(e) {
        var img = getImg();
        var s   = getState();
        s.tx = e.clientX - ox;
        s.ty = e.clientY - oy;
        clamp(s, img.naturalWidth, img.naturalHeight, panel.clientWidth, panel.clientHeight);
        applyXform(img, s);
      }
      function up() {
        panel.classList.remove('is-dragging');
        document.removeEventListener('mousemove', move);
        document.removeEventListener('mouseup',   up);
      }
      document.addEventListener('mousemove', move);
      document.addEventListener('mouseup',   up);
    });

    /* Double-click → reset to cover fit */
    panel.addEventListener('dblclick', function () {
      if (!MQ_DESKTOP.matches) return;
      var img = getImg();
      var s   = getState();
      s.scale = s.minScale;
      fitCover(img, panel, s);
    });

    /* Wheel → zoom to cursor */
    panel.addEventListener('wheel', function (e) {
      if (!MQ_DESKTOP.matches) return;
      e.preventDefault();
      var img     = getImg();
      var s       = getState();
      var factor  = e.deltaY < 0 ? 1.1 : (1 / 1.1);
      var newSc   = Math.max(s.minScale, Math.min(s.scale * factor, s.minScale * 7));
      var rect    = panel.getBoundingClientRect();
      var mx      = e.clientX - rect.left;
      var my      = e.clientY - rect.top;
      var ix      = (mx - s.tx) / s.scale;
      var iy      = (my - s.ty) / s.scale;
      s.scale     = newSc;
      s.tx        = mx - ix * s.scale;
      s.ty        = my - iy * s.scale;
      clamp(s, img.naturalWidth, img.naturalHeight, panel.clientWidth, panel.clientHeight);
      applyXform(img, s);
    }, { passive: false });

    /* Touch: 1-finger pan, 2-finger pinch+zoom — desktop only */
    var t0 = null, t1 = null, tDist = 0;

    panel.addEventListener('touchstart', function (e) {
      if (!MQ_DESKTOP.matches) return;
      if (e.touches.length === 1) {
        t0 = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        t1 = null;
      } else if (e.touches.length === 2) {
        t0 = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        t1 = { x: e.touches[1].clientX, y: e.touches[1].clientY };
        tDist = Math.hypot(t1.x - t0.x, t1.y - t0.y);
      }
    }, { passive: true });

    panel.addEventListener('touchmove', function (e) {
      if (!MQ_DESKTOP.matches) return;
      e.preventDefault();
      var img = getImg();
      var s   = getState();

      if (e.touches.length === 1 && t0 && !t1) {
        var dx = e.touches[0].clientX - t0.x;
        var dy = e.touches[0].clientY - t0.y;
        s.tx  += dx; s.ty += dy;
        t0     = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        clamp(s, img.naturalWidth, img.naturalHeight, panel.clientWidth, panel.clientHeight);
        applyXform(img, s);
      } else if (e.touches.length === 2 && t0 && t1) {
        var a0   = e.touches[0], a1 = e.touches[1];
        var dist = Math.hypot(a1.clientX - a0.clientX, a1.clientY - a0.clientY);
        var cx   = (a0.clientX + a1.clientX) / 2;
        var cy   = (a0.clientY + a1.clientY) / 2;
        var rect = panel.getBoundingClientRect();
        var mx   = cx - rect.left;
        var my   = cy - rect.top;
        var ix   = (mx - s.tx) / s.scale;
        var iy   = (my - s.ty) / s.scale;
        s.scale  = Math.max(s.minScale, Math.min(s.scale * (dist / tDist), s.minScale * 7));
        s.tx     = mx - ix * s.scale;
        s.ty     = my - iy * s.scale;
        tDist    = dist;
        t0 = { x: a0.clientX, y: a0.clientY };
        t1 = { x: a1.clientX, y: a1.clientY };
        clamp(s, img.naturalWidth, img.naturalHeight, panel.clientWidth, panel.clientHeight);
        applyXform(img, s);
      }
    }, { passive: false });

    /* Re-fit when panel resizes (e.g. window resize) */
    var rafR = null;
    window.addEventListener('resize', function () {
      if (rafR) return;
      rafR = requestAnimationFrame(function () {
        rafR = null;
        if (MQ_DESKTOP.matches) {
          var img = getImg();
          var s   = getState();
          // only refit if at minimum scale (user hasn't zoomed in)
          if (Math.abs(s.scale - s.minScale) < 0.001) fitCover(img, panel, s);
        }
      });
    });
  }

  /* ── Arrow button ──────────────────────────────────────────────────────── */

  function makeArrow(dir) {
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'book-arrow book-arrow--' + dir;
    btn.setAttribute('aria-label', dir === 'prev' ? 'Previous image' : 'Next image');
    btn.innerHTML = dir === 'prev'
      ? '<svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="13 4 7 10 13 16"/></svg>'
      : '<svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="7 4 13 10 7 16"/></svg>';
    return btn;
  }

  /* Skip shortcuts while typing in form fields. */
  function isTypingTarget(el) {
    if (!el || el === document.body) return false;
    var tag = (el.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'textarea' || tag === 'select') return true;
    if (el.isContentEditable) return true;
    return false;
  }

  /* ── Persist active image across reloads (URL ?img= + sessionStorage) ─── */

  function imgStorageKey() {
    return 'kmba-book-img:' + location.pathname;
  }

  /* 1-based ?img= in the URL; sessionStorage as fallback. */
  function readSavedImgIndex(n) {
    if (n < 1) return 0;
    try {
      var q = new URLSearchParams(location.search).get('img');
      if (q !== null && q !== '') {
        var i = parseInt(q, 10);
        if (!isNaN(i) && i >= 1 && i <= n) return i - 1;
      }
    } catch (e) { /* ignore */ }
    try {
      var s = sessionStorage.getItem(imgStorageKey());
      if (s !== null && s !== '') {
        var j = parseInt(s, 10);
        if (!isNaN(j) && j >= 0 && j < n) return j;
      }
    } catch (e) { /* ignore */ }
    return 0;
  }

  function persistImgIndex(idx, n) {
    if (n < 2) return;
    try { sessionStorage.setItem(imgStorageKey(), String(idx)); } catch (e) { /* ignore */ }
    try {
      var url = new URL(location.href);
      if (idx <= 0) url.searchParams.delete('img');
      else url.searchParams.set('img', String(idx + 1));
      var next = url.pathname + url.search + url.hash;
      if (next !== location.pathname + location.search + location.hash) {
        history.replaceState(null, '', next);
      }
    } catch (e) { /* ignore */ }
  }

  /* ── Theme-aware image srcs ──────────────────────────────────────────────
     Each entry may be a string path, or { light, dark } for day/night art.
     Day (light) shows color when provided; night (dark) shows B/W.        */

  function currentTheme() {
    return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
  }

  function resolveImgSrc(entry, theme) {
    if (!entry) return '';
    if (typeof entry === 'string') return entry;
    if (theme === 'dark') return entry.dark || entry.light || entry.night || entry.day || '';
    return entry.light || entry.dark || entry.day || entry.night || '';
  }

  function entryHasThemeVariant(entry) {
    return entry && typeof entry === 'object' && (entry.light || entry.dark || entry.day || entry.night);
  }

  /* ── Build the image panel ─────────────────────────────────────────────── */

  /* Returns go(delta) for keyboard wiring; null if no multi-image slider. */
  function buildPanel(panel, entries) {
    var n       = entries.length;
    var start   = readSavedImgIndex(n);
    var current = start;
    var theme   = currentTheme();
    var states  = entries.map(function () { return { scale: 1, tx: 0, ty: 0, minScale: 1 }; });

    /* Create all img elements */
    var imgEls = entries.map(function (entry, i) {
      var img       = new Image();
      img.className = 'book-img' + (i === start ? ' book-img--active' : '');
      img.src       = resolveImgSrc(entry, theme);
      img.alt       = '';
      img.draggable = false;
      img.dataset.bookIdx = String(i);
      panel.appendChild(img);
      return img;
    });

    /* Fit image to panel once its dimensions are known (desktop only) */
    function fitEl(idx) {
      if (!MQ_DESKTOP.matches) return;
      var img = imgEls[idx];
      var s   = states[idx];
      if (img.naturalWidth) {
        fitCover(img, panel, s);
      } else {
        img.addEventListener('load', function onLoad() {
          img.removeEventListener('load', onLoad);
          fitCover(img, panel, s);
        });
      }
    }
    fitEl(start);

    /* Slider: go to image index */
    var dots = [];
    function go(idx) {
      idx = ((idx % n) + n) % n;
      if (idx === current) {
        persistImgIndex(current, n);
        return;
      }
      imgEls[current].classList.remove('book-img--active');
      dots[current] && dots[current].classList.remove('book-dot--active');
      current = idx;
      imgEls[current].classList.add('book-img--active');
      dots[current] && dots[current].classList.add('book-dot--active');
      fitEl(idx);
      persistImgIndex(current, n);
    }

    /* Day/night: swap themed sources; re-fit active image. */
    function applyThemeSrcs(nextTheme) {
      if (nextTheme === theme) return;
      theme = nextTheme;
      entries.forEach(function (entry, i) {
        if (!entryHasThemeVariant(entry)) return;
        var next = resolveImgSrc(entry, theme);
        if (!next) return;
        var img = imgEls[i];
        if ((img.getAttribute('src') || '') === next) return;
        /* Reset pan/zoom; re-fit after the new plate loads. */
        states[i] = { scale: 1, tx: 0, ty: 0, minScale: 1 };
        img.addEventListener('load', function onThemeLoad() {
          img.removeEventListener('load', onThemeLoad);
          if (i === current) fitEl(i);
        });
        img.src = next;
      });
    }

    /* Arrows + dots if multiple images */
    if (n > 1) {
      var prevBtn = makeArrow('prev');
      var nextBtn = makeArrow('next');
      prevBtn.addEventListener('click', function () { go(current - 1); });
      nextBtn.addEventListener('click', function () { go(current + 1); });
      panel.appendChild(prevBtn);
      panel.appendChild(nextBtn);

      var dotsEl = document.createElement('div');
      dotsEl.className = 'book-dots';
      entries.forEach(function (_, i) {
        var d = document.createElement('button');
        d.type = 'button';
        d.className = 'book-dot' + (i === start ? ' book-dot--active' : '');
        d.setAttribute('aria-label', 'Image ' + (i + 1));
        d.addEventListener('click', function () { go(i); });
        dotsEl.appendChild(d);
        dots.push(d);
      });
      panel.appendChild(dotsEl);

      /* Write current choice into the URL / session so a reload lands here. */
      persistImgIndex(start, n);
    }

    /* Zoom hint (desktop) */
    if (MQ_DESKTOP.matches) {
      var hint = document.createElement('span');
      hint.className = 'book-zoom-hint';
      hint.textContent = n > 1
        ? '← → images · ctrl ← → canto · scroll zoom · drag pan'
        : 'scroll to zoom · drag to pan · dbl-click to reset';
      panel.appendChild(hint);
    }

    /* Pan/zoom (handlers check MQ_DESKTOP internally) */
    setupPanZoom(
      panel,
      function () { return imgEls[current]; },
      function () { return states[current];  }
    );

    /* Touch swipe → navigate (mobile: check !MQ_DESKTOP; desktop: also usable) */
    var swipeX = null, swipeY = null, multiTouch = false;
    panel.addEventListener('touchstart', function (e) {
      multiTouch = e.touches.length > 1;
      if (e.touches.length === 1) {
        swipeX = e.touches[0].clientX;
        swipeY = e.touches[0].clientY;
      }
    }, { passive: true });
    panel.addEventListener('touchend', function (e) {
      if (multiTouch || swipeX === null || n < 2) { swipeX = null; return; }
      var dx = e.changedTouches[0].clientX - swipeX;
      var dy = e.changedTouches[0].clientY - swipeY;
      /* Only navigate on a clearly horizontal swipe */
      if (Math.abs(dx) > Math.abs(dy) * 1.4 && Math.abs(dx) > 45) {
        go(current + (dx < 0 ? 1 : -1));
      }
      swipeX = null;
    }, { passive: true });
    panel.addEventListener('touchstart', function (e) {
      if (e.touches.length > 1) multiTouch = true;
    }, { passive: true });

    /* React to theme toggle (site.js sets data-theme on <html>). */
    if (entries.some(entryHasThemeVariant)) {
      if (window.MutationObserver) {
        var mo = new MutationObserver(function () {
          applyThemeSrcs(currentTheme());
        });
        mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
      }
      document.addEventListener('kmba-theme', function (e) {
        var t = (e && e.detail) || currentTheme();
        applyThemeSrcs(t === 'dark' ? 'dark' : 'light');
      });
    }

    return n > 1
      ? function (delta) { go(current + delta); }
      : null;
  }

  /* ── Footer nav (Previous / Index / Next) ─────────────────────────────── */

  function buildFooterNav(cfg) {
    var body = document.querySelector('.book-text-body');
    if (!body) return;

    var toc  = cfg.toc  || null;
    var prev = cfg.prev || null;
    var next = cfg.next || null;
    if (!toc && !prev && !next) return;

    var nav = document.createElement('div');
    nav.className = 'book-nav';

    function makeBtn(href, cls, inner) {
      var el = document.createElement(href ? 'a' : 'span');
      if (href) el.href = href;
      el.className = 'book-nav-btn ' + cls + (href ? '' : ' book-nav-disabled');
      el.innerHTML = inner;
      return el;
    }

    nav.appendChild(makeBtn(prev, 'book-nav-prev',
      '<span class="book-nav-arrow" aria-hidden="true">←</span> Previous'));
    if (toc) {
      nav.appendChild(makeBtn(toc, 'book-nav-toc', cfg.tocLabel || 'Index'));
    }
    nav.appendChild(makeBtn(next, 'book-nav-next',
      'Next <span class="book-nav-arrow" aria-hidden="true">→</span>'));

    body.appendChild(nav);
  }

  /* ── Keyboard: ←/→ images · Ctrl←/Ctrl→ prev/next canto ──────────────── */

  function setupKeyboard(goImage, cfg) {
    document.addEventListener('keydown', function (e) {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      if (isTypingTarget(e.target)) return;
      /* Ignore other modifiers (Alt, Shift alone); Ctrl/Meta = canto nav. */
      if (e.altKey) return;

      var dir = e.key === 'ArrowLeft' ? -1 : 1;

      if (e.ctrlKey || e.metaKey) {
        var href = dir < 0 ? cfg.prev : cfg.next;
        if (!href) return;
        e.preventDefault();
        window.location.href = href;
        return;
      }

      /* Plain ←/→: cycle panel images when a multi-image slider exists. */
      if (!goImage) return;
      e.preventDefault();
      goImage(dir);
    });
  }

  /* ── Init ──────────────────────────────────────────────────────────────── */

  function init() {
    var panel = document.querySelector('.book-img-panel');
    if (!panel) return;

    var cfg  = window.TRANS_CONFIG || {};
    var srcs = cfg.images || [];
    var goImage = null;

    if (srcs.length) {
      document.body.classList.add('book-has-images');
      goImage = buildPanel(panel, srcs);
    }

    buildFooterNav(cfg);
    setupKeyboard(goImage, cfg);
  }

  init();
}());
