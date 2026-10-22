/**
 * translation-table.js — Generic cross-highlighting for translation tables
 *
 * Supports any combination of 2+ language columns (e.g. bn+it+en, bn+fa+tl).
 * Tables must have class="tt-table".  Each column cell needs a language class
 * (bn, it, en, fa, tl, …).  Line-number columns use class="ln-col" and are
 * ignored.
 *
 * Words can be plain text (auto-wrapped at runtime) or pre-wrapped as
 *   <span class="w" data-w="KEY">.
 *
 * The script:
 *   1. Auto-detects language columns from the DOM
 *   2. Tokenises text (respects <br> segments)
 *   3. Aligns tokens across columns via DP edit-distance
 *   4. Wraps tokens with shared group-keys → hover any word to see its
 *      correspondence in every other column
 */
(function () {
  "use strict";

  function init() {

  /* ═══════════════════════════════════════════════════════════════════
   * Tokenisation
   * ═══════════════════════════════════════════════════════════════════ */

  /** Extract tokens split by whitespace, grouped by <br> segments. */
  function tokensBySegment(td) {
    var segs = [[]], si = 0;
    (function walk(node) {
      if (node.nodeType === Node.TEXT_NODE) {
        var t = node.nodeValue || "";
        if (t && /\S/u.test(t)) segs[si].push.apply(segs[si], t.split(/\s+/u).filter(Boolean));
        return;
      }
      if (node.nodeType !== Node.ELEMENT_NODE) return;
      var tag = node.tagName;
      if (tag === "BR") { si++; segs[si] = segs[si] || []; return; }
      if (tag === "SCRIPT" || tag === "STYLE") return;
      for (var c = Array.from(node.childNodes), i = 0; i < c.length; i++) walk(c[i]);
    })(td);
    return segs;
  }

  /* ═══════════════════════════════════════════════════════════════════
   * Punctuation-anchored proportional alignment
   *
   * Cross-script pairs (Bengali↔English, Bengali↔Italian, etc.) have
   * no character-level similarity, so DP edit-distance produces mostly
   * random matches.  Instead we:
   *   1. Find mid-line punctuation (commas, semicolons, danda) in both
   *      token lists — these are reliable structural anchors that
   *      correspond across any translation.
   *   2. Match anchor positions (1:1 if same count, proportionally if
   *      different).  This splits both lists into corresponding segments.
   *   3. Within each segment, assign group IDs proportionally by
   *      position — if segment A has 3 tokens and B has 5, the mapping
   *      gives groups [0,1,2] ↔ [0,0,1,1,2].
   * ═══════════════════════════════════════════════════════════════════ */

  var ANCHOR_RE = /[,;\u0964\u060C\u061B]$/u;   // mid-line punctuation

  function alignPair(a, b) {
    var n = a.length, m = b.length;
    if (!n || !m) return { ai: new Array(n).fill(0), bi: new Array(m).fill(0) };

    // Step 1 — find mid-line punctuation anchors (skip last token)
    var pa = [], pb = [];
    for (var i = 0; i < n - 1; i++) if (ANCHOR_RE.test(a[i])) pa.push(i);
    for (var j = 0; j < m - 1; j++) if (ANCHOR_RE.test(b[j])) pb.push(j);

    // Step 2 — match anchors to build segment boundaries
    var cutsA = [0], cutsB = [0];
    var k = Math.min(pa.length, pb.length);
    for (var p = 0; p < k; p++) {
      var ia = pa.length === k ? pa[p]
             : pa[Math.round(p * (pa.length - 1) / Math.max(k - 1, 1))];
      var ib = pb.length === k ? pb[p]
             : pb[Math.round(p * (pb.length - 1) / Math.max(k - 1, 1))];
      cutsA.push(ia + 1);
      cutsB.push(ib + 1);
    }
    cutsA.push(n);
    cutsB.push(m);

    // Step 3 — proportional group assignment within each segment
    var ai = new Array(n), bi = new Array(m), g = 0;
    for (var s = 0; s < cutsA.length - 1; s++) {
      var la = cutsA[s + 1] - cutsA[s];
      var lb = cutsB[s + 1] - cutsB[s];
      if (!la && !lb) continue;
      var G = Math.max(1, Math.min(la, lb));
      for (var i = 0; i < la; i++)
        ai[cutsA[s] + i] = g + (la <= 1 ? 0 : Math.min(G - 1, Math.floor(i * G / la)));
      for (var j = 0; j < lb; j++)
        bi[cutsB[s] + j] = g + (lb <= 1 ? 0 : Math.min(G - 1, Math.floor(j * G / lb)));
      g += G;
    }
    return { ai: ai, bi: bi };
  }

  /* ═══════════════════════════════════════════════════════════════════
   * Span wrapping — inject <span class="w" data-w="KEY"> around tokens
   * ═══════════════════════════════════════════════════════════════════ */

  function wrapTd(td, ln, gids, colName, dict) {
    if (td.querySelector(".w")) return;          // already wrapped
    var seg = 0, tok = 0;
    // dict: the word→group map for this cell — a line-scoped one when the
    // row carries data-key and the page's word-list has that line, else
    // the page-wide TT_DICT, else none (positional groups).
    dict = dict || window.TT_DICT;
    var seen = {};   // occurrences so far in this cell, for `word#2` pairs
    (function walk(node) {
      if (node.nodeType === Node.TEXT_NODE) {
        var t = node.nodeValue || "";
        if (!t || !/\S/u.test(t)) return;
        // a dash parts two words even with no space round it (করি—কারণ)
        var parts = t.split(/(\s+|[\u2014\u2013])/u), frag = document.createDocumentFragment();
        for (var p = 0; p < parts.length; p++) {
          if (!parts[p]) continue;
          if (/^(?:\s+|[\u2014\u2013])$/u.test(parts[p])) { frag.appendChild(document.createTextNode(parts[p])); continue; }
          var g = (gids[seg] || [])[tok];
          var span = document.createElement("span");
          span.className = "w";
          
          if (dict && dict[colName]) {
            // Normalise: NFC (Bengali nukta forms), strip punctuation,
            // Arabic tashkeel, lowercase \u2014 mirror md-loader's normWord
            var wRaw = parts[p];
            var wStripped = wRaw.normalize('NFC')
                               .replace(/[^\p{L}\p{M}\p{N}'\-]/gu, '')
                               .replace(/[\u064B-\u065F\u0670]/gu, '')
                               .toLowerCase();
            var wNoHyphens = wStripped.replace(/-/g, '');
            var dictCol = dict[colName];
            var nth = seen[wNoHyphens] = (seen[wNoHyphens] || 0) + 1;
            var matched = dictCol[wNoHyphens + '#' + nth] || dictCol[wNoHyphens];

            // Try without Arabic definite article ال
            if (!matched) {
              var noAl = wNoHyphens.replace(/^\u0627\u0644/, '');
              if (noAl !== wNoHyphens) matched = dictCol[noAl];
            }

            // Try each part of a hyphenated token (e.g. s-sāqī → sāqī)
            if (!matched && wStripped.indexOf('-') !== -1) {
              var hparts = wStripped.split('-');
              for (var hi = 0; hi < hparts.length && !matched; hi++) {
                if (hparts[hi]) matched = dictCol[hparts[hi]];
              }
            }

            span.dataset.w = matched || ("U_" + ln + "_" + seg + "_" + tok + "_" + colName);
          } else if (dict) {
            // Column not in dictionary — unique ID
            span.dataset.w = "U_" + ln + "_" + seg + "_" + tok + "_" + colName;
          } else {
            span.dataset.w = "L" + ln + "_S" + seg + "_G" + (g != null ? g : 0);
          }
          
          span.textContent = parts[p];
          frag.appendChild(span);
          tok++;
        }
        node.parentNode.replaceChild(frag, node);
        return;
      }
      if (node.nodeType !== Node.ELEMENT_NODE) return;
      var tag = node.tagName;
      if (tag === "BR") { seg++; tok = 0; return; }
      if (tag === "SCRIPT" || tag === "STYLE") return;
      for (var ch = Array.from(node.childNodes), ci = 0; ci < ch.length; ci++) walk(ch[ci]);
    })(td);
  }

  /* ═══════════════════════════════════════════════════════════════════
   * Phase 1 — Detect columns, align, wrap
   * ═══════════════════════════════════════════════════════════════════ */

  var tables = Array.from(document.querySelectorAll(".tt-table"));
  if (!tables.length) return;

  var SKIP = { "ln-col": 1 };
  var lineNum = 1;                               // global across all tables

  for (var ti = 0; ti < tables.length; ti++) {
    var table = tables[ti];
    // The first *verse* row sets the column shape — a sonnet head (one
    // spanning cell) must not be read as a one-column table.
    var firstRow = Array.from(table.querySelectorAll("tbody tr")).find(function (r) {
      return r.querySelectorAll("td").length >= 2;
    });
    if (!firstRow) continue;

    // Detect language columns (DOM order)
    var cols = [];
    var tds0 = firstRow.querySelectorAll("td");
    for (var ci = 0; ci < tds0.length; ci++) {
      var cls = null;
      for (var xi = 0; xi < tds0[ci].classList.length; xi++) {
        var c = tds0[ci].classList[xi];
        if (!SKIP[c]) { cls = c; break; }
      }
      if (cls && cols.indexOf(cls) === -1) cols.push(cls);
    }
    if (cols.length < 2 || cols.indexOf("bn") === -1) continue;

    var otherCols = cols.filter(function (c) { return c !== "bn"; });
    var anchorCol = otherCols[otherCols.length - 1];   // align bn ↔ anchor
    var middleCols = otherCols.slice(0, -1);            // map proportionally

    var trs = table.querySelectorAll("tbody tr");
    for (var ri = 0; ri < trs.length; ri++) {
      var tr = trs[ri];
      // Collect tds for each column
      var rowTds = {};
      for (var ci = 0; ci < cols.length; ci++) {
        rowTds[cols[ci]] = tr.querySelector("td." + cols[ci]);
      }
      if (!rowTds["bn"] || !rowTds[anchorCol]) continue;

      // Assign data-line
      for (var ci = 0; ci < cols.length; ci++) {
        if (rowTds[cols[ci]]) rowTds[cols[ci]].dataset.line = String(lineNum);
      }

      // Tokenise all columns
      var segToks = {};
      for (var ci = 0; ci < cols.length; ci++) {
        segToks[cols[ci]] = rowTds[cols[ci]] ? tokensBySegment(rowTds[cols[ci]]) : [[]];
      }
      var nSeg = 0;
      for (var ci = 0; ci < cols.length; ci++) nSeg = Math.max(nSeg, segToks[cols[ci]].length);

      var gids = {};
      for (var ci = 0; ci < cols.length; ci++) gids[cols[ci]] = new Array(nSeg);

      for (var s = 0; s < nSeg; s++) {
        var bnToks = segToks["bn"][s] || [];
        var anchorToks = segToks[anchorCol][s] || [];

        if (!bnToks.length || !anchorToks.length) {
          // fallback: proportional
          var posCount = Math.max(bnToks.length, anchorToks.length, 1);
          gids["bn"][s] = bnToks.map(function (_, i) { return Math.floor(i * posCount / Math.max(1, bnToks.length)); });
          gids[anchorCol][s] = anchorToks.map(function (_, j) { return Math.floor(j * posCount / Math.max(1, anchorToks.length)); });
          for (var mi = 0; mi < middleCols.length; mi++) {
            var mToks = segToks[middleCols[mi]][s] || [];
            gids[middleCols[mi]][s] = mToks.map(function (_, k) { return Math.floor(k * posCount / Math.max(1, mToks.length)); });
          }
          continue;
        }

        // DP align bn ↔ anchor
        var aligned = alignPair(bnToks, anchorToks);
        gids["bn"][s] = aligned.ai;
        gids[anchorCol][s] = aligned.bi;

        // Middle columns → proportional mapping to anchor's group IDs
        for (var mi = 0; mi < middleCols.length; mi++) {
          var mc = middleCols[mi];
          var mToks = segToks[mc][s] || [];
          var mLen = mToks.length, aLen = aligned.bi.length;
          if (!mLen) { gids[mc][s] = []; continue; }
          if (!aLen) { gids[mc][s] = mToks.map(function () { return 0; }); continue; }
          gids[mc][s] = Array.from({ length: mLen }, function (_, fi) {
            var tj = Math.min(aLen - 1, Math.floor(fi * aLen / mLen));
            return aligned.bi[tj] != null ? aligned.bi[tj] : 0;
          });
        }
      }

      // Wrap each column's tokens with shared keys — line-scoped alignment
      // when the row has one (sonnets), page-wide otherwise
      var rowDict = (window.TT_DICT_LINES && tr.dataset.key) ? window.TT_DICT_LINES[tr.dataset.key] : null;
      for (var ci = 0; ci < cols.length; ci++) {
        if (rowTds[cols[ci]]) wrapTd(rowTds[cols[ci]], lineNum, gids[cols[ci]], cols[ci], rowDict);
      }
      lineNum++;
    }
  }

  /* ═══════════════════════════════════════════════════════════════════
   * Phase 2 — Highlighting (hover / click / pin)
   * ═══════════════════════════════════════════════════════════════════ */

  var CLS_SRC = "source-word", CLS_WORD = "word-highlight";

  // Cache spans by key
  var byKey = {};
  document.querySelectorAll(".tt-table .w").forEach(function (s) {
    var k = s.dataset.w; if (!k) return;
    (byKey[k] = byKey[k] || []).push(s);
  });

  function clearAll() {
    document.querySelectorAll("." + CLS_SRC + ",." + CLS_WORD)
      .forEach(function (s) { s.classList.remove(CLS_SRC, CLS_WORD); });
  }

  // Highlight only the hovered word and its cross-column matches —
  // not the rest of the line.
  function highlight(src) {
    clearAll();
    src.classList.add(CLS_SRC);
    var key = src.dataset.w;
    (byKey[key] || []).forEach(function (s) { if (s !== src) s.classList.add(CLS_WORD); });
  }

  /* ── Event delegation ─────────────────────────────────────────────── */

  var pinned = false, last = null;

  // The mapping is the Bangla's: a Bangla word lights the words it renders.
  // An original is hovered for its literal English instead (crib.js), unless
  // it is English itself (the Sonnets), which maps both ways like the Bangla.
  function mapWord(t) {
    var span = t.closest(".w");
    return span && span.closest("td.bn, td.en") ? span : null;
  }

  for (var ti = 0; ti < tables.length; ti++) {
    tables[ti].addEventListener("mouseover", function (e) {
      if (pinned || window.innerWidth <= 760) return;
      var span = mapWord(e.target);
      if (span) { if (last !== span) { last = span; highlight(span); } return; }
      if (last) { last = null; clearAll(); }
    });
    tables[ti].addEventListener("mouseleave", function () {
      if (!pinned) { last = null; clearAll(); }
    });
    tables[ti].addEventListener("click", function (e) {
      // on a phone the other columns are hidden: nothing to cross-highlight
      if (window.innerWidth <= 760) return;
      var span = mapWord(e.target);
      if (!span) { pinned = false; last = null; clearAll(); return; }
      if (pinned && span.classList.contains(CLS_SRC)) { pinned = false; last = null; clearAll(); return; }
      highlight(span);
      pinned = true; last = span;
    });
  }

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") { pinned = false; last = null; clearAll(); }
  });

  } // end init()

  window.TranslationTable = { init: init };

  /* ═══════════════════════════════════════════════════════════════════
   * Verse fit — phones only
   *
   * A verse line never breaks, and the whole poem is set in one size: the
   * largest at which the page's longest line still fits the screen, up to
   * a comfortable ceiling (FIT_MAX). No line is set smaller on its own.
   * Measured once at the ceiling (a Range gives each line's natural width,
   * clipped or not), scaled, then verified, since shaping is not perfectly
   * linear in the size. Two guards: a row many times wider than the page's
   * verse is prose that strayed into the table (a notice, a colophon) and
   * simply wraps; and below FIT_MIN no text is comfortable to read, so a
   * line that would need less turns over with a hanging indent, as a
   * printed book does, and the rest of the poem is sized without it. Runs after md-loader has built and word-wrapped the table, again
   * when the webfonts land (they change every width), and when the width
   * changes (not on a phone's toolbar sliding, which only changes height).
   * ═══════════════════════════════════════════════════════════════════ */
  var fitRaf = null, fitWidth = 0;

  function isVerseRow(tr) {
    return !/(?:^|\s)(?:tt-section|tt-title|tt-marker)(?:\s|$)/.test(tr.className);
  }

  /* Beside its original, on a tablet or a narrow desktop: if the parallel
   * table is wider than its column, shrink the page's verse (--par-fit)
   * just enough that it fits, floored at 16px; past that only the original may wrap, the Bangla never. */
  function fitParallel() {
    var doc = document.documentElement;
    doc.style.removeProperty("--par-fit");
    doc.classList.remove("tt-src-wrap");
    var table = document.querySelector(".tt-table");
    if (!table || !table.querySelector("td.it, td.en, td.fa")) return;
    // the column it has (the reading room's text pane, a chapter's page),
    // not its own fit-content wrapper, which only grows with it
    var box = table.closest(".book-text-panel, .pangea-page, .shell-main") || table.parentElement;
    var cs = getComputedStyle(box);
    var have = box.clientWidth - (parseFloat(cs.paddingLeft) || 0) - (parseFloat(cs.paddingRight) || 0);
    var need = table.scrollWidth;
    if (!have || need <= have) return;
    var probe = table.querySelector("tr td.bn");
    var fs = parseFloat(getComputedStyle(probe).fontSize) || 18;
    for (var pass = 0; pass < 4 && need > have; pass++) {
      fs = Math.max(16, Math.floor(fs * (have / need) * 0.985 * 10) / 10);
      doc.style.setProperty("--par-fit", fs + "px");
      if (fs <= 16) break;
      need = table.scrollWidth;
    }
    /* the Bangla is what is read: it stops shrinking at 16px, and if the
       table still does not fit, the original (the reference) may wrap */
    if (table.scrollWidth > have) doc.classList.add("tt-src-wrap");
  }

  var FIT_MAX = 20, FIT_MIN = 13, PROSE_X = 2;

  function fitVerse() {
    var doc = document.documentElement;
    doc.style.removeProperty("--verse-fs");
    doc.style.removeProperty("--par-fit");
    var all = document.querySelectorAll(".tt-table td.bn");
    for (var c = 0; c < all.length; c++) all[c].classList.remove("tt-turn", "tt-prose-line");
    fitWidth = window.innerWidth;
    if (window.innerWidth > 760) return fitParallel();

    var cells = [];
    for (var i = 0; i < all.length; i++) {
      if (isVerseRow(all[i].parentNode) && /\S/.test(all[i].textContent)) cells.push(all[i]);
    }
    if (!cells.length) return;
    doc.style.setProperty("--verse-fs", FIT_MAX + "px");

    /* each line's width over the room it has (its cell's content box; a
       couplet's indent narrows it), read in one pass */
    var range = document.createRange(), padBy = {};
    function have(td) {
      var k = td.parentNode.className;
      if (padBy[k] == null) {
        var cs = getComputedStyle(td);
        padBy[k] = (parseFloat(cs.paddingLeft) || 0) + (parseFloat(cs.paddingRight) || 0);
      }
      return td.clientWidth - padBy[k];
    }
    function over(td) {
      range.selectNodeContents(td);
      return range.getBoundingClientRect().width / Math.max(1, have(td));
    }
    var x = cells.map(over);

    /* prose that strayed in: far wider than the page's own long lines */
    var sorted = x.slice().sort(function (a, b) { return a - b; });
    var p99 = sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.99))];
    /* a line that would need less than the floor turns over as it is
       (hanging indent), and does not drag the poem down with it */
    var verse = [], vx = [], worst = 0, limit = FIT_MAX / FIT_MIN;
    cells.forEach(function (td, k) {
      if (x[k] > p99 * PROSE_X) { td.classList.add("tt-prose-line"); return; }
      if (x[k] > limit) { td.classList.add("tt-turn"); return; }
      verse.push(td);
      vx.push(x[k]);
      if (x[k] > worst) worst = x[k];
    });
    if (!verse.length) return;

    var fs = FIT_MAX;
    if (worst > 1) fs = Math.max(FIT_MIN, Math.floor(FIT_MAX / worst * 0.99 * 10) / 10);
    doc.style.setProperty("--verse-fs", fs + "px");

    /* verify on the longest lines; step down by what is still missing */
    var widest = verse.map(function (td, k) { return k; })
      .sort(function (a, b) { return vx[b] - vx[a]; })
      .slice(0, 12).map(function (k) { return verse[k]; });
    for (var pass = 0; pass < 3 && fs > FIT_MIN; pass++) {
      var w = Math.max.apply(null, widest.map(over));
      if (w <= 1) break;
      fs = Math.max(FIT_MIN, Math.floor(fs / w * 0.99 * 10) / 10);
      doc.style.setProperty("--verse-fs", fs + "px");
    }

    /* at the floor, a line still too long turns over (hanging indent) */
    if (fs <= FIT_MIN) {
      verse.forEach(function (td) { if (over(td) > 1) td.classList.add("tt-turn"); });
    }
  }

  function queueFit() {
    if (fitRaf) return;
    fitRaf = requestAnimationFrame(function () { fitRaf = null; fitVerse(); });
  }

  document.addEventListener("md-loader-done", queueFit);
  window.addEventListener("resize", function () {
    if (window.innerWidth !== fitWidth) queueFit();
  }, { passive: true });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(queueFit);

})();
