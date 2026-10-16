/**
 * tika.js — the টীকা (notes) of a translation page.
 *
 * md-loader marks a noted phrase in a line (<span class="tika">) and puts a
 * small mark in the line's margin (.tika-mark); the notes themselves wait in
 * window.TT_NOTES. Here a card shows a note: on a wide screen while the
 * pointer rests on the phrase or the mark (and on the card itself, so it can
 * be read and selected); a click or a tap pins it; Esc, a click elsewhere or
 * a second tap puts it away. On a phone the margin is hidden, so the phrase
 * itself is what is tapped.
 *
 * Pages without notes never get a card.
 */
(function () {
  'use strict';

  var card = null, owner = null, pinned = false, hideT = null;

  function ensureCard() {
    if (card) return card;
    card = document.createElement('div');
    card.className = 'tika-card';
    card.setAttribute('role', 'note');
    card.hidden = true;
    card.innerHTML = '<span class="tika-kicker">টীকা</span><div class="tika-body"></div>';
    card.addEventListener('mouseenter', function () { clearTimeout(hideT); });
    card.addEventListener('mouseleave', function () { if (!pinned) hideSoon(); });
    document.body.appendChild(card);
    return card;
  }

  /* the phrase the note belongs to: the card hangs from it, below its line
     (above, when the line is low on the screen) */
  function anchorOf(el) {
    if (el.classList.contains('tika')) return el;
    var tr = el.closest('tr');
    return (tr && tr.querySelector('.tika[data-tika="' + el.dataset.tika + '"]')) || el;
  }

  function show(el, pin) {
    var html = window.TT_NOTES && window.TT_NOTES[el.dataset.tika];
    if (!html) return;
    clearTimeout(hideT);
    ensureCard();
    if (owner) owner.classList.remove('tika-on');
    owner = anchorOf(el);
    owner.classList.add('tika-on');
    pinned = !!pin;
    card.querySelector('.tika-body').innerHTML = html;
    card.hidden = false;
    place();
  }

  function place() {
    if (!owner || card.hidden) return;
    var r = owner.getBoundingClientRect();
    var vw = document.documentElement.clientWidth, vh = window.innerHeight;
    var w = Math.min(card.offsetWidth, vw - 24);
    var left = Math.max(12, Math.min(r.left, vw - w - 12));
    card.style.left = left + 'px';
    var below = r.bottom + 8, h = card.offsetHeight;
    var top = (below + h > vh - 12 && r.top - h - 8 > 12) ? r.top - h - 8 : below;
    card.style.top = top + 'px';
  }

  function hide() {
    clearTimeout(hideT);
    pinned = false;
    if (owner) owner.classList.remove('tika-on');
    owner = null;
    if (card) card.hidden = true;
  }

  function hideSoon() {
    clearTimeout(hideT);
    hideT = setTimeout(hide, 220);
  }

  function target(e) {
    return e.target.closest ? e.target.closest('.tika, .tika-mark') : null;
  }

  var fine = window.matchMedia('(hover: hover) and (pointer: fine)');

  document.addEventListener('mouseover', function (e) {
    if (!fine.matches || pinned) return;
    var t = target(e);
    if (t) show(t, false);
  });
  document.addEventListener('mouseout', function (e) {
    if (!fine.matches || pinned) return;
    var t = target(e);
    if (t && !(e.relatedTarget && (t.contains(e.relatedTarget) || (card && card.contains(e.relatedTarget))))) hideSoon();
  });
  document.addEventListener('click', function (e) {
    var t = target(e);
    if (t) {
      e.preventDefault();
      if (pinned && owner === anchorOf(t)) hide(); else show(t, true);
      return;
    }
    if (card && !card.hidden && !card.contains(e.target)) hide();
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') hide();
    if ((e.key === 'Enter' || e.key === ' ') && e.target.classList && e.target.classList.contains('tika')) {
      e.preventDefault();
      show(e.target, true);
    }
  });
  document.addEventListener('focusin', function (e) {
    if (e.target.classList && (e.target.classList.contains('tika') || e.target.classList.contains('tika-mark'))) show(e.target, false);
  });
  window.addEventListener('scroll', function () { if (pinned) place(); else if (card && !card.hidden) hide(); }, { passive: true });
  window.addEventListener('resize', place, { passive: true });
})();
