(function () {
  'use strict';

  // ── Theme management ───────────────────────────────────────────────────────
  // The nav (incl. #nav-theme-btn) is now rendered server-side by Base.astro;
  // this script only wires behaviour. An inline script in <head> applies the
  // initial theme before paint to avoid a flash.
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

  function setupTheme() {
    applyTheme(resolveTheme());
    var btn = document.getElementById('nav-theme-btn');
    if (btn) {
      btn.addEventListener('click', function () {
        var current = document.documentElement.getAttribute('data-theme') || 'light';
        applyTheme(current === 'dark' ? 'light' : 'dark');
      });
    }
    if (window.matchMedia) {
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function (e) {
        if (!getStoredTheme()) applyTheme(e.matches ? 'dark' : 'light');
      });
    }
  }

  // ── Auto-TOC ───────────────────────────────────────────────────────────────
  function formatLabel(id) {
    return id.replace(/[-_]+/g, ' ').replace(/\b\w/g, function (c) { return c.toUpperCase(); });
  }

  function collectTOCEntries() {
    var entries = [];
    var sections = document.querySelectorAll('.page-section[id]');
    if (sections.length) {
      sections.forEach(function (sec) {
        var title = sec.querySelector('.section-title');
        var label = (title && title.textContent.trim()) ||
                    sec.getAttribute('data-toc-label') || formatLabel(sec.id);
        entries.push({ href: '#' + sec.id, label: label });
      });
      return entries;
    }
    var mount = document.getElementById('matrix-mount');
    if (mount) { if (!mount.id) mount.id = 'trellis'; entries.push({ href: '#' + mount.id, label: 'Trellis' }); return entries; }
    var listing = document.querySelector('.listing-box');
    if (listing) { if (!listing.id) listing.id = 'articles'; entries.push({ href: '#' + listing.id, label: 'Articles' }); return entries; }
    var trans = document.querySelector('.trans-page, .tt-wrap');
    if (trans) { if (!trans.id) trans.id = 'text'; entries.push({ href: '#' + trans.id, label: 'Text' }); return entries; }
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
    toc.innerHTML = '<span class="toc-label">TOC ▾</span>' +
      '<div class="toc-dropdown"><ul>' + listHtml + '</ul></div>';
    headerInner.appendChild(toc);
  }

  function tryLateTOCRefresh() {
    var wrap = document.querySelector('.page-header-inner .toc-wrapper');
    if (!wrap) { injectTOC(); return; }
    var sections = document.querySelectorAll('.page-section[id]');
    if (!sections.length) return;
    var links = wrap.querySelectorAll('.toc-dropdown li a');
    sections.forEach(function (sec, i) {
      var title = sec.querySelector('.section-title');
      if (title && links[i]) links[i].textContent = title.textContent.trim();
    });
  }

  // ── Sticky shrinking page-header ────────────────────────────────────────────
  function setupStickyHeader() {
    var header = document.querySelector('.page-header');
    if (!header) return;
    var threshold = 16, stuck = false, ticking = false;
    function update() {
      ticking = false;
      var s = window.scrollY > threshold;
      if (s !== stuck) { stuck = s; header.classList.toggle('is-sticky', s); }
    }
    function onScroll() { if (!ticking) { requestAnimationFrame(update); ticking = true; } }
    window.addEventListener('scroll', onScroll, { passive: true });
    update();
  }

  function boot() {
    setupTheme();
    injectTOC();
    setupStickyHeader();
    setTimeout(tryLateTOCRefresh, 400);
    setTimeout(tryLateTOCRefresh, 1500);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
}());
