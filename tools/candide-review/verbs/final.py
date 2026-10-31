"""The owner's choices applied to Claude's guesses: the final standard → Dhaka map."""
from pathlib import Path
HERE = Path(__file__).resolve().parent
SITE_TSV = HERE.parents[2] / 'src/data/gadya/candide.tsv'
STORE = HERE.parent / 'store/verbs'
OUT = HERE.parent / 'work'
import json, glob, re
import lexicon as L, tui as T, match as M
from words import GROUPS

def load(col):
    out = {}
    for f in glob.glob(str(STORE / col / '*.json')):
        d = json.load(open(f)); d = d.get('data', d); out[f.split('/')[-1][:-5]] = d
    return out
CELLS = {(d['verb'], d['cat']): d['val'] for d in load('cells').values()}
WORDS = {(d['std'], d['field']): d['val'] for d in load('words').values()}

def house(cat, dh, verb=None):
    """The owner's spelling: no ো added to an ending (করল, করত, করব, করছ, আছ)."""
    if cat == 'fut.1' and dh.endswith('বো'): dh = dh[:-1]
    if cat in ('prog.2', 'perf.2', 'pres.2') and dh.endswith('ছো'): dh = dh[:-1]
    if verb in ('দেওয়া', 'নেওয়া') and cat == 'fut.1': dh = {'দেওয়া': 'দিব', 'নেওয়া': 'নিব'}[verb]
    return dh

def final(verb, cat, std, guess):
    if (verb, cat) in CELLS: return CELLS[(verb, cat)], 'confirmed'
    return house(cat, guess, verb), 'accepted'

AMBIG = {'hab.2', 'past.2', 'fut.2'}   # করতে/করলে/করবে: তুমি or not, by context
rows = []
for verb, (s, d) in L.LEX.items():
    for cat in s:
        dh, st = final(verb, cat, s[cat], d[cat])
        rows.append((s[cat], dh, verb, cat, st))
    for f, cat in L.ALIAS.get(verb, {}).items():
        g = L.ALIAS_DH.get(f, d.get(cat, f))
        rows.append((f, final(verb, cat, f, g)[0] if (verb, cat) not in CELLS else CELLS[(verb, cat)], verb, cat, 'accepted'))
for verb, cells in T.TUI.items():
    for cat, (s, d) in cells.items():
        dh, st = final(verb, cat, s, d)
        rows.append((s, dh, verb, cat, st))
# a form spelt in two ways in standard (হল/হলো) maps the same
extra = []
for s, dh, verb, cat, st in rows:
    if cat in ('past.3', 'pprog.3', 'pperf.3', 'hab.3') and re.search('[লত]$', s): extra.append((s + 'ো', dh, verb, cat, st))
rows += extra
seen = set(); FORMS = []
for r in rows:
    if (r[0], r[2], r[3]) in seen: continue
    seen.add((r[0], r[2], r[3])); FORMS.append(r)

WORDMAP = []
for gname, note, items in GROUPS:
    for w, g, n in items:
        v = WORDS.get((w, 'all'), g); dv = WORDS.get((w, 'dialogue'), '')
        st = 'confirmed' if (w, 'all') in WORDS else 'accepted'
        WORDMAP.append((w, v, dv, gname, st, n))
