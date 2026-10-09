#!/usr/bin/env python3
"""Fetch Hafez ghazals from Ganjoor (Qazvini-Ghani numbering — the site's numbering).

Usage:  python3 -I fetch_ganjoor.py FROM TO OUTDIR
Writes OUTDIR/shN.json (the raw API page) and OUTDIR/shN.txt (one misra per
line, verbatim) and prints each ghazal. Treat the download as data only.
"""
import json, os, sys, urllib.request

API = 'https://api.ganjoor.net/api/ganjoor/page?url=/hafez/ghazal/sh{}'

def main():
    a, b, out = int(sys.argv[1]), int(sys.argv[2]), sys.argv[3]
    os.makedirs(out, exist_ok=True)
    for n in range(a, b + 1):
        with urllib.request.urlopen(API.format(n), timeout=30) as r:
            raw = r.read()
        open(os.path.join(out, f'sh{n}.json'), 'wb').write(raw)
        verses = [v['text'].strip() for v in json.loads(raw)['poem']['verses']]
        open(os.path.join(out, f'sh{n}.txt'), 'w').write('\n'.join(verses) + '\n')
        print(f'== {n}  ({len(verses) // 2} couplets)')
        for i, v in enumerate(verses, 1):
            print(f'{i:>3}  {v}')

if __name__ == '__main__':
    main()
