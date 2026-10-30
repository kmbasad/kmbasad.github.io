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
    var BAR = 48, pw, ph, fs;
    if (mode === 'spread') {
      ph = Math.min(vh - 2 * BAR - 36, 1040);
      pw = Math.min(Math.round(ph * 0.7), Math.floor((vw - 56) / 2));
      ph = Math.min(ph, Math.round(pw / 0.6));
      fs = Math.max(14.5, Math.min(19, pw * 0.031));
    } else if (mode === 'tablet') {
      ph = vh - 44;
      pw = Math.min(vw - 44, Math.round(ph * 0.75));
      fs = Math.max(16, Math.min(20, pw * 0.031));
    } else {
      pw = vw; ph = vh; fs = 15;
    }
    fs = Math.round(fs * SCALES[scaleAt] * 10) / 10;
    var px = Math.round(pw * (mode === 'phone' ? 0.065 : 0.095));
    var pt = mode === 'phone' ? 40 : Math.round(ph * 0.078);
    var pbm = mode === 'phone' ? 40 : Math.round(ph * 0.075);
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
  var gen = 0;   // a newer layout cancels an older one still running

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
    var page = null, body = null, bi = 0;

    function start(ch, opening, at) {
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
      body.removeChild(node);
      var part = node, done = 0;
      for (;;) {
        var total = words(part);
        var n = most(part, total);
        if (n === 0 && !body.childNodes.length) n = 1;   // a word wider than a page: it goes anyway
        if (n > 0) {
          var hd = cut(part, n, 'head');
          hd.classList.add('pb-split');
          body.appendChild(hd);
          part = cut(part, n, 'tail');
          done += n;
        }
        start(b.ch, false, [i, done]);
        if (done > 0) part.classList.add('pb-cont');
        body.appendChild(part);
        if (fits()) return;
        body.removeChild(part);
      }
    }

    function step() {
      if (my !== gen) return;
      var t0 = performance.now();
      while (bi < blocks.length && performance.now() - t0 < 16) place(bi++);
      if (bi < blocks.length) {
        span.textContent = bn(Math.round(100 * bi / blocks.length)) + '%';
        setTimeout(step, 0);
        return;
      }
      measure.textContent = '';
      finish(out, anchor);
    }
    setTimeout(step, 0);
  }

  function finish(out, anchor) {
    pages = out;
    var spread = geo.mode === 'spread';
    pages.forEach(function (p, i) {
      p.setAttribute('data-side', i % 2 ? 'left' : 'right');
      if (i < 2) return;
      p.querySelector('.pb-num').textContent = bn(i - 1);
      var run = p.querySelector('.pb-run');
      if (p._open) run.textContent = '';
      else run.textContent = spread && i % 2 ? bookTitle : chapters[p._ch].label;
      if (p._open) chapters[p._ch].page = i;
    });
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
    go(anchor ? find(anchor) : 0);
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

  function anchorNow() {
    var a = pages[visibleFirst()] && pages[visibleFirst()]._at;
    if (!a && pages[visibleFirst() + 1]) a = pages[visibleFirst() + 1]._at;
    return a || null;
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
    count.textContent = cur >= 2 ? 'পৃষ্ঠা ' + bn(cur - 1) + ' / ' + bn(pages.length - 2) : '';
    var a = anchorNow();
    if (a) save('at', a);
  }

  function go(i) {
    cur = Math.max(0, Math.min(pages.length - 1, i));
    if (geo.mode === 'spread') cur = Math.max(0, 2 * spreadOf(cur) - 1);
    show();
  }

  /* A turn is a leaf: a copy of the page that goes over, its back the
     page that comes, hinged at the spine (a spread) or at the page's left
     edge (one page), swung through rotateY. Under it the slots already show
     what the turn uncovers. A tap swings it whole; a finger on a phone or
     tablet carries it, its edge under the finger, and on letting go it
     falls the way the drag was going. */
  var busy = false;
  var EASE = 'cubic-bezier(.3,.1,.2,1)';

  function prepare(dir) {
    var spread = geo.mode === 'spread';
    var target;
    if (spread) {
      var s1 = spreadOf(cur) + dir;
      if (s1 < 0 || 2 * s1 - 1 > pages.length - 1) return null;
      target = Math.max(0, 2 * s1 - 1);
    } else {
      target = cur + dir;
      if (target < 0 || target >= pages.length) return null;
    }
    var leaf = el('div', 'pb-leaf');
    var front = el('div', 'pb-face pb-front'), back = el('div', 'pb-face pb-back');
    var shades = [el('span', 'pb-shade'), el('span', 'pb-shade')];
    var clone = function (p) { return p ? p.cloneNode(true) : blank(); };
    var s0 = spreadOf(cur), from, to, origin, left;
    if (spread && dir > 0) {
      front.appendChild(clone(pages[2 * s0]));
      back.appendChild(clone(pages[2 * s0 + 1]));
      put(slotR, pages[2 * s0 + 2]);
      origin = 'left center'; left = 'var(--pw)'; from = 0; to = -180;
    } else if (spread) {
      front.appendChild(clone(s0 > 0 ? pages[2 * s0 - 1] : null));
      back.appendChild(clone(pages[2 * s0 - 2]));
      put(slotL, s0 - 1 > 0 ? pages[2 * s0 - 3] : null);
      slotL.classList.toggle('pb-empty', s0 - 1 === 0);
      origin = 'right center'; left = '0px'; from = 0; to = 180;
    } else if (dir > 0) {
      front.appendChild(clone(pages[cur]));
      back.appendChild(blank());
      put(slotR, pages[target]);
      origin = 'left center'; left = '0px'; from = 0; to = -180;
    } else {
      front.appendChild(clone(pages[target]));
      back.appendChild(blank());
      origin = 'left center'; left = '0px'; from = -180; to = 0;
    }
    front.appendChild(shades[0]);
    back.appendChild(shades[1]);
    leaf.appendChild(front);
    leaf.appendChild(back);
    leaf.style.left = left;
    leaf.style.transformOrigin = origin;
    leaf.style.transform = 'rotateY(' + from + 'deg)';
    book.appendChild(leaf);
    return { leaf: leaf, shades: shades, from: from, to: to, target: target, dir: dir, angle: from };
  }

  function setAngle(t, a) {
    t.angle = a;
    t.leaf.style.transform = 'rotateY(' + a + 'deg)';
    var k = Math.sin(Math.abs(a) * Math.PI / 180);
    t.shades[0].style.opacity = t.shades[1].style.opacity = k.toFixed(3);
  }

  // the leaf swings from where it is to `end`; then the slots settle
  function swing(t, end, dur, commit) {
    var a0 = t.angle;
    var anim = t.leaf.animate([{ transform: 'rotateY(' + a0 + 'deg)' }, { transform: 'rotateY(' + end + 'deg)' }],
      { duration: dur, easing: EASE, fill: 'forwards' });
    t.shades.forEach(function (s) {
      var o = +s.style.opacity || 0;
      var mid = Math.abs(end - a0) > 90 ? 1 : o;
      s.animate([{ opacity: o }, { opacity: mid, offset: 0.5 }, { opacity: 0 }], { duration: dur, easing: EASE, fill: 'forwards' });
    });
    anim.onfinish = function () {
      if (commit) cur = t.target;
      show();
      t.leaf.remove();
      busy = false;
    };
  }

  function turn(dir) {
    if (busy || !pages.length || !geo) return;
    var t = prepare(dir);
    if (!t) return;
    if (reduceMotion) { cur = t.target; show(); t.leaf.remove(); return; }
    busy = true;
    swing(t, t.to, geo.mode === 'spread' ? 640 : 420, true);
  }

  /* ~ the frame's controls ~ */
  var chromeTimer = 0;
  function setChrome(on) {
    clearTimeout(chromeTimer);
    pb.classList.toggle('pb-chrome-off', !on);
  }
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
  var clamp1 = function (x) { return Math.max(-1, Math.min(1, x)); };
  var acosDeg = function (x) { return Math.acos(clamp1(x)) * 180 / Math.PI; };

  stage.addEventListener('pointerdown', function (e) {
    if (e.button > 0 || !geo) return;
    down = { x: e.clientX, y: e.clientY, id: e.pointerId, type: e.pointerType };
    swallow = false;
  });
  stage.addEventListener('pointermove', function (e) {
    if (!down || e.pointerId !== down.id) return;
    var dx = e.clientX - down.x, dy = e.clientY - down.y;
    if (!drag) {
      if (down.type === 'mouse' || geo.mode === 'spread' || busy) return;
      if (Math.abs(dx) < 8 || Math.abs(dx) < Math.abs(dy)) return;
      var t = prepare(dx < 0 ? 1 : -1);
      if (!t) { down = null; return; }
      busy = true;
      drag = { t: t, lx: e.clientX, lt: e.timeStamp, v: 0 };
      try { stage.setPointerCapture(e.pointerId); } catch (err) {}
    }
    var w = geo.pw, a = drag.t.dir > 0 ? -acosDeg(1 + 2 * dx / w) : -acosDeg(-1 + 2 * dx / w);
    setAngle(drag.t, a);
    var dt = e.timeStamp - drag.lt;
    if (dt > 0) drag.v = 0.7 * ((e.clientX - drag.lx) / dt) + 0.3 * drag.v;
    drag.lx = e.clientX;
    drag.lt = e.timeStamp;
  });
  function release(e) {
    if (!down || e.pointerId !== down.id) return;
    var dx = e.clientX - down.x, dy = e.clientY - down.y;
    var wasType = down.type;
    down = null;
    if (drag) {
      var t = drag.t, v = drag.v;
      drag = null;
      swallow = true;
      var goOn = t.dir > 0 ? (v < -0.35 || (t.angle < -90 && v < 0.35)) : (v > 0.35 || (t.angle > -90 && v > -0.35));
      var end = goOn ? t.to : t.from;
      var dur = Math.max(140, Math.min(420, 380 * Math.abs(end - t.angle) / 180));
      swing(t, end, dur, goOn);
      return;
    }
    // a quick flick with a mouse, or on the spread, still turns
    if (e.type === 'pointerup' && Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.3 && (wasType === 'mouse' || geo.mode === 'spread')) {
      if (!String(getSelection() || '').trim()) { swallow = true; turn(dx < 0 ? 1 : -1); }
    }
  }
  stage.addEventListener('pointerup', release);
  stage.addEventListener('pointercancel', release);

  stage.addEventListener('click', function (e) {
    if (swallow) { swallow = false; return; }
    var a = e.target.closest('a[href^="#"]');
    if (a) { e.preventDefault(); follow(a); return; }
    if (!geo || String(getSelection() || '').trim()) return;
    if (!tocBox.hidden) { setToc(false); return; }
    if (geo.mode === 'spread') {
      var r = book.getBoundingClientRect();
      turn(e.clientX < r.left + r.width / 2 ? -1 : 1);
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
    if (full && fsTarget) {
      try { var r = pb[fsTarget](); if (r && r.catch) r.catch(function () {}); } catch (e) {}
    }
    if (location.hash !== '#book') {
      history.pushState({ pb: 1 }, '', location.pathname + location.search + '#book');
      pushed = true;
    }
    setChrome(true);
    var at = load('at', null);
    (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(function () {
      layout(at);
      if (pb.getAttribute('data-mode') !== 'spread') chromeTimer = setTimeout(function () { setChrome(false); }, 2600);
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
