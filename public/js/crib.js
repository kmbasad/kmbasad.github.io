/**
 * crib.js — a literal English line under each line of the original.
 *
 * For readers (and the translator) who read the Greek poorly and English
 * well: each line of the original has its plain sense in English, kept
 * beside the poem as `<part>-crib.tsv` (`N<TAB>english`, N = the original's
 * line number, as md-loader.js stamps it on each verse row's data-key).
 * BookReader sets `TRANS_CONFIG.crib` only where such a file exists.
 *
 *   a mouse: rest on a line and a card opens under it, overlaid on the page
 *     (nothing moves), the line's English with the lines either side faint,
 *     since a sentence runs on;
 *   a finger, from 761px: tap a Bangla line and the same card stands at the
 *     screen's foot; tap it or elsewhere to put it away;
 *   a phone: the held line's sheet (verse-hold.js) carries the English under
 *     the original, through window.TransCrib.
 */
(function () {
  'use strict';

  var cfg = window.TRANS_CONFIG || {};
  if (!cfg.crib) return;

  var crib = null, card = null, lit = null, touch = false;
  var PHONE = window.matchMedia('(max-width: 760px)');

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

  function show(tr, foot) {
    var n = lineOf(tr);
    if (!n) return hide();
    if (!card) build();
    function side(k) {
      return crib[k] ? '<p class="crib-side"><span class="crib-n">' + k + '</span>' + esc(crib[k]) + '</p>' : '';
    }
    card.innerHTML = side(n - 1) +
      '<p class="crib-here"><span class="crib-n">' + n + '</span>' + esc(crib[n]) + '</p>' + side(n + 1);
    card.classList.toggle('crib-foot', !!foot);
    if (lit) lit.classList.remove('crib-row');
    lit = tr;
    tr.classList.add('crib-row');
    card.hidden = false;
    if (!foot) {
      // under the row, at the original's column (the Bangla's if it is hidden)
      var cell = tr.querySelector('td.it, td.en, td.fa');
      var anchor = cell && cell.offsetParent ? cell : tr.querySelector('td.bn') || tr;
      var r = tr.getBoundingClientRect(), a = anchor.getBoundingClientRect();
      var w = Math.min(Math.max(a.width, 288), window.innerWidth - 32);
      card.style.width = w + 'px';
      card.style.left = Math.max(16, Math.min(a.left, window.innerWidth - w - 16)) + window.scrollX + 'px';
      card.style.top = r.bottom + window.scrollY + 6 + 'px';
    } else {
      card.style.width = card.style.left = card.style.top = '';
    }
  }

  function hide() {
    if (card) card.hidden = true;
    if (lit) { lit.classList.remove('crib-row'); lit = null; }
  }

  // a mouse hovers; a finger taps (pointerType tells them apart, whatever
  // the screen's size)
  document.addEventListener('pointerdown', function (e) { touch = e.pointerType !== 'mouse'; }, true);
  document.addEventListener('pointerover', function (e) {
    if (e.pointerType !== 'mouse' || !crib) return;
    touch = false;
    var tr = e.target.closest && e.target.closest('.tt-table tr[data-key]');
    if (tr && lineOf(tr)) { if (tr !== lit) show(tr, false); } else if (lit) hide();
  });
  document.addEventListener('click', function (e) {
    if (!touch || !crib || PHONE.matches) return;
    if (card && card.contains(e.target)) return hide();
    if (window.getSelection && String(window.getSelection()).length) return;
    var tr = e.target.closest && e.target.closest('.tt-table tr[data-key]');
    if (tr && tr !== lit && e.target.closest('td.bn')) show(tr, true); else hide();
  });
  window.addEventListener('scroll', function () { if (lit && !touch) hide(); }, { passive: true });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && lit) hide(); });
})();
