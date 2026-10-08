#!/usr/bin/env python3
"""Merge align/out_*.json into the four line-scoped word-lists
public/translations/sonnets/<part>/<part>-words.md  (| sonnet.line | bn | en |).
Pairs whose tokens no longer occur in the current line (after later edits)
are dropped, so the map never points at words that are not there."""
import glob, json, os, re, sys, unicodedata
REPO = sys.argv[1]
HERE = os.environ.get('SONNET_WORK') or os.getcwd()   # the work dir: data/ out/ align/
PARTS = [('usha', 1, 38), ('diba', 39, 77), ('sandhya', 78, 115), ('nisha', 116, 154)]

def norm(w):
    w = unicodedata.normalize('NFC', w).strip()
    w = re.sub(r"[^\w']", '', w).replace('_', '')
    return w.lower()

# current lines from the md
cur = {}
for p, lo, hi in PARTS:
    n, li = None, 0
    for s in open(os.path.join(REPO, 'public/translations/sonnets', p, p + '.md'), encoding='utf-8'):
        s = s.strip()
        if not s.startswith('|') or re.match(r'^\|[-:\s|]+\|$', s) or s.startswith('| বাংলা'): continue
        cells = [c.strip() for c in s[1:-1].split('|')]
        if all(not c for c in cells): continue
        if cells[2]: n, li = int(cells[2]), 0
        li += 1
        cur[f'{n}.{li}'] = ({norm(t) for t in cells[0].split()}, {norm(t) for t in cells[1].split()})

pairs = {}
for f in sorted(glob.glob(os.path.join(HERE, 'align', 'out_*.json'))):
    try: d = json.load(open(f, encoding='utf-8'))
    except Exception as e: print('SKIP', f, e); continue
    for k, lst in d.items():
        # the re-alignment of revised lines replaces, not adds to, earlier pairs
        if os.path.basename(f) == 'out_10.json': pairs[k] = []
        pairs.setdefault(k, [])
        for pr in lst:
            if isinstance(pr, list) and len(pr) == 2: pairs[k].append((pr[0], pr[1]))

kept = dropped = 0
for p, lo, hi in PARTS:
    out = ['---', 'type: words', 'lang: en', '---', '']
    for k in sorted(pairs, key=lambda x: (int(x.split('.')[0]), int(x.split('.')[1]))):
        n = int(k.split('.')[0])
        if not (lo <= n <= hi) or k not in cur: continue
        bnset, enset = cur[k]
        seen = set()
        for bn, en in pairs[k]:
            if norm(bn) in bnset and norm(en) in enset and (norm(bn), norm(en)) not in seen:
                seen.add((norm(bn), norm(en)))
                out.append(f'| {k} | {bn.replace("|", "")} | {en.replace("|", "")} |'); kept += 1
            else:
                dropped += 1
    path = os.path.join(REPO, 'public/translations/sonnets', p, p + '-words.md')
    open(path, 'w', encoding='utf-8').write('\n'.join(out) + '\n')
    print('wrote', path, len(out) - 5, 'pairs')
print('kept', kept, 'dropped', dropped)
