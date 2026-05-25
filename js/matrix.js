(function () {
  'use strict';

  // ── Lightweight-markup → HTML converter ────────────────────────────────
  function markupToHtml(text) {
    if (!text) return '';
    if (text.indexOf('<p>') !== -1) return text;
    var html = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
    html = html.split(/\n\n+/).map(function (p) { return '<p>' + p.trim() + '</p>'; }).join('');
    return html;
  }

  // ── TSV parser (handles quoted cells with embedded newlines) ───────────
  function parseTSV(text) {
    var rows = [];
    var currentRow = [];
    var currentCell = '';
    var inQuotes = false;

    for (var i = 0; i < text.length; i++) {
      var c = text[i];
      var nextC = text[i + 1] || '';

      if (inQuotes) {
        if (c === '"') {
          if (nextC === '"') {
            currentCell += '"';
            i++;
          } else {
            inQuotes = false;
          }
        } else {
          currentCell += c;
        }
      } else {
        if (c === '"') {
          inQuotes = true;
        } else if (c === '\t') {
          currentRow.push(currentCell);
          currentCell = '';
        } else if (c === '\r' && nextC === '\n') {
          currentRow.push(currentCell);
          rows.push(currentRow);
          currentRow = [];
          currentCell = '';
          i++;
        } else if (c === '\n') {
          currentRow.push(currentCell);
          rows.push(currentRow);
          currentRow = [];
          currentCell = '';
        } else {
          currentCell += c;
        }
      }
    }
    if (currentCell !== '' || currentRow.length > 0) {
      currentRow.push(currentCell);
      rows.push(currentRow);
    }
    return rows.filter(function (r) { return r.length > 1 || r[0].trim() !== ''; });
  }

  // ── Unique ID generator for multi-table pages ─────────────────────────
  var _idSeq = 0;
  function uid(base) { return 'mx-' + base + '-' + (_idSeq++); }

  // ── Animate refresh: remove class, force reflow, re-add ───────────────
  function animateRefresh(el) {
    el.classList.remove('panel-refresh');
    void el.offsetWidth;
    el.classList.add('panel-refresh');
  }

  // ── Build full matrix from TSV and mount into a container ─────────────
  function buildMatrix(mountId, tsvText) {
    var mount = document.getElementById(mountId);
    if (!mount) return;

    var tsv   = parseTSV(tsvText);
    var nRows = tsv.length - 1;
    var nCols = tsv[0].length - 1;

    // Parse corner cell (row 0, col 0)
    var cornerParts = tsv[0][0].split('\n');
    var cornerLabel = cornerParts[0] || '';
    var cornerSize  = cornerParts[1] || '';

    // Generate unique IDs
    var ids = {
      table:     uid('table'),
      container: uid('container'),
      fsBtn:     uid('fsbtn'),
      panel:     uid('panel'),
      overlay:   uid('overlay'),
      close:     uid('close'),
      prev:      uid('prev'),
      next:      uid('next'),
      pLabel:    uid('label'),
      pProp:     uid('prop'),
      pName:     uid('name'),
      pMeta:     uid('meta'),
      pShort:    uid('short'),
      pLong:     uid('long'),
      pHead:     uid('head'),
      pBody:     uid('body')
    };

    // ── Container ────────────────────────────────────────────────────────
    var container = document.createElement('div');
    container.className = 'matrix-container';
    container.id = ids.container;

    // fsBtn lives inside the corner cell — built here, injected below
    var fsBtn = document.createElement('button');
    fsBtn.className = 'matrix-fs-btn';
    fsBtn.id = ids.fsBtn;
    fsBtn.title = 'Full screen (Esc to exit)';
    fsBtn.innerHTML = '<svg width="11" height="11" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M1 5V1h4M9 1h4v4M13 9v4H9M5 13H1V9"/></svg><span>Full screen</span>';

    // ── Build table ──────────────────────────────────────────────────────
    var scroll = document.createElement('div');
    scroll.className = 'table-scroll';

    var table = document.createElement('table');
    table.id = ids.table;

    // thead
    var thead = document.createElement('thead');
    var htr = document.createElement('tr');

    // Corner th — contains the label + the fullscreen button
    var cornerTh = document.createElement('th');
    var cornerInner = document.createElement('div');
    cornerInner.className = 'th-inner';
    var cornerSpan = document.createElement('span');
    cornerSpan.className = 'corner-label';
    cornerSpan.innerHTML = '<strong>' + cornerLabel + '</strong>' + cornerSize;
    cornerInner.appendChild(cornerSpan);
    cornerInner.appendChild(fsBtn);
    cornerTh.appendChild(cornerInner);
    htr.appendChild(cornerTh);

    // Column headers
    for (var ci = 0; ci < nCols; ci++) {
      var colParts = tsv[0][ci + 1].split('\n\n');
      var th = document.createElement('th');
      th.style.cursor = 'pointer';
      var inner = '<div class="th-inner">';
      inner += '<span class="th-num">' + ci + '</span>';
      var hasDates   = colParts[1] && /\d/.test(colParts[1]);
      var hasCulture = hasDates && colParts[2] && !/\d/.test(colParts[2]);
      if (hasCulture) inner += '<span class="th-culture">' + colParts[2] + '</span>';
      if (hasDates)   inner += '<span class="th-dates">'   + colParts[1] + '</span>';
      inner += '<span class="th-name">' + (colParts[0] || '') + '</span>';
      inner += '</div>';
      th.innerHTML = inner;
      htr.appendChild(th);
    }
    thead.appendChild(htr);
    table.appendChild(thead);

    // tbody
    var tbody = document.createElement('tbody');
    for (var ri = 0; ri < nRows; ri++) {
      var tr = document.createElement('tr');

      // Row header
      var rowTh = document.createElement('th');
      rowTh.style.cursor = 'pointer';
      var rowParts = tsv[ri + 1][0].split('\n\n');
      rowTh.innerHTML =
        '<span class="th-num">' + ri + '</span>' +
        '<span class="prop-name">' + (rowParts[0] || '') + '</span>' +
        (rowParts[1] ? '<span class="prop-desc">' + rowParts[1] + '</span>' : '');
      tr.appendChild(rowTh);

      // Data cells
      for (var ci2 = 0; ci2 < nCols; ci2++) {
        var td = document.createElement('td');
        var btn = document.createElement('button');
        btn.className = 'cell-btn';

        // Staggered entrance animation delay
        var delayMs = ri * 28 + ci2 * 7;
        btn.style.animationDelay = delayMs + 'ms';

        var numSpan = document.createElement('span');
        numSpan.className = 'cell-num';
        numSpan.textContent = ri + '' + ci2;
        btn.appendChild(numSpan);

        var cellParts = tsv[ri + 1][ci2 + 1].split('\n\n');
        btn.appendChild(document.createTextNode(cellParts[0] ? cellParts[0].split('\n')[0] : ''));
        btn.dataset.ri = ri;
        btn.dataset.ci = ci2;
        if (ri === ci2) {
          td.classList.add('is-diagonal');
          numSpan.textContent = '◆';
        }
        td.appendChild(btn);
        tr.appendChild(td);
      }
      tbody.appendChild(tr);
    }
    table.appendChild(tbody);
    scroll.appendChild(table);
    container.appendChild(scroll);

    // ── Build overlay + panel (inside container so fixed coords work in fullscreen) ──
    var overlay = document.createElement('div');
    overlay.className = 'table-overlay';
    overlay.id = ids.overlay;

    var panel = document.createElement('div');
    panel.className = 'table-panel';
    panel.id = ids.panel;
    panel.innerHTML =
      '<div class="panel-bar"></div>' +
      '<button class="panel-close-btn" id="' + ids.close + '" title="Close">&#x2715;</button>' +
      '<div class="panel-head" id="' + ids.pHead + '">' +
        '<div class="panel-label" id="' + ids.pLabel + '"></div>' +
        '<div class="panel-prop" id="' + ids.pProp + '"></div>' +
        '<div class="panel-name" id="' + ids.pName + '"></div>' +
        '<div class="panel-meta" id="' + ids.pMeta + '"></div>' +
      '</div>' +
      '<div class="panel-body" id="' + ids.pBody + '">' +
        '<div class="panel-short" id="' + ids.pShort + '"></div>' +
        '<div class="panel-long" id="' + ids.pLong + '"></div>' +
      '</div>' +
      '<div class="panel-nav">' +
        '<button id="' + ids.prev + '">&#8592; Prev</button>' +
        '<button id="' + ids.next + '">Next &#8594;</button>' +
      '</div>';

    container.appendChild(overlay);
    container.appendChild(panel);
    mount.appendChild(container);

    // ── Wire interactions ────────────────────────────────────────────────
    var btnPrev = document.getElementById(ids.prev);
    var btnNext = document.getElementById(ids.next);
    var pHead   = document.getElementById(ids.pHead);
    var pBody   = document.getElementById(ids.pBody);
    var ap = -1, ah = -1, synthMode = false;

    // Cached header node lists for cross-highlight
    var colHeaders = table.querySelectorAll('thead th:not(:first-child)');
    var rowHeaders = table.querySelectorAll('tbody th');

    function set(id, val, html) {
      var el = document.getElementById(id);
      if (!el) return;
      if (html) el.innerHTML = val || '';
      else el.textContent = val || '';
    }

    function content(type, ri, ci) {
      var rP = ri >= 0 ? tsv[ri + 1][0].split('\n\n') : [];
      var cP = ci >= 0 ? tsv[0][ci + 1].split('\n\n') : [];

      var colFull = cP[1] && /\d/.test(cP[1]);

      if (type === 'cell') {
        var cellParts = tsv[ri + 1][ci + 1].split('\n\n');
        var meta = colFull
          ? ((cP[1] || '') + (cP[2] ? ' · ' + cP[2] : ''))
          : (rP[1] || '');
        return {
          prop: rP[0] || '', name: cP[0] || '',
          meta: meta,
          short: cellParts[0] || '',
          long: markupToHtml(cellParts.slice(1).join('\n\n'))
        };
      } else if (type === 'row') {
        var rowHasShort = rP[2] && rP[2].length < 80;
        return {
          prop: rP[0] || '',
          name: 'Synthesis across all',
          meta: rP[1] || '',
          short: rowHasShort ? rP[2] : '',
          long: markupToHtml(rP.slice(rowHasShort ? 3 : 2).join('\n\n'))
        };
      } else {
        if (colFull) {
          return {
            prop: cP[0] || '',
            name: (cP[1] || '') + (cP[2] ? ' · ' + cP[2] : ''),
            meta: '',
            short: cP[3] || '',
            long: markupToHtml(cP.slice(4).join('\n\n'))
          };
        } else {
          return {
            prop: cP[0] || '',
            name: cP[1] || cP[0] || '',
            meta: '',
            short: '',
            long: markupToHtml(cP.slice(2).join('\n\n'))
          };
        }
      }
    }

    function setPanel(c) {
      // Trigger fade-in animation on head and body
      animateRefresh(pHead);
      animateRefresh(pBody);

      set(ids.pLabel, c.label || '');
      set(ids.pProp, c.prop);
      set(ids.pName, c.name);
      set(ids.pMeta, c.meta);
      set(ids.pShort, c.short);
      set(ids.pLong, c.long, true);
    }

    function clearActive() {
      table.querySelectorAll('.cell-btn.active').forEach(function (b) { b.classList.remove('active'); });
      table.querySelectorAll('tbody th.row-active').forEach(function (t) { t.classList.remove('row-active'); });
      table.querySelectorAll('thead th.col-active').forEach(function (t) { t.classList.remove('col-active'); });
    }

    function clearCross() {
      table.querySelectorAll('tbody th.row-cross').forEach(function (t) { t.classList.remove('row-cross'); });
      table.querySelectorAll('thead th.col-cross').forEach(function (t) { t.classList.remove('col-cross'); });
    }

    function openSlide() {
      panel.classList.add('open'); overlay.classList.add('visible'); panel.scrollTop = 0;
    }

    function openColSynth(ci) {
      clearActive(); synthMode = true; ap = -1; ah = ci;
      panel.classList.remove('panel-diagonal');
      if (ci < colHeaders.length) colHeaders[ci].classList.add('col-active');
      setPanel(content('col', -1, ci));
      btnPrev.disabled = ci <= 0;
      btnNext.disabled = ci >= nCols - 1;
      openSlide();
    }

    function openRowSynth(ri) {
      clearActive(); synthMode = true; ap = ri; ah = -1;
      panel.classList.remove('panel-diagonal');
      rowHeaders[ri].classList.add('row-active');
      setPanel(content('row', ri, -1));
      btnPrev.disabled = ri <= 0;
      btnNext.disabled = ri >= nRows - 1;
      openSlide();
    }

    function openCell(ri, ci) {
      clearActive(); synthMode = false; ap = ri; ah = ci;
      panel.classList.toggle('panel-diagonal', ri === ci);
      var btn = table.querySelector('.cell-btn[data-ri="' + ri + '"][data-ci="' + ci + '"]');
      if (btn) btn.classList.add('active');
      setPanel(content('cell', ri, ci));
      btnPrev.disabled = ci <= 0;
      btnNext.disabled = ci >= nCols - 1;
      openSlide();
    }

    function closePanel() {
      clearActive(); synthMode = false; ap = -1; ah = -1;
      panel.classList.remove('open', 'panel-diagonal'); overlay.classList.remove('visible');
    }

    // ── Cross-highlight on cell hover ────────────────────────────────────
    table.querySelectorAll('.cell-btn').forEach(function (btn) {
      var ri = parseInt(btn.dataset.ri);
      var ci = parseInt(btn.dataset.ci);

      btn.addEventListener('mouseenter', function () {
        clearCross();
        if (ri < rowHeaders.length) rowHeaders[ri].classList.add('row-cross');
        if (ci < colHeaders.length) colHeaders[ci].classList.add('col-cross');
      });

      btn.addEventListener('mouseleave', function () {
        clearCross();
      });
    });

    // ── Click handlers ───────────────────────────────────────────────────
    colHeaders.forEach(function (hdr, ci) {
      hdr.addEventListener('click', (function (ci) { return function () { openColSynth(ci); }; })(ci));
    });

    rowHeaders.forEach(function (th, ri) {
      th.addEventListener('click', (function (ri) { return function () { openRowSynth(ri); }; })(ri));
    });

    table.querySelectorAll('.cell-btn').forEach(function (btn) {
      var ri = parseInt(btn.dataset.ri);
      var ci = parseInt(btn.dataset.ci);
      btn.addEventListener('click', (function (ri, ci) { return function () { openCell(ri, ci); }; })(ri, ci));
    });

    document.getElementById(ids.close).addEventListener('click', closePanel);
    overlay.addEventListener('click', closePanel);

    btnPrev.addEventListener('click', function () {
      if (synthMode && ap === -1 && ah > 0)        { openColSynth(ah - 1); return; }
      if (synthMode && ap > 0  && ah === -1)        { openRowSynth(ap - 1); return; }
      if (!synthMode && ah > 0)                     { openCell(ap, ah - 1); }
    });
    btnNext.addEventListener('click', function () {
      if (synthMode && ap === -1 && ah < nCols - 1) { openColSynth(ah + 1); return; }
      if (synthMode && ap < nRows - 1 && ah === -1) { openRowSynth(ap + 1); return; }
      if (!synthMode && ah < nCols - 1)             { openCell(ap, ah + 1); }
    });

    // ── Keyboard: ESC closes panel first, then exits pseudo-fullscreen ───
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        if (panel.classList.contains('open')) { closePanel(); return; }
        if (container.classList.contains('is-fullscreen')) { exitPseudoFS(); return; }
        return;
      }
      if (!panel.classList.contains('open')) return;
      if (synthMode && ap === -1) {
        if (e.key === 'ArrowLeft'  && ah > 0)         { e.preventDefault(); openColSynth(ah - 1); }
        if (e.key === 'ArrowRight' && ah < nCols - 1) { e.preventDefault(); openColSynth(ah + 1); }
        return;
      }
      if (synthMode) {
        if (e.key === 'ArrowUp'   && ap > 0)          { e.preventDefault(); openRowSynth(ap - 1); }
        if (e.key === 'ArrowDown' && ap < nRows - 1)  { e.preventDefault(); openRowSynth(ap + 1); }
        return;
      }
      if (e.key === 'ArrowLeft'  && ah > 0)           { e.preventDefault(); openCell(ap, ah - 1); }
      if (e.key === 'ArrowRight' && ah < nCols - 1)   { e.preventDefault(); openCell(ap, ah + 1); }
      if (e.key === 'ArrowUp'    && ap > 0)           { e.preventDefault(); openCell(ap - 1, ah); }
      if (e.key === 'ArrowDown'  && ap < nRows - 1)   { e.preventDefault(); openCell(ap + 1, ah); }
    });

    // ── Pseudo-fullscreen (position:fixed, no native API) ─────────────────
    function resizeForFullscreen() {
      if (window.innerWidth < 768) return;
      // Read the scroll container's actual rendered dimensions — this is the
      // ground truth after CSS has laid out the flex column.
      var scrollW  = scroll.clientWidth;
      var scrollH  = scroll.clientHeight;
      var theadH   = table.querySelector('thead').offsetHeight || 82;
      var rowHeaderW = 174;

      var colW = Math.max(100, Math.floor((scrollW - rowHeaderW) / nCols));
      var rowH = Math.max(52,  Math.floor((scrollH - theadH)     / nRows));

      container.style.setProperty('--fs-cell-w', colW + 'px');
      container.style.setProperty('--fs-cell-h', rowH + 'px');
    }

    function enterPseudoFS() {
      if (window.innerWidth < 768) return;
      container.classList.add('is-fullscreen');
      // Prevent page scroll while fullscreen is active
      document.body.style.overflow = 'hidden';
      updateFsBtn(true);
      // Double rAF: first frame applies CSS, second reads settled dimensions
      requestAnimationFrame(function () {
        requestAnimationFrame(resizeForFullscreen);
      });
    }

    function exitPseudoFS() {
      container.classList.remove('is-fullscreen');
      container.style.removeProperty('--fs-cell-w');
      container.style.removeProperty('--fs-cell-h');
      document.body.style.overflow = '';
      updateFsBtn(false);
    }

    function updateFsBtn(active) {
      if (active) {
        fsBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M5 1v4H1M9 1v4h4M1 9h4v4M13 9H9v4"/></svg><span>Exit full screen</span>';
        fsBtn.title = 'Exit full screen (Esc)';
      } else {
        fsBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M1 5V1h4M9 1h4v4M13 9v4H9M5 13H1V9"/></svg><span>Full screen</span>';
        fsBtn.title = 'Full screen (Esc to exit)';
      }
    }

    fsBtn.addEventListener('click', function () {
      if (container.classList.contains('is-fullscreen')) exitPseudoFS();
      else enterPseudoFS();
    });

    window.addEventListener('resize', function () {
      if (container.classList.contains('is-fullscreen')) {
        requestAnimationFrame(resizeForFullscreen);
      }
    });
  }

  // ── Markdown essay renderer ────────────────────────────────────────────
  // Format:
  //   # Title          ← becomes .section-title
  //   Subtitle text    ← first block after title becomes .section-intro
  //   (blank line)
  //   Body paragraph… ← rest become <p> inside .essay-body
  //
  // Title and subtitle are optional; any block can be omitted.
  function renderEssay(md, mount) {
    var blocks = md.split(/\n{2,}/)
      .map(function (b) { return b.trim(); })
      .filter(Boolean);

    if (!blocks.length) return;

    var title = '', intro = '', i = 0;

    if (blocks[i] && blocks[i].charAt(0) === '#') {
      title = blocks[i].replace(/^#+\s*/, '');
      i++;
    }
    if (i < blocks.length && blocks[i].charAt(0) !== '#') {
      intro = blocks[i];
      i++;
    }

    function inlineMarkup(s) {
      return s
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.+?)\*/g, '<em>$1</em>');
    }

    var html = '';
    if (title) html += '<div class="section-title">' + title + '</div>\n';
    if (intro) html += '<p class="section-intro">' + inlineMarkup(intro) + '</p>\n';

    var bodyParts = blocks.slice(i).map(function (p) {
      return '<p>' + inlineMarkup(p) + '</p>';
    }).join('\n');

    html += '<div class="writing-col"><div class="writing-stack"><div class="essay">'
          + '<div class="essay-body">' + bodyParts + '</div>'
          + '</div></div></div>';

    mount.innerHTML = html;
  }

  // ── Auto-discover and initialise ──────────────────────────────────────

  // Single matrix: MATRIX_CONFIG = { src: 'file.tsv', mountId: 'id' }
  if (window.MATRIX_CONFIG) {
    fetch(window.MATRIX_CONFIG.src)
      .then(function (res) { return res.text(); })
      .then(function (tsvText) { buildMatrix(window.MATRIX_CONFIG.mountId, tsvText); });
  }

  // Multiple matrices: GOD_DATA = [{ src: 'file.tsv', mountId: 'id' }, ...]
  if (window.GOD_DATA) {
    window.GOD_DATA.forEach(function (entry) {
      fetch(entry.src)
        .then(function (res) { return res.text(); })
        .then(function (tsvText) { buildMatrix(entry.mountId, tsvText); });
    });
  }

  // Essay markdown: ESSAY_SRC = 'file.md'  (GOD_ESSAY_SRC accepted for compat)
  var essaySrc = window.ESSAY_SRC || window.GOD_ESSAY_SRC;
  if (essaySrc) {
    fetch(essaySrc)
      .then(function (res) { return res.text(); })
      .then(function (md) {
        var mount = document.getElementById('essay-mount');
        if (mount) renderEssay(md, mount);
      });
  }

}());
