(function () {
  'use strict';

  function injectNav() {
    var path = window.location.pathname;

    var section = /\/creations(\/|$)/.test(path) ? 'creations'
                : /\/translations(\/|$)/.test(path) ? 'translations'
                : /\/visions(\/|$)/.test(path) ? 'visions'
                : '';

    function li(href, label, key) {
      return '<li><a href="' + href + '"' +
             (section === key ? ' class="active"' : '') +
             '>' + label + '</a></li>';
    }

    var nav = document.createElement('nav');
    nav.className = 'nav';
    nav.innerHTML =
      '<div class="nav-inner">' +
        '<span class="nav-brand"><a href="/">KMBA</a></span>' +
        '<ul class="nav-links">' +
          li('/creations/', 'Creations',    'creations') +
          li('/translations/', 'Translations', 'translations') +
          li('/visions/', 'Visions',       'visions') +
        '</ul>' +
      '</div>';

    document.body.insertBefore(nav, document.body.firstChild);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectNav);
  } else {
    injectNav();
  }
}());
