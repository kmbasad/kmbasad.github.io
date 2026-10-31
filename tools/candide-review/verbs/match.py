from pathlib import Path
HERE = Path(__file__).resolve().parent
SITE_TSV = HERE.parents[2] / 'src/data/gadya/candide.tsv'
STORE = HERE.parent / 'store/verbs'
OUT = HERE.parent / 'work'
import json, re, collections, sys
import lexicon as L
rows = []
for line in open(SITE_TSV, encoding='utf-8'):
    if line.startswith('#') or not line.strip(): continue
    id_, kind, fr, bn = line.rstrip('\n').split('\t')
    rows.append((id_, bn))
WORD = re.compile(r'[ঀ-৿‌‍]+')
occ = collections.defaultdict(list)   # token -> [sentence index]
for i, (id_, bn) in enumerate(rows):
    for w in WORD.findall(bn): occ[w].append(i)

def variants(cat, f):
    v = [f]
    if cat in ('past.3', 'pprog.3', 'pperf.3') and f.endswith('ল'): v.append(f + 'ো')
    if cat == 'hab.3' and f.endswith('ত'): v.append(f + 'ো')
    if cat == 'fut.1' and f.endswith('ব'): v.append(f + 'ো')
    if cat in ('prog.2', 'perf.2', 'pres.2') and f.endswith('ছ'): v.append(f + 'ো')
    return v
FORM = collections.defaultdict(list)  # surface -> [(lexeme, cat, dh)]
for lex, (s, d) in L.LEX.items():
    for cat, f in s.items():
        for v in variants(cat, f):
            FORM[v].append((lex, cat, d[cat]))
    for f, cat in L.ALIAS.get(lex, {}).items():
        for v in variants(cat, f):
            FORM[v].append((lex, cat, L.ALIAS_DH.get(f, d.get(cat, f))))
matched = {}
for w in occ:
    if w in L.STOP: continue
    if w in FORM: matched[w] = (FORM[w], '')
    elif len(w) > 2 and w[-1] in 'ইও' and w[:-1] in FORM: matched[w] = (FORM[w[:-1]], w[-1])
if __name__ == '__main__':
    n = sum(len(occ[w]) for w in matched)
    print('matched types', len(matched), 'tokens', n)
    ends = ['েছে', 'েছিল', 'েছেন', 'ছিল', 'ছিলেন', 'লেন', 'তেন', 'ুন', 'েনি', 'য়নি', 'ননি', 'লাম', 'চ্ছে', 'চ্ছিল', 'য়েছে', 'বেন', 'ছিলাম', 'তাম', 'ছি', 'ছে', 'ল', 'লো', 'ত']
    um = collections.Counter({w: len(occ[w]) for w in occ if w not in matched and any(w.endswith(e) for e in ends)})
    print(' '.join(f'{w}:{n}' for w, n in um.most_common(400)))
