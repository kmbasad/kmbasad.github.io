#!/usr/bin/env python3
"""Build the four sonnet .md files for the site from sonnets.json plus any
agent overlays in out/*.json.

  polish overlays: {"n": {"i": "line"}}      — replace line i (0-based) of sonnet n
  full overlays:   {"n": ["l1", …, "l14"]}   — replace all 14 lines of sonnet n

Output: public/translations/sonnets/<part>/<part>.md in the GFM-table format
md-loader.js reads (type: sonnet). A sonnet's first row carries its number in
the # column; blank rows mark the quatrain breaks; an empty বাংলা cell is an
untranslated line (the loader marks it).
"""
import json, glob, os, sys, unicodedata

SCRATCH = os.environ.get('SONNET_WORK') or os.getcwd()   # the work dir: data/ out/ align/
REPO = sys.argv[1]
PARTS = [('usha', 'ঊষা', 1, 38), ('diba', 'দিবা', 39, 77),
         ('sandhya', 'সন্ধ্যা', 78, 115), ('nisha', 'নিশা', 116, 154)]

import re
_STRAY_ZW = re.compile(r'[‌‍]+(?=[\s,;:.!?—’”)]|$)')
def nfc(s):
    s = unicodedata.normalize('NFC', s or '').replace('﻿', '').strip()
    return _STRAY_ZW.sub('', s)   # a ZWNJ typed before punctuation does nothing
def bn(n): return str(n).translate(str.maketrans('0123456789', '০১২৩৪৫৬৭৮৯'))

S = {s['n']: s for s in json.load(open(os.path.join(SCRATCH, 'data/sonnets.json')))}

# Flatten to 14 verse lines + gap positions
for s in S.values():
    verse = [l for l in s['lines'] if not l.get('gap')]
    s['verse'] = verse

# The 136 text pasted into 138/139 is not a translation of them — blank it
for n in (138, 139):
    if '\n'.join(l['bn'] for l in S[n]['verse']) == '\n'.join(l['bn'] for l in S[136]['verse']):
        for l in S[n]['verse']: l['bn'] = ''

applied = 0
for path in sorted(glob.glob(os.path.join(SCRATCH, 'out', '*.json'))):
    try:
        data = json.load(open(path, encoding='utf-8'))
    except Exception as e:
        print('SKIP', path, e); continue
    for k, v in data.items():
        n = int(k)
        if n not in S: continue
        verse = S[n]['verse']
        if isinstance(v, list):
            if len(v) != len(verse):
                print(f'SKIP {path} sonnet {n}: {len(v)} lines, expected {len(verse)}'); continue
            for i, line in enumerate(v):
                verse[i]['bn'] = nfc(line); applied += 1
        elif isinstance(v, dict):
            for i, line in v.items():
                i = int(i)
                if 0 <= i < len(verse):
                    verse[i]['bn'] = nfc(line); applied += 1
print('overlay lines applied:', applied)

def cell(s): return nfc(s).replace('|', '\\|')

for slug, title, lo, hi in PARTS:
    out = [f'---', f'title: Sonnets · {lo}–{hi}', 'type: sonnet', 'lang: en', '---', '',
           '| বাংলা | ইংলিশ | # |', '| :-- | :-- | --: |']
    for n in range(lo, hi + 1):
        s = S[n]
        verse = s['verse']
        # gap after which verse index? (from the sheet's blank rows)
        gaps, vi = set(), 0
        for l in s['lines']:
            if l.get('gap'): gaps.add(vi)
            else: vi += 1
        if not gaps: gaps = {4, 8, 12}
        for i, l in enumerate(verse):
            if i in gaps: out.append('| | | |')
            out.append(f'| {cell(l["bn"])} | {cell(l["en"])} | {n if i == 0 else ""} |')
        out.append('| | | |')
    d = os.path.join(REPO, 'public', 'translations', 'sonnets', slug)
    os.makedirs(d, exist_ok=True)
    p = os.path.join(d, slug + '.md')
    open(p, 'w', encoding='utf-8').write('\n'.join(out) + '\n')
    print('wrote', p, len(out), 'lines')
