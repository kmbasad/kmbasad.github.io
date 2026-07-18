/**
 * md-loader.js — Markdown-to-translation-table loader
 *
 * The translations (Hafez's Divan, Dante's Inferno, Ovid's Metamorphoses)
 * are authored as plain Markdown and rendered into a 3-column parallel
 * table:  Bangla | original language | line number (small).
 *
 * Reads window.TRANS_CONFIG, fetches the .md, parses it, builds the DOM,
 * then calls window.TranslationTable.init() so translation-table.js can
 * wire up the hover cross-highlighting.
 *
 *   window.TRANS_CONFIG = { src: 'inferno-01.md', dict: 'inferno-01-words.md' };
 *
 * The optional `dict` is a Markdown word-list (`bangla :: original` per line)
 * that drives the hover cross-highlighting (built into window.TT_DICT).
 *
 * Markdown shape
 * ──────────────
 *   ---
 *   title: Inferno · Canto I
 *   type:  tercet | ghazal     # tercet = one row per line; ghazal = misras paired
 *   lang:  it | la | fa        # source-column class + script styling
 *   ---
 *
 *   [N] bangla :: original     # [N] (optional) = line/ghazal number, on stanza starts
 *   bangla :: original
 *                              # a blank line = stanza break (tercet / ghazal)
 *
 * Conventions
 *   • Each verse line is one Markdown line: `bangla :: original`.
 *   • An optional `[N]` prefix sets the number shown in the last column.
 *   • Blank line separates stanzas (tercets, or whole ghazals).
 *   • `## heading :: gloss` renders a section-heading row.
 */
