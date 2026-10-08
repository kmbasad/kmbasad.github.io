#!/usr/bin/env python3
"""From the generated sonnet .md files, list every verse line as
{"<sonnet>.<line>": {"bn": ..., "en": ...}} in align/src_<part>.json, split
into chunks for the alignment agents."""
import json, os, re, sys
REPO = sys.argv[1]
HERE = os.environ.get('SONNET_WORK') or os.getcwd()   # the work dir: data/ out/ align/
os.makedirs(os.path.join(HERE, 'align'), exist_ok=True)
PARTS = ['usha', 'diba', 'sandhya', 'nisha']
allrows = {}
for p in PARTS:
    md = open(os.path.join(REPO, 'public/translations/sonnets', p, p + '.md'), encoding='utf-8').read().split('\n')
    n, li = None, 0
    for s in md:
        s = s.strip()
        if not s.startswith('|') or re.match(r'^\|[-:\s|]+\|$', s) or s.startswith('| বাংলা'):
            continue
        cells = [c.strip() for c in s[1:-1].split('|')]
        if all(not c for c in cells): continue
        bn, en, num = cells[0], cells[1], cells[2]
        if num: n, li = int(num), 0
        li += 1
        if bn and en: allrows[f'{n}.{li}'] = {'bn': bn, 'en': en}
keys = list(allrows)
chunks = 8
per = -(-len(keys) // chunks)
for c in range(chunks):
    sub = {k: allrows[k] for k in keys[c * per:(c + 1) * per]}
    if not sub: continue
    first, last = list(sub)[0], list(sub)[-1]
    name = f'src_{c + 1:02d}_{first.split(".")[0]}-{last.split(".")[0]}.json'
    json.dump(sub, open(os.path.join(HERE, 'align', name), 'w', encoding='utf-8'), ensure_ascii=False, indent=0)
    print(name, len(sub), 'lines')
print('total lines', len(keys))
