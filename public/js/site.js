(function () {
  'use strict';

  /* ── Theme management ─────────────────────────────────────────────────────
     The nav (#nav-theme-btn) is server-rendered; this script wires behaviour.
     An inline script in <head> sets the initial theme before paint.          */
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
    try {
      document.dispatchEvent(new CustomEvent('kmba-theme', { detail: t }));
    } catch (e) { /* IE / old engines: MutationObserver in book.js still works */ }
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

  /* ── TOC rail ─────────────────────────────────────────────────────────────
     Scans for [data-toc] elements. If ≥ 2 found, builds a fixed right-edge
     nav with horizontal dash markers (universe-style). The whole panel
     expands on hover to reveal labelled links. Scroll-spy highlights the
     active section and dims past ones.                                        */

  var tocNav = null;
  var tocItems = [];   // [{target, a}]
  var rafPending = false;

  function buildTOC() {
    var targets = Array.from(document.querySelectorAll('[data-toc]'));
    if (targets.length < 2) {
      var old = document.getElementById('site-toc');
      if (old) old.parentNode.removeChild(old);
      return;
    }

    // Tear down any existing nav (rebuilt after md-loader-done)
    var existing = document.getElementById('site-toc');
    if (existing) existing.parentNode.removeChild(existing);

    tocNav = document.createElement('nav');
    tocNav.id = 'site-toc';
    tocNav.className = 'toc';
    tocNav.setAttribute('aria-label', 'সূচিপত্র');

    var title = document.createElement('span');
    title.className = 'toc__title';
    title.textContent = 'সূচিপত্র';
    tocNav.appendChild(title);

    var list = document.createElement('ol');
    list.className = 'toc__list';

    tocItems = targets.map(function (target) {
      var label = target.getAttribute('data-toc');
      var id = target.id;

      var a = document.createElement('a');
      a.className = 'toc__link';
      a.href = '#' + id;

      var lbl = document.createElement('span');
      lbl.className = 'toc__label';
      lbl.textContent = label;

      var marker = document.createElement('span');
      marker.className = 'toc__marker';
      marker.setAttribute('aria-hidden', 'true');

      a.appendChild(lbl);
      a.appendChild(marker);

      a.addEventListener('click', function (e) {
        e.preventDefault();
        var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        target.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
        history.replaceState(null, '', '#' + id);
        setActive(id);
      });

      var li = document.createElement('li');
      li.className = 'toc__item';
      li.appendChild(a);
      list.appendChild(li);

      return { id: id, target: target, a: a };
    });

    tocNav.appendChild(list);
    document.body.appendChild(tocNav);

    var activeIdx = -1;

    function setActive(id) {
      var idx = tocItems.findIndex(function (it) { return it.id === id; });
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

    function onScroll() {
      if (rafPending) return;
      rafPending = true;
      requestAnimationFrame(function () { spy(); rafPending = false; });
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    spy();
  }

  /* ── Boot ─────────────────────────────────────────────────────────────── */

  function boot() {
    setupTheme();
    buildTOC();
    document.addEventListener('md-loader-done', buildTOC);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
}());
