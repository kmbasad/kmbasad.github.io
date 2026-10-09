// @ts-check
import { defineConfig } from 'astro/config';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import path from 'node:path';

// ── In-place editor (dev server only) ───────────────────────────────────────
// On `npm run dev`, Ctrl+click any text on any page and it becomes editable
// right where it stands; Ctrl+Enter writes the change back into its source
// file, Esc cancels. The client is src/dev/edit.js (loaded by Base.astro in
// DEV only); the endpoints below exist only inside the dev server — the built
// site that goes to kmbasad.github.io contains none of this.
//
//   POST /__edit/lines  { f, edits: [{ line, col, text }] }
//        a verse: rows carry data-mdline, so cell `col` (0 = বাংলা, 1 = the
//        source language — English in Pangea, OCR'd Bangla, Latin …) of those
//        exact table lines is replaced; repeated verses stay unambiguous.
//   POST /__edit/text   { hints, pairs: [{ old, new }] }
//        anything else: the old text (whitespace-flexible) is found once in
//        the page's own sources (hints) or, failing that, in the site's
//        sources at large, and replaced. Several matches → refused, unless
//        exactly one of them is a whole line / heading label / quoted value.
//
// After a save the dev server's own full-reload is held back for a moment:
// the page already shows the new text, and a reload would lose the place
// (and close a trellis panel).
const ROOT = fileURLToPath(new URL('.', import.meta.url));
const EDIT_JS = fileURLToPath(new URL('./src/dev/edit.js', import.meta.url));
const EDIT_ROOTS = [
  'public/translations', 'public/pangea', 'public/trellises',
  'src/stories', 'src/pages', 'src/components', 'src/layouts', 'src/data',
].map((d) => path.join(ROOT, d));
const EDIT_EXT = /\.(md|astro|js|mjs)$/;

