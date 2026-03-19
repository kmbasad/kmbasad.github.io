/**
 * translation-table.js  —  Generic cross-highlighting for translation tables
 *
 * Supports 2-column (bn + other), 3-column (bn + other + en), or
 * 4-column (bn + other + en + line-num) layouts.
 *
 * Each page provides its own word-mapping data via:
 *   window.TT_MAPPINGS = {
 *     LANG1_TO_LANG2: { ... },   // e.g. IT_TO_EN
 *     LANG1_TO_BN:   { ... },   // e.g. IT_TO_BN
 *     BN_TO_LANG1:   { ... },   // e.g. BN_TO_IT
 *   }
 *
 * The table must have class="tt-table" and cells with class bn/it/en/etc.
 * Words are <span class="w" data-w="key">.
 */

(function () {
  "use strict";

  /* ── Read page-supplied mappings ────────────────────────────────────── */
  const M = window.TT_MAPPINGS || {};

  // Primary language (the "other" language, e.g. Italian, Persian, etc.)
  const LANG1_TO_EN = M.LANG1_TO_EN || {};
  const LANG1_TO_BN = M.LANG1_TO_BN || {};
  const BN_TO_LANG1 = M.BN_TO_LANG1 || {};

  /* Build reverse EN → LANG1[] */
  const EN_TO_LANG1 = {};
  for (const [k, vs] of Object.entries(LANG1_TO_EN)) {
    for (const v of vs) { (EN_TO_LANG1[v] = EN_TO_LANG1[v] || []).push(k); }
  }

  /* ── Detect which columns exist ────────────────────────────────────── */
  // The "lang1" column class is provided by the page
  const lang1Class = M.lang1Class || "it";  // default to "it" for backward compat

  /* ── BN → EN via LANG1 bridge ──────────────────────────────────────── */
  function bnToEn(bnKey) {
    const lang1Keys = BN_TO_LANG1[bnKey] || [];
    const enKeys = [];
    for (const k of lang1Keys) {
      for (const ek of (LANG1_TO_EN[k] || [])) {
        if (!enKeys.includes(ek)) enKeys.push(ek);
      }
    }
    return enKeys;
  }

  /* ── Cache DOM elements ───────────────────────────────────────────── */
  const bnWords = {}, lang1Words = {}, enWords = {};
  document.querySelectorAll("td.bn .w").forEach(s => {
    const k = s.dataset.w; if (!k) return;
    (bnWords[k] = bnWords[k] || []).push(s);
  });
  document.querySelectorAll(`td.${lang1Class} .w`).forEach(s => {
    const k = s.dataset.w; if (!k) return;
    (lang1Words[k] = lang1Words[k] || []).push(s);
  });
  document.querySelectorAll("td.en .w").forEach(s => {
    const k = s.dataset.w; if (!k) return;
    (enWords[k] = enWords[k] || []).push(s);
  });

  // Line-level caches
  const bnLines = {}, lang1Lines = {}, enLines = {};
  document.querySelectorAll("td.bn").forEach(td => {
    const ln = td.dataset.line; if (!ln) return;
    bnLines[ln] = Array.from(td.querySelectorAll(".w"));
  });
  document.querySelectorAll(`td.${lang1Class}`).forEach(td => {
    const ln = td.dataset.line; if (!ln) return;
    lang1Lines[ln] = Array.from(td.querySelectorAll(".w"));
  });
  document.querySelectorAll("td.en").forEach(td => {
    const ln = td.dataset.line; if (!ln) return;
    enLines[ln] = Array.from(td.querySelectorAll(".w"));
  });

  /* ── Highlight classes ────────────────────────────────────────────── */
  const CLS_SOURCE = "source-word";
  const CLS_WORD = "word-highlight";
  const CLS_LINE = "line-highlight";

  function clearAll() {
    document.querySelectorAll(`.${CLS_SOURCE},.${CLS_WORD},.${CLS_LINE}`)
      .forEach(s => s.classList.remove(CLS_SOURCE, CLS_WORD, CLS_LINE));
  }

  /* ── Highlight words in a column, with fallback to whole line ────── */
  function highlightCol(matchedKeys, wordMap, lineSpans, matchClass, fallbackClass) {
    if (matchedKeys.length > 0) {
      const matched = new Set();
      for (const k of matchedKeys) {
        for (const s of (wordMap[k] || [])) {
          s.classList.add(matchClass);
          matched.add(s);
        }
      }
      for (const s of lineSpans) {
        if (!matched.has(s)) s.classList.add(fallbackClass);
      }
    } else {
      for (const s of lineSpans) s.classList.add(fallbackClass);
    }
  }

  /* ── Main highlight ────────────────────────────────────────────────── */
  function applyHighlight(sourceSpan, wordKey, col) {
    clearAll();
    sourceSpan.classList.add(CLS_SOURCE);

    const lineNum = sourceSpan.closest("td").dataset.line;
    const bnLine = bnLines[lineNum] || [];
    const l1Line = lang1Lines[lineNum] || [];
    const enLine = enLines[lineNum] || [];

    if (col === lang1Class) {
      const enKeys = LANG1_TO_EN[wordKey] || [];
      const bnKeys = LANG1_TO_BN[wordKey] || [];
      highlightCol(enKeys, enWords, enLine, CLS_WORD, CLS_LINE);
      highlightCol(bnKeys, bnWords, bnLine, CLS_WORD, CLS_LINE);

    } else if (col === "en") {
      const l1Keys = EN_TO_LANG1[wordKey] || [];
      const bnKeys = [];
      for (const lk of l1Keys) {
        for (const bk of (LANG1_TO_BN[lk] || [])) {
          if (!bnKeys.includes(bk)) bnKeys.push(bk);
        }
      }
      highlightCol(l1Keys, lang1Words, l1Line, CLS_WORD, CLS_LINE);
      highlightCol(bnKeys, bnWords, bnLine, CLS_WORD, CLS_LINE);

    } else if (col === "bn") {
      const l1Keys = BN_TO_LANG1[wordKey] || [];
      const enKeys = bnToEn(wordKey);
      highlightCol(l1Keys, lang1Words, l1Line, CLS_WORD, CLS_LINE);
      highlightCol(enKeys, enWords, enLine, CLS_WORD, CLS_LINE);
    }
  }

  /* ── Event delegation ─────────────────────────────────────────────── */
  const table = document.querySelector(".tt-table");
  if (!table) return;

  let pinned = false;
  let lastTarget = null;

  function colOf(span) {
    if (span.closest("td.bn")) return "bn";
    if (span.closest(`td.${lang1Class}`)) return lang1Class;
    if (span.closest("td.en")) return "en";
    return null;
  }

  table.addEventListener("mouseover", function (e) {
    if (pinned) return;
    const span = e.target.closest(".w");
    if (span) {
      if (lastTarget !== span) {
        lastTarget = span;
        const col = colOf(span);
        if (col) applyHighlight(span, span.dataset.w, col);
      }
      return;
    }
    if (lastTarget) { lastTarget = null; clearAll(); }
  });

  table.addEventListener("mouseleave", function () {
    if (!pinned) { lastTarget = null; clearAll(); }
  });

  table.addEventListener("click", function (e) {
    const span = e.target.closest(".w");
    if (!span) { pinned = false; lastTarget = null; clearAll(); return; }
    if (pinned && span.classList.contains(CLS_SOURCE)) {
      pinned = false; lastTarget = null; clearAll(); return;
    }
    const col = colOf(span);
    if (col) applyHighlight(span, span.dataset.w, col);
    pinned = true; lastTarget = span;
  });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") { pinned = false; lastTarget = null; clearAll(); }
  });

})();
