/**
 * book.js — the reading engine of the Translations pages.
 *
 * Runs inside the BookReader shell (src/components/BookReader.astro):
 * the parallel table on the left (built by md-loader.js, word-wrapped by
 * translation-table.js) and the অভিধান panel on the right.
 *
 *   · অভিধান — click any source-language word and its meaning is fetched
 *     from Wiktionary (filtered to that language) into the side panel,
 *     with links out to the classic dictionaries of the language
 *     (Logeion/Whitaker/Perseus for Latin, Treccani for Italian,
 *     Vajehyab/Steingass for Persian). On narrow screens the panel
 *     becomes a bottom sheet that rises on lookup.
 *   · Prosody toggles (cfg.meters) — মাত্রা: matrabritta matra-count
 *     dividers walked over the Bangla line; পর্ব: Latin dactylic-hexameter
 *     foot boundaries. Both insert separator glyphs into the live text
 *     without disturbing the .w hover-highlight spans.
 *   - Ctrl+Left/Right: the previous / next part (the way on is shown in the rail).
 *
 * Config (window.TRANS_CONFIG, shared with md-loader.js):
 *   dictLang: 'la' | 'grc' | 'it' | 'fa' | 'en'   — the source language of this page
 *   meters:   { matra: [8,16], feet: true }   — which toggles to offer
 *   prev, next                     — ctrl+arrow keys (shown in the reading rail)
 */