function inPlaceEditor() {
  return {
    name: 'in-place-editor',
    hooks: {
      /** @param {{ server: import('vite').ViteDevServer }} ctx */
      'astro:server:setup'({ server }) {
        // '/trellises/ray/essay.md' → public/…; '@stories/panthea/index.md' →
        // src/stories/…; anything resolving outside the roots → null
        const resolve = (/** @type {unknown} */ f) => {
          const s = String(f || '');
          const rel = s.startsWith('@stories/') ? path.join('src/stories', s.slice(9))
                    : s.startsWith('/') ? path.join('public', s) : s;
          const p = path.normalize(path.join(ROOT, rel));
          return EDIT_EXT.test(p) && EDIT_ROOTS.some((r) => p.startsWith(r + path.sep)) ? p : null;
        };

        const allSources = () => {
          /** @type {string[]} */
          const out = [];
          const walk = (/** @type {string} */ d) => {
            if (!fs.existsSync(d)) return;
            for (const e of fs.readdirSync(d, { withFileTypes: true })) {
              const p = path.join(d, e.name);
              if (e.isDirectory()) walk(p);
              else if (EDIT_EXT.test(e.name)) out.push(p);
            }
          };
          EDIT_ROOTS.forEach(walk);
          return out;
        };

        // hold back the reload that our own write would trigger
        let quietUntil = 0;
        const hush = (/** @type {any} */ ch) => {
          if (!ch || typeof ch.send !== 'function' || ch.__hushed) return;
          const send = ch.send.bind(ch);
          ch.send = (/** @type {any[]} */ ...args) => {
            const m = args[0];
            if (Date.now() < quietUntil && m && typeof m === 'object' && m.type === 'full-reload') return;
            return send(...args);
          };
          ch.__hushed = true;
        };
        hush(server.ws);
        hush(/** @type {any} */ (server).hot);
        for (const env of Object.values(/** @type {any} */ (server).environments || {})) hush(env?.hot);

        const esc = (/** @type {string} */ s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const flex = (/** @type {string} */ s) => s.trim().split(/\s+/).map(esc).join('\\s+');
        // a match that is a whole unit: a line, a heading label after "·",
        // a "key: value", a table cell, an element's text, a quoted string
        const WHOLE_BEFORE = /(^|\n)[ \t]*(#+[^\n·]*·[ \t]*)?$|[·:|>"'`][ \t]*$/;
        const WHOLE_AFTER = /^[ \t]*($|\n|\||<|"|'|`)/;

        /** @param {string[]} files @param {string} old */
        const find = (files, old) => {
          const re = new RegExp(flex(old), 'g');
          /** @type {{ p: string, text: string, i: number, len: number, whole: boolean }[]} */
          const hits = [];
          for (const p of files) {
            const text = fs.readFileSync(p, 'utf8');
            for (const m of text.matchAll(re)) {
              const i = m.index ?? 0;
              hits.push({
                p, text, i, len: m[0].length,
                whole: WHOLE_BEFORE.test(text.slice(Math.max(0, i - 200), i)) &&
                       WHOLE_AFTER.test(text.slice(i + m[0].length, i + m[0].length + 5)),
              });
            }
          }
          if (hits.length <= 1) return hits;
          const whole = hits.filter((h) => h.whole);
          return whole.length === 1 ? whole : hits;
        };

        const readBody = (/** @type {any} */ req) => new Promise((ok, bad) => {
          let body = '';
          req.on('data', (/** @type {string} */ c) => { body += c; });
          req.on('end', () => { try { ok(JSON.parse(body)); } catch (e) { bad(e); } });
        });

        const fail = (/** @type {any} */ res, /** @type {number} */ code, /** @type {string} */ msg) => {
          res.statusCode = code;
          res.setHeader('Content-Type', 'text/plain; charset=utf-8');
          res.end(msg);
        };

        server.middlewares.use('/__edit', async (req, res, next) => {
          const url = new URL(req.url || '/', 'http://localhost');

          if (req.method === 'GET' && url.pathname === '/edit.js') {
            res.setHeader('Content-Type', 'text/javascript; charset=utf-8');
            res.end(fs.readFileSync(EDIT_JS));
            return;
          }

          if (req.method === 'POST' && url.pathname === '/lines') {
            try {
              const { f, edits } = /** @type {any} */ (await readBody(req));
              const p = resolve(f);
              if (!p || !fs.existsSync(p)) return fail(res, 400, 'উৎস ফাইল পাওয়া যায়নি');
              const lines = fs.readFileSync(p, 'utf8').split('\n');
              for (const { line, col, text } of edits) {
                const orig = lines[line];
                if (!Number.isInteger(line) || orig == null) throw new Error(`no line ${line}`);
                // the legacy `bangla :: source` line format
                if (!orig.trimStart().startsWith('|') && orig.includes('::')) {
                  const parts = orig.split('::');
                  const c = col === 1 ? 1 : 0;
                  parts[c] = (c ? ' ' : '') + String(text).trim() + (c ? '' : ' ');
                  lines[line] = parts.join('::');
                  continue;
                }
                // replace that one cell, leaving the rest untouched
                const m = orig.match(/^(\s*\|)(.*)(\|\s*)$/);
                if (!m) throw new Error(`line ${line + 1} is not a table row`);
                const cells = m[2].split(/(?<!\\)\|/);
                const c = Number.isInteger(col) ? col : 0;
                if (c < 0 || c >= cells.length) throw new Error(`line ${line + 1} has no cell ${c}`);
                cells[c] = ' ' + String(text).replace(/\|/g, '\\|').trim() + ' ';
                lines[line] = m[1] + cells.join('|') + m[3];
              }
              quietUntil = Date.now() + 2500;
              fs.writeFileSync(p, lines.join('\n'), 'utf8');
              res.end('ok');
            } catch (e) { fail(res, 500, String(e)); }
            return;
          }

          if (req.method === 'POST' && url.pathname === '/text') {
            try {
              const { hints, pairs } = /** @type {any} */ (await readBody(req));
              const hinted = [...new Set((hints || []).map(resolve).filter(Boolean))]
                .filter((p) => fs.existsSync(/** @type {string} */ (p)));
              // try each rendering of the old text (markdown, then plain) —
              // first in the page's own sources, then everywhere
              for (const { old, new: neu } of pairs) {
                if (!old || !old.trim()) continue;
                for (const pool of [hinted, null]) {
                  const hits = find(/** @type {string[]} */ (pool || allSources()), old);
                  if (hits.length === 1) {
                    const h = hits[0];
                    quietUntil = Date.now() + 2500;
                    fs.writeFileSync(h.p, h.text.slice(0, h.i) + neu + h.text.slice(h.i + h.len), 'utf8');
                    res.end(path.relative(ROOT, h.p));
                    return;
                  }
                  if (hits.length > 1) {
                    const where = [...new Set(hits.map((x) => path.relative(ROOT, x.p)))].join(', ');
                    return fail(res, 409, `এই লেখা একাধিক জায়গায় আছে (${where}) — কোনটা, বোঝা গেল না`);
                  }
                }
              }
              fail(res, 404, 'উৎস খুঁজে পাওয়া যায়নি — লেখাটা হয়তো কোড থেকে তৈরি');
            } catch (e) { fail(res, 500, String(e)); }
            return;
          }

          next();
        });
      },
    },
  };
}

// kmbasad.github.io is a GitHub *user* site → served at the domain root,
// so no `base` prefix is needed. Absolute paths like /css/... and /js/...
// resolve against public/ exactly as the legacy site expected.
export default defineConfig({
  site: 'https://kmbasad.github.io',
  integrations: [inPlaceEditor()],
});
