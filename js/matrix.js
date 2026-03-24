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
      table:   uid('table'),
      panel:   uid('panel'),
      overlay: uid('overlay'),
      close:   uid('close'),
      prev:    uid('prev'),
      next:    uid('next'),
      pLabel:  uid('label'),
      pProp:   uid('prop'),
      pName:   uid('name'),
      pMeta:   uid('meta'),
      pShort:  uid('short'),
      pLong:   uid('long')
    };

    // ── Build table ──────────────────────────────────────────────────────
    var scroll = document.createElement('div');
    scroll.className = 'table-scroll';

    var table = document.createElement('table');
    table.id = ids.table;

    // thead
    var thead = document.createElement('thead');
    var htr = document.createElement('tr');

    // Corner th
    var cornerTh = document.createElement('th');
    cornerTh.innerHTML = '<div class="th-inner"><span class="corner-label"><strong>' +
      cornerLabel + '</strong>' + cornerSize + '</span></div>';
    htr.appendChild(cornerTh);

    // Column headers
    for (var ci = 0; ci < nCols; ci++) {
      var colParts = tsv[0][ci + 1].split('\n\n');
      var th = document.createElement('th');
      th.style.cursor = 'pointer';
      var inner = '<div class="th-inner">';
      inner += '<span class="th-num">' + ci + '</span>';
      // Only show dates/culture if parts[1] contains digits (e.g. "980–1037 CE", "~2nd c. BCE").
      // Chan-wook synth titles have no digits ("Fall — across ten films") — suppress them.
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

        var numSpan = document.createElement('span');
        numSpan.className = 'cell-num';
        numSpan.textContent = ri + '' + ci2;
        btn.appendChild(numSpan);

        var cellParts = tsv[ri + 1][ci2 + 1].split('\n\n');
        btn.appendChild(document.createTextNode(cellParts[0] ? cellParts[0].split('\n')[0] : ''));
        btn.dataset.ri = ri;
        btn.dataset.ci = ci2;
        td.appendChild(btn);
        tr.appendChild(td);
      }
      tbody.appendChild(tr);
    }
    table.appendChild(tbody);
    scroll.appendChild(table);
    mount.appendChild(scroll);

    // ── Build overlay + panel ────────────────────────────────────────────
    var overlay = document.createElement('div');
    overlay.className = 'table-overlay';
    overlay.id = ids.overlay;

    var panel = document.createElement('div');
    panel.className = 'table-panel';
    panel.id = ids.panel;
    panel.innerHTML =
      '<div class="panel-bar"></div>' +
      '<button class="panel-close-btn" id="' + ids.close + '" title="Close">&#x2715;</button>' +
      '<div class="panel-head">' +
        '<div class="panel-label" id="' + ids.pLabel + '"></div>' +
        '<div class="panel-prop" id="' + ids.pProp + '"></div>' +
        '<div class="panel-name" id="' + ids.pName + '"></div>' +
        '<div class="panel-meta" id="' + ids.pMeta + '"></div>' +
      '</div>' +
      '<div class="panel-body">' +
        '<div class="panel-short" id="' + ids.pShort + '"></div>' +
        '<div class="panel-long" id="' + ids.pLong + '"></div>' +
      '</div>' +
      '<div class="panel-nav">' +
        '<button id="' + ids.prev + '">&#8592; Prev</button>' +
        '<button id="' + ids.next + '">Next &#8594;</button>' +
      '</div>';

    mount.appendChild(overlay);
    mount.appendChild(panel);

    // ── Wire interactions ────────────────────────────────────────────────
    var btnPrev = document.getElementById(ids.prev);
    var btnNext = document.getElementById(ids.next);
    var ap = -1, ah = -1, synthMode = false;

    function set(id, val, html) {
      var el = document.getElementById(id);
      if (!el) return;
      if (html) el.innerHTML = val || '';
      else el.textContent = val || '';
    }

    function content(type, ri, ci) {
      var rP = ri >= 0 ? tsv[ri + 1][0].split('\n\n') : [];
      var cP = ci >= 0 ? tsv[0][ci + 1].split('\n\n') : [];

      // Detect col format: if parts[1] and parts[2] are both short (< 25 chars),
      // it's consciousness/god style (dates + culture + synth_title + body).
      // Otherwise it's simple style (synth_title + body).
      // Detect col format: dates fields always contain digits (e.g. "980–1037 CE", "~2nd c. BCE").
      // Chan-wook synth titles don't ("Fall — across ten films"). Use digit presence as discriminator.
      var colFull = cP[1] && /\d/.test(cP[1]);

      if (type === 'cell') {
        var cellParts = tsv[ri + 1][ci + 1].split('\n\n');
        // meta: for full-format cols use dates · culture; for simple use row part[1] (e.g. year)
        var meta = colFull
          ? ((cP[1] || '') + (cP[2] ? ' \u00b7 ' + cP[2] : ''))
          : (rP[1] || '');
        return {
          prop: rP[0] || '', name: cP[0] || '',
          meta: meta,
          short: cellParts[0] || '',
          long: markupToHtml(cellParts.slice(1).join('\n\n'))
        };
      } else if (type === 'row') {
        // Detect row format: if parts[2] is a short synth title (< 80 chars), use consciousness style.
        // Otherwise (chan-wook: parts[2] is the synopsis body), start long from parts[2].
        var rowHasShort = rP[2] && rP[2].length < 80;
        return {
          prop: rP[0] || '',
          name: 'Synthesis across all',
          meta: rP[1] || '',
          short: rowHasShort ? rP[2] : '',
          long: markupToHtml(rP.slice(rowHasShort ? 3 : 2).join('\n\n'))
        };
      } else {
        // col synth
        if (colFull) {
          // consciousness/god: parts[1]=dates, parts[2]=culture, parts[3]=synth_title, parts[4+]=body
          return {
            prop: cP[0] || '',
            name: (cP[1] || '') + (cP[2] ? ' \u00b7 ' + cP[2] : ''),
            meta: '',
            short: cP[3] || '',
            long: markupToHtml(cP.slice(4).join('\n\n'))
          };
        } else {
          // simple: parts[0]=name, parts[1]=synth_title, parts[2+]=body
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

    function openSlide() {
      panel.classList.add('open'); overlay.classList.add('visible'); panel.scrollTop = 0;
    }

    function openColSynth(ci) {
      clearActive(); synthMode = true; ap = -1; ah = ci;
      var headers = table.querySelectorAll('thead th:not(:first-child)');
      if (ci < headers.length) headers[ci].classList.add('col-active');
      setPanel(content('col', -1, ci));
      btnPrev.disabled = ci <= 0;
      btnNext.disabled = ci >= nCols - 1;
      openSlide();
    }

    function openRowSynth(ri) {
      clearActive(); synthMode = true; ap = ri; ah = -1;
      table.querySelectorAll('tbody th')[ri].classList.add('row-active');
      setPanel(content('row', ri, -1));
      btnPrev.disabled = ri <= 0;
      btnNext.disabled = ri >= nRows - 1;
      openSlide();
    }

    function openCell(ri, ci) {
      clearActive(); synthMode = false; ap = ri; ah = ci;
      var btn = table.querySelector('.cell-btn[data-ri="' + ri + '"][data-ci="' + ci + '"]');
      if (btn) btn.classList.add('active');
      setPanel(content('cell', ri, ci));
      btnPrev.disabled = ci <= 0;
      btnNext.disabled = ci >= nCols - 1;
      openSlide();
    }

    function closePanel() {
      clearActive(); synthMode = false; ap = -1; ah = -1;
      panel.classList.remove('open'); overlay.classList.remove('visible');
    }

    // Wire click handlers
    table.querySelectorAll('thead th:not(:first-child)').forEach(function (hdr, ci) {
      hdr.addEventListener('click', (function (ci) { return function () { openColSynth(ci); }; })(ci));
    });

    table.querySelectorAll('tbody th').forEach(function (th, ri) {
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

    document.addEventListener('keydown', function (e) {
      if (!panel.classList.contains('open')) return;
      if (e.key === 'Escape') { closePanel(); return; }
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
  }

  // ── Markdown → HTML converter (for essay) ─────────────────────────────
  function mdToHtml(md) {
    return md.split(/\n{2,}/)
      .filter(function (p) { return p.trim(); })
      .map(function (p) {
        var h = p.trim();
        h = h.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
        h = h.replace(/\*(.+?)\*/g, '<em>$1</em>');
        return '<p>' + h + '</p>';
      })
      .join('\n');
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

  // Essay markdown: GOD_ESSAY_SRC = 'file.md'
  if (window.GOD_ESSAY_SRC) {
    fetch(window.GOD_ESSAY_SRC)
      .then(function (res) { return res.text(); })
      .then(function (md) {
        var el = document.getElementById('essay-body');
        if (el) el.innerHTML = mdToHtml(md);
      });
  }

}());
