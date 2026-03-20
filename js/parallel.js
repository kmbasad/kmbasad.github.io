/* parallel.js — Ibn Sina al-Nafs parallel reader
   1. Sync-scroll: proportional scroll lock between both columns.
   2. Word-click: clicking .w[data-wid] in col-bn highlights the
      matching .w[data-wid] in col-ar and scrolls it into view.
   3. Segment ambient glow via .seg-lit on the paired AR segment.
*/
(function () {
  'use strict';

  const colBn = document.getElementById('col-bn');
  const colAr = document.getElementById('col-ar');
  if (!colBn || !colAr) return;

  /* ── 1. Sync-scroll ──────────────────────────────────── */
  let busy = false;

  function sync(src, tgt) {
    if (busy) return;
    busy = true;
    const ratio = src.scrollTop / Math.max(1, src.scrollHeight - src.clientHeight);
    tgt.scrollTop = ratio * (tgt.scrollHeight - tgt.clientHeight);
    requestAnimationFrame(function () { busy = false; });
  }

  colBn.addEventListener('scroll', function () { sync(colBn, colAr); }, { passive: true });
  colAr.addEventListener('scroll', function () { sync(colAr, colBn); }, { passive: true });

  /* ── 2. Word-click highlighting ──────────────────────── */
  var activeWid = null;

  function clearAll() {
    document.querySelectorAll('.active-src, .active-tgt').forEach(function (el) {
      el.classList.remove('active-src', 'active-tgt');
    });
    document.querySelectorAll('.seg-lit').forEach(function (el) {
      el.classList.remove('seg-lit');
    });
    activeWid = null;
  }

  function activate(wid) {
    if (activeWid === wid) { clearAll(); return; }
    clearAll();
    activeWid = wid;

    /* Highlight clicked word(s) in BN */
    colBn.querySelectorAll('.w[data-wid="' + wid + '"]').forEach(function (el) {
      el.classList.add('active-src');
    });

    /* Highlight paired word(s) in AR + light up parent segment */
    var targets = colAr.querySelectorAll('.w[data-wid="' + wid + '"]');
    targets.forEach(function (el) {
      el.classList.add('active-tgt');
      var seg = el.closest('.seg');
      if (seg) seg.classList.add('seg-lit');
    });

    /* Scroll AR column to first target */
    if (targets.length) {
      var firstTarget = targets[0];
      var colRect = colAr.getBoundingClientRect();
      var elRect  = firstTarget.getBoundingClientRect();
      var offset  = elRect.top - colRect.top - colAr.clientHeight / 3;
      if (elRect.top < colRect.top || elRect.bottom > colRect.bottom) {
        colAr.scrollBy({ top: offset, behavior: 'smooth' });
      }
    }
  }

  /* Delegate clicks on the whole document */
  document.addEventListener('click', function (e) {
    var w = e.target.closest && e.target.closest('.w');
    if (!w) { clearAll(); return; }
    var wid = w.getAttribute('data-wid');
    if (wid) activate(wid);
  });

  /* Escape key clears */
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') clearAll();
  });

}());