(function () {
  'use strict';

  var cfg = window.TRANS_CONFIG || {};
  var MQ_NARROW = window.matchMedia('(max-width: 1099px)');

  function $(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
  var eu = encodeURIComponent;

  /* ═════════════════════════════════════════════════════════════════════
   * অভিধান — the dictionary panel
   * ═════════════════════════════════════════════════════════════════════ */

  var LANGS = {
    grc: {
      wikt: 'Ancient Greek',
      hint: 'গ্রিক যেকোনো শব্দে ক্লিক করুন — উইকশনারি থেকে অর্থ আসবে।',
      links: [
        ['Logeion',    function (w) { return 'https://logeion.uchicago.edu/' + eu(w); }],
        ['Perseus',    function (w) { return 'https://www.perseus.tufts.edu/hopper/morph?l=' + eu(w) + '&la=greek'; }],
        ['Wiktionary', function (w) { return 'https://en.wiktionary.org/wiki/' + eu(w) + '#Ancient_Greek'; }]
      ]
    },
    la: {
      wikt: 'Latin',
      hint: 'লাতিন যেকোনো শব্দে ক্লিক করুন — উইকশনারি থেকে অর্থ আসবে।',
      links: [
        ['Logeion',  function (w) { return 'https://logeion.uchicago.edu/' + eu(w); }],
        ['Whitaker', function (w) { return 'https://latin-words.com/?query=' + eu(w); }],
        ['Perseus',  function (w) { return 'https://www.perseus.tufts.edu/hopper/morph?l=' + eu(w) + '&la=la'; }]
      ]
    },
    it: {
      wikt: 'Italian',
      hint: 'ইতালীয় যেকোনো শব্দে ক্লিক করুন — উইকশনারি থেকে অর্থ আসবে।',
      links: [
        ['Treccani',      function (w) { return 'https://www.treccani.it/vocabolario/ricerca/' + eu(w) + '/'; }],
        ['WordReference', function (w) { return 'https://www.wordreference.com/definizione/' + eu(w); }],
        ['Wiktionary',    function (w) { return 'https://en.wiktionary.org/wiki/' + eu(w) + '#Italian'; }]
      ]
    },
    en: {
      wikt: 'English',
      hint: 'শেকস্পিয়ারের যেকোনো শব্দে ক্লিক করুন — উইকশনারি থেকে অর্থ আসবে।',
      links: [
        ['Shakespeare’s Words', function (w) { return 'https://www.shakespeareswords.com/Public/Glossary.aspx?letter=' + eu(w.charAt(0).toLowerCase()) + '&q=' + eu(w); }],
        ['Etymonline', function (w) { return 'https://www.etymonline.com/search?q=' + eu(w); }],
        ['OED',        function (w) { return 'https://www.oed.com/search/dictionary/?q=' + eu(w); }],
        ['Wiktionary', function (w) { return 'https://en.wiktionary.org/wiki/' + eu(w) + '#English'; }]
      ]
    },
    fa: {
      wikt: 'Persian',
      rtl: true,
      hint: 'ফারসি যেকোনো শব্দে ক্লিক করুন — উইকশনারি থেকে অর্থ আসবে।',
      links: [
        ['Vajehyab',   function (w) { return 'https://www.vajehyab.com/?q=' + eu(w); }],
        ['Steingass',  function (w) { return 'https://dsal.uchicago.edu/cgi-bin/app/steingass_query.py?qs=' + eu(w) + '&searchhws=yes'; }],
        ['Wiktionary', function (w) { return 'https://en.wiktionary.org/wiki/' + eu(w) + '#Persian'; }]
      ]
    }
  };

  var LANG = LANGS[cfg.dictLang] || null;
  var dictEl = $('book-dict');

  var stripMacrons = function (w) {
    return w.normalize('NFD').replace(/[̀-ͯ]/g, '');
  };

  /* Trim punctuation from both ends; keep letters, marks, digits,
     apostrophes and ZWNJ inside. */
  function coreWord(raw) {
    return String(raw)
      .replace(/[ً-ٰٟـ]/g, '')                     // tashkeel, kasheeda
      .replace(/^[^\p{L}\p{M}\p{N}]+|[^\p{L}\p{M}\p{N}'’‌]+$/gu, '')
      .replace(/['’‌]+$/g, function (m) {
        return m.indexOf('‌') !== -1 ? '' : m;                    // trailing ZWNJ goes
      });
  }

  /* The words the dictionary itself says. */
  var T = {
    dict: 'অভিধান',
    inLine: 'এই চরণে',
    lemma: 'মূল শব্দ',
    searching: 'খুঁজছি…',
    notFound: 'এই শব্দটি উইকিঅভিধানে পাওয়া গেল না। নিচের অভিধানগুলোতে দেখুন।',
    recent: 'আগে দেখা',
    search: 'শব্দ খুঁজুন',
    others: 'অন্যান্য অভিধান',
    lang: {
      la: 'লাতিন',
      grc: 'গ্রিক',
      it: 'ইতালীয়',
      en: 'ইংরেজি',
      fa: 'ফারসি'
    }
  };
  var AVYAY = 'অব্যয়';
  var POS_BN = {
    'Noun': 'বিশেষ্য',
    'Proper noun': 'নামবাচক বিশেষ্য',
    'Verb': 'ক্রিয়া',
    'Adjective': 'বিশেষণ',
    'Adverb': 'ক্রিয়াবিশেষণ',
    'Pronoun': 'সর্বনাম',
    'Conjunction': 'সংযোজক ' + AVYAY,
    'Preposition': 'পদান্বয়ী ' + AVYAY,
    'Postposition': 'পদান্বয়ী ' + AVYAY,
    'Interjection': 'আবেগসূচক ' + AVYAY,
    'Particle': AVYAY,
    'Participle': 'কৃদন্ত',
    'Numeral': 'সংখ্যাবাচক',
    'Article': 'নির্দেশক',
    'Determiner': 'নির্দেশক',
    'Suffix': 'প্রত্যয়',
    'Prefix': 'উপসর্গ'
  };

  /* ~ Finding the word ~
     A word in a poem is rarely the word in a dictionary: Ovid's are
     inflected and carry enclitics, Dante's are elided and cut short,
     Shakespeare's are contracted and wear old endings, Hafez's carry
     Persian suffixes and Arabic letter forms. So each click is turned into
     a short list of candidates, best first; the first that Wiktionary
     knows in the right language wins. If none does, Wiktionary's own
     search is asked for near spellings. And a form that is only an
     inflection ("ablative plural of ...") is followed to its lemma, whose
     senses are shown beneath. */

  var IT_ELIDED = { "ch'": 'che', "s'": 'si', "m'": 'mi', "t'": 'ti', "v'": 'vi', "n'": 'ne',
                    "c'": 'ci', "l'": 'lo', "d'": 'di', "e'": 'ei', "de'": 'dei', "ne'": 'nei',
                    "co'": 'coi', "a'": 'ai', "da'": 'dai', "su'": 'sui', "fe'": 'fece', "po'": 'poco' };
  var EN_ARCHAIC = { "o'er": 'over', "e'er": 'ever', "ne'er": 'never', "'tis": 'it', "'twas": 'it',
                     "'gainst": 'against', "th'": 'the', "i'": 'in', "ta'en": 'taken', "e'en": 'even',
                     'hast': 'have', 'hath': 'have', 'dost': 'do', 'doth': 'do', 'art': 'be', 'wert': 'be',
                     'shalt': 'shall', 'wilt': 'will', 'canst': 'can', 'couldst': 'could', 'wouldst': 'would',
                     'shouldst': 'should', 'mayst': 'may', 'mightst': 'might', 'didst': 'do', 'hadst': 'have' };
  var FA_SUFFIXES = ['هایی', 'های', 'ها', 'ان', 'شان',
                     'تان', 'مان', 'یی', 'ام', 'ات', 'اش',
                     'ست', 'ی', 'م', 'ت', 'ش'];

  function candidates(word) {
    var out = [];
    function add(w) { if (w && w.length > 0 && out.indexOf(w) === -1) out.push(w); }

    if (cfg.dictLang === 'grc') {
      // Homer's words as Wiktionary titles them: NFC, the grave turned
      // acute, an enclitic's second accent dropped, an elided vowel restored
      var g = word.normalize('NFC').replace(/[\u1FBD\u1FBF\u2019\u02BC']+$/, function (m) { return m ? "'" : ''; });
      var elided = /'$/.test(g);
      g = g.replace(/'$/, '');
      var acute = function (x) { return x.normalize('NFD').replace(/\u0300/g, '\u0301').normalize('NFC'); };
      var oneAccent = function (x) {
        var d = x.normalize('NFD'), seen = 0;
        return d.replace(/[\u0301\u0342]/g, function (m) { return seen++ ? '' : m; }).normalize('NFC');
      };
      [g, acute(g), oneAccent(acute(g))].forEach(function (x) { add(x); add(x.toLowerCase()); });
      if (elided) ['\u03b5', '\u03b1', '\u03bf', '\u03b9'].forEach(function (v) {
        add(acute(g) + v); add(acute(g).toLowerCase() + v);
        var d = acute(g).toLowerCase().normalize('NFD');
        if (!/[\u0301\u0342]/.test(d)) add((d + v + '\u0301').normalize('NFC'));   // \u03b4' -> \u03b4\u03ad
      });
    } else if (cfg.dictLang === 'la') {
      var w = stripMacrons(word), lw = w.toLowerCase();
      add(lw);
      if (w !== lw) add(w);                                   // Iuppiter, Phoebe
      add(lw.replace(/j/g, 'i'));
      if (/^u[aeiou]/.test(lw)) add('v' + lw.slice(1));       // uirum -> virum
      ['que', 'ne', 've', 'ce'].forEach(function (enc) {
        if (lw.length > enc.length + 2 && lw.slice(-enc.length) === enc) add(lw.slice(0, -enc.length));
      });
    } else if (cfg.dictLang === 'it') {
      var iw = word.toLowerCase().replace(/[’‘]/g, "'");
      add(iw);
      if (iw.indexOf("'") !== -1) {
        var head = iw.slice(0, iw.indexOf("'") + 1), rest = iw.slice(iw.indexOf("'") + 1);
        if (IT_ELIDED[head]) add(IT_ELIDED[head]);
        if (rest.length >= 2) add(rest);
        add(iw.replace(/'$/, ''));
        add(head);
      }
      if (/[lrnm]$/.test(iw)) { add(iw + 'e'); add(iw + 'o'); }  // Dante's apocope: voler, cammin
      if (/[àèéìòù]$/.test(iw)) add(iw.normalize('NFD').replace(/[̀-ͯ]/g, ''));
    } else if (cfg.dictLang === 'fa') {
      var f = word.replace(/ي/g, 'ی').replace(/ك/g, 'ک').replace(/ة/g, 'ه');
      add(f);
      var bare = f.replace(/‌/g, '');
      add(bare);
      var stems = [f, bare];
      [/^نمی‌?/, /^می‌?/].forEach(function (re) {
        if (re.test(f)) stems.push(f.replace(re, ''));
      });
      stems.slice().forEach(function (st) {
        FA_SUFFIXES.forEach(function (suf) {
          var t = st.replace(/‌$/, '');
          if (t.length > suf.length + 1 && t.slice(-suf.length) === suf) stems.push(t.slice(0, -suf.length).replace(/‌$/, ''));
        });
      });
      stems.forEach(add);
      if (/^[بن]/.test(bare) && bare.length > 3) add(bare.slice(1));
    } else {
      var ew = word.replace(/[’‘]/g, "'"), el = ew.toLowerCase();
      add(ew); add(el);
      if (EN_ARCHAIC[el]) add(EN_ARCHAIC[el]);
      if (/'d$/.test(el)) { add(el.replace(/'d$/, 'ed')); add(el.replace(/'d$/, 'e')); add(el.replace(/'d$/, '')); }
      if (/'st$/.test(el)) { add(el.replace(/'st$/, 'e')); add(el.replace(/'st$/, '')); }
      if (/eth$/.test(el)) { add(el.replace(/eth$/, 'e')); add(el.replace(/eth$/, '')); add(el.replace(/eth$/, 's')); }
      if (/est$/.test(el) && el.length > 5) { add(el.replace(/est$/, '')); add(el.replace(/est$/, 'e')); }
      if (/'s$/.test(el)) add(el.replace(/'s$/, ''));
      add(el.replace(/'/g, ''));
    }
    return out.slice(0, 10);
  }

  var cache = {};
  function getJSON(url) {
    if (cache[url]) return cache[url];
    cache[url] = fetch(url).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; });
    return cache[url];
  }

  function wiktionary(word) {
    return getJSON('https://en.wiktionary.org/api/rest_v1/page/definition/' + eu(word) + '?redirect=true')
      .then(function (data) {
        if (!data) return null;
        var keys = Object.keys(data);
        for (var i = 0; i < keys.length; i++) {
          var hits = (data[keys[i]] || []).filter(function (e) { return e.language === LANG.wikt; });
          if (hits.length) return hits;
        }
        return null;
      });
  }

  function suggest(word) {
    return getJSON('https://en.wiktionary.org/w/api.php?action=opensearch&format=json&origin=*&limit=6&search=' + eu(word))
      .then(function (d) { return (d && d[1]) || []; });
  }

  /* Wiktionary's definition HTML, cleaned: no styles, no references */
  var parser = new DOMParser();
  function cleanDef(html) {
    var doc = parser.parseFromString('<div>' + (html || '') + '</div>', 'text/html');
    var root = doc.body.firstChild;
    root.querySelectorAll('style, script, sup.reference, .HQToggle, link').forEach(function (n) { n.remove(); });
    root.querySelectorAll('[style]').forEach(function (n) { n.removeAttribute('style'); });
    return root;
  }

  /* the lemmas an inflected form points to */
  function lemmasOf(entries, word) {
    var out = [];
    entries.forEach(function (e) {
      (e.definitions || []).forEach(function (d) {
        cleanDef(d.definition).querySelectorAll('.form-of-definition-link a, .form-of-definition a').forEach(function (a) {
          var t = (a.getAttribute('title') || a.textContent || '').trim();
          if (t && t !== word && out.indexOf(t) === -1 && out.length < 2) out.push(t);
        });
      });
    });
    return out;
  }

  function renderEntries(entries) {
    return entries.map(function (e) {
      var pos = e.partOfSpeech || '';
      var bn = POS_BN[pos];
      var defs = (e.definitions || []).filter(function (d) { return (d.definition || '').trim(); });
      if (!defs.length) return '';
      return '<section class="dict-pos">' +
        '<h3>' + (bn ? '<span class="pos-bn">' + esc(bn) + '</span>' : '') +
        '<span class="pos-en">' + esc(pos) + '</span></h3>' +
        '<ol>' + defs.map(function (d) {
          return '<li>' + cleanDef(d.definition).innerHTML + '</li>';
        }).join('') + '</ol></section>';
    }).join('');
  }

  /* links inside a definition ("inflection of arma") look up in place */
  function hookDefinitionLinks(box) {
    box.querySelectorAll('a').forEach(function (a) {
      var href = a.getAttribute('href') || '';
      var m = href.match(/\/wiki\/([^#?]+)|^\.\/([^#?]+)/);
      if (m) {
        var target = decodeURIComponent(m[1] || m[2]).replace(/_/g, ' ');
        a.setAttribute('href', '#');
        a.addEventListener('click', function (ev) {
          ev.preventDefault();
          lookup(target);
        });
      } else {
        a.target = '_blank';
        a.rel = 'noopener';
        if (href.charAt(0) === '/') a.href = 'https://en.wiktionary.org' + href;
      }
    });
  }

  function openSheet() {
    if (!dictEl) return;
    if (MQ_NARROW.matches) dictEl.classList.add('is-open');
    else setCollapsed(false);            // a lookup always unfolds the panel
  }
  function closeSheet() {
    if (!dictEl) return;
    if (MQ_NARROW.matches) dictEl.classList.remove('is-open');
    else setCollapsed(true);
  }

  /* ── Desktop panel geometry — foldable, and resizable by its seam ──────
     The panel always starts folded; only its width is remembered
     in localStorage (per browser). The width lives in
     --book-dict-w on <html>; book.css lays the panel out from it. */
  var KEY_W = 'book-dict-w', KEY_FOLD = 'book-dict-folded';
  var DICT_MIN = 240, DICT_MAX_FRAC = 0.6, DICT_DEFAULT = 344;   // px
  var reopenBtn = $('dict-reopen');

  function store(k, v) { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, String(v)); } catch (e) {} }
  function recall(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }

  function setCollapsed(on) {
    document.body.classList.toggle('dict-collapsed', !!on);
    if (reopenBtn) reopenBtn.hidden = !on;
    store(KEY_FOLD, on ? '1' : null);
  }

  function clampW(px) {
    var max = Math.max(DICT_MIN, Math.floor(window.innerWidth * DICT_MAX_FRAC));
    return Math.min(max, Math.max(DICT_MIN, Math.round(px)));
  }

  function setWidth(px, persist) {
    if (px == null) {
      document.documentElement.style.removeProperty('--book-dict-w');
      if (persist) store(KEY_W, null);
      return;
    }
    px = clampW(px);
    document.documentElement.style.setProperty('--book-dict-w', px + 'px');
    if (persist) store(KEY_W, px);
  }

  function setupPanelGeometry() {
    if (!dictEl || !LANG) return;
    var grip = $('book-dict-grip');

    var w = parseInt(recall(KEY_W), 10);
    if (w) setWidth(w, false);
    // every visit starts with the panel folded (BookReader folds it before
    // first paint); it unfolds on a lookup or from its tab, for this visit
    setCollapsed(true);

    if (reopenBtn) reopenBtn.addEventListener('click', function () { setCollapsed(false); });

    if (!grip) return;
    var dragging = false, startX = 0, startW = 0;

    grip.addEventListener('pointerdown', function (ev) {
      if (MQ_NARROW.matches) return;
      dragging = true;
      startX = ev.clientX;
      startW = dictEl.getBoundingClientRect().width;
      document.body.classList.add('dict-resizing');
      grip.setPointerCapture(ev.pointerId);
      ev.preventDefault();
    });
    grip.addEventListener('pointermove', function (ev) {
      if (!dragging) return;
      setWidth(startW + (startX - ev.clientX), false);   // seam moves left → wider
    });
    function endDrag(ev) {
      if (!dragging) return;
      dragging = false;
      document.body.classList.remove('dict-resizing');
      try { grip.releasePointerCapture(ev.pointerId); } catch (e) {}
      store(KEY_W, clampW(dictEl.getBoundingClientRect().width));
    }
    grip.addEventListener('pointerup', endDrag);
    grip.addEventListener('pointercancel', endDrag);
    grip.addEventListener('dblclick', function () { setWidth(null, true); });

    // keyboard: ←/→ nudge the seam, Home restores, Enter/Space folds
    grip.addEventListener('keydown', function (ev) {
      var cur = dictEl.getBoundingClientRect().width;
      if (ev.key === 'ArrowLeft')       { setWidth(cur + 24, true); ev.preventDefault(); }
      else if (ev.key === 'ArrowRight') { setWidth(cur - 24, true); ev.preventDefault(); }
      else if (ev.key === 'Home')       { setWidth(null, true); ev.preventDefault(); }
      else if (ev.key === 'Enter' || ev.key === ' ') { setCollapsed(true); ev.preventDefault(); }
    });

    window.addEventListener('resize', function () {
      var cur = parseInt(recall(KEY_W), 10);
      if (cur) setWidth(cur, false);
    }, { passive: true });
  }

  var lookupSeq = 0;
  var recentKey = 'dict-recent-' + (cfg.dictLang || '');
  var recent = (function () { try { return JSON.parse(localStorage.getItem(recentKey) || '[]'); } catch (e) { return []; } })();

  function remember(word) {
    recent = [word].concat(recent.filter(function (w) { return w !== word; })).slice(0, 10);
    try { localStorage.setItem(recentKey, JSON.stringify(recent)); } catch (e) {}
    drawRecent(word);
  }

  function drawRecent(current) {
    var box = $('dict-recent');
    if (!box) return;
    var others = recent.filter(function (w) { return w !== current; });
    box.hidden = !others.length;
    box.innerHTML = '<p class="dict-sub">' + esc(T.recent) + '</p>' + others.map(function (w) {
      return '<button type="button" class="dict-chip"' + (LANG.rtl ? ' dir="rtl"' : '') + '>' + esc(w) + '</button>';
    }).join('');
    box.querySelectorAll('.dict-chip').forEach(function (b) {
      b.addEventListener('click', function () { lookup(b.textContent); });
    });
  }

  /* the Bangla this word became in its own line: the word-list's pairing,
     when it has one (positional guesses are not shown) */
  function alignedBangla(span) {
    if (!span) return '';
    var key = span.dataset.w || '';
    if (!key || /^U_|^L\d/.test(key)) return '';
    var tr = span.closest('tr');
    if (!tr) return '';
    var seen = [];
    tr.querySelectorAll('td.bn .w').forEach(function (s) {
      if (s.dataset.w === key) seen.push(coreWord(s.textContent));
    });
    return seen.filter(Boolean).join(' ');
  }

  function lookup(word, span) {
    if (!LANG || !dictEl) return;
    var seq = ++lookupSeq;
    var wordEl = $('dict-word'), bodyEl = $('dict-body'), linksEl = $('dict-links'), lineEl = $('dict-line');

    wordEl.textContent = word;
    if (LANG.rtl) wordEl.setAttribute('dir', 'rtl'); else wordEl.removeAttribute('dir');
    wordEl.classList.add('has-word');
    $('dict-hint').hidden = true;

    var bn = alignedBangla(span);
    if (lineEl) {
      lineEl.hidden = !bn;
      lineEl.innerHTML = bn ? '<span class="dict-sub">' + esc(T.inLine) + '</span><b>' + esc(bn) + '</b>' : '';
    }

    bodyEl.innerHTML = '<p class="dict-note dict-wait">' + esc(T.searching) + '</p>';

    var q = cfg.dictLang === 'la' ? stripMacrons(word).toLowerCase() : word;
    linksEl.innerHTML = '<p class="dict-sub">' + esc(T.others) + '</p>' + LANG.links.map(function (l) {
      return '<a href="' + esc(l[1](q)) + '" target="_blank" rel="noopener">' + esc(l[0]) + '</a>';
    }).join('');
    linksEl.hidden = false;
    openSheet();
    remember(word);

    var tried = [];
    function show(found, entries) {
      var note = found.toLowerCase() !== word.toLowerCase()
        ? '<p class="dict-note dict-found">→ <span' + (LANG.rtl ? ' dir="rtl"' : '') + '>' + esc(found) + '</span></p>' : '';
      bodyEl.innerHTML = note + renderEntries(entries);
      hookDefinitionLinks(bodyEl);
      // an inflected form: follow it to its lemma and show that too
      var lemmas = lemmasOf(entries, found);
      lemmas.forEach(function (lem) {
        wiktionary(lem).then(function (lemEntries) {
          if (seq !== lookupSeq || !lemEntries) return;
          var block = document.createElement('div');
          block.className = 'dict-lemma-block';
          block.innerHTML = '<p class="dict-lemma-head"><span class="dict-sub">' + esc(T.lemma) + '</span>' +
            '<button type="button" class="dict-lemma-word"' + (LANG.rtl ? ' dir="rtl"' : '') + '>' + esc(lem) + '</button></p>' +
            renderEntries(lemEntries);
          block.querySelector('.dict-lemma-word').addEventListener('click', function () { lookup(lem); });
          hookDefinitionLinks(block);
          bodyEl.appendChild(block);
        });
      });
    }
    function fail() {
      bodyEl.innerHTML = '<p class="dict-note">' + esc(T.notFound) + '</p>';
    }
    function tryList(list, i, then) {
      if (seq !== lookupSeq) return;
      if (i >= list.length) return then();
      if (tried.indexOf(list[i]) !== -1) return tryList(list, i + 1, then);
      tried.push(list[i]);
      wiktionary(list[i]).then(function (entries) {
        if (seq !== lookupSeq) return;
        if (entries) show(list[i], entries);
        else tryList(list, i + 1, then);
      });
    }
    tryList(candidates(word), 0, function () {
      // nothing by rule: ask Wiktionary for near spellings of the word
      suggest(candidates(word)[0] || word).then(function (titles) {
        if (seq !== lookupSeq) return;
        tryList(titles.slice(0, 4), 0, fail);
      });
    });
  }

  /* The visible text of a word span, prosody separators excluded. */
  function spanWord(span) {
    var clone = span.cloneNode(true);
    clone.querySelectorAll('.m-sep, .f-sep').forEach(function (el) { el.remove(); });
    return coreWord(clone.textContent);
  }

  function setupDict() {
    if (!LANG || !dictEl) return;
    document.body.classList.add('book-has-dict');
    $('dict-hint').textContent = LANG.hint;
    var kicker = $('dict-kicker');
    if (kicker) kicker.textContent = T.dict + ' · ' + (T.lang[cfg.dictLang] || '');
    var qEl = $('dict-q');
    if (qEl) {
      qEl.placeholder = T.search;
      if (LANG.rtl) qEl.setAttribute('dir', 'rtl');
      $('dict-search').addEventListener('submit', function (ev) {
        ev.preventDefault();
        var w = coreWord(qEl.value);
        if (w) { lookup(w); qEl.blur(); }
      });
    }
    drawRecent('');

    /* Click any word in a source-language cell (md-loader renders Latin
       into .it cells too; bn and ln-col are not lookup targets). */
    document.addEventListener('click', function (ev) {
      var span = ev.target.closest ? ev.target.closest('.tt-table td .w') : null;
      if (!span) return;
      var td = span.closest('td');
      if (!td || td.classList.contains('bn') || td.classList.contains('ln-col')) return;
      var word = spanWord(span);
      if (word) lookup(word, span);
    });

    var closeBtn = $('dict-close');
    if (closeBtn) closeBtn.addEventListener('click', closeSheet);
    document.addEventListener('keydown', function (ev) {
      if (ev.key === 'Escape' && document.activeElement !== qEl) closeSheet();
    });
  }

  /* ═════════════════════════════════════════════════════════════════════
   * Prosody separators — inserted at text-node level so the .w
   * hover-highlight spans survive toggling.
   * ═════════════════════════════════════════════════════════════════════ */

  /* The cell's text with all separator glyphs removed — exactly the
     concatenation, in order, of the text nodes walked below. */
  function cleanCellText(cell) {
    var clone = cell.cloneNode(true);
    clone.querySelectorAll('.m-sep, .f-sep').forEach(function (el) { el.remove(); });
    return clone.textContent;
  }

  function clearSeps(cell, cls) {
    cell.querySelectorAll('.' + cls).forEach(function (el) { el.remove(); });
  }

  /* Insert a separator glyph before each UTF-16 offset in `positions`
     (ascending) into the cell's running text (separators excluded). */
  function insertSeps(cell, positions, cls, glyph) {
    if (!positions || !positions.length) return;
    var queue = positions.slice();
    var offset = 0;
    var makeSep = function () {
      var sep = document.createElement('span');
      sep.className = cls;
      sep.textContent = glyph;
      return sep;
    };
    var walker = document.createTreeWalker(cell, NodeFilter.SHOW_TEXT, {
      acceptNode: function (n) {
        return n.parentElement && n.parentElement.closest('.' + cls)
          ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT;
      }
    });
    var node = walker.nextNode();
    while (node && queue.length) {
      var end = offset + node.nodeValue.length;
      var pos = queue[0];
      if (pos <= offset) {
        node.parentNode.insertBefore(makeSep(), node);      // boundary: before node
        queue.shift();
      } else if (pos < end) {
        var rest = node.splitText(pos - offset);
        rest.parentNode.insertBefore(makeSep(), rest);
        queue.shift();
        offset = pos;
        node = rest;
        walker.currentNode = rest;                          // don't re-visit the tail
      } else {
        offset = end;
        node = walker.nextNode();
      }
    }
    while (queue.length) {                                  // trailing boundary
      cell.appendChild(makeSep());
      queue.shift();
    }
  }

  /* ── মাত্রা: matrabritta matra walk over a Bangla verse line ─────────
     Open (vowel-ended) syllable = 1 matra, closed = 2 — counted
     incrementally: every vowel sound is 1 (diphthongs ঐ ঔ ৈ ৌ are 2),
     and every syllable-closing consonant — bare, hasanta'd or
     conjunct-initial, anusvara/visarga/khanda-ta — adds 1. A divider
     lands exactly where the running count passes each target (e.g. 8
     then 16), even inside a word, nudged forward only past marks that
     belong to the syllable already counted. */

  var BN_CONSONANT  = /[ক-হড়ঢ়য়]/;
  var BN_VOWEL_SIGN = /[া-ৄেৈোৌৗ]/;
  var BN_VOWEL_IND  = /[অ-ঔ]/;
  var BN_TWO_MATRA  = /[ঐঔৈৌ]/;
  var BN_CODA_MARK  = /[ংঃৎ]/;   // anusvara, visarga, khanda-ta
  var BN_ZERO_MARK  = /[ঁ়]/;         // candrabindu, nukta
  var HASANTA = '্';
  var ZW = /[‌‍়]/;              // ZWNJ, ZWJ, nukta (transparent)

  function matraBreaks(text, targets) {
    var chars = Array.from(text);
    var breaks = [];
    var cum = 0;
    var nucleus = false;    // a vowel has sounded; its syllable is still open

    var skipZW = function (k, dir) { while (ZW.test(chars[k] || '')) k += dir; return k; };
    var nextOf = function (i) { return chars[skipZW(i + 1, +1)]; };

    // ও in পাওয়া/যাওয়া… is the glide w, not a vowel: ও + য়/য + vowel sign
    var isGlideO = function (i) {
      var j = skipZW(i + 1, +1);
      if (chars[j] !== 'য়' && chars[j] !== 'য') return false;
      var k = skipZW(j + 1, +1);
      return chars[k] !== undefined && BN_VOWEL_SIGN.test(chars[k]);
    };

    // A divider may not fall before a mark that closes the syllable just
    // counted, before a conjunct-initial consonant, between a consonant
    // and its vowel sign, or before trailing punctuation.
    var breakableBefore = function (i) {
      var next = nextOf(i);
      if (next === undefined || /\s/.test(next)) return true;
      if (next === HASANTA || BN_CODA_MARK.test(next) || BN_ZERO_MARK.test(next)) return false;
      if (BN_VOWEL_SIGN.test(next)) return false;
      if (BN_CONSONANT.test(next) && nextOf(skipZW(i + 1, +1)) === HASANTA) return false;
      if (!BN_CONSONANT.test(next) && !BN_VOWEL_IND.test(next)) return false;
      return true;
    };

    for (var i = 0; i < chars.length; i++) {
      var c = chars[i];
      if (BN_CONSONANT.test(c)) {
        var next = nextOf(i);
        if (next === HASANTA) {
          if (nucleus) { cum += 1; nucleus = false; }
        } else if (next !== undefined && BN_VOWEL_SIGN.test(next)) {
          /* counted when the vowel sign is reached */
        } else {
          cum += 1;
          nucleus = true;
        }
      } else if (c === 'ও' && isGlideO(i)) {
        /* silent glide onset */
      } else if (BN_VOWEL_SIGN.test(c) || BN_VOWEL_IND.test(c)) {
        cum += BN_TWO_MATRA.test(c) ? 2 : 1;
        nucleus = true;
      } else if (BN_CODA_MARK.test(c)) {
        if (nucleus) cum += 1;
        nucleus = false;
      } else if (c !== HASANTA && !ZW.test(c) && !BN_ZERO_MARK.test(c)) {
        nucleus = false;
      }
      if (breaks.length < targets.length &&
          cum >= targets[breaks.length] && breakableBefore(i)) {
        breaks.push(i + 1);                     // insert AFTER char i
      }
    }
    // code-point indices → UTF-16 offsets (identical for Bengali, but safe)
    return breaks.map(function (cp) {
      var s = 0;
      for (var k = 0; k < cp; k++) s += chars[k].length;
      return s;
    });
  }

  /* ── পর্ব: Latin dactylic hexameter scansion ─────────────────────────
     No macrons in the source, so quantities are inferred from what is
     certain: diphthongs and position are long, everything else anceps.
     Elision removes a syllable. The syllable count fixes the number of
     dactyls exactly (n − 12), and a small constraint search places them
     among feet 1–5, preferring the classical dactylic 5th foot.
     Unscannable lines are left unmarked. */

  var LA_WORD = /[A-Za-zÀ-ÿĀ-ſ]+/g;
  var laIsVowel = function (c) { return c !== undefined && 'aeiouy'.indexOf(c) !== -1; };

  function laNuclei(w) {
    var out = [];
    for (var i = 0; i < w.length; i++) {
      var c = w[i];
      if (!laIsVowel(c)) continue;
      if (c === 'u' && laIsVowel(w[i + 1]) &&
          (w[i - 1] === 'q' || (w[i - 1] === 'g' && w[i - 2] === 'n') ||
           (w[i - 1] === 's' && /^(uad|uav|ues)/.test(w.slice(i))))) continue;
      if (c === 'i' && laIsVowel(w[i + 1])) {
        if (i === 0 || laIsVowel(w[i - 1])) continue;
        if (/^(con|in|ad|ob|sub|per|dis|circum)$/.test(w.slice(0, i))) continue;
      }
      var two = w.slice(i, i + 2);
      if (two === 'ae' || two === 'au' || two === 'oe' ||
          (two === 'eu' && (/^(heu|seu|ceu|neu|eheu)$/.test(w) || /^(deucalion|eur)/.test(w))) ||
          (two === 'ei' && /^(ei|dein|deinde|deinceps)$/.test(w)) ||
          (two === 'ui' && /^(cui|huic)$/.test(w))) {
        out.push({ start: i, len: 2 });
        i++;
        continue;
      }
      out.push({ start: i, len: 1 });
    }
    return out;
  }

  var LA_MUTA = 'bpdtcgf';
  var LA_LIQUID = 'lr';

  function hexBreaks(text) {
    var words = [];
    var m;
    LA_WORD.lastIndex = 0;
    while ((m = LA_WORD.exec(text))) {
      words.push({ text: m[0], lower: m[0].toLowerCase(), start: m.index });
    }
    if (!words.length) return null;

    var wordNuc = words.map(function (wd) { return laNuclei(wd.lower); });
    var sylls = [];
    wordNuc.forEach(function (ns, wi) {
      ns.forEach(function (nc, ni) {
        sylls.push({ wi: wi, ni: ni, start: nc.start, end: nc.start + nc.len,
                     diph: nc.len === 2, elided: false });
      });
    });

    // elision: final vowel or vowel+m before a word starting with (h+)vowel
    for (var s = 0; s < sylls.length - 1; s++) {
      var cur = sylls[s], nxt = sylls[s + 1];
      if (cur.wi === nxt.wi || cur.ni !== wordNuc[cur.wi].length - 1) continue;
      var tail = words[cur.wi].lower.slice(cur.end);
      if ((tail === '' || tail === 'm') && /^h?[aeiouy]/.test(words[nxt.wi].lower)) {
        cur.elided = true;
      }
    }

    var counted = sylls.filter(function (x) { return !x.elided; });
    var n = counted.length;
    var d = n - 12;
    if (d < 0 || d > 5) return null;

    var elided = {};
    sylls.forEach(function (x) {
      if (!x.elided) return;
      var end = x.end;
      if (words[x.wi].lower[end] === 'm') end++;
      (elided[x.wi] = elided[x.wi] || []).push([x.start, end]);
    });
    var keptSlice = function (wi, from, to) {
      var wl = words[wi].lower;
      var out = '';
      for (var p = from; p < (to === undefined ? wl.length : to); p++) {
        var drop = (elided[wi] || []).some(function (ab) { return p >= ab[0] && p < ab[1]; });
        if (!drop) out += wl[p];
      }
      return out;
    };
    var consVal = function (run) {
      var v = 0;
      for (var p = 0; p < run.length; p++) {
        var c = run[p];
        if (c === 'h') continue;
        if (c === 'x' || c === 'z') v += 2;
        else if (c === 'u' && run[p - 1] === 'q') continue;
        else v += 1;
      }
      return v;
    };

    // weights: L = certainly long, U = anceps
    var W = counted.map(function (x, k) {
      if (k === n - 1) return 'U';
      if (x.diph) return 'L';
      var nxt = counted[k + 1];
      var tail, onset = '';
      if (nxt.wi === x.wi) tail = keptSlice(x.wi, x.end, nxt.start);
      else {
        tail = keptSlice(x.wi, x.end);
        for (var wi2 = x.wi + 1; wi2 < nxt.wi; wi2++) onset += keptSlice(wi2, 0);
        onset += keptSlice(nxt.wi, 0, nxt.start);
      }
      var tv = consVal(tail), ov = consVal(onset);
      if (tv + ov < 2) return 'U';
      if (tv === 0) return 'U';
      var run = tail + onset;
      var ml = nxt.wi === x.wi && run.length === 2 &&
        LA_MUTA.indexOf(run[0]) !== -1 && LA_LIQUID.indexOf(run[1]) !== -1;
      return ml ? 'U' : 'L';
    });

    var choose = function (arr, k) {
      if (k === 0) return [[]];
      var acc = [];
      arr.forEach(function (v, i) {
        choose(arr.slice(i + 1), k - 1).forEach(function (r) { acc.push([v].concat(r)); });
      });
      return acc;
    };
    var best = null, bestScore = -1;
    choose([0, 1, 2, 3, 4], d).forEach(function (S) {
      var set = {};
      S.forEach(function (f) { set[f] = true; });
      var p = 0, ok = true;
      for (var f = 0; f < 5 && ok; f++) {
        var pattern = set[f] ? 'LSS' : 'LL';
        for (var pi = 0; pi < pattern.length; pi++) {
          var w = W[p++];
          if ((pattern[pi] === 'L' && w === 'S') || (pattern[pi] === 'S' && w === 'L')) {
            ok = false;
            break;
          }
        }
      }
      if (ok && W[p] === 'S') ok = false;
      if (!ok) return;
      var score = (set[4] ? 100 : 0) + S.reduce(function (a, f) { return a + (5 - f); }, 0);
      if (score > bestScore) { bestScore = score; best = set; }
    });
    if (!best) return null;

    // boundary syllables → string insertion positions
    var positions = [];
    var p = 0;
    for (var f = 0; f < 5; f++) {
      p += best[f] ? 3 : 2;
      var x = counted[p - 1];
      var laterInWord = counted.find(function (t) { return t.wi === x.wi && t.ni > x.ni; });
      if (!laterInWord) {
        var q = words[x.wi].start + words[x.wi].text.length;
        while (q < text.length && !/\s/.test(text[q])) q++;
        positions.push(q);
      } else {
        var run = words[x.wi].lower.slice(x.end, laterInWord.start);
        var ml = run.length === 2 &&
          LA_MUTA.indexOf(run[0]) !== -1 && LA_LIQUID.indexOf(run[1]) !== -1;
        var digraph = run.length === 2 && run[1] === 'h';
        var keep = 0;
        if (run.length === 1 && (run === 'x' || run === 'z')) keep = 1;
        else if (run.length >= 2 && !ml && !digraph && run !== 'qu') keep = 1;
        positions.push(words[x.wi].start + x.end + keep);
      }
    }
    return positions;
  }

  /* ── The toggles ────────────────────────────────────────────────────── */

  var VERSE_ROW = 'tbody tr:not(.tt-section):not(.tt-marker):not(.tt-title)';
  var meterOn = { matra: false, feet: false };

  function applyMatra() {
    var targets = (cfg.meters && cfg.meters.matra) || [8, 16];
    document.querySelectorAll('.tt-table ' + VERSE_ROW + ' td.bn').forEach(function (cell) {
      clearSeps(cell, 'm-sep');
      if (!meterOn.matra) return;
      insertSeps(cell, matraBreaks(cleanCellText(cell), targets), 'm-sep', '/');
    });
  }

  function applyFeet() {
    document.querySelectorAll('.tt-table ' + VERSE_ROW + ' td.it').forEach(function (cell) {
      clearSeps(cell, 'f-sep');
      if (!meterOn.feet) return;
      var breaks = hexBreaks(cleanCellText(cell));
      if (breaks) insertSeps(cell, breaks, 'f-sep', '|');
    });
  }

  /* The মিটার স্ক্যান bar lives at the head of the অভিধান panel:
     বাংলা toggles the matrabritta dividers, লাতিন the hexameter feet. */
  function setupMeters() {
    if (!cfg.meters) return;
    var inner = document.querySelector('#book-dict .dict-inner');
    if (!inner) return;

    var bar = document.createElement('div');
    bar.className = 'dict-meter';

    var label = document.createElement('span');
    label.className = 'dict-meter-label';
    label.textContent = 'মিটার স্ক্যান:';
    bar.appendChild(label);

    function chip(text, title, onToggle) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'book-tool';
      b.textContent = text;
      b.title = title;
      b.setAttribute('aria-pressed', 'false');
      b.addEventListener('click', function () {
        var on = b.getAttribute('aria-pressed') !== 'true';
        b.setAttribute('aria-pressed', String(on));
        b.classList.toggle('is-on', on);
        onToggle(on);
      });
      return b;
    }

    if (cfg.meters.matra) {
      bar.appendChild(chip('বাংলা', 'মাত্রাবৃত্তের পর্ব ভাগ দেখাও',
        function (on) { meterOn.matra = on; applyMatra(); }));
    }
    if (cfg.meters.feet) {
      bar.appendChild(chip('লাতিন', 'ড্যাকটিলিক হেক্সামিটার — ৬ পর্ব',
        function (on) { meterOn.feet = on; applyFeet(); }));
    }
    if (bar.children.length > 1) inner.insertBefore(bar, inner.firstChild);

    /* If the md arrives after a toggle was switched on, redraw. */
    document.addEventListener('md-loader-done', function () {
      if (meterOn.matra) applyMatra();
      if (meterOn.feet) applyFeet();
    });
  }

  /* ═════════════════════════════════════════════════════════════════════
   * Ctrl+Left/Right: the previous / next part
   * ═════════════════════════════════════════════════════════════════════ */

  function isTypingTarget(el) {
    if (!el || el === document.body) return false;
    var tag = (el.tagName || '').toLowerCase();
    return tag === 'input' || tag === 'textarea' || tag === 'select' || el.isContentEditable;
  }

  function setupKeyboard() {
    document.addEventListener('keydown', function (e) {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      if (!(e.ctrlKey || e.metaKey) || e.altKey) return;
      if (isTypingTarget(e.target)) return;
      var href = e.key === 'ArrowLeft' ? cfg.prev : cfg.next;
      if (!href) return;
      e.preventDefault();
      window.location.href = href;
    });
  }

  /* ── Init ──────────────────────────────────────────────────────────── */

  setupDict();
  setupPanelGeometry();
  setupMeters();
  setupKeyboard();
}());
