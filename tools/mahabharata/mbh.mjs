#!/usr/bin/env node
/**
 * The Mahabharata workbench: one Sanskrit line, one Bangla line, the same
 * count. All counting is public/js/sanskrit.js, the page's own rules.
 *
 *   node tools/mahabharata/mbh.mjs import <MBhNN.txt> <chapter> <out.md>
 *       A chapter of the BORI critical edition (Tokunaga–Smith e-text,
 *       bombay.indology.info/mahabharata/text/UD/MBhNN.txt) as the page's
 *       table: Bangla empty, the Devanagari, the verse number on a verse's
 *       first line, and each line's quarters ("8+8", "11+12"). Speaker lines
 *       become marker rows, prose stays one row. Never overwrites.
 *
 *   node tools/mahabharata/mbh.mjs fill <page.md> <drafts.tsv>
 *       Writes Bangla into the table: each draft line is `verse.line<TAB>bangla`
 *       (e.g. `2.1`), the same key the page, the crib and the word map use.
 *
 *   node tools/mahabharata/mbh.mjs check <page.md> [--all]
 *       Every line: the Sanskrit's syllables against its quarters, and the
 *       Bangla's অক্ষরবৃত্ত — the same total, each পর্ব ending on a word
 *       where the quarter ends. Lists the faults (--all: every line);
 *       exits 1 when there are any.
 */
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const ctx = {};
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(here, '../../public/js/sanskrit.js'), 'utf8'), ctx);
const SA = ctx.Sanskrit;


/* ── the page's table ─────────────────────────────────────────────── */

// rows as the page keys them: [{ i (md line index), key, bn, src, num, meter }]
function readRows(md) {
  const lines = md.split('\n'), rows = [];
  let verse = null, vl = 0;
  lines.forEach((l, i) => {
    const s = l.trim();
    if (!s.startsWith('|') || /^\|[-:\s|]+\|$/.test(s) || s.startsWith('| বাংলা')) return;
    const c = s.slice(1, -1).split('|').map((x) => x.trim());
    if (c.every((x) => !x)) return;
    if (/^\*\(.*\)\*$/.test(c[0])) return;           // a speaker's marker row
    if (/^\d+$/.test(c[2] || '')) { verse = +c[2]; vl = 0; }
    vl++;
    rows.push({ i, key: `${verse}.${vl}`, bn: c[0], src: c[1], num: c[2] || '', meter: c[3] || '' });
  });
  return rows;
}

const cell = (s) => String(s).replace(/\|/g, '\\|');
const rowText = (r) => `| ${cell(r.bn)} | ${cell(r.src)} | ${r.num} | ${r.meter} |`;

/* ── import ───────────────────────────────────────────────────────── */

const SPEAKER = {
  'सूत उवाच': 'সূত বললেন',
  'ऋषय ऊचुः': 'ঋষিরা বললেন',
  'शौनक उवाच': 'শৌনক বললেন',
  'वैशंपायन उवाच': 'বৈশম্পায়ন বললেন',
  'जनमेजय उवाच': 'জনমেজয় বললেন',
};

// the quarters of a line: `;` parts a long line's halves in the e-text;
// an anuṣṭubh line is 8+8, a nine-syllable quarter placed by the word break
function quarters(src) {
  if (src.includes(';')) return src.split(';').map((p) => SA.syllables(p)).join('+');
  const n = SA.syllables(src);
  if (n === 16) return '8+8';
  if (n === 17) {
    let cum = 0;
    const ends = src.split(/\s+/).map((w) => (cum += SA.syllables(w)));
    return ends.includes(9) || !ends.includes(8) ? '9+8' : '8+9';
  }
  return String(n);
}

