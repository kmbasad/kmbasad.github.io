/**
 * sanskrit.js — the Mahabharata's two scripts and two metres.
 *
 * One file for the page and for the translator's checker
 * (tools/mahabharata/mbh.mjs), so both count by the same rules:
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
 *   akshar(text)      a Bangla line in অক্ষরবৃত্ত: { total, words:[{w,end,cum,guess}] }.
 *                     Every spoken syllable is 1 মাত্রা, a closed one 2 at
 *                     a word's end and 1 inside it (সংসার 3, দুঃখ 2, উৎসব 3,
 *                     মন 2, করলেন 3, মহাভারতের 6, তোমাকে পাওয়ার জন্যে 8).
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
  // অক্ষর is the spoken syllable: open 1; closed 1 inside a word, 2 at its
  // end. Writing hides where a consonant's own vowel falls silent, which
  // counts only inside a word (at the end the consonant adds 1 either way,
  // its own syllable or the closing of the one before): ভা-র-তের keeps it,
  // কর্‌-লেন, আম্‌-রা, তার্‌-পর drop it. The rules below decide; BN_LEX holds
  // the words they decide wrong; a word they had to guess is marked, for
  // the translator's ear (check.mjs lists them).

  var BN_LEX = {
    'কখনো': 2, 'কখনও': 2, 'সকলে': 3, 'ভারতে': 3,
    'সরস্বতী': 4, 'সরস্বতীকে': 5, 'সরস্বতীকেও': 6, 'কঠোরব্রত': 4,
    'সমস্ত': 3, 'অবস্থা': 3, 'ব্যবস্থা': 3, 'নমস্কার': 4,
    'একদিন': 3, 'জোড়হাতে': 3, 'সকলেই': 4, 'আপনাদের': 4, 'আপনারা': 3,
    'পরমর্ষি': 4, 'বিধিমতো': 4, 'সরস্বতীতে': 5, 'সরস্বতীতেও': 6,
    // heard and confirmed (the rules guess these right; listed so they
    // are not asked again)
    'তারপর': 3, 'তারপরে': 3, 'তারপরেই': 4, 'পড়বে': 2, 'নৈমিষারণ্যবাসীরা': 8,
    'তপস্বীরা': 4, 'শুনতে': 2, 'তপস্যার': 4, 'পাড়তে': 2, 'জানতে': 2,
    'রাজর্ষি': 3, 'জনমেজয়ের': 6, 'সর্পযজ্ঞে': 4, 'সমন্তপঞ্চক': 6,
    'দ্বিজসেবিত': 5, 'দেখতে': 2, 'পুণ্যকথা': 4, 'দেবতা': 3, 'সুসংস্কৃত': 4,
    'নৃপতি': 3, 'জনমেজয়কে': 5, 'জনমেজয়': 5, 'সানন্দে': 3, 'বৈশম্পায়ন': 5,
    'অদ্ভুতকর্মা': 4, 'পাপভয়হর': 4, 'লোমহর্ষণি': 4, 'অতঃপর': 4,
    'পরমাব্যয়': 5, 'চরাচরগুরু': 5, 'জগতে': 3, 'দেবগুরু': 3, 'সুরগুরু': 3,
    'দিনরাত্রি': 3, 'লোকসাক্ষী': 3, 'তেমনি': 2, 'অমিততেজা': 4,
    'অমিততেজস্বী': 5,
    'অসৎ': 3, 'সদসতের': 4, 'মহর্ষির': 4, 'সমগ্র': 3, 'পণ্ডিতজনের': 5,
    'সমভাবে': 4, 'সদসৎ': 3, 'প্রজাপতি': 4, 'পরমেষ্ঠীও': 5, 'রাজর্ষিও': 4,
    'যুগক্ষয়': 4, 'দেবতাদের': 5, 'দিবস্পুত্র': 4, 'বৃহদ্ভানু': 4, 'বিভাবসু': 4
  };
  // consonant-led endings that close the syllable before them: কর্‌|লেন,
  // আম্‌|রা, সব্‌|খানে, এক্‌|জন
  var CLOSE_END = ['লেন', 'লাম', 'লেম', 'লি', 'লো', 'লে', 'লেও', 'লেই',
    'তেন', 'তাম', 'তিস', 'তো', 'তে', 'তেও', 'তেই', 'ছে', 'ছেন', 'ছিস', 'ছি',
    'ছিল', 'ছিলেন', 'ছিলাম', 'ছিলে', 'ছিলো', 'বেন', 'বে', 'বো', 'বি', 'বার',
    'টা', 'টি', 'টুকু', 'টাই', 'টার', 'টির', 'গুলো', 'গুলি', 'গুলোর', 'দের',
    'দেরই', 'কে', 'কেই', 'রা', 'রাও', 'রাই', 'খানে', 'খানা', 'খানি', 'জন'];
  // …which a stem's last consonant and a bare vowel ending can also spell
  // (ভারত+এ is ভা-র-তে, not ভার্‌-তে): guessed as closing, and marked
  var AMBIG_END = { 'লে': 1, 'তে': 1, 'কে': 1, 'বে': 1, 'লো': 1, 'তো': 1 };
  // a stem's last consonant before a vowel ending keeps the vowel before
  // it: ভা-র|তের, ন-গ|রে
  var VOWEL_END = /^[ক-হড়ঢ়য়]়?ে(?:র(?:া|ই|ও)?|ই|ও)?$/;
  var BN_YA = /^(?:য়|য়)$/;   // য়, precomposed or not

  // a Bangla word as written syllables: V (a vowel letter), S (a consonant
  // or cluster with its sign), B (bare: its own vowel, sounded or not), H
  // (a closing consonant: hasanta at the end, ৎ); ং ঃ mark a coda
  function bnTokens(core) {
    var cs = Array.from(core), out = [], i = 0;
    while (i < cs.length) {
      var k = kind(cs[i]);
      if (k === 'V') { out.push({ t: 'V', ch: cs[i], at: i }); i++; continue; }
      if (k === 'K') { out.push({ t: 'H', text: cs[i], n: 1, at: i }); i++; continue; }
      if (k === 'M') { if (out.length) out[out.length - 1].coda = true; i++; continue; }
      if (k !== 'C') { i++; continue; }
      var at = i, n = 1;
      i++;
      for (;;) {
        while (i < cs.length && kind(cs[i]) === 'Z') i++;
        if (kind(cs[i] || ' ') === 'H' && kind(cs[i + 1] || ' ') === 'C') { i += 2; n++; continue; }
        break;
      }
      var tk = { at: at, n: n, text: cs.slice(at, i).join('') };
      if (kind(cs[i] || ' ') === 'S') { tk.t = 'S'; tk.sign = cs[i]; i++; }
      else if (kind(cs[i] || ' ') === 'H') { tk.t = 'H'; i++; }
      else tk.t = 'B';
      while (i < cs.length && kind(cs[i]) === 'Z') i++;
      out.push(tk);
    }
    return out;
  }

  // a bare consonant inside a word: 1 if its vowel sounds, 0 if silent.
  // Decided from the word's end back, so `nextSilent` knows whether the
  // consonant after it lost its vowel: two silent ones cannot meet, so
  // then this one sounds (না-রা-য়ণ্‌-কে).
  function bareInside(T, i, core, nextSilent) {
    var t = T[i], next = T[i + 1], lastIx = T.length - 1;
    var rest = Array.from(core).slice(next.at).join('');
    var ya = t.n === 1 && BN_YA.test(t.text);
    if (nextSilent || t.coda) return { c: 1 };               // …or carries ং ঃ (অ-তঃ-পর)
    // before a closing য় the consonant sounds (জ-য়্‌কে)
    if (!ya && next.t === 'B' && next.n === 1 && BN_YA.test(next.text) && i + 1 < lastIx) return { c: 1 };
    // a cluster, or one next, sounds the vowel (উ-ত্তম, স-মস্‌-ত, স-রস্‌-ব-তী)
    // — but a compound's first part ends silent before one (ক-ঠোর্‌-ব্র-ত)
    if (t.n > 1) return { c: 1 };
    if (next.n > 1) return { c: 1, guess: true };
    if (CLOSE_END.indexOf(rest) !== -1) return { c: 0, guess: !!AMBIG_END[rest] };
    if (VOWEL_END.test(rest)) return { c: 1 };                   // না-রা-য়|ণে
    if (next.t === 'B' && i + 1 === lastIx) return { c: 1 };     // ন-গর, না-রা-য়ণ
    // য় after a sounded syllable closes it (জয়্‌-টি)
    if (ya) return { c: 0 };
    if (next.t === 'B') return { c: 0, guess: true };            // তার্‌-পর
    // otherwise the vowel sounds, as in most tatsama words (দে-ব-তা), but
    // native words and compounds drop it (এক্‌-দিন, রাজ্‌-পুত্‌-র): marked
    return { c: 1, guess: true };
  }

  var FINAL_DIPH = /[ৈৌঐঔ]/;   // ৈ ৌ ঐ ঔ

  function bnWord(w) {
    var core = w.replace(/^[^ঀ-৿]+|[^ঀ-৿]+$/g, '');
    if (!core) return { matra: 0 };
    if (BN_LEX[core] != null) return { matra: BN_LEX[core] };
    var T = bnTokens(core), n = 0, guess = false, L = T.length, silent = false;
    for (var i = L - 1; i >= 0; i--) {
      var t = T[i], first = i === 0, last = i === L - 1, next = T[i + 1];
      var wasSilent = silent;
      silent = false;
      if (t.t === 'H') { if (last) n++; continue; }          // a closing consonant
      if (t.t === 'V') {
        if (!first && !last && /[\u0987\u0989]/.test(t.ch)) { /* ই উ after a vowel close it: যাই্‌-টা */ }
        else if (!first && t.ch === '\u0993' && next && next.t === 'S' && BN_YA.test(next.text)) { /* ও+য়া is w */ }
        else n++;
      } else if (t.t === 'S') {
        n++;
      } else if (first || last) {
        n++;
      } else {
        var r = bareInside(T, i, core, wasSilent);
        n += r.c;
        silent = r.c === 0;
        if (r.guess) guess = true;
      }
      if (last && (t.coda || FINAL_DIPH.test(t.sign || t.ch || ''))) n++;
    }
    if (!n && L) n = 1;
    return { matra: n, guess: guess };
  }

  function akshar(text) {
    var s = String(text), words = [], cum = 0, re = /[^\s—–-]+/g, m;
    while ((m = re.exec(s))) {
      var v = bnWord(m[0]);
      if (!v.matra) continue;
      cum += v.matra;
      words.push({ w: m[0], start: m.index, end: m.index + m[0].length,
                   matra: v.matra, cum: cum, guess: !!v.guess });
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
    lexicon: BN_LEX, toBn: toBn, aksharas: aksharas, syllables: syllables, padaBreaks: padaBreaks,
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
