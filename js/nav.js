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

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectNav);
  } else {
    injectNav();
  }
}());
