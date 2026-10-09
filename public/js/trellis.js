(function () {
  'use strict';

  // ── Auto-load the trellis flora layer ──
  // Side-effect: drop the woven-trellis stylesheet + JS into the page so
  // every matrix on the site picks up flora. Opt-out per mount with
  // data-flora="off". (Safe to omit if you've already linked them by hand.)
  (function loadFlora() {
    var head = document.head;
    if (!document.querySelector('link[href="/css/trellis-flora.css"]')) {
      var l = document.createElement('link');
      l.rel = 'stylesheet';
      l.href = '/css/trellis-flora.css';
      head.appendChild(l);
    }
    if (!document.querySelector('script[src="/js/trellis-flora.js"]')) {
      var s = document.createElement('script');
      s.src = '/js/trellis-flora.js';
      s.defer = true;
      head.appendChild(s);
    }
  }());

  // ── Lightweight-markup → HTML converter ────────────────────────────────
  function markupToHtml(text) {
    if (!text) return '';
    if (text.indexOf('<p>') !== -1) return text;
    var html = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
    html = html.split(/\n\n+/).map(function (p) { return '<p>' + p.trim() + '</p>'; }).join('');
    return html;
  }

  // ── Markdown parser ────────────────────────────────────────────────────
  // Produces the same 2D-array shape as parseTSV so buildMatrix doesn't care.
  // Format:
  //   axes:
  //     rows: <RowDim>
  //     cols: <ColDim>
  //
  //   ## Columns
  //   ### Col N · Name
  //   (optional)  dates: ...
  //   (optional)  culture: ...
  //   (optional)  short: ...
  //   (paragraphs)  long synthesis
  //
  //   ## Rows
  //   ### Row N · Name
  //   (optional)  desc: ...
  //   (optional)  short: ...
  //   (paragraphs)  long synthesis
  //
  //   ## Cells
  //   ### NN · Short label
  //   (paragraphs)  long
  function parseMarkdown(text) {
    var lines = text.split('\n');

    // Axes — find any "axes:" block and read its rows: / cols: keys
    var rowAxis = 'Row', colAxis = 'Col';
    for (var i = 0; i < lines.length; i++) {
      if (lines[i].trim() === 'axes:') {
        for (var j = i + 1; j < Math.min(i + 6, lines.length); j++) {
          var m = lines[j].match(/^\s+(rows|cols)\s*:\s*(.+?)\s*$/);
          if (!m) break;
          if (m[1] === 'rows') rowAxis = m[2];
          else                 colAxis = m[2];
        }
        break;
      }
    }

    // Bucket content by `## Section` heading
    var sections = {}, sec = null, buf = [];
    for (var k = 0; k < lines.length; k++) {
      var sm = lines[k].match(/^##\s+(.+?)\s*$/);
      if (sm) {
        if (sec) sections[sec] = buf.join('\n');
        sec = sm[1].toLowerCase();
        buf = [];
      } else if (sec) {
        buf.push(lines[k]);
      }
    }
    if (sec) sections[sec] = buf.join('\n');

    // Pull `### <id> · <name>` items out of a section.
    // headingRegex captures id (group 1) and the rest after the dot (group 2).
    function parseItems(secText, headingRegex) {
      if (!secText) return [];
      var blocks = secText.split(/^###\s+/m).slice(1);
      var out = [];
      blocks.forEach(function (block) {
        var nl = block.indexOf('\n');
        var heading = (nl >= 0 ? block.substring(0, nl) : block).trim();
        var body    = (nl >= 0 ? block.substring(nl + 1) : '').trim();

        var hm = heading.match(headingRegex);
        if (!hm) return;
        var id   = hm[1];
        var name = (hm[2] || '').trim();

        // Body: leading "key: value" lines are metadata; rest is long content.
        var bls = body.split('\n');
        var meta = {};
        var p = 0;
        while (p < bls.length) {
          var bl = bls[p];
          if (bl.trim() === '') { p++; continue; }
          var mm = bl.match(/^(dates|culture|short|desc)\s*:\s*(.+?)\s*$/);
          if (!mm) break;
          meta[mm[1]] = mm[2];
          p++;
        }
        var longText = bls.slice(p).join('\n').trim();
        out.push({ id: id, name: name, meta: meta, long: longText });
      });
      return out;
    }

    var cols  = parseItems(sections['columns'] || '', /^Col\s+(\d+)\s*[·\-—]\s*(.*)$/i);
    var rowsP = parseItems(sections['rows']    || '', /^Row\s+(\d+)\s*[·\-—]\s*(.*)$/i);
    var cells = parseItems(sections['cells']   || '', /^(\d+)\s*[·\-—]\s*(.*)$/);

    var byId = {};
    cells.forEach(function (c) { byId[c.id] = c; });

    // Assemble into the 2D array shape that parseTSV produces
    var nRows = rowsP.length;
    var nCols = cols.length;
    var grid = [];

    // Corner cell  +  column headers
    var topRow = [rowAxis + '\n\n' + colAxis];
    cols.forEach(function (col) {
      var parts = [col.name];
      // col format expected by buildMatrix: name\n\ndates\n\nculture\n\nshort\n\nlong
      if (col.meta.dates || col.meta.culture || col.meta.short || col.long) {
        parts.push(col.meta.dates   || '');
        parts.push(col.meta.culture || '');
        parts.push(col.meta.short   || '');
        if (col.long) parts.push(col.long);
      }
      topRow.push(parts.join('\n\n'));
    });
    grid.push(topRow);

    // Data rows
    for (var r = 0; r < nRows; r++) {
      var row = rowsP[r];
      var line = [];
      // row format expected by buildMatrix: name\n\ndesc\n\nshort\n\nlong
      var rparts = [row.name];
      if (row.meta.desc || row.meta.short || row.long) {
        rparts.push(row.meta.desc || '');
        if (row.meta.short) rparts.push(row.meta.short);
        if (row.long)       rparts.push(row.long);
      }
      line.push(rparts.join('\n\n'));

      for (var c = 0; c < nCols; c++) {
        var key = '' + r + c;
        var cell = byId[key];
        var short = cell ? cell.name : '';
        var long  = cell ? cell.long : '';
        line.push(short + (long ? '\n\n' + long : ''));
      }
      grid.push(line);
    }
    return grid;
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

  // ── Parse markdown OR TSV depending on file extension / content shape ──
  function parseSource(src, text) {
    var looksMd = /\.md$/i.test(src || '') || /^\s*#/.test(text);
    return looksMd ? parseMarkdown(text) : parseTSV(text);
  }

  // ── Build full matrix from a 2D grid and mount into a container ────────
  // `opts` carries what the data file knows but the grid does not: the
  // matrix's own `# Title`, the stable anchor the menubar সূচি scrolls to,
  // and whether that title should also be drawn. It is drawn only on a page
  // holding several matrices — where the two tables would otherwise butt up
  // against each other unlabelled. A page with one matrix already wears its
  // name in the breadcrumb and must not repeat it.
  function buildMatrix(mount, tsv, opts) {
    if (!mount) return;
    if (!tsv || !tsv.length) return;
    opts = opts || {};

    var nRows = tsv.length - 1;
    var nCols = tsv[0].length - 1;

    // Parse corner cell (row 0, col 0) into row + column dimension labels.
    // Supports two TSV formats:
    //   "Row ↓ · Col →"   (legacy, single line)
    //   "Row\n\nCol"      (preferred — each label on its own line)
    function parseCornerLabels(text) {
      var t = (text || '').trim();
      // Legacy arrow format
      var m = t.match(/^(.+?)\s*↓\s*[·•\-]\s*(.+?)\s*→/);
      if (m) return { row: m[1].trim(), col: m[2].trim() };
      // Block-split format (anything separated by blank line or single newline)
      var parts = t.split(/\n+/).map(function (s) { return s.trim(); }).filter(Boolean);
      // Strip an embedded size hint like "10 × 10" from the list
      parts = parts.filter(function (p) { return !/^\d+\s*[×x]\s*\d+$/.test(p); });
      if (parts.length >= 2) return { row: parts[0], col: parts[1] };
      return { row: parts[0] || 'Row', col: 'Col' };
    }
    var cornerLabels = parseCornerLabels(tsv[0][0]);

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
    /* The anchor is the matrix's position in its file, not a uid() draw:
       uid() runs sixteen times per matrix, so a counter-derived id would
       shift the moment another id joined the list above. */
    container.id = opts.anchor || ids.container;
    if (opts.title) container.setAttribute('data-toc', opts.title);

    if (opts.title && opts.showTitle) {   /* off in a slider — its tabs name the matrices */
      var mxTitle = document.createElement('h2');
      mxTitle.className = 'matrix-title';
      mxTitle.textContent = opts.title;
      container.appendChild(mxTitle);
    }

    // fsBtn lives inside the corner cell — built here, injected below.
    // Icon-only (no text) so the corner cell stays clean.
    var fsBtn = document.createElement('button');
    fsBtn.className = 'matrix-fs-btn';
    fsBtn.id = ids.fsBtn;
    fsBtn.title = 'Full screen (Esc to exit)';
    fsBtn.setAttribute('aria-label', 'Full screen');
    fsBtn.innerHTML = '<svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M1 5V1h4M9 1h4v4M13 9v4H9M5 13H1V9"/></svg>';

    // ── Build table ──────────────────────────────────────────────────────
    var scroll = document.createElement('div');
    scroll.className = 'table-scroll';

    var table = document.createElement('table');
    table.id = ids.table;

    // thead
    var thead = document.createElement('thead');
    var htr = document.createElement('tr');

    // Corner th — fullscreen icon at top-left, row label at bottom-edge,
    // column label at right-edge. Nothing else.
    var cornerTh = document.createElement('th');
    cornerTh.className = 'corner-th';
    var cornerInner = document.createElement('div');
    cornerInner.className = 'corner-inner';
    cornerInner.appendChild(fsBtn);
    var colLbl = document.createElement('span');
    colLbl.className = 'corner-col-label';
    colLbl.textContent = cornerLabels.col + ' →';
    cornerInner.appendChild(colLbl);
    var rowLbl = document.createElement('span');
    rowLbl.className = 'corner-row-label';
    rowLbl.textContent = cornerLabels.row + ' ↓';
    cornerInner.appendChild(rowLbl);
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
      '<button class="panel-close-btn" id="' + ids.close + '" title="বন্ধ (Esc)">&#x2715;</button>' +
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
        '<button id="' + ids.prev + '">&#8592; আগের</button>' +
        '<button id="' + ids.next + '">পরের &#8594;</button>' +
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
          name: 'সবগুলো জুড়ে',
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

    // ── Fit the grid to its box ───────────────────────────────────────────
    // In pseudo-fullscreen, and in the page's hero (desktop), the cells are
    // sized to fill the scroll box exactly: the box is laid out by CSS, this
    // only divides it. Below 768px the grid keeps its natural size and
    // scrolls sideways.
    function isFitted() {
      return container.classList.contains('is-fullscreen') ||
             !!container.closest('.trellis-hero');
    }
    function resizeForFullscreen() {
      if (window.innerWidth < 768 || !isFitted()) {
        container.style.removeProperty('--fs-cell-w');
        container.style.removeProperty('--fs-cell-h');
        return;
      }
      // Read the scroll container's actual rendered dimensions — this is the
      // ground truth after CSS has laid out the flex column.
      var scrollW  = scroll.clientWidth;
      var scrollH  = scroll.clientHeight;
      var theadH   = table.querySelector('thead').offsetHeight || 82;
      var rowHeaderW = table.querySelector('.corner-th').offsetWidth || 174;

      var colW = Math.max(100, Math.floor((scrollW - rowHeaderW) / nCols));
      // one px of border per row, so the last row does not slip under the clip
      var rowH = Math.max(52,  Math.floor((scrollH - theadH - nRows - 2) / nRows));

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
      document.body.style.overflow = '';
      updateFsBtn(false);
      requestAnimationFrame(resizeForFullscreen);   // back to the hero's box
    }

    function updateFsBtn(active) {
      if (active) {
        fsBtn.innerHTML = '<svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M5 1v4H1M9 1v4h4M1 9h4v4M13 9H9v4"/></svg>';
        fsBtn.title = 'Exit full screen (Esc)';
        fsBtn.setAttribute('aria-label', 'Exit full screen');
      } else {
        fsBtn.innerHTML = '<svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M1 5V1h4M9 1h4v4M13 9v4H9M5 13H1V9"/></svg>';
        fsBtn.title = 'Full screen (Esc to exit)';
        fsBtn.setAttribute('aria-label', 'Full screen');
      }
    }

    // ── Native Fullscreen API helpers (real OS-level fullscreen) ──────────
    function nativeFsElement() {
      return document.fullscreenElement || document.webkitFullscreenElement || null;
    }
    function requestNativeFs(el) {
      var req = el.requestFullscreen || el.webkitRequestFullscreen;
      if (req) {
        try {
          var p = req.call(el);
          if (p && typeof p.catch === 'function') p.catch(function () {});
        } catch (e) { /* fall back silently to pseudo-FS only */ }
      }
    }
    function exitNativeFs() {
      var ex = document.exitFullscreen || document.webkitExitFullscreen;
      if (ex && nativeFsElement()) {
        try {
          var p = ex.call(document);
          if (p && typeof p.catch === 'function') p.catch(function () {});
        } catch (e) {}
      }
    }

    fsBtn.addEventListener('click', function () {
      if (container.classList.contains('is-fullscreen')) {
        exitNativeFs();
        exitPseudoFS();
      } else {
        enterPseudoFS();
        requestNativeFs(container);
      }
    });

    // If the user exits native fullscreen (Esc, F11, browser UI), drop our
    // pseudo-fullscreen layout too so the page returns cleanly.
    function onFsChange() {
      if (!nativeFsElement() && container.classList.contains('is-fullscreen')) {
        exitPseudoFS();
      } else if (nativeFsElement() === container) {
        // Native FS just enabled — re-measure after the viewport settles.
        requestAnimationFrame(function () {
          requestAnimationFrame(resizeForFullscreen);
        });
      }
    }
    document.addEventListener('fullscreenchange', onFsChange);
    document.addEventListener('webkitfullscreenchange', onFsChange);

    window.addEventListener('resize', function () {
      requestAnimationFrame(resizeForFullscreen);
    });
    requestAnimationFrame(resizeForFullscreen);

    return {
      container: container,
      openCell: function (ri, ci) {
        if (ri >= 0 && ri < nRows && ci >= 0 && ci < nCols) openCell(ri, ci);
      },
      isOpen: function () { return panel.classList.contains('open'); },
      fit: resizeForFullscreen
    };
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

    /* `[words](#RC)` — or `[words](#2-RC)` on a page of several matrices —
       is a reference to one cell: it renders as a link that opens that
       cell's panel over the essay, so the argument can be checked against
       the grid without losing one's place. */
    function inlineMarkup(s) {
      return s
        .replace(/\[([^\]]+)\]\(#(?:(\d+)-)?(\d)(\d)\)/g, function (_, t, m, r, c) {
          return '<a class="cell-ref" href="#mx-' + (m || 1) + '" data-ref="' + (m ? m + '-' : '') + r + c +
            '" data-mx="' + (m || 1) +
            '" data-r="' + r + '" data-c="' + c + '">' + t +
            '<span class="cell-ref-num">' + r + c + '</span></a>';
        })
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.+?)\*/g, '<em>$1</em>');
    }

    var html = '';
    /* the essay is the page's last স্টেশন — an anchor here puts it in the
       menubar সূচি under its own name, below the matrices */
    if (title) {
      html += '<div class="section-title" id="essay" data-toc="' +
        title.replace(/"/g, '&quot;') + '">' + title + '</div>\n';
    }
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

  // The matrices and the essay are fetched independently and land in either
  // order, so each announces itself. site.js rebuilds the সূচি from scratch
  // on every `content-ready`, so announcing twice costs nothing and
  // announcing once would race.
  function announce() {
    document.dispatchEvent(new CustomEvent('content-ready'));
  }

  // Split a data file into one-or-more matrix blocks. A new block begins at a
  // top-level "# " heading once the current block already holds an "axes:"
  // line — so a single-matrix file never splits, while a file with several
  // matrices (e.g. god: philosophers + prophets) yields one block each.
  function splitMatrices(text) {
    var lines = text.split('\n'), blocks = [], cur = [];
    function hasAxes(arr) {
      return arr.some(function (l) { return l.trim() === 'axes:'; });
    }
    for (var i = 0; i < lines.length; i++) {
      if (/^#\s+/.test(lines[i]) && cur.length && hasAxes(cur)) {
        blocks.push(cur.join('\n'));
        cur = [lines[i]];
      } else {
        cur.push(lines[i]);
      }
    }
    if (cur.length) blocks.push(cur.join('\n'));
    return blocks.filter(function (b) { return b.trim(); });
  }

  // The `# Title` heading a chunk opens with. parseMarkdown never reads it —
  // it looks only for `axes:`, `## sections` and `### items` — so it is read
  // here, where the chunks are still whole, and handed to buildMatrix.
  function matrixTitle(chunk) {
    var m = chunk.match(/^#\s+(.+?)\s*$/m);
    return m ? m[1].trim() : '';
  }

  // Every built matrix, in file order — the essay's cell links address them
  // as #1-RC, #2-RC …
  var matrices = [];
  var slider = null;

  function loadAndBuild(src, mountId) {
    var mount = document.getElementById(mountId);
    if (!mount) return;
    fetch(src)
      .then(function (res) { return res.text(); })
      .then(function (text) {
        var chunks = splitMatrices(text);
        var titles = chunks.map(matrixTitle);
        var slots = chunks.length > 1 ? buildSlider(mount, titles) : [mount];
        chunks.forEach(function (chunk, i) {
          matrices.push(buildMatrix(slots[i], parseSource(src, chunk), {
            title:     titles[i],
            anchor:    'mx-' + (i + 1),
            showTitle: false,
          }));
        });
        if (document.fonts && document.fonts.ready) {
          document.fonts.ready.then(function () {
            matrices.forEach(function (m) { if (m) m.fit(); });
          });
        }
        announce();
      });
  }

  // ── Slider: several matrices share the hero, one at a time ─────────────
  // A horizontal scroll-snap track, so a swipe or a trackpad moves it
  // natively and the সূচি's scrollIntoView lands on the right slide with no
  // help. The tabs name the matrices; the arrows and ←/→ step between them.
  function buildSlider(mount, titles) {
    var wrap = document.createElement('div');
    wrap.className = 'mx-slider';

    var bar = document.createElement('div');
    bar.className = 'mx-tabs';
    var prev = document.createElement('button');
    prev.className = 'mx-step';
    prev.setAttribute('aria-label', 'আগের ছক');
    prev.innerHTML = '&#8249;';
    var next = document.createElement('button');
    next.className = 'mx-step';
    next.setAttribute('aria-label', 'পরের ছক');
    next.innerHTML = '&#8250;';

    var track = document.createElement('div');
    track.className = 'mx-track';

    var tabs = [], slots = [];
    bar.appendChild(prev);
    titles.forEach(function (t, i) {
      var tab = document.createElement('button');
      tab.className = 'mx-tab';
      tab.textContent = t || ('' + (i + 1));
      tab.addEventListener('click', function () { go(i); });
      bar.appendChild(tab);
      tabs.push(tab);

      var slide = document.createElement('div');
      slide.className = 'mx-slide';
      track.appendChild(slide);
      slots.push(slide);
    });
    bar.appendChild(next);

    wrap.appendChild(bar);
    wrap.appendChild(track);
    mount.appendChild(wrap);

    var cur = 0;
    function mark(i) {
      cur = i;
      tabs.forEach(function (t, k) { t.classList.toggle('active', k === i); });
      prev.disabled = i <= 0;
      next.disabled = i >= tabs.length - 1;
    }
    function go(i, instant) {
      i = Math.max(0, Math.min(tabs.length - 1, i));
      track.scrollTo({ left: i * track.clientWidth, behavior: instant ? 'auto' : 'smooth' });
      mark(i);
    }
    // a swipe moves the tabs once the track settles — mid-glide positions
    // would drag the mark back during a tab's own smooth scroll
    var settle = 0;
    track.addEventListener('scroll', function () {
      clearTimeout(settle);
      settle = setTimeout(function () {
        var i = Math.round(track.scrollLeft / Math.max(1, track.clientWidth));
        if (i !== cur) mark(i);
      }, 90);
    }, { passive: true });
    prev.addEventListener('click', function () { go(cur - 1); });
    next.addEventListener('click', function () { go(cur + 1); });

    // ←/→ turn the slide while the hero is on screen and no panel is open
    document.addEventListener('keydown', function (e) {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      if (document.querySelector('.table-panel.open, .is-fullscreen')) return;
      var r = wrap.getBoundingClientRect();
      if (r.bottom < window.innerHeight * 0.4 || r.top > window.innerHeight * 0.6) return;
      e.preventDefault();
      go(cur + (e.key === 'ArrowRight' ? 1 : -1));
    });
    window.addEventListener('resize', function () { go(cur, true); });

    mark(0);
    slider = { go: go };
    return slots;
  }

  // An essay's cell link opens that cell's panel over the essay, and turns
  // the slider to its matrix underneath so the grid agrees on the way back.
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a.cell-ref');
    if (!a) return;
    var m = matrices[(+a.dataset.mx || 1) - 1];
    if (!m) return;
    e.preventDefault();
    if (slider) slider.go((+a.dataset.mx || 1) - 1, true);
    m.openCell(+a.dataset.r, +a.dataset.c);
  });

  // Unified config — every trellis page uses the same shape:
  //   window.TRELLIS_CONFIG = { data: 'trellis.md', essay: 'essay.md', mountId: 'trellis-mount' }
  // `data` may hold one or several matrices; `essay` may be empty (skipped).
  var cfg = window.TRELLIS_CONFIG || {};

  if (cfg.data) {
    loadAndBuild(cfg.data, cfg.mountId || 'trellis-mount');
  }

  if (cfg.essay) {
    fetch(cfg.essay)
      .then(function (res) { return res.ok ? res.text() : ''; })
      .then(function (md) {
        var mount = document.getElementById('essay-mount');
        if (mount && md && md.trim()) { renderEssay(md, mount); announce(); }
      });
  }

}());