function importChapter(file, chapter, out) {
  if (fs.existsSync(out)) throw new Error(`${out} exists; not overwriting`);
  const recs = [];
  for (const l of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = l.match(/^(\d{2})(\d{3})(\d{3})(.)\s?(.*)$/);
    if (m && +m[2] === +chapter) recs.push({ book: +m[1], verse: +m[3], half: m[4], text: m[5].trim() });
  }
  if (!recs.length) throw new Error(`chapter ${chapter} not in ${file}`);
  const md = [
    '---',
    `title: Mahabharata ${recs[0].book}.${chapter}`,
    'type: tercet',
    'lang: sa',
    'keys: verse',
    `source: BORI critical edition, ${recs[0].book}.${chapter} (Tokunaga–Smith e-text)`,
    '---',
    '',
    '| বাংলা | সংস্কৃত | # | পাদ |',
    '| :-- | :-- | --: | :-- |',
  ];
  let last = null;
  for (const r of recs) {
    if (r.half === ' ') {                              // a speaker line
      md.push(`| *(${SPEAKER[r.text] || r.text})* | ${r.text} |  |  |`);
      continue;
    }
    const first = r.verse !== last;
    last = r.verse;
    const prose = /[A-Z]/.test(r.half);
    const src = r.text.replace(/\s*;\s*/g, ' ');
    md.push(`|  | ${src} | ${first ? r.verse : ''} | ${prose ? '' : quarters(r.text)} |`);
  }
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, md.join('\n') + '\n');
  console.log(`${out}: ${recs.length} lines of ${recs[0].book}.${chapter}`);
}

/* ── fill ─────────────────────────────────────────────────────────── */

function fill(page, drafts) {
  const md = fs.readFileSync(page, 'utf8'), lines = md.split('\n');
  const byKey = new Map(readRows(md).map((r) => [r.key, r]));
  let n = 0;
  for (const l of fs.readFileSync(drafts, 'utf8').split(/\r?\n/)) {
    const t = l.indexOf('\t');
    if (t < 0 || l.startsWith('#')) continue;
    const key = l.slice(0, t).trim(), bn = l.slice(t + 1).trim();
    const r = byKey.get(key);
    if (!r) { console.error(`no line ${key}`); continue; }
    r.bn = bn;
    lines[r.i] = rowText(r);
    n++;
  }
  fs.writeFileSync(page, lines.join('\n'));
  console.log(`${page}: ${n} lines filled`);
}

/* ── check ────────────────────────────────────────────────────────── */

function check(page, all) {
  const rows = readRows(fs.readFileSync(page, 'utf8'));
  let ok = 0, faults = 0, empty = 0, prose = 0;
  for (const r of rows) {
    if (!r.meter) { prose++; continue; }
    const ps = SA.parseMeter(r.meter), want = ps.reduce((a, b) => a + b, 0);
    const problems = [];
    const syl = SA.syllables(r.src);
    if (syl !== want) problems.push(`Sanskrit has ${syl}, quarters say ${r.meter}`);
    if (!r.bn) { empty++; if (all) console.log(`${r.key}\t—\t(not yet translated)`); continue; }
    const a = SA.akshar(r.bn), ends = new Set(a.words.map((w) => w.cum));
    if (a.total !== want) problems.push(`Bangla ${a.total} মাত্রা, needs ${want}`);
    let cum = 0;
    ps.slice(0, -1).forEach((p) => {
      cum += p;
      if (!ends.has(cum)) {
        const w = a.words.find((x) => x.cum > cum);
        problems.push(`no word ends at ${cum}${w ? ` (${w.w} runs ${w.cum - w.matra}→${w.cum})` : ''}`);
      }
    });
    const shape = a.words.map((w) => w.matra).join(' ');
    if (problems.length) {
      faults++;
      console.log(`✗ ${r.key}\t${r.meter}\t${r.bn}\n\t[${shape}] ${problems.join('; ')}`);
    } else {
      ok++;
      if (all) console.log(`✓ ${r.key}\t${r.meter}\t${r.bn}`);
    }
  }
  console.log(`\n${page}: ${ok} lines right, ${faults} faults, ${empty} untranslated, ${prose} prose`);
  return faults;
}

const [cmd, ...args] = process.argv.slice(2);
try {
  if (cmd === 'import') importChapter(args[0], args[1], args[2]);
  else if (cmd === 'fill') fill(args[0], args[1]);
  else if (cmd === 'check') process.exitCode = check(args[0], args.includes('--all')) ? 1 : 0;
  else console.log(fs.readFileSync(fileURLToPath(import.meta.url), 'utf8').split('*/')[0]);
} catch (e) {
  console.error(e.message);
  process.exitCode = 2;
}
