"""First pass: replace the forms whose standard reading is certain. What needs
context (তুমি or not in -তে/-লে/-বে, ভারি = heavy or very, dialogue) is left."""
from pathlib import Path
HERE = Path(__file__).resolve().parent
SITE_TSV = HERE.parents[2] / 'src/data/gadya/candide.tsv'
STORE = HERE.parent / 'store/verbs'
OUT = HERE.parent / 'work'
import re, collections, json
import final as F, match as M, lexicon as L
FINAL = {(r[2], r[3], r[0]): r[1] for r in F.FORMS}
WORD = re.compile(r'[ঀ-৿‌‍]+')
SAFE_WORDS = {w: v for w, v, dv, g, st, n in F.WORDMAP
              if w not in ('সঙ্গে', 'সঙ্গেই', 'ভারি', 'বটে', 'বৈকি', 'দিব্যি', 'খানিক', 'বাছা', 'হ্যাঁ', 'কোথায়', 'এখানে', 'সেখানে', 'খোদা', 'বিধাতা') and v != w}
HON = {'তাঁ': 'তা', 'যাঁ': 'যা'}
HON_STEMS = ('র', 'কে', 'রা', 'দের', 'দেরকে')
OE = {'ওঁর': 'উনার', 'ওঁকে': 'উনাকে', 'এঁর': 'উনার', 'এঁকে': 'উনাকে', 'ওঁরা': 'উনারা', 'এঁরা': 'উনারা', 'ওঁদের': 'উনাদের', 'এঁদের': 'উনাদের'}
stats = collections.Counter(); left = collections.Counter()
def convert_word(w):
    core, enc = w, ''
    for e in ('ই', 'ও'):
        if w.endswith(e) and w[:-1] in M.FORM and w not in M.FORM: core, enc = w[:-1], e
    m = re.match(r'^(তাঁ|যাঁ)(র|কে|রা|দের|দেরকে)(ই|ও)?$', w)
    if m: stats['তাঁ/যাঁ'] += 1; return m.group(1)[:-1] + m.group(2) + (m.group(3) or '')
    m = re.match(r'^(ওঁ|এঁ)(র|কে|রা|দের)(ই|ও)?$', w)
    if m: stats['ওঁ/এঁ'] += 1; return 'উনা' + m.group(2) + (m.group(3) or '')
    if core in SAFE_WORDS: stats['word:' + core] += 1; return SAFE_WORDS[core] + enc
    if core in L.STOP or core not in M.FORM: return w
    outs = set()
    for lex, cat, _ in M.FORM[core]:
        outs.add(FINAL.get((lex, cat, core), core))
    if len(outs) == 1:
        o = outs.pop()
        if o != core: stats['verb'] += 1
        return o + enc
    left[core] += 1
    return w
def convert(bn):
    return WORD.sub(lambda m: convert_word(m.group(0)), bn)
if __name__ == '__main__':
    out = []
    for line in open(SITE_TSV, encoding='utf-8'):
        if line.startswith('#') or not line.strip(): continue
        id_, kind, fr, bn = line.rstrip('\n').split('\t')
        out.append((id_, kind, fr, bn, convert(bn)))
    by = collections.defaultdict(list)
    for r in out: by[r[0][:2]].append(r)
    for ch, rs in by.items():
        with open(f'{OUT}/in/{ch}.tsv', 'w', encoding='utf-8') as f:
            f.write('# id\tkind\tFrench\tBangla (site, standard)\tBangla (first pass: certain forms already changed)\n')
            for r in rs: f.write('\t'.join(r) + '\n')
    changed = sum(1 for r in out if r[3] != r[4])
    print('sentences', len(out), 'changed', changed)
    print({k: v for k, v in stats.most_common(12)})
    print('left for context:', ' '.join(f'{w}:{n}' for w, n in left.most_common(40)))
