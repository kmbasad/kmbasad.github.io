import json, sys
import match as M
from words import GROUPS
d = json.load(open('verbs.json'))
words = []
for name, note, items in GROUPS:
    rows = []
    for w, g, n in items:
        occ = M.occ.get(w, [])
        if not occ: continue
        ex = sorted(set(occ))[:3]
        for i in ex: d['sent'][str(i)] = [M.rows[i][0], M.rows[i][1]]
        rows.append({'t': w, 'n': len(occ), 'g': g, 'note': n, 'ex': ex})
    words.append({'name': name, 'note': note, 'w': rows})
d['words'] = words
json.dump(d, open('verbs.json', 'w'), ensure_ascii=False, separators=(',', ':'))
print(sum(len(g['w']) for g in words), 'words')
