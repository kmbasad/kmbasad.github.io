/**
 * tsv-loader.js — Generic TSV-to-translation-table loader
 *
 * Reads window.TSV_CONFIG, fetches the TSV, builds the DOM, then
 * calls window.TranslationTable.init() so translation-table.js
 * can wrap tokens and wire up highlighting.
 *
 * Config shape (set before this script loads):
 *
 *   window.TSV_CONFIG = {
 *     src      : 'filename.tsv',   // relative to the HTML page
 *     type     : 'ghazal'          // paired rows, blank = ghazal separator
 *              | 'tercet',         // one row per line, blank = tercet separator
 *     sections : {                 // (ghazal only) section headings
 *       <firstGhazalNum>: { id: 'anchor-id', label: 'Ghazals …' },
 *       …
 *     }
 *   };
 *
 * TSV conventions
 * ───────────────
 * GHAZAL  (prathama-style):
 *   Row 0 : header (skipped)
 *   Col 0 : Bangla  (one misra / half-verse per row)
 *   Col 1 : Ghazal number (only on first row of each ghazal)
 *   Col 2 : Persian
 *   Col 3 : Transliteration
 *   Blank row (all empty) = ghazal boundary
 *   Rows come in pairs — each pair → one <tr> joined with <br>
 *
 * TERCET  (inferno-style):
 *   No header row
 *   Col 0 : Bangla
 *   Col 1 : Line number
 *   Col 2 : Italian
 *   Col 3 : English
 *   Blank row = tercet boundary; next content row gets class="tercet-start"
 */

