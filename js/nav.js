(function () {
  'use strict';

  // ── Theme management ───────────────────────────────────────────────────────
  function getStoredTheme() {
    try { return localStorage.getItem('kmba-theme'); } catch (e) { return null; }
  }
  function storeTheme(t) {
    try { localStorage.setItem('kmba-theme', t); } catch (e) {}
  }
  function systemPrefersDark() {
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  }
  function resolveTheme() {
    var stored = getStoredTheme();
    if (stored === 'dark' || stored === 'light') return stored;
    return systemPrefersDark() ? 'dark' : 'light';
  }
  function applyTheme(t) {
    document.documentElement.setAttribute('data-theme', t);
    storeTheme(t);
    var btn = document.getElementById('nav-theme-btn');
    if (btn) btn.setAttribute('title', t === 'dark' ? 'Switch to day mode' : 'Switch to night mode');
  }

  // Apply immediately to avoid flash
  applyTheme(resolveTheme());

  // ── Nav injection ──────────────────────────────────────────────────────────
  function injectNav() {
    var path = window.location.pathname;
    var section = /\/creations(\/|$)/.test(path) ? 'creations'
                : /\/translations(\/|$)/.test(path) ? 'translations'
                : /\/visions(\/|$)/.test(path) ? 'visions'
                : '';

    function li(href, label, key) {
      return '<li><a href="' + href + '"' +
             (section === key ? ' class="active"' : '') +
             '>' + label + '</a></li>';
    }

    var nav = document.createElement('nav');
    nav.className = 'nav';
    nav.innerHTML =
      '<div class="nav-inner">' +
        '<span class="nav-brand"><a href="/">KMBA</a></span>' +
        '<div class="nav-right">' +
          '<ul class="nav-links">' +
            li('/creations/', 'Creations', 'creations') +
            li('/translations/', 'Translations', 'translations') +
            li('/visions/', 'Visions', 'visions') +
          '</ul>' +
          '<button class="nav-theme-btn" id="nav-theme-btn" aria-label="Toggle theme"></button>' +
        '</div>' +
      '</div>';

    document.body.insertBefore(nav, document.body.firstChild);

    var btn = document.getElementById('nav-theme-btn');
    applyTheme(resolveTheme()); // re-run now that btn exists
    btn.addEventListener('click', function () {
      var current = document.documentElement.getAttribute('data-theme') || 'light';
      applyTheme(current === 'dark' ? 'light' : 'dark');
    });

    // Listen for OS preference changes
    if (window.matchMedia) {
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function (e) {
        if (!getStoredTheme()) applyTheme(e.matches ? 'dark' : 'light');
      });
    }
  }

  // ── Auto-TOC ───────────────────────────────────────────────────────────────
  // Every internal page gets a TOC dropdown in the page-header.
  // If a manual TOC is already present in the HTML, it's preserved.
  function formatLabel(id) {
    return id.replace(/[-_]+/g, ' ').replace(/\b\w/g, function (c) {
      return c.toUpperCase();
    });
  }

  function collectTOCEntries() {
    var entries = [];

    // 1. Sections explicitly marked as .page-section[id]
    var sections = document.querySelectorAll('.page-section[id]');
    if (sections.length) {
      sections.forEach(function (sec) {
        var title = sec.querySelector('.section-title');
        var label = (title && title.textContent.trim()) ||
                    sec.getAttribute('data-toc-label') ||
                    formatLabel(sec.id);
        entries.push({ href: '#' + sec.id, label: label });
      });
      return entries;
    }

    // 2. A bare matrix mount (no surrounding page-section)
    var mount = document.getElementById('matrix-mount');
    if (mount) {
      if (!mount.id) mount.id = 'trellis';
      entries.push({ href: '#' + mount.id, label: 'Trellis' });
      return entries;
    }

    // 3. A listing of articles
    var listing = document.querySelector('.listing-box');
    if (listing) {
      if (!listing.id) listing.id = 'articles';
      entries.push({ href: '#' + listing.id, label: 'Articles' });
      return entries;
    }

    // 4. A translation table
    var trans = document.querySelector('.trans-page, .tt-wrap');
    if (trans) {
      if (!trans.id) trans.id = 'text';
      entries.push({ href: '#' + trans.id, label: 'Text' });
      return entries;
    }

    return entries;
  }

  function injectTOC() {
    var headerInner = document.querySelector('.page-header-inner');
    if (!headerInner) return;
    if (headerInner.querySelector('.toc-wrapper')) return;

    var entries = collectTOCEntries();
    if (!entries.length) return;

    var toc = document.createElement('div');
    toc.className = 'toc-wrapper';
    var listHtml = entries.map(function (e) {
      return '<li><a href="' + e.href + '">' + e.label + '</a></li>';
    }).join('');
    toc.innerHTML =
      '<span class="toc-label">TOC ▾</span>' +
      '<div class="toc-dropdown"><ul>' + listHtml + '</ul></div>';
    headerInner.appendChild(toc);
  }

  // Some pages render sections asynchronously (matrix.js). Re-run injection
  // a moment later so labels can pick up live section-titles, but only if
  // we haven't already produced a TOC.
  function tryLateTOCRefresh() {
    var wrap = document.querySelector('.page-header-inner .toc-wrapper');
    if (!wrap) { injectTOC(); return; }
    // Refresh labels from rendered section-titles
    var sections = document.querySelectorAll('.page-section[id]');
    if (!sections.length) return;
    var links = wrap.querySelectorAll('.toc-dropdown li a');
    sections.forEach(function (sec, i) {
      var title = sec.querySelector('.section-title');
      if (title && links[i]) {
        links[i].textContent = title.textContent.trim();
      }
    });
  }

  // ── Sticky shrinking page-header ───────────────────────────────────────────
  function setupStickyHeader() {
    var header = document.querySelector('.page-header');
    if (!header) return;
    var threshold = 16;
    var stuck = false;
    var ticking = false;
    function update() {
      ticking = false;
      var s = window.scrollY > threshold;
      if (s !== stuck) {
        stuck = s;
        header.classList.toggle('is-sticky', s);
      }
    }
    function onScroll() {
      if (!ticking) {
        requestAnimationFrame(update);
        ticking = true;
      }
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    update();
  }

  // ── Boot ───────────────────────────────────────────────────────────────────
  function boot() {
    injectNav();
    injectTOC();
    setupStickyHeader();
    // After matrix.js / essay renderers have had a tick to render
    setTimeout(tryLateTOCRefresh, 400);
    setTimeout(tryLateTOCRefresh, 1500);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
}());
