/**
 * verse-hold.js — the original, a line at a time, on a phone.
 *
 * On a phone the reading page is the Bangla alone (translation-table.css);
 * the original stays a gesture away. Hold any line for a moment and a sheet
 * rises from the bottom with that line's original (and any other column the
 * page carries: an English column, a transliteration; and the line's literal
 * English where the page has a crib, crib.js). While the sheet is up,
 * a tap on another line shows that one instead, and ‹ › step through the
 * poem line by line; a tap on a word of the original opens the অভিধান
 * (book.js), where the page has one. × or a swipe down puts it away.
 *
 * The hold takes the place of the browser's own long-press, which is how a
 * phone selects text; so the sheet gives copying back two ways: কপি puts
 * the held line on the clipboard, and বাছাই returns the phone's own
 * selection to the whole poem (the hold rests meanwhile) until শেষ.
 *
 * Scrolling is never touched: every listener is passive, a hold that moves
 * more than a few pixels is a scroll and is dropped, and the sheet itself is
 * the only thing that ever calls preventDefault (on the browser's own
 * long-press menu over a verse line, which the hold replaces).
 *
 * Phones only (≤760px), and only on pages whose table has a column besides
 * the Bangla. A first visit gets one quiet hint.
 */
(function () {
  'use strict';

  var MQ = window.matchMedia('(max-width: 760px)');
  var HOLD_MS = 420, SLOP = 10;
  var SRC = ['it', 'en', 'fa', 'tl'];
  var LANG = { grc: 'গ্রিক', la: 'লাতিন', it: 'ইতালীয়', fa: 'ফারসি', en: 'ইংরেজি' };
  var COL = { en: 'ইংরেজি', tl: 'প্রতিবর্ণ' };
  var BN_DIGITS = '০১২৩৪৫৬৭৮৯';

  var table, sheet, body, kicker, num, current = null;
  var root = document.documentElement;

  function toBn(n) { return String(n).replace(/\d/g, function (d) { return BN_DIGITS[d]; }); }

  function srcCells(tr) {
    var out = [];
    for (var i = 0; i < SRC.length; i++) {
      var td = tr.querySelector('td.' + SRC[i]);
      if (td && /\S/.test(td.textContent)) out.push(td);
    }
    return out;
  }

  /* a line that has something to show: verse, with an original */
  function holdable(tr) {
    return tr && tr.tagName === 'TR' && tr.parentNode && tr.closest('.tt-table') === table &&
      !/(?:^|\s)(?:tt-section|tt-title|tt-marker)(?:\s|$)/.test(tr.className) &&
      srcCells(tr).length > 0;
  }

  function verseRows() {
    return Array.prototype.filter.call(table.querySelectorAll('tbody tr'), holdable);
  }

  /* a line's number in its poem, for the pages read line by line */
  function lineNo(tr) {
    if (!tr.hasAttribute('data-tercet')) return 0;
    var rows = verseRows();
    return rows.indexOf(tr) + 1;
  }

  function label(td) {
    if (td.classList.contains('it') || td.classList.contains('fa')) {
      return LANG[document.body.dataset.srcLang] || 'মূল';
    }
    return COL[td.classList[0]] || 'মূল';
  }

  /* ── the sheet ─────────────────────────────────────────────────────── */

  /* The original keeps its own lines in the sheet, as the Bangla does on
     the page: one size per column for the whole poem, the largest at which
     its longest line fits the sheet (at most SHEET_MAX), so stepping line
     by line never changes the size. All lines are measured in one layout
     pass, at a reference size, then scaled. A line the original itself
     breaks (a ghazal's two misras) keeps its break. Below SHEET_MIN a line
     too long wraps rather than shrink further. */
  var SHEET_MAX = 20, SHEET_MIN = 12, REF = 20;
  var sheetFs = {}, sheetW = 0;

  function fitSheet() {
    sheetW = window.innerWidth;
    sheetFs = {};
    var have = body.clientWidth;
    if (!have) return;
    var rows = verseRows(), box = document.createElement('div');
    box.style.cssText = 'position:absolute;left:0;top:0;visibility:hidden;width:max-content;';
    var probes = [];
    rows.forEach(function (tr) {
      srcCells(tr).forEach(function (td) {
        var col = td.classList[0];
        var p = document.createElement('p');
        p.className = 'vh-src vh-' + col;
        p.style.cssText = 'display:block;width:max-content;white-space:nowrap;margin:0;font-size:' + REF + 'px;';
        p.innerHTML = td.innerHTML;
        box.appendChild(p);
        probes.push([col, p]);
      });
    });
    body.appendChild(box);
    var widest = {};
    probes.forEach(function (cp) {
      var w = cp[1].getBoundingClientRect().width;
      if (!widest[cp[0]] || w > widest[cp[0]]) widest[cp[0]] = w;
    });
    box.remove();
    Object.keys(widest).forEach(function (col) {
      var fs = Math.floor(REF * have / widest[col] * 0.98 * 10) / 10;
      sheetFs[col] = Math.max(SHEET_MIN, Math.min(SHEET_MAX, fs));
    });
  }

  function build() {
    sheet = document.createElement('div');
    sheet.className = 'vh-sheet';
    sheet.setAttribute('role', 'dialog');
    sheet.setAttribute('aria-label', 'মূল');
    sheet.innerHTML =
      '<div class="vh-head">' +
        '<span class="vh-kicker"></span>' +
        '<span class="vh-num"></span>' +
        '<span class="vh-tools">' +
          '<button type="button" class="vh-step" data-step="-1" aria-label="আগের লাইন">‹</button>' +
          '<button type="button" class="vh-step" data-step="1" aria-label="পরের লাইন">›</button>' +
          '<button type="button" class="vh-close" aria-label="বন্ধ করুন">×</button>' +
        '</span>' +
      '</div>' +
      '<div class="vh-body"></div>' +
      '<div class="vh-acts">' +
        '<button type="button" class="vh-act vh-copy">কপি</button>' +
        '<button type="button" class="vh-act vh-pick">বাছাই করে কপি</button>' +
      '</div>';
    document.body.appendChild(sheet);
    body = sheet.querySelector('.vh-body');
    kicker = sheet.querySelector('.vh-kicker');
    num = sheet.querySelector('.vh-num');

    sheet.querySelector('.vh-close').addEventListener('click', close);
    sheet.querySelector('.vh-copy').addEventListener('click', function () {
      if (current) copy(lineText(current.querySelector('td.bn')));
    });
    sheet.querySelector('.vh-pick').addEventListener('click', startPick);
    sheet.querySelectorAll('.vh-step').forEach(function (b) {
      b.addEventListener('click', function () { step(+b.dataset.step); });
    });

    /* a word of the original: look it up, as a click on it would on a
       desktop (book.js), with the word's own span so the অভিধান can show
       the Bangla it became */
    body.addEventListener('click', function (e) {
      var w = e.target.closest('.w');
      if (!w || !current || !window.BookDict) return;
      var p = w.closest('.vh-src');
      var td = current.querySelector('td.' + p.dataset.col);
      var mine = Array.prototype.indexOf.call(p.querySelectorAll('.w'), w);
      var orig = td && td.querySelectorAll('.w')[mine];
      if (orig) window.BookDict.lookupSpan(orig);
    });

    /* swipe the sheet down to put it away */
    var y0 = null;
    sheet.addEventListener('touchstart', function (e) { y0 = e.touches[0].clientY; }, { passive: true });
    sheet.addEventListener('touchmove', function (e) {
      if (y0 == null) return;
      var dy = e.touches[0].clientY - y0;
      sheet.style.transform = dy > 0 ? 'translateY(' + dy + 'px)' : '';
    }, { passive: true });
    sheet.addEventListener('touchend', function (e) {
      var dy = y0 == null ? 0 : e.changedTouches[0].clientY - y0;
      y0 = null;
      sheet.style.transform = '';
      if (dy > 60) close();
    }, { passive: true });
  }

  /* On a phone the original's column is hidden, so its face (GFS Didot,
     Cormorant, Naskh) is never fetched until the sheet first needs it,
     and a sheet measured before it lands is measured in the fallback.
     Ask for each face up front; when they are in, measure again. */
  function preloadFaces() {
    if (!document.fonts || !document.fonts.load) return;
    var jobs = [];
    SRC.forEach(function (col) {
      var td = table.querySelector('tbody td.' + col);
      if (!td) return;
      var cs = getComputedStyle(td);
      jobs.push(document.fonts.load(cs.fontStyle + ' 20px ' + cs.fontFamily, td.textContent || 'a'));
    });
    if (!jobs.length) return;
    Promise.all(jobs).then(function () {
      sheetW = 0;
      if (current) show(current);
    }, function () {});
  }

  function show(tr) {
    if (!sheet) build();
    if (current) current.classList.remove('vh-held');
    current = tr;
    tr.classList.add('vh-held');

    var cells = srcCells(tr);
    kicker.textContent = 'মূল · ' + cells.map(label).filter(function (v, i, a) { return a.indexOf(v) === i; }).join(' · ');
    var n = lineNo(tr);
    num.textContent = n ? 'লাইন ' + toBn(n) : '';
    body.innerHTML = '';
    if (sheetW !== window.innerWidth) fitSheet();
    cells.forEach(function (td) {
      var col = td.classList[0];
      var p = document.createElement('p');
      p.className = 'vh-src vh-' + col;
      p.dataset.col = col;
      if (td.classList.contains('fa')) p.dir = 'rtl';
      if (sheetFs[col]) p.style.fontSize = sheetFs[col] + 'px';
      p.innerHTML = td.innerHTML;
      body.appendChild(p);
      // at the floor, a line still too long wraps rather than overflow
      if (p.scrollWidth > p.clientWidth + 1) p.classList.add('vh-wrap');
    });
    /* the line's literal English, where the page has a crib (crib.js) */
    var en = window.TransCrib ? window.TransCrib.text(tr) : '';
    if (en) {
      var c = document.createElement('p');
      c.className = 'vh-src vh-en vh-crib';
      en.split(' / ').forEach(function (part, i) {
        if (i) c.appendChild(document.createElement('br'));
        c.appendChild(document.createTextNode(part));
      });
      body.appendChild(c);
      kicker.textContent += ' \u00b7 ' + COL.en;
    }

    root.classList.add('vh-open');
    sheet.classList.add('is-open');
    hideHint();

    /* keep the line in view, above the sheet */
    requestAnimationFrame(function () {
      var r = tr.getBoundingClientRect();
      var room = window.innerHeight - sheet.offsetHeight - 24;
      if (r.bottom > room) window.scrollBy({ top: r.bottom - room + r.height, behavior: 'smooth' });
      else if (r.top < 24) window.scrollBy({ top: r.top - 48, behavior: 'smooth' });
    });
  }

  /* ── copying ───────────────────────────────────────────────────────── */

  /* a line as read: prosody marks (book.js) left out */
  function lineText(td) {
    var c = td.cloneNode(true);
    c.querySelectorAll('.m-sep, .f-sep').forEach(function (el) { el.remove(); });
    c.querySelectorAll('br').forEach(function (br) { br.replaceWith('\n'); });
    return c.textContent.replace(/[ \t]+/g, ' ').trim();
  }

  function copy(text) {
    function done() { toast('কপি হয়েছে'); }
    function fallback() {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0;';
      document.body.appendChild(ta);
      ta.select();
      ta.setSelectionRange(0, text.length);
      try { document.execCommand('copy'); done(); } catch (e) {}
      ta.remove();
    }
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(done, fallback);
    } else fallback();
  }

  /* বাছাই: the phone's own selection, back on the whole poem until শেষ */
  var pickBar = null;
  function startPick() {
    close();
    root.classList.add('vh-picking');
    if (!pickBar) {
      pickBar = document.createElement('div');
      pickBar.className = 'vh-pickbar';
      pickBar.innerHTML = '<span>লাইন চেপে ধরে বাছাই করুন, তারপর কপি</span>' +
        '<button type="button">শেষ</button>';
      pickBar.querySelector('button').addEventListener('click', endPick);
      document.body.appendChild(pickBar);
    }
    requestAnimationFrame(function () { pickBar.classList.add('is-on'); });
  }
  function endPick() {
    root.classList.remove('vh-picking');
    if (pickBar) pickBar.classList.remove('is-on');
    var sel = window.getSelection && window.getSelection();
    if (sel) sel.removeAllRanges();
  }
  function picking() { return root.classList.contains('vh-picking'); }

  var toastEl = null, toastT = null;
  function toast(msg) {
    if (!toastEl) {
      toastEl = document.createElement('div');
      toastEl.className = 'vh-hint vh-toast';
      toastEl.setAttribute('role', 'status');
      document.body.appendChild(toastEl);
    }
    toastEl.textContent = msg;
    // above the sheet when it is up, never over the line it shows
    toastEl.style.bottom = sheet && sheet.classList.contains('is-open') ? (sheet.offsetHeight + 14) + 'px' : '';
    toastEl.classList.add('is-on');
    clearTimeout(toastT);
    toastT = setTimeout(function () { toastEl.classList.remove('is-on'); }, 1600);
  }

  function close() {
    if (!sheet) return;
    sheet.classList.remove('is-open');
    root.classList.remove('vh-open');
    if (current) current.classList.remove('vh-held');
    current = null;
  }

  function step(d) {
    if (!current) return;
    var rows = verseRows();
    var i = rows.indexOf(current) + d;
    if (i >= 0 && i < rows.length) show(rows[i]);
  }

  /* ── the hold ──────────────────────────────────────────────────────── */

  function setupHold() {
    var timer = null, glow = null, x0 = 0, y0 = 0, tr = null, fired = 0;

    function cancel() {
      clearTimeout(timer); clearTimeout(glow);
      timer = glow = null;
      if (tr) tr.classList.remove('vh-pressing');
      tr = null;
    }

    table.addEventListener('touchstart', function (e) {
      cancel();
      if (!MQ.matches || picking() || e.touches.length > 1) return;
      var row = e.target.closest && e.target.closest('tr');
      var td = e.target.closest && e.target.closest('td.bn');
      if (!td || !holdable(row)) return;
      tr = row;
      x0 = e.touches[0].clientX; y0 = e.touches[0].clientY;
      // the line warms only once the finger has rested: a flick never shows it
      glow = setTimeout(function () { if (tr) tr.classList.add('vh-pressing'); }, 140);
      timer = setTimeout(function () {
        var row = tr;
        cancel();
        if (!row) return;
        fired = Date.now();
        if (navigator.vibrate) { try { navigator.vibrate(8); } catch (err) {} }
        show(row);
      }, HOLD_MS);
    }, { passive: true });

    table.addEventListener('touchmove', function (e) {
      if (!tr) return;
      var t = e.touches[0];
      if (Math.abs(t.clientX - x0) > SLOP || Math.abs(t.clientY - y0) > SLOP) cancel();
    }, { passive: true });

    table.addEventListener('touchend', cancel, { passive: true });
    table.addEventListener('touchcancel', cancel, { passive: true });

    /* the browser's own long-press menu (Android) gives way to the hold */
    table.addEventListener('contextmenu', function (e) {
      if (MQ.matches && !picking() && e.target.closest && e.target.closest('td.bn')) e.preventDefault();
    });

    /* the tap that ends a hold is not a tap; with the sheet up, a tap on
       another line shows that one */
    table.addEventListener('click', function (e) {
      if (!MQ.matches || picking()) return;
      if (Date.now() - fired < 600) { e.stopPropagation(); e.preventDefault(); return; }
      if (!current) return;
      var row = e.target.closest && e.target.closest('tr');
      if (holdable(row) && e.target.closest('td.bn')) show(row);
    }, true);

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && current) close();
    });
    MQ.addEventListener('change', function (m) { if (!m.matches) { close(); endPick(); } });
  }

  /* ── one quiet hint, once ──────────────────────────────────────────── */

  var hint = null;
  function hideHint() {
    if (!hint) return;
    hint.classList.remove('is-on');
    var h = hint; hint = null;
    setTimeout(function () { h.remove(); }, 400);
  }

  function maybeHint() {
    var seen = false;
    try { seen = localStorage.getItem('vh-hint') === '1'; } catch (e) {}
    if (seen) return;
    try { localStorage.setItem('vh-hint', '1'); } catch (e) {}
    var lang = LANG[document.body.dataset.srcLang];
    hint = document.createElement('div');
    hint.className = 'vh-hint';
    hint.setAttribute('role', 'status');
    hint.textContent = 'যেকোনো লাইন চেপে ধরলে ' + (lang ? 'মূল ' + lang : 'মূলটা') + ' দেখা যাবে';
    hint.addEventListener('click', hideHint);
    document.body.appendChild(hint);
    setTimeout(function () { if (hint) hint.classList.add('is-on'); }, 900);
    setTimeout(hideHint, 6500);
  }

  function init() {
    table = document.querySelector('.tt-table');
    if (!table || table.dataset.vhReady) return;
    if (!table.querySelector('tbody tr td.it, tbody tr td.en, tbody tr td.fa, tbody tr td.tl')) return;
    table.dataset.vhReady = '1';
    root.classList.add('vh-ready');
    setupHold();
    if (MQ.matches) preloadFaces();
    if (MQ.matches) maybeHint();
  }

  if (document.querySelector('.tt-table tbody tr')) init();
  document.addEventListener('md-loader-done', init);
})();
