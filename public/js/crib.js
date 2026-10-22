/**
 * crib.js — a literal English line under each line of the original.
 *
 * For readers (and the translator) who read the Greek poorly and English
 * well: each line of the original has its plain sense in English, kept
 * beside the poem as `<part>-crib.tsv` (`N<TAB>english`, N = the original's
 * line number, as md-loader.js stamps it on each verse row's data-key).
 * BookReader sets `TRANS_CONFIG.crib` only where such a file exists.
 *
 *   a mouse resting on the original's line (never the Bangla, which maps
 *     its words instead, translation-table.js): a card under that line with
 *     its English, overlaid, so nothing moves;
 *   a finger, from 761px: a tap on the original's line, the same card;
 *   a phone: the held line's sheet (verse-hold.js) carries the English under
 *     the original, through window.TransCrib.
 */
(function () {
  'use strict';

  var cfg = window.TRANS_CONFIG || {};
  if (!cfg.crib) return;

  var crib = null, card = null, lit = null, touch = false;
  var PHONE = window.matchMedia('(max-width: 760px)');
  var ORIG = 'td.it, td.fa';   // the original's column (an English one needs no crib)

  function esc(s) {
    return String(s).replace(/[&<>]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]; });
  }

  fetch(cfg.crib)
    .then(function (r) { return r.ok ? r.text() : ''; })
    .then(function (t) {
      var d = {}, any = false;
      t.split('\n').forEach(function (l) {
        var i = l.indexOf('\t');
        if (i > 0 && /^\d+$/.test(l.slice(0, i))) { d[l.slice(0, i)] = l.slice(i + 1).trim(); any = true; }
      });
      if (any) { crib = d; document.documentElement.classList.add('has-crib'); }
    })
    .catch(function () {});

  function lineOf(tr) {
    var n = tr && tr.dataset && tr.dataset.key;
    return n && /^\d+$/.test(n) && crib && crib[n] ? +n : 0;
  }

  /* for verse-hold.js: the English of a row, or '' */
  window.TransCrib = { text: function (tr) { var n = lineOf(tr); return n ? crib[n] : ''; } };

  function build() {
    card = document.createElement('div');
    card.className = 'crib-card';
    card.hidden = true;
    card.setAttribute('role', 'note');
    document.body.appendChild(card);
  }

  function show(tr) {
    var n = lineOf(tr);
    if (!n) return hide();
    if (!card) build();
    card.textContent = crib[n];
    if (lit) lit.classList.remove('crib-row');
    lit = tr;
    tr.classList.add('crib-row');
    card.hidden = false;
    // under the row, at the original's column
    var cell = tr.querySelector(ORIG) || tr;
    var r = tr.getBoundingClientRect(), a = cell.getBoundingClientRect();
    var w = Math.min(Math.max(a.width, 288), window.innerWidth - 32);
    card.style.width = w + 'px';
    card.style.left = Math.max(16, Math.min(a.left, window.innerWidth - w - 16)) + window.scrollX + 'px';
    card.style.top = r.bottom + window.scrollY + 6 + 'px';
  }

  function hide() {
    if (card) card.hidden = true;
    if (lit) { lit.classList.remove('crib-row'); lit = null; }
  }

  function origRow(t) {
    var td = t.closest && t.closest(ORIG);
    var tr = td && td.closest('.tt-table tr[data-key]');
    return tr && lineOf(tr) ? tr : null;
  }

  // a mouse hovers; a finger taps (pointerType tells them apart, whatever
  // the screen's size)
  document.addEventListener('pointerdown', function (e) { touch = e.pointerType !== 'mouse'; }, true);
  document.addEventListener('pointerover', function (e) {
    if (e.pointerType !== 'mouse' || !crib) return;
    touch = false;
    var tr = origRow(e.target);
    if (tr) { if (tr !== lit) show(tr); } else if (lit) hide();
  });
  document.addEventListener('click', function (e) {
    if (!touch || !crib || PHONE.matches) return;
    var tr = origRow(e.target);
    if (tr && tr !== lit) show(tr); else hide();
  });
  window.addEventListener('scroll', function () { if (lit) hide(); }, { passive: true });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && lit) hide(); });
})();
