(function () {
  'use strict';

  // ── Lightweight-markup → HTML converter ────────────────────────────────
  // Converts *word* → <em>word</em> and wraps bare text in <p> tags.
  // Only applied to externally loaded JSON (inline JSON already has HTML).
  function markupToHtml(text) {
    if (!text) return text;
    // If text already contains <p> tags, assume it's already HTML
    if (text.indexOf('<p>') !== -1) return text;
    // Convert *…* to <em>…</em>, **…** to <strong>…</strong>
    var html = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
    // Split on double newlines into paragraphs
    html = html.split(/\n\n+/).map(function (p) { return '<p>' + p.trim() + '</p>'; }).join('');
    return html;
  }

  // Apply markupToHtml to all text fields in config loaded from external JSON
  function convertMarkup(cfg) {
    function convertItem(item) {
      if (item.l) item.l = markupToHtml(item.l);
      if (item.b) item.b = markupToHtml(item.b);
    }
    if (cfg.cells) {
      cfg.cells.forEach(function (row) {
        row.forEach(convertItem);
      });
    }
    if (cfg.rowSynths) {
      cfg.rowSynths.forEach(convertItem);
    }
    if (cfg.colSynths) {
      cfg.colSynths.forEach(convertItem);
    }
    return cfg;
  }

  function initTable(cfg) {
    var table   = document.getElementById(cfg.tableId);
    var panel   = document.getElementById(cfg.panelId);
    var overlay = document.getElementById(cfg.overlayId);
    var btnPrev = document.getElementById(cfg.prevId);
    var btnNext = document.getElementById(cfg.nextId);
    var nRows = cfg.rows.length;
    var nCols = cfg.cols.length;
    var ap = -1, ah = -1, synthMode = false;

    // ── Build tbody rows (god-style: dynamic rows) ───────────────────────────
    if (cfg.tbodyId) {
      var tbody = document.getElementById(cfg.tbodyId);
      cfg.rows.forEach(function (row, ri) {
        var tr = document.createElement('tr');
        var th = document.createElement('th');
        th.style.cursor = 'pointer';
        th.title = cfg.rowTitle || 'Click for synthesis';
        th.innerHTML =
          '<span class="th-num">' + ri + '</span>' +
          '<span class="prop-name">' + row.name + '</span>' +
          '<span class="prop-desc">' + row.desc + '</span>';
        th.addEventListener('click', (function (ri) { return function () { openRowSynth(ri); }; })(ri));
        tr.appendChild(th);
        cfg.cols.forEach(function (col, ci) {
          var td = document.createElement('td');
          var b  = document.createElement('button');
          b.className = 'cell-btn';
          var numSpan = document.createElement('span');
          numSpan.className = 'cell-num';
          numSpan.textContent = ri + '' + ci;
          b.appendChild(numSpan);
          b.appendChild(document.createTextNode(cfg.cells[ri][ci].s));
          b.dataset.ri = ri;
          b.dataset.ci = ci;
          b.addEventListener('click', (function (ri, ci) { return function () { openCell(ri, ci); }; })(ri, ci));
          td.appendChild(b);
          tr.appendChild(td);
        });
        tbody.appendChild(tr);
      });
    }

    // ── Wire column headers + add numbering ───────────────────────────────────
    cfg.cols.forEach(function (col, ci) {
      var hdr = cfg.colHdrPrefix
        ? document.getElementById(cfg.colHdrPrefix + ci)
        : table.querySelector('thead th[' + cfg.colHdrAttr + '="' + col.key + '"]');
      if (hdr) {
        hdr.style.cursor = 'pointer';
        hdr.addEventListener('click', (function (ci) { return function () { openColSynth(ci); }; })(ci));
        // Add column number
        var inner = hdr.querySelector('.th-inner');
        if (inner && !inner.querySelector('.th-num')) {
          var num = document.createElement('span');
          num.className = 'th-num';
          num.textContent = ci;
          inner.insertBefore(num, inner.firstChild);
        }
      }
    });

    // ── Wire pre-built row headers (chan-wook-style) ─────────────────────────
    if (cfg.rowHdrAttr) {
      var rowThs = table.querySelectorAll('tbody th[' + cfg.rowHdrAttr + ']');
      rowThs.forEach(function (th, ri) {
        th.style.cursor = 'pointer';
        th.addEventListener('click', (function (ri) { return function () { openRowSynth(ri); }; })(ri));
        // Add row number
        if (!th.querySelector('.th-num')) {
          var num = document.createElement('span');
          num.className = 'th-num';
          num.textContent = ri;
          th.insertBefore(num, th.firstChild);
        }
      });
      // Add cell numbers to pre-built cells
      var trs = table.querySelectorAll('tbody tr');
      trs.forEach(function (tr, ri) {
        var btns = tr.querySelectorAll('.cell-btn');
        btns.forEach(function (btn, ci) {
          if (!btn.querySelector('.cell-num')) {
            var num = document.createElement('span');
            num.className = 'cell-num';
            num.textContent = ri + '' + ci;
            btn.insertBefore(num, btn.firstChild);
          }
        });
      });
      table.addEventListener('click', function (e) {
        var cell = e.target.closest('[' + cfg.cellKeyAttr + ']');
        if (!cell) return;
        var key = cell.getAttribute(cfg.cellKeyAttr);
        if (!key) return;
        var dash = key.indexOf('-');
        var colKey = key.slice(0, dash);
        var rowKey = key.slice(dash + 1);
        var ri = cfg.rows.findIndex(function (r) { return r.key === rowKey; });
        var ci = cfg.cols.findIndex(function (c) { return c.key === colKey; });
        if (ri >= 0 && ci >= 0) openCell(ri, ci);
      });
    }

    // ── Content builder ──────────────────────────────────────────────────────
    function content(type, ri, ci) {
      if (cfg.labelId) {
        // chan-wook style: cells/synths have {h, k, b}
        var e, lbl;
        if (type === 'cell') { e = cfg.cells[ri][ci]; lbl = cfg.labelCell || 'Concept'; }
        else if (type === 'row') { e = cfg.rowSynths[ri]; lbl = cfg.labelRow || 'Film'; }
        else { e = cfg.colSynths[ci]; lbl = cfg.labelCell || 'Concept'; }
        return { label: lbl, prop: e.h, name: e.k, long: e.b };
      } else {
        // god style: cells have {s, l}, synths have {s, l}
        if (type === 'cell') {
          var e = cfg.cells[ri][ci];
          return {
            prop: cfg.rows[ri].name, name: cfg.cols[ci].n,
            meta: cfg.cols[ci].d + ' \u00b7 ' + cfg.cols[ci].c,
            short: e.s, long: e.l
          };
        } else if (type === 'row') {
          var e = cfg.rowSynths[ri];
          return {
            prop: cfg.rows[ri].name,
            name: cfg.rowSynthName || 'Synthesis',
            meta: (cfg.rowSynthMetaPrefix || '') + cfg.rows[ri].desc,
            short: e.s, long: e.l
          };
        } else {
          var e = cfg.colSynths[ci];
          return {
            prop: cfg.cols[ci].n,
            name: cfg.cols[ci].d + ' \u00b7 ' + cfg.cols[ci].c,
            meta: cfg.colSynthMeta || '',
            short: e.s, long: e.l
          };
        }
      }
    }

    // ── Panel helpers ────────────────────────────────────────────────────────
    function setPanel(c) {
      function set(id, val, html) {
        var el = id && document.getElementById(id);
        if (!el) return;
        if (html) el.innerHTML = val || '';
        else el.textContent = val || '';
      }
      set(cfg.labelId, c.label);
      set(cfg.propId,  c.prop);
      set(cfg.nameId,  c.name);
      set(cfg.metaId,  c.meta);
      set(cfg.shortId, c.short);
      set(cfg.longId,  c.long, true);
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
      var hdr = cfg.colHdrPrefix
        ? document.getElementById(cfg.colHdrPrefix + ci)
        : table.querySelector('thead th[' + cfg.colHdrAttr + '="' + cfg.cols[ci].key + '"]');
      if (hdr) hdr.classList.add('col-active');
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
      if (cfg.rowHdrAttr) {
        var key = cfg.cols[ci].key + '-' + cfg.rows[ri].key;
        var cell = table.querySelector('[' + cfg.cellKeyAttr + '="' + key + '"] .cell-btn');
        if (cell) cell.classList.add('active');
      } else {
        var btn = table.querySelector('.cell-btn[data-ri="' + ri + '"][data-ci="' + ci + '"]');
        if (btn) btn.classList.add('active');
      }
      setPanel(content('cell', ri, ci));
      btnPrev.disabled = ci <= 0;
      btnNext.disabled = ci >= nCols - 1;
      openSlide();
    }

    function closePanel() {
      clearActive(); synthMode = false; ap = -1; ah = -1;
      panel.classList.remove('open'); overlay.classList.remove('visible');
    }

    document.getElementById(cfg.closeId).addEventListener('click', closePanel);
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

  // ── Markdown → HTML converter (for essay) ─────────────────────────────────
  // Converts *word* → <em>, **word** → <strong>, blank-line-separated → <p>
  function mdToHtml(md) {
    var paragraphs = md.split(/\n{2,}/);
    return paragraphs
      .filter(function (p) { return p.trim(); })
      .map(function (p) {
        var h = p.trim();
        // **…** → <strong>…</strong>  (must come before single *)
        h = h.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
        // *…* → <em>…</em>
        h = h.replace(/\*(.+?)\*/g, '<em>$1</em>');
        return '<p>' + h + '</p>';
      })
      .join('\n');
  }

  // ── Auto-discover and initialise all tables on the page ──────────────────

  // Check for external data source (single JSON — consciousness, chan-wook, etc.)
  if (window.MATRIX_DATA_SRC) {
    fetch(window.MATRIX_DATA_SRC)
      .then(function (res) { return res.json(); })
      .then(function (cfg) { initTable(convertMarkup(cfg)); });
  }

  // Check for GOD_DATA array (god page — multiple external JSON files)
  if (window.GOD_DATA) {
    window.GOD_DATA.forEach(function (entry) {
      fetch(entry.src)
        .then(function (res) { return res.json(); })
        .then(function (cfg) { initTable(convertMarkup(cfg)); });
    });
  }

  // Check for GOD_ESSAY_SRC (god page — external markdown essay)
  if (window.GOD_ESSAY_SRC) {
    fetch(window.GOD_ESSAY_SRC)
      .then(function (res) { return res.text(); })
      .then(function (md) {
        var el = document.getElementById('essay-body');
        if (el) el.innerHTML = mdToHtml(md);
      });
  }

  // Fall back to inline <script type="application/json" data-table> blocks
  document.querySelectorAll('script[type="application/json"][data-table]').forEach(function (el) {
    initTable(JSON.parse(el.textContent));
  });

}());