(async function () {
  'use strict';

  var cfg = window.TRANS_CONFIG;
  if (!cfg || !cfg.src) {
    console.warn('md-loader: window.TRANS_CONFIG missing or incomplete.');
    return;
  }

  var DELIM = '::';
  var LANG_LABEL = { it: 'Italian', la: 'Latin', fa: 'Persian', en: 'English' };
  // Latin-script sources share the Italian column styling (Cormorant italic);
  // map the frontmatter lang → the CSS column class actually rendered.
  var COL_CLASS = { it: 'it', la: 'it', fa: 'fa', en: 'en' };

  // Normalise a word the same way translation-table.js does, so dictionary
  // keys line up with the tokens it looks up at hover time.
  function normWord(w) {
    return String(w).trim()
      .replace(/[^\p{L}\p{M}\p{N}']/gu, '')
      .replace(/[\u064B-\u065F\u0670]/gu, '')   // strip Arabic tashkeel
      .toLowerCase();
  }

  /* ── fetch ─────────────────────────────────────────────────────── */
  var text;
  try {
    var res = await fetch(cfg.src);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    text = await res.text();
  } catch (e) {
    console.error('md-loader: could not fetch', cfg.src, e);
    var errEl = document.querySelector('.tt-table tbody');
    if (errEl) errEl.innerHTML =
      '<tr><td style="color:#c00;padding:2rem">Could not load ' + cfg.src + '</td></tr>';
    return;
  }

  /* ── frontmatter + body split ──────────────────────────────────── */
  var raw = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  var meta = {}, bodyText = raw;
  var fm = raw.match(/^---\n([\s\S]*?)\n---\n?/);
  if (fm) {
    fm[1].split('\n').forEach(function (l) {
      var m = l.match(/^([A-Za-z_]+):\s*(.*)$/);
      if (m) meta[m[1]] = m[2].trim();
    });
    bodyText = raw.slice(fm[0].length);
  }

  var type = (cfg.type || meta.type || 'tercet').toLowerCase();
  var lang = (cfg.lang || meta.lang || 'it').toLowerCase();
  var colCls = COL_CLASS[lang] || lang;
  var srcLabel = meta.source_label || LANG_LABEL[lang] || lang;
  var noSource = !!(cfg.noSource);

  /* ── parse body lines into verse records ───────────────────────── */
  //   record = { num, bn, src, blank, heading }

  function unescPipe(s) { return s.replace(/\\\|/g, '|'); }

  function isDelimRow(s) {
    return s.indexOf('-') !== -1 && /^\|[-:\s|]+\|$/.test(s);
  }

  function nextNonEmpty(lines, i) {
    for (var j = i + 1; j < lines.length; j++) {
      if (lines[j].trim()) return lines[j].trim();
    }
    return '';
  }

  function splitTitle(s) {
    var hi = s.indexOf(DELIM);
    return {
      bn:  (hi === -1 ? s : s.slice(0, hi)).trim(),
      src: (hi === -1 ? '' : s.slice(hi + DELIM.length)).trim()
    };
  }

  function markerRecord(bn, src) {
    var m = bn.match(/^\*\(([^)]*)\)\*$/);
    return m ? { marker: true, bn: m[1].trim(), src: src } : null;
  }

  // Unified body parser. Handles, in one pass, both the GFM-table format
  // (`| bn | src | num |` with header + `|---|` delimiter rows) and the
  // legacy `bn :: src` line format, plus `# chapter title`, `## section
  // heading`, prosody markers `*(metre)*`, and blank-line stanza breaks.
  // Header rows (a `|…|` row immediately followed by a delimiter row) and
  // the delimiter rows themselves are skipped — they exist only so the .md
  // previews as a real table.
  function parseBody(lines) {
    var out = [];
    for (var i = 0; i < lines.length; i++) {
      var s = lines[i].trim();
      if (!s) { out.push({ blank: true }); continue; }

      // # chapter title (single hash)
      if (s.indexOf('# ') === 0) {
        var t = splitTitle(s.slice(2));
        out.push({ title: true, bn: t.bn, src: t.src });
        continue;
      }
      // ## section heading
      if (s.indexOf('## ') === 0) {
        var h = splitTitle(s.slice(3));
        out.push({ heading: true, bn: h.bn, src: h.src });
        continue;
      }

      // Pipe-table row
      if (s.charAt(0) === '|') {
        if (isDelimRow(s)) continue;                       // |---| delimiter
        if (isDelimRow(nextNonEmpty(lines, i))) continue;  // header row
        var cells = s.slice(1, -1).split('|').map(function (c) { return unescPipe(c.trim()); });
        if (cells.every(function (c) { return !c; })) { out.push({ blank: true }); continue; }
        var c0 = cells[0] || '';
        var bn, src, num;
        if (noSource) { bn = c0; src = ''; num = cells[1] || ''; }
        else          { bn = c0; src = cells[1] || ''; num = cells[2] || ''; }
        var mk = markerRecord(bn, src);
        out.push(mk || { num: num, bn: bn, src: src });
        continue;
      }

      // Legacy `[N] bn :: src` line
      var marker = markerRecord(s.replace(/\s*::.*$/, '').trim(),
                                (s.indexOf(DELIM) !== -1 ? s.slice(s.indexOf(DELIM) + DELIM.length).trim() : ''));
      if (marker) { out.push(marker); continue; }
      var ln = s, num2 = '';
      var nm = ln.match(/^\[\s*([^\]]+?)\s*\]\s*/);
      if (nm) { num2 = nm[1].trim(); ln = ln.slice(nm[0].length); }
      var di = ln.indexOf(DELIM);
      out.push({
        num: num2,
        bn:  (di === -1 ? ln : ln.slice(0, di)).trim(),
        src: (di === -1 ? '' : ln.slice(di + DELIM.length)).trim()
      });
    }
    return out;
  }

  function isTableBody(lines) {
    for (var i = 0; i < lines.length; i++) {
      var s = lines[i].trim();
      if (s) return s.charAt(0) === '|';
    }
    return false;
  }

  var bodyLines = bodyText.split('\n');
  var records = parseBody(bodyLines);

  /* ── optional word-alignment dictionary (drives hover highlights) ─ */
  if (cfg.dict) await loadDict(cfg.dict, colCls);

  /* ── render ────────────────────────────────────────────────────── */
  if (type === 'ghazal') buildGhazal(records, colCls);
  else buildTercet(records, colCls);

  if (window.TranslationTable && typeof window.TranslationTable.init === 'function') {
    window.TranslationTable.init();
  }

  /* ── word-list dictionary → window.TT_DICT ──────────────────────────
   * The .md holds one `bangla :: original` pair per line. We normalise both
   * words (matching translation-table.js) and assign each pair a shared group
   * key, so hovering a Bangla word lights its source counterpart and back. */
  async function loadDict(src, srcCls) {
    try {
      var r = await fetch(src);
      if (!r.ok) throw new Error('HTTP ' + r.status);
      var t = (await r.text()).replace(/\r\n/g, '\n').replace(/\r/g, '\n');
      var dm = t.match(/^---\n[\s\S]*?\n---\n?/);
      if (dm) t = t.slice(dm[0].length);

      var groups = { bn: {} };
      groups[srcCls] = {};
      var counter = 0;
      var dlines = t.split('\n');
      var dictTable = isTableBody(dlines);
      dlines.forEach(function (line) {
        var s = line.trim();
        if (!s) return;
        var bnRaw, swRaw;
        if (dictTable) {
          if (s.charAt(0) !== '|') return;
          // Skip a (legacy) GFM separator row if one is still present.
          if (s.indexOf('-') !== -1 && /^\|[-:\s|]+\|$/.test(s)) return;
          var cells = s.slice(1, -1).split('|').map(function (c) { return unescPipe(c.trim()); });
          bnRaw = cells[0] || ''; swRaw = cells[1] || '';
        } else {
          var di = s.indexOf(DELIM);
          if (di === -1) return;
          bnRaw = s.slice(0, di); swRaw = s.slice(di + DELIM.length);
        }
        var bn = normWord(bnRaw), sw = normWord(swRaw);
        if (!bn || !sw) return;
        var g = groups.bn[bn] || groups[srcCls][sw] || ('DICT_' + (++counter));
        groups.bn[bn] = g;
        groups[srcCls][sw] = g;
      });
      window.TT_DICT = groups;
    } catch (e) {
      console.warn('md-loader: could not load dictionary', src, e);
    }
  }

  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function row(cls, bn, src, lnum, langCls, attrs) {
    return '<tr' + (cls ? ' class="' + cls + '"' : '') + (attrs || '') + '>' +
      '<td class="bn"' + lineAttr(lnum) + '>' + bn + '</td>' +
      (noSource ? '' : '<td class="' + langCls + '"' + lineAttr(lnum) + '>' + src + '</td>') +
      '<td class="ln-col"' + lineAttr(lnum) + '>' + (lnum || '') + '</td>' +
    '</tr>';
  }

  function lineAttr(lnum) {
    return lnum ? ' data-line="' + esc(String(lnum)) + '"' : '';
  }

  /* ── TERCET: one row per line; blank = tercet break ─────────────── */
  function buildTercet(records, langCls) {
    var tbody = document.querySelector('.tt-table tbody');
    if (!tbody) return;
    var html = '', nextStart = true, tercet = 0, sectionIdx = 0;

    var nCols = noSource ? 2 : 3;

    for (var i = 0; i < records.length; i++) {
      var r = records[i];
      if (r.blank) { nextStart = true; continue; }

      if (r.title) {
        html += '<tr class="tt-title"><td class="bn" colspan="' + nCols + '">' +
          esc(r.bn) + '</td></tr>';
        nextStart = false;
        continue;
      }

      if (r.heading) {
        var secId = 'sec-' + (++sectionIdx);
        html += '<tr class="tt-section" id="' + secId + '" data-toc="' + esc(r.bn) + '">' +
          '<td class="bn">' + esc(r.bn) + '</td>' +
          (noSource ? '' : '<td class="' + langCls + '">' + esc(r.src) + '</td>') +
          '<td class="ln-col"></td></tr>';
        nextStart = false;
        continue;
      }

      if (r.marker) {
        html += '<tr class="tt-marker">' +
          '<td class="bn">' + esc(r.bn) + '</td>' +
          (noSource ? '' : '<td class="' + langCls + '">' + esc(r.src) + '</td>') +
          '<td class="ln-col"></td></tr>';
        nextStart = false;
        continue;
      }

      var cls = '', attrs = '';
      if (nextStart) {
        tercet++;
        cls = 'tercet-start';
        attrs = ' data-tercet="' + tercet + '"';
        nextStart = false;
      } else {
        attrs = ' data-tercet="' + tercet + '"';
      }
      html += row(cls, esc(r.bn), esc(r.src), r.num, langCls, attrs);
    }
    tbody.innerHTML = html;
  }

  /* ── GHAZAL: each stanza = one ghazal; misras paired into rows ──── */
  function buildGhazal(records, langCls) {
    var tbody = document.querySelector('.tt-table tbody');
    if (!tbody) return;

    var groupSize = (cfg.tocGroupSize && cfg.tocGroupSize > 0) ? cfg.tocGroupSize : 0;

    function toBn(n) {
      return String(n).replace(/[0-9]/g, function (d) { return '০১২৩৪৫৬৭৮৯'[+d]; });
    }

    // group into ghazals (split on blank lines)
    var ghazals = [], cur = null;
    for (var i = 0; i < records.length; i++) {
      var r = records[i];
      if (r.blank) { if (cur) { ghazals.push(cur); cur = null; } continue; }
      if (r.heading || r.title || r.marker) continue;
      if (!cur) cur = { num: r.num || String(ghazals.length + 1), rows: [] };
      cur.rows.push(r);
    }
    if (cur) ghazals.push(cur);

    var totalGhazals = ghazals.length;
    var html = '';
    for (var gi = 0; gi < ghazals.length; gi++) {
      var g = ghazals[gi], gnum = g.num;
      var gnumInt = parseInt(gnum, 10);

      // TOC data-toc on the first row of every group-start ghazal
      var tocAttr = '';
      if (groupSize && !isNaN(gnumInt) && ((gnumInt - 1) % groupSize === 0)) {
        var groupEnd = Math.min(gnumInt + groupSize - 1, totalGhazals);
        var label = gnumInt === groupEnd
          ? 'গজল ' + toBn(gnumInt)
          : 'গজল ' + toBn(gnumInt) + '–' + toBn(groupEnd);
        tocAttr = ' data-toc="' + label + '"';
      }

      for (var ri = 0; ri < g.rows.length; ri += 2) {
        var a = g.rows[ri], b = g.rows[ri + 1];
        var bn  = b ? esc(a.bn) + '<br>' + esc(b.bn)   : esc(a.bn);
        var src = b ? esc(a.src) + '<br>' + esc(b.src) : esc(a.src);
        var first = (ri === 0);
        var cls = first ? 'ghazal-start' : '';
        var attrs = ' data-ghazal="' + esc(gnum) + '"' +
                    (first ? ' id="g' + esc(gnum) + '"' + tocAttr : '');
        var lbl = first ? gnum : '';
        html += '<tr' + (cls ? ' class="' + cls + '"' : '') + attrs + '>' +
          '<td class="bn">' + bn + '</td>' +
          '<td class="' + langCls + '">' + src + '</td>' +
          '<td class="ln-col">' + lbl + '</td></tr>';
      }
    }
    tbody.innerHTML = html;
  }

  // Notify site.js that dynamic content is ready (tick TOC can now build)
  document.dispatchEvent(new CustomEvent('md-loader-done'));

})();
