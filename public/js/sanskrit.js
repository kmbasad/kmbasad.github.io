/**
 * sanskrit.js — the Mahabharata's two scripts and two metres.
 *
 * One file for the page and for the translator's checker
 * (tools/mahabharata/check.mjs), so both count by the same rules:
 *
 *   toBn(deva)        Devanagari → Bangla script, as Bengal prints Sanskrit:
 *                     ya between vowels is য় (নারায়ণ), a syllable-closing
 *                     t is ৎ (কদাচিৎসূত), va is ব.
 *   aksharas(text)    the text cut into written syllables (either script):
 *                     [{ start, end, vocalic }], a vowel-less coda (word-final
 *                     ্ / ৎ, a sandhi'd न्) riding on the syllable before it.
 *   padaBreaks(text, meter)
 *                     where each quarter (পাদ) of a Sanskrit line ends:
 *                     `meter` is the line's quarters, "8+8", "11+12"…
 *   akshar(text)      a Bangla line in অক্ষরবৃত্ত: { total, words:[{w,end,cum}] }.
 *                     Every written syllable is 1 মাত্রা; a word-final closed
 *                     syllable — ং ঃ ৎ or a hasanta at the word's end, a
 *                     final ৈ/ৌ — is 2; inside a word it stays 1 (সংসার 3,
 *                     দুঃখ 2, উৎসব 3, মন 2, পুণ্যবান 4).
 *   aksharBreaks(text, meter)
 *                     offsets in a Bangla line where its পর্বs end, to sit
 *                     under the Sanskrit's quarters.
 *
 * On a page whose source is Sanskrit (TRANS_CONFIG.dictLang 'sa') it also
 * shows the Sanskrit column in Bangla script, Devanagari a toggle away
 * (book.js draws the toggle; window.Sanskrit.setScript switches).
 */
