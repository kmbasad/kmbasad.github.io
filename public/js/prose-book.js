/* prose-book.js ~ a prose page (src/pages/gadya/) opened as a book.

   The page's own text (.gd-prose: chapters of headings, paragraphs, a quoted
   letter, a note) is poured, at the size of the screen in hand, into real
   pages: a title leaf, its verso, then the chapters, each opening a fresh
   page. A paragraph that does not fit is cut at a word, its first part
   justified to the page's foot, the rest carried over without indent, so
   the pages read like a printed book's. The pages are then turned like
   leaves: on a laptop two at a time, a spread with the running heads and the
   numbers at the outer corners; on a tablet one page on the desk; on a
   phone one page filling the screen in a smaller face, as an e-reader does.

   Opened by any [data-book-open] button (fullscreen where the browser
   allows) or by #book in the address. The place is kept per page in this
   browser and survives a new size or face: the book is laid out again
   around the same word. */
(function () {
  'use strict';

  var src = document.querySelector('.gd-prose');
  var head = document.querySelector('.gd-head');
  if (!src || !head) return;

  var BN = '০১২৩৪৫৬৭৮৯';
  var bn = function (n) { return String(n).replace(/\d/g, function (d) { return BN[+d]; }); };
  var KEY = 'prose-book:' + location.pathname + ':';
  var load = function (k, d) {
    try { var v = localStorage.getItem(KEY + k); return v === null ? d : JSON.parse(v); } catch (e) { return d; }
  };
  var save = function (k, v) { try { localStorage.setItem(KEY + k, JSON.stringify(v)); } catch (e) {} };
  var reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var html = document.documentElement;
  var el = function (tag, cls, inner) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (inner != null) e.innerHTML = inner;
    return e;
  };
  var txt = function (sel) { var e = head.querySelector(sel); return e ? e.textContent.trim() : ''; };

  /* ~ the matter, gathered once from the page ~ */
  var bookTitle = src.getAttribute('data-book-title') || txt('h1');
  var chapters = [];   // {label, title, page}
  var blocks = [];     // {ch, kind: 'ch' | 'b', el}
  src.querySelectorAll('.gd-ch').forEach(function (sec, i) {
    var num = sec.querySelector('.gd-ch-num'), ttl = sec.querySelector('.gd-ch-title');
    chapters.push({ label: num ? num.textContent.trim() : '', title: ttl ? ttl.innerHTML : '', page: 0 });
    blocks.push({ ch: i, kind: 'ch', el: sec.querySelector('h2') });
    Array.prototype.forEach.call(sec.children, function (c) {
      if (c.tagName !== 'H2') blocks.push({ ch: i, kind: 'b', el: c });
    });
  });
  if (!blocks.length) return;

  /* ~ the reader's frame ~ */
  var pb = el('div', 'pb');
  pb.hidden = true;
  pb.setAttribute('role', 'dialog');
  pb.setAttribute('aria-label', bookTitle);
  pb.innerHTML =
    '<div class="pb-bar pb-top">' +
      '<button class="pb-btn pb-close" type="button" aria-label="বই বন্ধ করুন">' +
        '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M5 5l10 10M15 5L5 15"/></svg></button>' +
      '<span class="pb-name"></span>' +
      '<span class="pb-tools">' +
        '<button class="pb-btn pb-toc-btn" type="button">সূচি</button>' +
        '<button class="pb-btn pb-smaller" type="button" aria-label="অক্ষর ছোট">অ<small>−</small></button>' +
        '<button class="pb-btn pb-bigger" type="button" aria-label="অক্ষর বড়">অ<small>+</small></button>' +
        '<button class="pb-btn pb-fs" type="button" aria-label="পূর্ণ পর্দা">' +
          '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M3 8V3h5M12 3h5v5M17 12v5h-5M8 17H3v-5"/></svg></button>' +
      '</span>' +
    '</div>' +
    '<div class="pb-stage">' +
      '<div class="pb-book"><div class="pb-slot pb-left"></div><div class="pb-slot pb-right"></div></div>' +
      '<div class="pb-wait">বই সাজানো হচ্ছে… <span></span></div>' +
    '</div>' +
    '<div class="pb-bar pb-bot">' +
      '<span class="pb-where"></span>' +
      '<input class="pb-range" type="range" min="0" max="0" value="0" aria-label="পৃষ্ঠা">' +
      '<span class="pb-count"></span>' +
    '</div>' +
    '<nav class="pb-toc" hidden aria-label="সূচি"><div class="pb-toc-in"><p class="pb-toc-h">সূচি</p><ol></ol></div></nav>' +
    '<div class="pb-measure" aria-hidden="true"></div>';
  document.body.appendChild(pb);

  var $ = function (s) { return pb.querySelector(s); };
  var stage = $('.pb-stage'), book = $('.pb-book');
  var slotL = $('.pb-left'), slotR = $('.pb-right');
  var measure = $('.pb-measure'), wait = $('.pb-wait');
  var range = $('.pb-range'), where = $('.pb-where'), count = $('.pb-count');
  var tocBox = $('.pb-toc'), tocList = $('.pb-toc ol');
  $('.pb-name').textContent = bookTitle;

  var fsTarget = pb.requestFullscreen ? 'requestFullscreen' : (pb.webkitRequestFullscreen ? 'webkitRequestFullscreen' : '');
  if (!fsTarget) $('.pb-fs').hidden = true;
  var isFull = function () { return !!(document.fullscreenElement || document.webkitFullscreenElement); };

  /* ~ the page's size and face, from the screen ~ */
  var SCALES = [0.8, 0.88, 0.94, 1, 1.07, 1.15, 1.25, 1.36];
  var scaleAt = Math.max(0, Math.min(SCALES.length - 1, load('scale', 3)));
  var geo = null;

  function decide() {
    var vw = pb.clientWidth || innerWidth, vh = pb.clientHeight || innerHeight;
    var coarse = matchMedia('(pointer: coarse)').matches;
    var mode = (!coarse && vw >= 900 && vw / vh >= 1.15) ? 'spread'
      : (Math.min(vw, vh) < 600 ? 'phone' : 'tablet');
    // the book is the whole screen: a spread is two half screens, a
    // tablet's or a phone's page the screen itself
    var pw = mode === 'spread' ? Math.floor(vw / 2) : vw, ph = vh, fs;
    if (mode === 'spread') fs = Math.max(14.5, Math.min(17, ph / 56));
    else if (mode === 'tablet') fs = Math.max(14.5, Math.min(16.5, Math.min(vw, vh) / 50));
    else fs = 15;
    fs = Math.round(fs * SCALES[scaleAt] * 10) / 10;
    // margins: a fair share of the page, and never a line longer than a
    // reader's eye takes in (about forty ems)
    var phone = mode === 'phone';
    var px = Math.max(Math.round(pw * (phone ? 0.065 : 0.075)), Math.round((pw - fs * (phone ? 999 : 40)) / 2));
    var pt = phone ? 40 : Math.max(46, Math.round(ph * 0.07));
    var pbm = phone ? 40 : Math.max(46, Math.round(ph * 0.07));
    return { mode: mode, pw: pw, ph: ph, fs: fs, px: px, pt: pt, pbm: pbm, key: [mode, pw, ph, fs].join() };
  }

  function applyGeo(g) {
    pb.setAttribute('data-mode', g.mode);
    var s = pb.style;
    s.setProperty('--pw', g.pw + 'px');
    s.setProperty('--ph', g.ph + 'px');
    s.setProperty('--fs', g.fs + 'px');
    s.setProperty('--px', g.px + 'px');
    s.setProperty('--pt', g.pt + 'px');
    s.setProperty('--pbm', g.pbm + 'px');
  }

  /* ~ cutting a block at a word ~ */
  var WORD = /\S+/g;
  var words = function (node) { return (node.textContent.match(WORD) || []).length; };

  // a copy of the block holding only its first n words (keep = 'head') or
  // all but them (keep = 'tail'), its inline marks intact
  function cut(node, n, keep) {
    var c = node.cloneNode(true);
    var walk = document.createTreeWalker(c, NodeFilter.SHOW_TEXT), t, seen = 0, m;
    while ((t = walk.nextNode())) {
      WORD.lastIndex = 0;
      while ((m = WORD.exec(t.data))) {
        if (++seen === n) {
          var r = document.createRange();
          if (keep === 'head') { r.setStart(t, m.index + m[0].length); r.setEndAfter(c.lastChild); }
          else { r.setStart(c, 0); r.setEnd(t, m.index + m[0].length); }
          r.deleteContents();
          return c;
        }
      }
    }
    return c;
  }

  // ids become data-pbid: a block may be cut in two, and the page keeps its
  // own ids out of the book
  function clean(node) {
    if (node.id) { node.setAttribute('data-pbid', node.id); node.removeAttribute('id'); }
    node.querySelectorAll('[id]').forEach(function (e) { e.setAttribute('data-pbid', e.id); e.removeAttribute('id'); });
    return node;
  }

  /* ~ laying the book out ~ */
  var pages = [];
  var cur = 0;
  var gen = 0;        // a newer layout cancels an older one still running
  var laying = false; // the last page is still being filled, out of reach
  var lastReady = function () { return pages.length - (laying ? 2 : 1); };

  function makePage() {
    var p = el('div', 'pb-page');
    p.appendChild(el('div', 'pb-run'));
    p.appendChild(el('div', 'pb-body'));
    p.appendChild(el('div', 'pb-num'));
    return p;
  }

  function titlePage() {
    var p = makePage();
    p.classList.add('pb-title-page');
    var b = p.querySelector('.pb-body');
    b.appendChild(el('p', 'pb-t-kicker')).textContent = txt('.gd-kicker');
    b.appendChild(el('h1', 'pb-t-title')).textContent = txt('.gd-title');
    b.appendChild(el('span', 'pb-t-rule'));
    b.appendChild(el('p', 'pb-t-imprint')).textContent = txt('.gd-standfirst');
    return p;
  }

  function versoPage() {
    var p = makePage();
    p.classList.add('pb-verso-page');
    var b = p.querySelector('.pb-body');
    b.appendChild(el('p', 'pb-v-credit')).textContent = txt('.gd-credit');
    b.appendChild(el('p', 'pb-v-site')).textContent = document.querySelector('.mast-name') ? document.querySelector('.mast-name').textContent.trim() : '';
    return p;
  }

  function layout(anchor) {
    var my = ++gen;
    geo = decide();
    applyGeo(geo);
    wait.hidden = false;
    book.hidden = true;
    var span = wait.querySelector('span');
    var out = [titlePage(), versoPage()];
    decorate(out[0], 0);
    decorate(out[1], 1);
    var page = null, body = null, bi = 0, opened = false;
    laying = false;
    // enough is laid when the reader's page and a spread beyond it are done
    var enough = function () {
      if (out.length < 8) return false;
      if (!anchor) return true;
      var a = out[out.length - 6]._at;
      return !!a && (a[0] > anchor[0] || (a[0] === anchor[0] && a[1] > anchor[1]));
    };

    function start(ch, opening, at) {
      if (out.length > 2) decorate(out[out.length - 1], out.length - 1);
      page = makePage();
      page._ch = ch;
      page._open = opening;
      page._at = at;
      body = page.querySelector('.pb-body');
      measure.textContent = '';
      measure.appendChild(page);
      out.push(page);
    }
    var fits = function () { return body.scrollHeight <= body.clientHeight + 1; };
    function tryWith(node) { body.appendChild(node); var ok = fits(); body.removeChild(node); return ok; }

    // the most words of `part` this page still takes, from a first guess by
    // the space left, then a short search either way
    function most(part, total) {
      body.appendChild(part);
      var room = body.clientHeight - part.offsetTop;
      var guess = Math.max(0, Math.min(total - 1, Math.floor(total * room / Math.max(1, part.offsetHeight)) - 2));
      body.removeChild(part);
      var test = function (n) { if (n <= 0) return true; var h = cut(part, n, 'head'); h.classList.add('pb-split'); return tryWith(h); };
      var lo, hi;
      if (test(guess)) {
        lo = guess; hi = Math.min(total - 1, guess + 6);
        while (hi < total - 1 && test(hi)) { lo = hi; hi = Math.min(total - 1, hi + 12); }
        if (test(hi)) return hi;
      } else {
        hi = guess; lo = Math.max(0, guess - 12);
        while (lo > 0 && !test(lo)) { hi = lo; lo = Math.max(0, lo - 24); }
      }
      while (hi - lo > 1) { var mid = (lo + hi) >> 1; if (test(mid)) lo = mid; else hi = mid; }
      return lo;
    }

    // where an overflowing block in place on the page must be cut: the
    // last word whose line still ends inside the page, read from the
    // words' own boxes (one layout, no trial cuts)
    function lineCut(part) {
      var lim = body.getBoundingClientRect().top + body.clientHeight + 0.5;
      var lh = parseFloat(getComputedStyle(part).lineHeight) || 0;
      var spots = [], walk = document.createTreeWalker(part, NodeFilter.SHOW_TEXT), t, m;
      while ((t = walk.nextNode())) {
        WORD.lastIndex = 0;
        while ((m = WORD.exec(t.data))) spots.push([t, m.index, m.index + m[0].length]);
      }
      var r = document.createRange();
      var ends = function (k) {
        r.setStart(spots[k][0], spots[k][1]);
        r.setEnd(spots[k][0], spots[k][2]);
        var b = r.getBoundingClientRect();
        return b.top + (b.height + Math.max(lh, b.height)) / 2;
      };
      var lo = 0, hi = spots.length;   // the first `lo` words fit
      while (lo < hi) {
        var mid = (lo + hi + 1) >> 1;
        if (ends(mid - 1) <= lim) lo = mid; else hi = mid - 1;
      }
      return Math.min(lo, spots.length - 1);
    }
    function headOf(part, n) { var h = cut(part, n, 'head'); h.classList.add('pb-split'); return h; }

    function place(i) {
      var b = blocks[i];
      if (b.kind === 'ch') {
        start(b.ch, true, [i, 0]);
        var h = el('div', 'pb-chap');
        h.appendChild(el('span', 'pb-chap-num')).textContent = chapters[b.ch].label;
        h.appendChild(el('span', 'pb-chap-title', chapters[b.ch].title));
        body.appendChild(clean(h));
        return;
      }
      var node = clean(b.el.cloneNode(true));
      if (!body) start(b.ch, false, [i, 0]);
      if (!body.childNodes.length) page._at = [i, 0];
      body.appendChild(node);
      if (fits()) return;
      var part = node, done = 0;
      for (;;) {
        var total = words(part);
        var n = lineCut(part);
        body.removeChild(part);
        var hd = null;
        if (n > 0) {
          hd = headOf(part, n);
          body.appendChild(hd);
          if (!fits()) {
            // the boxes misjudged by a hair: search it out the slow way
            body.removeChild(hd);
            n = most(part, total);
            if (n > 0) body.appendChild(headOf(part, n));
          }
        }
        if (n === 0 && !body.childNodes.length) { n = 1; body.appendChild(headOf(part, 1)); }   // a word wider than a page
        if (n > 0) { part = cut(part, n, 'tail'); done += n; }
        start(b.ch, false, [i, done]);
        if (done > 0) part.classList.add('pb-cont');
        body.appendChild(part);
        if (fits()) return;
      }
    }

    function step() {
      if (my !== gen) return;
      var t0 = performance.now();
      while (bi < blocks.length && performance.now() - t0 < 16) place(bi++);
      if (bi < blocks.length) {
        if (!opened && enough()) { opened = true; early(out, anchor); }
        else if (!opened) span.textContent = bn(Math.round(100 * bi / blocks.length)) + '%';
        else count.textContent = cur >= 2 ? 'পৃষ্ঠা ' + bn(cur - 1) : '';
        setTimeout(step, 0);
        return;
      }
      measure.textContent = '';
      finish(out, anchor);
    }
    setTimeout(step, 0);
  }

  // a finished page gets its side, folio and running head
  function decorate(p, i) {
    p.setAttribute('data-side', i % 2 ? 'left' : 'right');
    if (i < 2) return;
    p.querySelector('.pb-num').textContent = bn(i - 1);
    var run = p.querySelector('.pb-run');
    if (p._open) run.textContent = '';
    else run.textContent = geo.mode === 'spread' && i % 2 ? bookTitle : chapters[p._ch].label;
    if (p._open) chapters[p._ch].page = i;
  }

  // the first pages are in hand: open the book there while the rest is laid
  function early(out, anchor) {
    pages = out;
    laying = true;
    wait.hidden = true;
    book.hidden = false;
    pos = anchor || null;
    go(anchor ? find(anchor) : 0, !!anchor);
  }

  function finish(out, anchor) {
    var wasOpen = laying && pages === out;
    pages = out;
    laying = false;
    pages.forEach(decorate);
    range.max = pages.length - 1;
    tocList.textContent = '';
    chapters.forEach(function (c) {
      var li = el('li'), a = el('button', 'pb-toc-a');
      a.type = 'button';
      a.appendChild(el('span', 'pb-toc-l')).textContent = c.label;
      a.appendChild(el('span', 'pb-toc-t', c.title));
      a.appendChild(el('span', 'pb-toc-n')).textContent = bn(c.page - 1);
      a.addEventListener('click', function () { setToc(false); go(c.page); });
      li.appendChild(a);
      tocList.appendChild(li);
    });
    wait.hidden = true;
    book.hidden = false;
    if (wasOpen) show(); else { pos = anchor || null; go(anchor ? find(anchor) : 0, !!anchor); }
  }

  // the page on which a place in the text falls
  function find(at) {
    var best = 0;
    for (var i = 2; i < pages.length; i++) {
      var a = pages[i]._at;
      if (!a) continue;
      if (a[0] < at[0] || (a[0] === at[0] && a[1] <= at[1])) best = i; else break;
    }
    return best;
  }

  var pos = null;   // the reader's place in the text, kept across layouts
  function anchorNow() {
    if (pos) return pos;
    var a = pages[visibleFirst()] && pages[visibleFirst()]._at;
    if (!a && pages[visibleFirst() + 1]) a = pages[visibleFirst() + 1]._at;
    return a || null;
  }
  // the place shown now: the first page in view that holds text
  function placeShown() {
    var f = visibleFirst();
    return (pages[f] && pages[f]._at) || (geo.mode === 'spread' && pages[f + 1] && pages[f + 1]._at) || null;
  }

  /* ~ showing and turning ~ */
  var spreadOf = function (i) { return Math.ceil(i / 2); };
  function visibleFirst() { return geo && geo.mode === 'spread' ? Math.max(0, 2 * spreadOf(cur) - 1) : cur; }

  function blank() { var p = el('div', 'pb-page pb-blank'); return p; }
  function put(slot, p) { slot.textContent = ''; slot.appendChild(p || blank()); }

  function show() {
    if (geo.mode === 'spread') {
      var s = spreadOf(cur);
      put(slotL, s > 0 ? pages[2 * s - 1] : null);
      put(slotR, pages[2 * s]);
      slotL.classList.toggle('pb-empty', s === 0);
    } else {
      put(slotR, pages[cur]);
    }
    range.value = cur;
    var p = pages[cur];
    where.innerHTML = p && p._ch != null ? chapters[p._ch].label : bookTitle;
    count.textContent = cur >= 2 ? 'পৃষ্ঠা ' + bn(cur - 1) + (laying ? '' : ' / ' + bn(pages.length - 2)) : '';
    if (pos) save('at', pos);
  }

  // the reader moved: the place is now what they see
  function moved() { pos = placeShown(); if (pos) save('at', pos); }

  function go(i, keep) {
    cur = Math.max(0, Math.min(lastReady() - (laying && geo.mode === 'spread' ? 1 : 0), i));
    if (geo.mode === 'spread') cur = Math.max(0, 2 * spreadOf(cur) - 1);
    show();
    if (!keep) moved();
  }

  /* A turn is a leaf, a copy of the page that goes over. On the spread it is
     hinged at the spine, its back the page that comes, and swings through
     rotateY like paper. On one page it slides, as an e-reader's page does:
     forward the page in hand slides off to the left over the next, back the
     previous slides in from the left over the page in hand. Under the leaf
     the slots already show what the turn uncovers. Every turn is a progress
     p from 0 to 1: a tap runs it whole, a finger carries it one to one, and
     on letting go it settles the way the finger was going. */
  var busy = false;
  var EASE = 'cubic-bezier(.25,.1,.25,1)';

  function prepare(dir) {
    var spread = geo.mode === 'spread';
    var target;
    var last = lastReady();
    if (spread) {
      var s1 = spreadOf(cur) + dir;
      if (s1 < 0 || 2 * s1 - 1 > last || (laying && 2 * s1 > last)) return null;
      target = Math.max(0, 2 * s1 - 1);
    } else {
      target = cur + dir;
      if (target < 0 || target > last) return null;
    }
    var leaf = el('div', 'pb-leaf' + (spread ? '' : ' pb-slide'));
    var front = el('div', 'pb-face pb-front');
    var clone = function (p) { return p ? p.cloneNode(true) : blank(); };
    var t = { leaf: leaf, dir: dir, target: target, spread: spread, p: 0, shades: [] };
    var s0 = spreadOf(cur);
    if (spread) {
      var back = el('div', 'pb-face pb-back');
      t.shades = [el('span', 'pb-shade'), el('span', 'pb-shade')];
      if (dir > 0) {
        front.appendChild(clone(pages[2 * s0]));
        back.appendChild(clone(pages[2 * s0 + 1]));
        put(slotR, pages[2 * s0 + 2]);
        leaf.style.left = 'var(--pw)';
        leaf.style.transformOrigin = 'left center';
      } else {
        front.appendChild(clone(s0 > 0 ? pages[2 * s0 - 1] : null));
        back.appendChild(clone(pages[2 * s0 - 2]));
        put(slotL, s0 - 1 > 0 ? pages[2 * s0 - 3] : null);
        slotL.classList.toggle('pb-empty', s0 - 1 === 0);
        leaf.style.left = '0px';
        leaf.style.transformOrigin = 'right center';
      }
      front.appendChild(t.shades[0]);
      back.appendChild(t.shades[1]);
      leaf.appendChild(front);
      leaf.appendChild(back);
    } else {
      if (dir > 0) { front.appendChild(clone(pages[cur])); put(slotR, pages[target]); }
      else front.appendChild(clone(pages[target]));
      leaf.appendChild(front);
      leaf.style.left = '0px';
    }
    leaf.style.transform = transformAt(t, 0);
    book.appendChild(leaf);
    return t;
  }

  // the leaf's place at progress p
  function transformAt(t, p) {
    if (t.spread) return 'rotateY(' + (t.dir > 0 ? -180 * p : 180 * p) + 'deg)';
    var w = geo.pw + 30;   // and its shadow, clear of the screen
    return 'translate3d(' + (t.dir > 0 ? -w * p : -w * (1 - p)) + 'px,0,0)';
  }

  function setP(t, p) {
    t.p = p;
    t.leaf.style.transform = transformAt(t, p);
    var k = Math.sin(Math.PI * p).toFixed(3);
    t.shades.forEach(function (s) { s.style.opacity = k; });
  }

  // the leaf runs from where it is to `end` (0 or 1); then the slots settle
  var canAnimate = !!Element.prototype.animate;
  function settle(t, end, dur) {
    var p0 = t.p;
    var done = function () {
      if (end === 1) { cur = t.target; show(); moved(); } else show();
      if (t.leaf.parentNode) t.leaf.parentNode.removeChild(t.leaf);
      busy = false;
    };
    if (!canAnimate) {
      // a CSS transition does it where the animations API is missing
      t.leaf.style.transition = 'transform ' + dur + 'ms ' + EASE;
      t.shades.forEach(function (s) { s.style.transition = 'opacity ' + dur + 'ms ' + EASE; s.style.opacity = 0; });
      t.leaf.getBoundingClientRect();
      t.leaf.style.transform = transformAt(t, end);
      setTimeout(done, dur + 30);
      return;
    }
    var anim = t.leaf.animate([{ transform: transformAt(t, p0) }, { transform: transformAt(t, end) }],
      { duration: dur, easing: EASE, fill: 'forwards' });
    t.shades.forEach(function (s) {
      var o = Math.sin(Math.PI * p0);
      var crosses = (p0 < 0.5 && end > 0.5) || (p0 > 0.5 && end < 0.5);
      var frames = crosses ? [{ opacity: o }, { opacity: 1, offset: Math.abs(0.5 - p0) / Math.abs(end - p0) }, { opacity: 0 }]
        : [{ opacity: o }, { opacity: 0 }];
      s.animate(frames, { duration: dur, easing: EASE, fill: 'forwards' });
    });
    anim.onfinish = done;
  }

  function turn(dir) {
    if (busy || !pages.length || !geo) return;
    var t = prepare(dir);
    if (!t) return;
    if (reduceMotion) { cur = t.target; show(); moved(); book.removeChild(t.leaf); return; }
    busy = true;
    settle(t, 1, t.spread ? 640 : 300);
  }

  /* ~ the frame's controls ~ */
  var chromeTimer = 0;
  function setChrome(on) {
    clearTimeout(chromeTimer);
    pb.classList.toggle('pb-chrome-off', !on);
    if (on) foldLater();
  }
  // shown bars fold away by themselves, unless the reader is using them
  function foldLater() {
    clearTimeout(chromeTimer);
    chromeTimer = setTimeout(function () {
      if (!tocBox.hidden || pb.querySelector('.pb-bar:hover')) { foldLater(); return; }
      pb.classList.add('pb-chrome-off');
    }, 2800);
  }
  // a mouse at the screen's top or foot brings them
  pb.addEventListener('mousemove', function (e) {
    if (e.clientY < 64 || e.clientY > pb.clientHeight - 64) {
      if (pb.classList.contains('pb-chrome-off')) setChrome(true); else foldLater();
    }
  });
  function setToc(on) {
    tocBox.hidden = !on;
    if (on) { setChrome(true); var a = tocList.querySelectorAll('.pb-toc-a')[pages[cur] && pages[cur]._ch || 0]; if (a) a.focus(); }
  }

  $('.pb-close').addEventListener('click', function () { close(); });
  $('.pb-toc-btn').addEventListener('click', function () { setToc(tocBox.hidden); });
  tocBox.addEventListener('click', function (e) { if (e.target === tocBox) setToc(false); });
  $('.pb-fs').addEventListener('click', function () {
    if (isFull()) (document.exitFullscreen || document.webkitExitFullscreen).call(document);
    else pb[fsTarget]();
  });
  function rescale(d) {
    var n = Math.max(0, Math.min(SCALES.length - 1, scaleAt + d));
    if (n === scaleAt) return;
    scaleAt = n;
    save('scale', n);
    layout(anchorNow());
  }
  $('.pb-smaller').addEventListener('click', function () { rescale(-1); });
  $('.pb-bigger').addEventListener('click', function () { rescale(1); });
  range.addEventListener('input', function () {
    var p = pages[+range.value];
    count.textContent = +range.value >= 2 ? 'পৃষ্ঠা ' + bn(+range.value - 1) + ' / ' + bn(pages.length - 2) : '';
    if (p && p._ch != null) where.textContent = chapters[p._ch].label;
  });
  range.addEventListener('change', function () { go(+range.value); });

  // a link inside the book (Voltaire's note and its way back) turns to the
  // page that holds its target
  function follow(a) {
    var id = decodeURIComponent(a.getAttribute('href').slice(1));
    for (var i = 0; i < pages.length; i++) {
      if (pages[i].querySelector('[data-pbid="' + id + '"]')) { go(i); return; }
    }
  }

  // taps, clicks, drags and the wheel on the stage
  var down = null, drag = null, swallow = false;

  function onDown(e) {
    if (e.button > 0 || !geo) return;
    down = { x: e.clientX, y: e.clientY, id: e.pointerId, type: e.pointerType };
    swallow = false;
  }
  function onMove(e) {
    if (!down || e.pointerId !== down.id) return;
    var dx = e.clientX - down.x, dy = e.clientY - down.y;
    if (!drag) {
      if (down.type === 'mouse' || geo.mode === 'spread' || busy) return;
      if (Math.abs(dx) < 8 || Math.abs(dx) < Math.abs(dy)) return;
      var t = prepare(dx < 0 ? 1 : -1);
      if (!t) { down = null; return; }
      busy = true;
      drag = { t: t, lx: e.clientX, lt: e.timeStamp, v: 0 };
      try { if (stage.setPointerCapture && window.PointerEvent) stage.setPointerCapture(e.pointerId); } catch (err) {}
    }
    var p = Math.max(0, Math.min(1, drag.t.dir > 0 ? -dx / geo.pw : dx / geo.pw));
    setP(drag.t, p);
    var dt = e.timeStamp - drag.lt;
    if (dt > 0) drag.v = 0.7 * ((e.clientX - drag.lx) / dt) + 0.3 * drag.v;
    drag.lx = e.clientX;
    drag.lt = e.timeStamp;
  }
  function release(e) {
    if (!down || e.pointerId !== down.id) return;
    var dx = e.clientX - down.x, dy = e.clientY - down.y;
    var wasType = down.type;
    down = null;
    if (drag) {
      var t = drag.t, v = drag.v;
      drag = null;
      swallow = true;
      var fling = t.dir > 0 ? -v : v;   // px per ms, the way of the turn
      var goOn = fling > 0.3 || (t.p > 0.5 && fling > -0.3);
      var end = goOn ? 1 : 0;
      var dur = Math.max(120, Math.min(320, 300 * Math.abs(end - t.p)));
      settle(t, end, dur);
      return;
    }
    // a quick flick with a mouse, or on the spread, still turns
    if (e.type === 'pointerup' && Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.3 && (wasType === 'mouse' || geo.mode === 'spread')) {
      if (!String(getSelection() || '').trim()) { swallow = true; turn(dx < 0 ? 1 : -1); }
    }
  }
  if (window.PointerEvent) {
    stage.addEventListener('pointerdown', onDown);
    stage.addEventListener('pointermove', onMove);
    stage.addEventListener('pointerup', release);
    stage.addEventListener('pointercancel', release);
  } else {
    var asPointer = function (e, type) {
      var t = e.changedTouches[0];
      return { clientX: t.clientX, clientY: t.clientY, pointerId: 1, pointerType: 'touch', button: 0, timeStamp: e.timeStamp || Date.now(), type: type };
    };
    // a turn takes the touched page out of the document, and a touch then
    // reports only to the node it began on: listen there, not on the stage
    stage.addEventListener('touchstart', function (e) {
      var node = e.target;
      var mv = function (ev) { if (drag) ev.preventDefault(); onMove(asPointer(ev, 'pointermove')); };
      var end = function (ev) {
        node.removeEventListener('touchmove', mv);
        node.removeEventListener('touchend', end);
        node.removeEventListener('touchcancel', end);
        release(asPointer(ev, ev.type === 'touchend' ? 'pointerup' : 'pointercancel'));
      };
      node.addEventListener('touchmove', mv, { passive: false });
      node.addEventListener('touchend', end);
      node.addEventListener('touchcancel', end);
      onDown(asPointer(e, 'pointerdown'));
    }, { passive: true });
  }

  stage.addEventListener('click', function (e) {
    if (swallow) { swallow = false; return; }
    var a = e.target.closest('a[href^="#"]');
    if (a) { e.preventDefault(); follow(a); return; }
    if (!geo || String(getSelection() || '').trim()) return;
    if (!tocBox.hidden) { setToc(false); return; }
    if (geo.mode === 'spread') {
      var r = book.getBoundingClientRect(), mid = r.left + r.width / 2;
      if (Math.abs(e.clientX - mid) < r.width * 0.06) setChrome(pb.classList.contains('pb-chrome-off'));
      else turn(e.clientX < mid ? -1 : 1);
      return;
    }
    var x = e.clientX / stage.clientWidth;
    if (x < 0.28) turn(-1);
    else if (x > 0.72) turn(1);
    else setChrome(pb.classList.contains('pb-chrome-off'));
  });

  // a wheel or a trackpad's two fingers: one turn for each push
  var wheelSum = 0, wheelLast = 0, wheelTurned = 0;
  stage.addEventListener('wheel', function (e) {
    e.preventDefault();
    var now = performance.now();
    if (now - wheelLast > 260) wheelSum = 0;
    wheelLast = now;
    wheelSum += Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
    if (now - wheelTurned < 420 || Math.abs(wheelSum) < 36) return;
    turn(wheelSum > 0 ? 1 : -1);
    wheelSum = 0;
    wheelTurned = now;
  }, { passive: false });

  document.addEventListener('keydown', function (e) {
    if (pb.hidden) return;
    if (e.target === range) return;
    if (e.key === ' ' && e.target.closest && e.target.closest('button')) return;
    var k = e.key;
    if (k === 'Escape') {
      if (!tocBox.hidden) setToc(false);
      else if (!isFull()) close();
      return;
    }
    if (!tocBox.hidden) return;
    if (k === 'ArrowRight' || k === 'PageDown' || (k === ' ' && !e.shiftKey)) { e.preventDefault(); turn(1); }
    else if (k === 'ArrowLeft' || k === 'PageUp' || (k === ' ' && e.shiftKey)) { e.preventDefault(); turn(-1); }
    else if (k === 'Home') { e.preventDefault(); go(0); }
    else if (k === 'End') { e.preventDefault(); go(pages.length - 1); }
  });

  // a new size lays the book out again around the same word
  var resizeTimer = 0;
  function onResize() {
    if (pb.hidden) return;
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      var g = decide();
      if (geo && g.key === geo.key) return;
      layout(anchorNow() || load('at', null));
    }, 180);
  }
  addEventListener('resize', onResize);
  document.addEventListener('fullscreenchange', onResize);
  document.addEventListener('webkitfullscreenchange', onResize);

  /* ~ opening and closing ~ */
  var pushed = false;
  function open(full) {
    if (!pb.hidden) return;
    pb.hidden = false;
    html.classList.add('pb-open');
    var settled = Promise.resolve();
    if (full && fsTarget) {
      try {
        var r = pb[fsTarget]();
        if (r && r.then) settled = Promise.race([r.catch(function () {}), new Promise(function (ok) { setTimeout(ok, 600); })]);
      } catch (e) {}
    }
    if (location.hash !== '#book') {
      history.pushState({ pb: 1 }, '', location.pathname + location.search + '#book');
      pushed = true;
    }
    setChrome(true);
    var at = load('at', null);
    var fonts = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
    Promise.all([settled, fonts]).then(function () {
      // a frame for the screen to take its new size
      requestAnimationFrame(function () { layout(at); });
    });
    $('.pb-close').focus();
  }
  function hide() {
    if (pb.hidden) return;
    gen++;
    if (isFull()) (document.exitFullscreen || document.webkitExitFullscreen).call(document);
    pb.hidden = true;
    setToc(false);
    html.classList.remove('pb-open');
  }
  function close() {
    if (pushed) { pushed = false; history.back(); return; }   // popstate hides it
    hide();
    history.replaceState(null, '', location.pathname + location.search);
  }
  addEventListener('popstate', function () {
    if (location.hash === '#book') open(false);
    else { pushed = false; hide(); }
  });

  document.querySelectorAll('[data-book-open]').forEach(function (b) {
    b.addEventListener('click', function () { open(true); });
  });
  if (location.hash === '#book') open(false);
})();