(async function () {
  'use strict';

  var cfg = window.TSV_CONFIG;
  if (!cfg || !cfg.src || !cfg.type) {
    console.warn('tsv-loader: window.TSV_CONFIG missing or incomplete.');
    return;
  }

  /* ── fetch ─────────────────────────────────────────────────────── */
  var text;
  try {
    var res = await fetch(cfg.src);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    text = await res.text();

    if (cfg.dictSrc) {
      try {
        var dRes = await fetch(cfg.dictSrc);
        if (dRes.ok) {
          var dText = await dRes.text();
          var windowDictLines = dText.split('\n').map(function(l) { return l.replace(/\r$/, ''); });
          
          if (windowDictLines.length > 0) {
              var headers = windowDictLines[0].split('\t').map(function(h) {
                 h = h.trim().toLowerCase();
                 // Bangla
                 if (/^(bn|bangla|bengali)/.test(h)) return 'bn';
                 // Italian
                 if (/^(it|italian)/.test(h)) return 'it';
                 // Persian / Farsi
                 if (/^(fa|farsi|persian)/.test(h)) return 'fa';
                 // Transliteration
                 if (/transliterat/.test(h) || h === 'tl' || h === 'tl_word') return 'tl';
                 // English
                 if (/^(en|english)/.test(h)) return 'en';
                 // Fallback: strip common suffixes
                 return h.replace(/_word$/, '');
              });

              var langGroups = {};
              headers.forEach(function(h) { if (h) langGroups[h] = {}; });
              var groupCounter = 0;

              for (var i = 1; i < windowDictLines.length; i++) {
                  var parts = windowDictLines[i].split('\t');
                  var rowWords = [];
                  for (var j = 0; j < headers.length; j++) {
                      if (!headers[j] || !parts[j]) continue;
                      var cleanW = parts[j].trim()
                          .replace(/[^\p{L}\p{M}\p{N}']/gu, '')   // strip ZWNJ, hyphens, punct
                          .replace(/[\u064B-\u065F\u0670]/gu, '')  // strip Arabic tashkeel
                          .toLowerCase();
                      if (cleanW) rowWords.push({ lang: headers[j], word: cleanW });
                  }
                  
                  if (rowWords.length >= 2) {
                      var targetGroup = null;
                      for (var k = 0; k < rowWords.length; k++) {
                          var g = langGroups[rowWords[k].lang][rowWords[k].word];
                          if (g) {
                              if (!targetGroup) targetGroup = g;
                              else if (targetGroup !== g) {
                                  for (var lang in langGroups) {
                                      for (var w in langGroups[lang]) {
                                          if (langGroups[lang][w] === g) langGroups[lang][w] = targetGroup;
                                      }
                                  }
                              }
                          }
                      }
                      if (!targetGroup) targetGroup = 'DICT_' + (++groupCounter);
                      
                      for (var k = 0; k < rowWords.length; k++) {
                          langGroups[rowWords[k].lang][rowWords[k].word] = targetGroup;
                      }
                  }
              }
              window.TT_DICT = langGroups;
          }
        }
      } catch (e) {
        console.warn('tsv-loader: could not fetch dictionary', cfg.dictSrc, e);
      }
    }
  } catch (e) {
    console.error('tsv-loader: could not fetch', cfg.src, e);
    var errEl = document.querySelector('#ghazal-container, .tt-table tbody');
    if (errEl) errEl.innerHTML =
      '<p style="color:#c00;padding:2rem">Could not load ' + cfg.src + '</p>';
    return;
  }

  var lines = text.split('\n').map(function (l) { return l.replace(/\r$/, ''); });

  /* ── dispatch to the right builder ─────────────────────────────── */
  if (cfg.type === 'ghazal')  buildGhazal(lines, cfg);
  else if (cfg.type === 'tercet') buildTercet(lines);
  else console.warn('tsv-loader: unknown type', cfg.type);

  /* ── call translation-table init after DOM is ready ─────────────── */
  if (window.TranslationTable && typeof window.TranslationTable.init === 'function') {
    window.TranslationTable.init();
  }

  /* ══════════════════════════════════════════════════════════════════
   * GHAZAL builder  — single table, one <tr> per couplet
   * ══════════════════════════════════════════════════════════════════ */
  function buildGhazal(lines, cfg) {
    var tbody = document.querySelector('.tt-table tbody');
    if (!tbody) { console.warn('tsv-loader: .tt-table tbody not found'); return; }

    function toBn(n) {
      return String(n).replace(/\d/g, function (d) {
        return '০১২৩৪৫৬৭৮৯'[d];
      });
    }

    /* parse into ghazal objects ────────────────────────────────── */
    var ghazals = [], cur = null;

    for (var i = 1; i < lines.length; i++) {       // skip header row
      var cols = lines[i].split('\t');
      var bn   = (cols[0] || '').trim();
      var num  = parseInt(cols[1]) || null;
      var fa   = (cols[2] || '').trim();
      var tl   = (cols[3] || '').trim();
      var blank = !bn && !num && !fa && !tl;

      if (blank) {
        if (cur) { ghazals.push(cur); cur = null; }
        continue;
      }
      if (num) {
        if (cur) ghazals.push(cur);
        cur = { num: num, rows: [] };
      } else if (!cur) {
        cur = { num: ghazals.length + 1, rows: [] };
      }
      cur.rows.push([bn, fa, tl]);   // store in render order: bn, fa, tl
    }
    if (cur) ghazals.push(cur);

    /* render into single tbody ──────────────────────────────────── */
    var html = '';

    for (var gi = 0; gi < ghazals.length; gi++) {
      var ghazal = ghazals[gi];
      var gnum = ghazal.num;

      for (var ri = 0; ri < ghazal.rows.length; ri += 2) {
        var a = ghazal.rows[ri];
        var b = ghazal.rows[ri + 1] || ['', '', ''];
        var rBn = b[0] ? a[0] + '<br>' + b[0] : a[0];
        var rFa = b[1] ? a[1] + '<br>' + b[1] : a[1];
        var rTl = b[2] ? a[2] + '<br>' + b[2] : a[2];

        var isFirst = (ri === 0);
        var cls = isFirst ? ' class="ghazal-start"' : '';
        var id  = isFirst ? ' id="g' + gnum + '"'   : '';
        var lbl = isFirst ? toBn(gnum)               : '';

        html += '<tr' + cls + id + ' data-ghazal="' + gnum + '">';
        html += '<td class="bn">' + rBn + '</td>';
        html += '<td class="ln-col">' + lbl + '</td>';
        html += '<td class="fa">' + rFa + '</td>';
        html += '<td class="tl">' + rTl + '</td>';
        html += '</tr>';
      }
    }

    tbody.innerHTML = html;
  }

  /* ══════════════════════════════════════════════════════════════════
   * TERCET builder
   * ══════════════════════════════════════════════════════════════════ */
  function buildTercet(lines) {
    var tbody = document.querySelector('.tt-table tbody');
    if (!tbody) { console.warn('tsv-loader: .tt-table tbody not found'); return; }

    function toBn(n) {
      return String(n).replace(/\d/g, function (d) {
        return '০১২৩৪৫৬৭৮৯'[d];
      });
    }

    var tercetNum   = 0;
    var nextIsStart = true;
    var html = '';

    for (var i = 1; i < lines.length; i++) {       // skip header row
      var cols  = lines[i].split('\t');
      var bn    = (cols[0] || '').trim();
      var lnum  = (cols[1] || '').trim();
      var col1  = (cols[2] || '').trim();   // Italian
      var col2  = (cols[3] || '').trim();   // English
      var blank = !bn && !lnum && !col1 && !col2;

      if (blank) { nextIsStart = true; continue; }

      var isStart = nextIsStart;
      if (nextIsStart) {
        tercetNum++;
        nextIsStart = false;
        html += '<tr class="tercet-start" data-tercet="' + tercetNum + '">';
      } else {
        html += '<tr data-tercet="' + tercetNum + '">';
      }

      var lnDisplay = isStart && lnum ? toBn(lnum) : '';

      html += '<td class="bn"     data-line="' + lnum + '">' + bn        + '</td>';
      html += '<td class="ln-col" data-line="' + lnum + '">' + lnDisplay + '</td>';
      html += '<td class="it"     data-line="' + lnum + '">' + col1      + '</td>';
      html += '<td class="en"     data-line="' + lnum + '">' + col2      + '</td>';
      html += '</tr>';
    }

    tbody.innerHTML = html;
  }

})();