(function (root) {
  'use strict';

  /* ── Devanagari → Bangla ─────────────────────────────────────────── */

  var VIRAMA_D = '्';
  var DEVA_SPECIAL = {
    'व': 'ব',   // व → ব
    'ळ': 'ল',   // ळ → ল
    'ॐ': 'ওঁ', // ॐ → ওঁ
    '।': '।', '॥': '॥'   // । ॥ are shared
  };
  // t closes its syllable as ৎ unless it starts a cluster Bangla writes
  // whole: ত্ত ত্থ ত্ন ত্ম ত্য ত্র ত্ব
  var T_CLUSTER = /[तथनमयरव]/;
  var D_VOWEL_SOUND = /[ऄ-औा-ौक-ह]/;  // vowels, signs, consonants

  function toBn(s) {
    var cs = Array.from(String(s)), out = '';
    for (var i = 0; i < cs.length; i++) {
      var c = cs[i], o = c.codePointAt(0);
      if (c === 'त' && cs[i + 1] === VIRAMA_D && !T_CLUSTER.test(cs[i + 2] || '')) {
        out += 'ৎ';  // ৎ
        i++;
        continue;
      }
      if (c === 'य') {
        // য় after a sounded vowel (a vowel, a sign, a consonant's own a);
        // য after a virama, ং, ঃ, a space or at the start
        var p = cs[i - 1] || '';
        out += D_VOWEL_SOUND.test(p) && cs[i + 1] !== VIRAMA_D ? 'য়' : 'য';
        continue;
      }
      if (DEVA_SPECIAL[c]) { out += DEVA_SPECIAL[c]; continue; }
      if (o >= 0x0900 && o <= 0x097F) { out += String.fromCodePoint(o + 0x80); continue; }
      out += c;
    }
    return out;
  }

  /* ── written syllables, either script ────────────────────────────── */

  // the two scripts' blocks run parallel; fold Bangla onto Devanagari
  function fold(c) {
    if (c === 'য়') return 'य';          // য়
    if (c === 'ড়' || c === 'ঢ়') return 'ड';  // ড় ঢ় (consonants)
    if (c === 'ৎ') return 'T';               // ৎ: a closing t
    var o = c.codePointAt(0);
    if (o >= 0x0980 && o <= 0x09FF) return String.fromCodePoint(o - 0x80);
    return c;
  }
  function kind(c) {
    var f = fold(c);
    if (f === 'T') return 'K';                           // ৎ
    var o = f.codePointAt(0);
    if (o >= 0x0904 && o <= 0x0914) return 'V';          // independent vowel
    if (o === 0x0960 || o === 0x0961) return 'V';
    if (o >= 0x0915 && o <= 0x0939) return 'C';          // consonant
    if (o >= 0x0958 && o <= 0x095F) return 'C';
    if (o >= 0x093E && o <= 0x094C) return 'S';          // vowel sign
    if (o === 0x0962 || o === 0x0963) return 'S';
    if (o === 0x094D) return 'H';                        // virama / hasanta
    if (o === 0x0902 || o === 0x0903) return 'M';        // anusvara, visarga
    if (o === 0x0901 || o === 0x093C || o === 0x200C || o === 0x200D) return 'Z';
    if (o === 0x093D) return 'Z';                        // avagraha: no sound
    return 'X';                                          // space, punctuation
  }

  // [{start, end, vocalic, coda}] in UTF-16 offsets; a syllable's `end`
  // includes the marks and codas that close it
  function aksharas(text) {
    var cs = Array.from(String(text));
    var off = [], o = 0;
    for (var i = 0; i < cs.length; i++) { off.push(o); o += cs[i].length; }
    off.push(o);
    var out = [], cur = null;
    for (var j = 0; j < cs.length; j++) {
      var k = kind(cs[j]);
      if (k === 'C') {
        // a consonant opens a syllable unless it is a cluster's first part
        // whose syllable is already open (cur.open) — then it waits too
        if (!cur || !cur.pending) {
          cur = { start: off[j], end: off[j + 1], vocalic: false, coda: false, pending: true };
          out.push(cur);
        }
        cur.end = off[j + 1];
        var n = kind(cs[j + 1] || ' ');
        if (n === 'H') continue;                 // cluster goes on
        cur.pending = false;
        cur.vocalic = true;                      // its own a, or the sign next
      } else if (k === 'V') {
        cur = { start: off[j], end: off[j + 1], vocalic: true, coda: false, pending: false };
        out.push(cur);
      } else if (k === 'S' || k === 'Z') {
        if (cur) cur.end = off[j + 1];
      } else if (k === 'H') {
        if (cur) {
          cur.end = off[j + 1];
          var nx = kind(cs[j + 1] || ' ');
          if (nx !== 'C') {
            // a word-final hasanta: this cluster closes the syllable before
            var prev = out[out.length - 2];
            if (cur.pending && prev) {
              out.pop();
              prev.end = cur.end;
              prev.coda = true;
              cur = prev;
            }
            cur.pending = false;
          }
        }
      } else if (k === 'M' || k === 'K') {
        if (cur) { cur.end = off[j + 1]; cur.coda = true; cur.pending = false; }
      } else {
        if (cur) cur.pending = false;
        cur = null;
      }
    }
    // a cluster that never met its vowel (e.g. text ends in a hasanta
    // with nothing before it) still counts as written
    out.forEach(function (a) { delete a.pending; });
    return out;
  }

  function syllables(text) {
    return aksharas(text).filter(function (a) { return a.vocalic; }).length;
  }

  function parseMeter(meter) {
    return String(meter || '').split('+').map(Number).filter(function (n) { return n > 0; });
  }

  // offsets where each quarter but the last ends — the boundary before
  // the next quarter's first written syllable
  function padaBreaks(text, meter) {
    var ps = parseMeter(meter);
    if (ps.length < 2) return [];
    var syl = aksharas(text).filter(function (a) { return a.vocalic; });
    var out = [], cum = 0;
    for (var i = 0; i < ps.length - 1; i++) {
      cum += ps[i];
      if (cum >= syl.length) break;
      // a word space before that syllable: break at the space
      var at = syl[cum].start, s = String(text);
      var q = at;
      while (q > 0 && /\s/.test(s[q - 1])) q--;
      out.push(q < at ? q : at);
    }
    return out;
  }

  /* ── অক্ষরবৃত্ত ───────────────────────────────────────────────────── */

  var WORD_SPLIT = /[\s—–-]+/;
  var FINAL_DIPH = /[ৈৌঐঔ]$/;   // ৈ ৌ ঐ ঔ

  function wordMatra(w) {
    var core = w.replace(/^[^ঀ-৿]+|[^ঀ-৿]+$/g, '');
    if (!core) return 0;
    var as = aksharas(core), n = 0;
    as.forEach(function (a) { if (a.vocalic) n++; });
    var last = as[as.length - 1];
    if (last && (last.coda || FINAL_DIPH.test(core))) n++;
    if (!as.some(function (a) { return a.vocalic; }) && as.length) n = 1;
    return n;
  }

  function akshar(text) {
    var s = String(text), words = [], cum = 0, re = /[^\s—–-]+/g, m;
    while ((m = re.exec(s))) {
      var v = wordMatra(m[0]);
      if (!v) continue;
      cum += v;
      words.push({ w: m[0], start: m.index, end: m.index + m[0].length, matra: v, cum: cum });
    }
    return { total: cum, words: words };
  }

  // after the word whose running count reaches each target; mid-word when
  // no word ends there (the divider then shows the fault)
  function aksharBreaks(text, meter) {
    var ps = parseMeter(meter);
    if (ps.length < 2) return [];
    var a = akshar(text), out = [], cum = 0;
    for (var i = 0; i < ps.length - 1; i++) {
      cum += ps[i];
      var w = a.words.find(function (x) { return x.cum >= cum; });
      if (!w) break;
      if (w.cum === cum) { out.push(w.end); continue; }
      // inside w: walk its syllables to the target
      var before = w.cum - w.matra, as = aksharas(text.slice(w.start, w.end)), k = before, pos = w.end;
      for (var j = 0; j < as.length; j++) {
        if (as[j].vocalic) k++;
        if (k >= cum) { pos = w.start + as[j].end; break; }
      }
      out.push(pos);
    }
    return out;
  }

  var api = {
    toBn: toBn, aksharas: aksharas, syllables: syllables, padaBreaks: padaBreaks,
    akshar: akshar, aksharBreaks: aksharBreaks, parseMeter: parseMeter
  };
  root.Sanskrit = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;

  /* ── the page: Bangla script by default, Devanagari a toggle away ── */

  if (typeof document === 'undefined') return;
  var cfg = root.TRANS_CONFIG || {};
  if (cfg.dictLang !== 'sa') return;

  var KEY = 'mbh-script';
  var script = 'bn';
  try { if (localStorage.getItem(KEY) === 'deva') script = 'deva'; } catch (e) {}
  document.documentElement.classList.add('sa-script-pending');

  function render() {
    document.querySelectorAll('.tt-table td.it .w').forEach(function (span) {
      if (span.dataset.deva == null) {
        var c = span.cloneNode(true);
        c.querySelectorAll('.f-sep, .m-sep').forEach(function (el) { el.remove(); });
        span.dataset.deva = c.textContent;
      }
      span.textContent = script === 'bn' ? toBn(span.dataset.deva) : span.dataset.deva;
    });
    document.body.dataset.saScript = script;
    document.documentElement.classList.remove('sa-script-pending');
  }

  api.getScript = function () { return script; };
  api.setScript = function (s) {
    script = s === 'deva' ? 'deva' : 'bn';
    try { localStorage.setItem(KEY, script); } catch (e) {}
    render();
    document.dispatchEvent(new CustomEvent('sa-script'));
  };
  // before book.js's own md-loader-done handlers redraw any dividers
  document.addEventListener('md-loader-done', render);
}(typeof window !== 'undefined' ? window : globalThis));
