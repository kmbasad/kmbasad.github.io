// @ts-check
import { defineConfig } from 'astro/config';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import path from 'node:path';

// ── Panthea in-browser story editor (dev server only) ──────────────────────
// Ctrl+double-clicking a Panthea story panel on localhost opens its Markdown
// source (src/stories/panthea/…) in place; Ctrl+Enter writes the file back
// to disk and reloads at the same spot, Esc cancels. The endpoints below (and the editor
// script itself) exist only inside `npm run dev` — the built site that goes
// to kmbasad.github.io contains none of this.
const STORIES_DIR = fileURLToPath(new URL('./src/stories/panthea', import.meta.url));
const EDITOR_JS = fileURLToPath(new URL('./src/dev/panthea-edit.js', import.meta.url));

function pantheaEditor() {
  return {
    name: 'panthea-editor',
    hooks: {
      /** @param {{ server: import('vite').ViteDevServer }} ctx */
      'astro:server:setup'({ server }) {
        // A story path from the client ('index.md', 'minar/17.md') must
        // resolve to an .md file inside src/stories/panthea — nothing else.
        const resolveStory = (/** @type {string | null} */ f) => {
          const p = path.normalize(path.join(STORIES_DIR, f || ''));
          return p.startsWith(STORIES_DIR + path.sep) && p.endsWith('.md') ? p : null;
        };

        server.middlewares.use('/__panthea', (req, res, next) => {
          const url = new URL(req.url || '/', 'http://localhost');

          if (req.method === 'GET' && url.pathname === '/edit.js') {
            res.setHeader('Content-Type', 'text/javascript; charset=utf-8');
            res.end(fs.readFileSync(EDITOR_JS));
            return;
          }

          if (req.method === 'GET' && url.pathname === '/raw') {
            const p = resolveStory(url.searchParams.get('f'));
            if (!p) { res.statusCode = 400; res.end('bad story path'); return; }
            res.setHeader('Content-Type', 'text/plain; charset=utf-8');
            res.end(fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : '');
            return;
          }

          if (req.method === 'POST' && url.pathname === '/save') {
            let body = '';
            req.on('data', (c) => { body += c; });
            req.on('end', () => {
              try {
                const { f, content } = JSON.parse(body);
                const p = resolveStory(f);
                if (!p) { res.statusCode = 400; res.end('bad story path'); return; }
                fs.mkdirSync(path.dirname(p), { recursive: true });
                fs.writeFileSync(p, content, 'utf8');
                res.end('ok');
              } catch (e) {
                res.statusCode = 500;
                res.end(String(e));
              }
            });
            return;
          }

          next();
        });
      },
    },
  };
}

// ── Translations in-browser verse editor (dev server only) ─────────────────
// On a Translations reading page, Ctrl+double-clicking a বাংলা verse cell
// makes it editable in place; Ctrl+Enter writes the line back into its
// public/translations/**.md source (the dev server then reloads the page at
// the same scroll position), Esc cancels. Like the Panthea editor, none of
// this exists in the production build.
const TRANS_DIR = fileURLToPath(new URL('./public/translations', import.meta.url));
const TRANS_EDITOR_JS = fileURLToPath(new URL('./src/dev/trans-edit.js', import.meta.url));

function transEditor() {
  return {
    name: 'trans-editor',
    hooks: {
      /** @param {{ server: import('vite').ViteDevServer }} ctx */
      'astro:server:setup'({ server }) {
        // A client path ('/translations/divan/prathama/prathama.md') must
        // resolve to an .md file inside public/translations — nothing else.
        const resolveMd = (/** @type {string | null} */ f) => {
          const rel = String(f || '').replace(/^\/translations\//, '');
          const p = path.normalize(path.join(TRANS_DIR, rel));
          return p.startsWith(TRANS_DIR + path.sep) && p.endsWith('.md') ? p : null;
        };

        server.middlewares.use('/__trans', (req, res, next) => {
          const url = new URL(req.url || '/', 'http://localhost');

          if (req.method === 'GET' && url.pathname === '/edit.js') {
            res.setHeader('Content-Type', 'text/javascript; charset=utf-8');
            res.end(fs.readFileSync(TRANS_EDITOR_JS));
            return;
          }

          if (req.method === 'POST' && url.pathname === '/save-lines') {
            let body = '';
            req.on('data', (c) => { body += c; });
            req.on('end', () => {
              try {
                const { f, edits } = JSON.parse(body);
                const p = resolveMd(f);
                if (!p || !fs.existsSync(p)) { res.statusCode = 400; res.end('bad md path'); return; }
                const lines = fs.readFileSync(p, 'utf8').split('\n');
                for (const { line, bn } of edits) {
                  if (!Number.isInteger(line) || line < 0 || line >= lines.length) {
                    throw new Error(`no line ${line}`);
                  }
                  const orig = lines[line];
                  if (!orig.trimStart().startsWith('|')) {
                    throw new Error(`line ${line} is not a table row: ${orig}`);
                  }
                  // replace the first (বাংলা) cell, leaving the rest untouched
                  const m = orig.match(/^(\s*\|)(.*)(\|\s*)$/);
                  if (!m) throw new Error(`line ${line} is not a closed row`);
                  const cells = m[2].split(/(?<!\\)\|/);
                  cells[0] = ' ' + String(bn).replace(/\|/g, '\\|').trim() + ' ';
                  lines[line] = m[1] + cells.join('|') + m[3];
                }
                fs.writeFileSync(p, lines.join('\n'), 'utf8');
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ ok: true }));
              } catch (e) {
                res.statusCode = 500;
                res.end(String(e));
              }
            });
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
  integrations: [pantheaEditor(), transEditor()],
});
