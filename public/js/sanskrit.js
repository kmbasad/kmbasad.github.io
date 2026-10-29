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
    'যুগক্ষয়': 4, 'দেবতাদের': 5, 'দিবস্পুত্র': 4, 'বৃহদ্ভানু': 4, 'বিভাবসু': 4,
    'দেবভ্রাট': 3, 'দশজ্যোতি': 4, 'শতজ্যোতি': 4, 'বারবার': 3, 'দেড়শো': 2,
    'শুকদেব': 3,
    'বিবস্বানের': 5, 'সংযমী': 3, 'সহস্রজ্যোতি': 5, 'দশজ্যোতির': 5,
    'শতজ্যোতির': 5, 'পুনরায়': 4, 'সহস্রজ্যোতির': 6, 'রাজর্ষির': 4, 'রহস্য': 3,
    'উপরিচর': 5, 'ব্রহ্মচর্যে': 4, 'সত্যবতীসুত': 6, 'ধৃতরাষ্ট্র': 4, 'মহর্ষি': 3,
    'সহস্র': 3, 'করলে': 2, 'বৈশম্পায়নকে': 5, 'সদস্যসহ': 5, 'ভগবান': 4,
    'ভারতসংহিতা': 5, 'এরপর': 3, 'অনুক্রমণী': 5, 'ঘটনার': 4, 'উপযুক্ত': 4,
    'যজ্ঞকর্মের': 5, 'অবকাশে': 4,
    'করল': 2, 'বলল': 2, 'ধরল': 2, 'চলল': 2, 'পড়ল': 2, 'উঠল': 2, 'মারল': 2,
    'ভীমসেন': 3, 'ভীমসেনের': 4, 'রাজসভায়': 4, 'রাজসূয়': 3, 'চারদিকের': 4,
    'পুরবাসী': 3, 'পুরবাসীর': 4, 'উপভোগ': 4, 'ধনসম্পদ': 4,
    'বলব': 2, 'করব': 2, 'স্বয়ংবরা': 4, 'স্বজনসহ': 4,
    'কুশল': 3, 'যেসব': 3, 'ভারত': 3, 'মানব': 3, 'দেবল': 3, 'দেবতার': 4,
    'তপস্বীসহ': 5, 'অরণ্যে': 3, 'কৌরব': 3, 'স্বাগত': 3, 'কোলাহল': 4,
    'থামলে': 2, 'আনন্দে': 3, 'বিনম্রতা': 4, 'বীরত্বে': 3, 'জরাসন্ধ': 4,
    'সুমহান': 4, 'উপহার': 4, 'উপহাস্য': 4, 'বিবর্ণ': 3, 'বিদুরকে': 3,
    'শারদ্বত': 4, 'কৃপকে': 2, 'পরস্পরে': 4, 'সঞ্জয়কে': 3, 'মৃগয়ায়': 4, 'যুগল': 3,
    'ক্রোধপরায়ণ': 5, 'রাজসূয়ে': 3, 'রাজসূয়ের': 4, 'শরশয্যায়': 4, 'বাণশয্যায়': 3,
    'লড়ব': 2, 'অবসন্ন': 4, 'বাঁধল': 2, 'ঢুকল': 2, 'বনগামী': 3, 'বনবাসী': 3,
    'কিরাতরূপী': 4, 'ধনপতি': 3, 'একসাথে': 3, 'ঘোষযাত্রী': 3, 'প্রাণপণে': 3,
    'অসমর্থ': 4,
    'বাপকে': 2, 'দীনতায়': 4, 'মোহগ্রস্ত': 4, 'তেজস্বী': 3, 'উপহাস': 4, 'জিততে': 2,
    'উৎসাহহীন': 5, 'বুদ্ধিসম্মত': 5, 'জানবে': 2, 'দ্বারকাপুরে': 5, 'সুভদ্রাকে': 4,
    'দ্রৌপদী': 3, 'একবস্ত্রা': 3, 'রজস্বলা': 4, 'পাশুপত': 4, 'ধনঞ্জয়': 4,
    'সত্যসন্ধ': 4, 'অগম্য': 3, 'কর্ণমন্ত্রে': 4, 'একরথী': 3, 'ধনঞ্জয়ে': 4,
    'পুত্রবধূ': 4, 'মাধব': 3, 'কেশবকে': 3, 'বাঁধতে': 2, 'কেশব': 3, 'শান্তনব': 4,
    'লড়লে': 2, 'শিখণ্ডীকে': 4, 'মহারথীরা': 5, 'সংশপ্তকেরা': 5, 'সৌভদ্র': 3,
    'অভিমন্যুকে': 5,
    'কৃতবর্মা': 4, 'কৃতবর্মাও': 5, 'মরত': 2, 'একটুও': 3, 'শতরথ': 4,
    'সূতপুত্র': 4, 'রথহীন': 4, 'নারদের': 4, 'দাশরথি': 4, 'দেবগণ': 4, 'জনগণ': 4,
    'প্রায়োপবিষ্টকে': 6, 'নিহত': 3, 'সৌবল': 3, 'সহদেবের': 5, 'দর্পভগ্ন': 4,
    'অসহিষ্ণু': 4, 'ঘুমন্ত': 3, 'দ্রৌপদেয়': 4, 'বীভৎস': 3, 'কলঙ্কের': 4,
    'পরমাস্ত্র': 4, 'মণিরত্ন': 4, 'পরস্পর': 4, 'চেতনা': 3, 'ছাড়তে': 2,
    'মহীপতিকে': 5, 'গাবল্গণি': 4, 'মহাবল': 4, 'রাজবংশে': 3, 'বিজয়ীশ্রেষ্ঠ': 5,
    'শশবিন্দু': 4, 'পুণ্যকর্মা': 4, 'মহারথী': 4, 'বিষ্বগশ্ব': 4, 'যুবনাশ্ব': 4,
    'বৃহদ্গুরু': 4, 'পরশু': 3, 'বৃহদ্রথ': 4, 'পাণ্ডবদের': 4, 'রাজাদের': 4,
    'কুরুদের': 4, 'দেবতাদের': 5, 'মুনিদের': 4, 'শিষ্যদের': 4, 'তাঁদের': 3,
    'কৌরবদের': 4, 'স্বজনদের': 4, 'সোমকদের': 4, 'দেবর্ষি': 3, 'করতে': 2, 'ভরত': 3,
    'বলবন্ধু': 4, 'আপনার': 3, 'আপনি': 2, 'বেদবিধি': 3, 'শুভকর্মারা': 5,
    'কর্মকথা': 4, 'একটু': 2, 'দইয়ের': 3,
    'অনরণ্য': 4, 'কৃতবন্ধু': 4, 'সরলতা': 4, 'ধ্যানযোগের': 4, 'পাপমুক্ত': 3,
    'ভাবদুষ্ট': 3, 'ব্রাহ্মণগণে': 4,
    'সুবল': 3, 'জানুজঙ্ঘ': 4, 'নিরামর্দ': 4, 'বৃহদ্বল': 4, 'বৃহৎকেতু': 4,
    'পরহা': 3, 'মহাবলী': 4, 'মহত্ত্ব': 3, 'মহত্ত্বে': 3, 'কালকে': 2,
    'রাজর্ষিরা': 4, 'পুনর্ভব': 4, 'অনুক্রমণিকা': 6, 'অনুক্রমণীতে': 6, 'করবে': 2,
    'ভ্রূণহত্যার': 4, 'স্বর্গগতি': 4, 'দেবর্ষিরা': 4, 'তুলাদণ্ডে': 4,
    'ভারবত্তায়': 4, 'মহাভারত': 5
  };
  // consonant-led endings that close the syllable before them: কর্‌|লেন,
  // আম্‌|রা, সব্‌|খানে, এক্‌|জন
  var CLOSE_END = ['লেন', 'লাম', 'লেম', 'লি', 'লো', 'লে', 'লেও', 'লেই',
    'তেন', 'তাম', 'তিস', 'তো', 'তে', 'তেও', 'তেই', 'ছে', 'ছেন', 'ছিস', 'ছি',
    'ছিল', 'ছিলেন', 'ছিলাম', 'ছিলে', 'ছিলো', 'বেন', 'বে', 'বো', 'বি', 'বার',
    'টা', 'টি', 'টুকু', 'টাই', 'টার', 'টির', 'গুলো', 'গুলি', 'গুলোর', 'দের',
    'দেরই', 'দেরও', 'কে', 'কেই', 'কেও', 'রা', 'রাও', 'রাই', 'টাও', 'টিও',
    'খানে', 'খানা', 'খানি', 'জন'];
  // …which a stem's last consonant and a bare vowel ending can also spell
  // (ভারত+এ is ভা-র-তে, not ভার্‌-তে): guessed as closing, and marked
  var AMBIG_END = { 'লে': 1, 'তে': 1, 'কে': 1, 'বে': 1, 'লো': 1, 'তো': 1, 'দের': 1 };
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
    // য় after an i-vowel keeps its own (প্রি-য়-জন, ক্ষত্‌-ত্রি-য়-দের)
    var prev = T[i - 1];
    if (ya && prev && /[\u09BF\u09C0]/.test(prev.sign || '')) return { c: 1 };
    if (nextSilent || t.coda) return { c: 1 };               // …or carries ং ঃ (অ-তঃ-পর)
    // a cluster keeps its vowel (অল্‌-পো, so অল্‌-পোই)
    if (t.n > 1) return { c: 1 };
    // before a vowel letter a single consonant is that vowel's onset
    // (স-বি, তাঁ-রি, আ-জো)
    if (next.t === 'V') return { c: 0 };
    // before a closing য় the consonant sounds (জ-য়্‌কে)
    if (!ya && next.t === 'B' && next.n === 1 && BN_YA.test(next.text) && i + 1 < lastIx) return { c: 1 };
    // a cluster, or one next, sounds the vowel (উ-ত্তম, স-মস্‌-ত, স-রস্‌-ব-তী)
    // — but a compound's first part ends silent before one (ক-ঠোর্‌-ব্র-ত)
    if (t.n > 1) return { c: 1 };
    if (next.n > 1) return { c: 1, guess: true };
    if (CLOSE_END.indexOf(rest) !== -1) return { c: 0, guess: !!AMBIG_END[rest] };
    if (VOWEL_END.test(rest)) return { c: 1 };                   // না-রা-য়|ণে
    // before a last bare consonant it sounds (ন-গর, না-রা-য়ণ), but a verb's
    // ল ত ব ending closes it (কর্‌-লো, পার্‌-বো): those are marked
    if (next.t === 'B' && i + 1 === lastIx) return { c: 1, guess: /^[লতব]$/.test(next.text) };
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

  // When the original has to wrap (a narrow screen, a long line), it
  // wraps only where its quarters meet, as editions print long metres:
  // the spaces inside a quarter turn non-breaking, the one between them
  // stays (or, where sandhi runs one word across, a <wbr> opens there).
  function padaWrap(td) {
    var meter = td.parentNode.dataset.meter;
    td.querySelectorAll('wbr.sa-br').forEach(function (e) { e.remove(); });
    td.normalize();
    if (!meter) return;
    var text = td.textContent, br = padaBreaks(text, meter)[0];
    var tw = document.createTreeWalker(td, NodeFilter.SHOW_TEXT), n, off = 0, at = null;
    while ((n = tw.nextNode())) {
      var v = n.nodeValue, out = '';
      for (var i = 0; i < v.length; i++) {
        var c = v[i];
        out += (c === ' ' || c === '\u00A0') ? (off + i === br ? ' ' : '\u00A0') : c;
      }
      if (br != null && at == null && br > off && br < off + v.length && !/\s/.test(v[br - off])) {
        at = { node: n, k: br - off };
      }
      n.nodeValue = out;
      off += v.length;
    }
    if (at) {
      var rest = at.node.splitText(at.k), w = document.createElement('wbr');
      w.className = 'sa-br';
      rest.parentNode.insertBefore(w, rest);
    }
  }

  function render() {
    document.querySelectorAll('.tt-table td.it .f-sep').forEach(function (el) { el.remove(); });
    document.querySelectorAll('.tt-table td.it .w').forEach(function (span) {
      if (span.dataset.deva == null) {
        var c = span.cloneNode(true);
        c.querySelectorAll('.f-sep, .m-sep').forEach(function (el) { el.remove(); });
        span.dataset.deva = c.textContent;
      }
      span.textContent = script === 'bn' ? toBn(span.dataset.deva) : span.dataset.deva;
    });
    document.querySelectorAll('.tt-table tr[data-meter] td.it').forEach(padaWrap);
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
