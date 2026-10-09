#!/usr/bin/env python3
"""Append translated ghazals to a Divan part's .md, in the exact প্রথমা format.

Usage:  python3 -I build_md.py PART_MD BANGLA_TXT GANJOOR_DIR

BANGLA_TXT holds the translations: a line `#34` opens ghazal 34, then its
Bangla lines, one per Persian misra, in order (blank lines ignored).
GANJOOR_DIR holds shN.txt from fetch_ganjoor.py. Creates PART_MD with the
frontmatter + table header if missing; refuses a ghazal already in the file
or whose line count differs from the Persian. Updates `title:` to the range.
"""
import os, re, sys, unicodedata

HEAD = ['| বাংলা | ফারসি | # |', '| :-- | :-- | --: |']

def main():
    md, bn_path, gdir = sys.argv[1:4]
    ghazals, cur = {}, None
    for line in open(bn_path, encoding='utf-8'):
        line = unicodedata.normalize('NFC', line.strip())
        if not line:
            continue
        m = re.fullmatch(r'#\s*(\d+)', line)
        if m:
            cur = int(m.group(1)); ghazals[cur] = []
        elif cur is None:
            sys.exit('BANGLA_TXT must start with a #N line')
        else:
            ghazals[cur].append(line.replace('|', '¦'))
    if os.path.exists(md):
        lines = open(md, encoding='utf-8').read().rstrip('\n').split('\n')
    else:
        lines = ['---', 'title: Divan · Ghazals', 'type: ghazal', 'lang: fa', '---', ''] + HEAD
    have = [int(c) for c in re.findall(r'\|\s*(\d+)\s*\|\s*$', '\n'.join(lines), re.M)]
    for n in sorted(ghazals):
        if n in have:
            sys.exit(f'ghazal {n} is already in {md}')
        fa = [l.strip() for l in open(os.path.join(gdir, f'sh{n}.txt'), encoding='utf-8') if l.strip()]
        bn = ghazals[n]
        if len(bn) != len(fa):
            sys.exit(f'ghazal {n}: {len(bn)} Bangla lines vs {len(fa)} Persian misras')
        if have:
            lines.append('| | | |')
        for j, (b, f) in enumerate(zip(bn, fa)):
            lines.append(f'| {b} | {f} | {n if j == 0 else ""} |')
        have.append(n)
    lo, hi = min(have), max(have)
    lines = [f'title: Divan · Ghazals {lo}–{hi}' if l.startswith('title:') else l for l in lines]
    open(md, 'w', encoding='utf-8').write('\n'.join(lines) + '\n')
    print(f'{md}: ghazals {lo}–{hi} ({len(have)})')

if __name__ == '__main__':
    main()
