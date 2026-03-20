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

  function wrapTd(td, ln, gids, colName) {
    if (td.querySelector(".w")) return;          // already wrapped
    var seg = 0, tok = 0;
    (function walk(node) {
      if (node.nodeType === Node.TEXT_NODE) {
        var t = node.nodeValue || "";
        if (!t || !/\S/u.test(t)) return;
        var parts = t.split(/(\s+)/u), frag = document.createDocumentFragment();
        for (var p = 0; p < parts.length; p++) {
          if (!parts[p]) continue;
          if (/^\s+$/u.test(parts[p])) { frag.appendChild(document.createTextNode(parts[p])); continue; }
          var g = (gids[seg] || [])[tok];
          var span = document.createElement("span");
          span.className = "w";
          
          if (window.TT_DICT && window.TT_DICT[colName]) {
            // Normalise: strip punctuation, Arabic tashkeel, lowercase
            var wRaw = parts[p];
            var wStripped = wRaw.replace(/[^\p{L}\p{M}\p{N}'\-]/gu, '')
                               .replace(/[\u064B-\u065F\u0670]/gu, '')
                               .toLowerCase();
            var wNoHyphens = wStripped.replace(/-/g, '');
            var dictCol = window.TT_DICT[colName];
            var matched = dictCol[wNoHyphens];

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
          } else if (window.TT_DICT) {
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
    var firstRow = table.querySelector("tbody tr");
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

      // Wrap each column's tokens with shared keys
      for (var ci = 0; ci < cols.length; ci++) {
        if (rowTds[cols[ci]]) wrapTd(rowTds[cols[ci]], lineNum, gids[cols[ci]], cols[ci]);
      }
      lineNum++;
    }
  }

  /* ═══════════════════════════════════════════════════════════════════
   * Phase 2 — Highlighting (hover / click / pin)
   * ═══════════════════════════════════════════════════════════════════ */

  var CLS_SRC = "source-word", CLS_WORD = "word-highlight", CLS_LINE = "line-highlight";

  // Cache spans by key and by line
  var byKey = {}, byLine = {};
  document.querySelectorAll(".tt-table .w").forEach(function (s) {
    var k = s.dataset.w; if (!k) return;
    (byKey[k] = byKey[k] || []).push(s);
    var ln = (s.closest("td") || {}).dataset;
    if (ln && ln.line) (byLine[ln.line] = byLine[ln.line] || []).push(s);
  });

  function clearAll() {
    document.querySelectorAll("." + CLS_SRC + ",." + CLS_WORD + ",." + CLS_LINE)
      .forEach(function (s) { s.classList.remove(CLS_SRC, CLS_WORD, CLS_LINE); });
  }

  function highlight(src) {
    clearAll();
    src.classList.add(CLS_SRC);
    var key = src.dataset.w;
    var ln = (src.closest("td") || {}).dataset && src.closest("td").dataset.line;
    var matched = new Set([src]);
    (byKey[key] || []).forEach(function (s) { if (s !== src) { s.classList.add(CLS_WORD); matched.add(s); } });
    (byLine[ln] || []).forEach(function (s) { if (!matched.has(s)) s.classList.add(CLS_LINE); });
  }

  /* ── Event delegation ─────────────────────────────────────────────── */

  var pinned = false, last = null;

  for (var ti = 0; ti < tables.length; ti++) {
    tables[ti].addEventListener("mouseover", function (e) {
      if (pinned) return;
      var span = e.target.closest(".w");
      if (span) { if (last !== span) { last = span; highlight(span); } return; }
      if (last) { last = null; clearAll(); }
    });
    tables[ti].addEventListener("mouseleave", function () {
      if (!pinned) { last = null; clearAll(); }
    });
    tables[ti].addEventListener("click", function (e) {
      var span = e.target.closest(".w");
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

})();
