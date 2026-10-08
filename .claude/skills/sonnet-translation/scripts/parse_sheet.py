#!/usr/bin/env python3
"""Dump the sonnet workbook to JSON and print a per-sonnet audit.

Sheet shape: one verse line per row. Column A carries the sonnet number on
the sonnet's first row only; B = Bangla, C = English, D = special words.
An all-empty row is a stanza gap (quatrain / couplet break).
"""
import json, sys
import openpyxl

src, out = sys.argv[1], sys.argv[2]
wb = openpyxl.load_workbook(src, read_only=True, data_only=True)

BN = '০১২৩৪৫৬৭৮৯'
def bn2int(v):
    s = str(v).strip()
    d = ''.join(str(BN.index(c)) if c in BN else c for c in s if c in BN or c.isdigit())
    return int(d) if d else None

def txt(v):
    return '' if v is None else str(v).replace(' ', ' ').strip()

sonnets, cur = [], None
for ws in wb.worksheets:
    rows = list(ws.iter_rows(values_only=True))
    for r in rows[1:]:
        r = list(r) + [None] * (4 - len(r))
        a, b, c, d = (txt(x) for x in r[:4])
        n = bn2int(a) if a else None
        if n is not None:
            cur = {'sheet': ws.title, 'n': n, 'lines': []}
            sonnets.append(cur)
        if cur is None: continue
        if not (b or c or d):
            if cur['lines'] and not cur['lines'][-1].get('gap'):
                cur['lines'].append({'gap': True})
            continue
        cur['lines'].append({'bn': b, 'en': c, 'note': d})

# trim trailing gaps
for s in sonnets:
    while s['lines'] and s['lines'][-1].get('gap'): s['lines'].pop()

sonnets.sort(key=lambda s: s['n'])
json.dump(sonnets, open(out, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)

print('sheets:', [ws.title for ws in wb.worksheets])
print('sonnets:', len(sonnets), 'range', sonnets[0]['n'], '..', sonnets[-1]['n'])
print('\n  n   bn  en  gaps  flags')
import collections
dup = collections.defaultdict(list)
for s in sonnets:
    L = [l for l in s['lines'] if not l.get('gap')]
    bn = [l for l in L if l['bn']]; en = [l for l in L if l['en']]
    gaps = sum(1 for l in s['lines'] if l.get('gap'))
    key = '\n'.join(l['bn'] for l in bn)
    if key: dup[key].append(s['n'])
    flags = []
    if not bn: flags.append('EMPTY')
    elif len(bn) < len(en): flags.append('PARTIAL')
    if len(en) != 14: flags.append(f'en={len(en)}')
    if any('[' in l['bn'] for l in bn): flags.append('bracket')
    if gaps != 3: flags.append(f'gaps={gaps}')
    notes = [l['note'] for l in L if l['note']]
    if notes: flags.append('notes=' + '|'.join(notes)[:50])
    if flags: print(f'{s["n"]:>3}  {len(bn):>3} {len(en):>3}  {gaps:>3}   ' + '; '.join(flags))
print('duplicates:', [v for v in dup.values() if len(v) > 1])
