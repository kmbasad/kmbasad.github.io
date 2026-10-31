import json, collections
import match as M, lexicon as L, tui as T
from morph import CAT_NAME, PERS_NAME
# a cell's tense and person, for the reader
def label(cat):
    t, _, p = cat.partition('.')
    if cat == 'vn.gen': return CAT_NAME['vn.gen']
    return CAT_NAME[t] + (' · ' + PERS_NAME[p] if p else '')
# one reading per form: the one not in তুমি, with the তুমি reading as a note
by = collections.defaultdict(list)
forms = []
for w, (cands, enc) in M.matched.items():
    groups = collections.defaultdict(list)
    for lex, cat, dh in cands: groups[lex].append((cat, dh))
    for lex, cs in groups.items():
        cs.sort(key=lambda c: (c[0].endswith('.2'), c[0]))
        cat, dh = cs[0]
        if w.endswith('ো') and not dh.endswith('ো') and not w[:-1].endswith(dh[-1:] + 'ো'):
            pass
        base = w[:-1] if enc else w
        f = {'t': w, 'n': len(M.occ[w]), 'lex': lex, 'cat': cat, 'lab': label(cat), 'g': dh, 'e': enc,
             'ex': sorted(set(M.occ[w]))[:3]}
        alt = [(c, d) for c, d in cs[1:] if d != dh]
        if alt: f['alt'] = alt[0][1]; f['altlab'] = label(alt[0][0])
        by[lex].append(len(forms)); forms.append(f)
lexes = sorted(by, key=lambda l: -sum(forms[i]['n'] for i in by[l]))
ORDER = ['pres', 'prog', 'perf', 'past', 'pprog', 'pperf', 'hab', 'fut', 'imp', 'neg', 'inf', 'cond', 'conj', 'vn']
def ckey(c):
    t, _, p = c.partition('.')
    return (ORDER.index(t) if t in ORDER else 99, '1t23h'.find(p) if p else 0, c)
out_lex = []
for l in lexes:
    idx = sorted(by[l], key=lambda i: (ckey(forms[i]['cat']), forms[i]['t']))
    out_lex.append({'name': l, 'n': sum(forms[i]['n'] for i in idx), 'f': idx})
MODEL = ['করা', 'দেখা', 'জানা', 'শোনা', 'বলা', 'আসা', 'যাওয়া', 'হওয়া', 'দেওয়া', 'নেওয়া', 'খাওয়া', 'পাওয়া', 'চাওয়া', 'দেখানো', 'পৌঁছানো', 'আছে']
NOTE = {
    'করা': 'অ-কারান্ত ধাতু (কর, বল, চল, ধর, পড়, মর, বস…)', 'দেখা': 'এ-কারান্ত ধাতু (দেখ, ফেল, খেল, বেচ…)',
    'জানা': 'আ-কারান্ত ধাতু, যার করে-রূপে আ বদলে এ হয় (জান > জেনে; রাখ, থাক, লাগ, মার, পার, ভাব…)',
    'শোনা': 'উ/ও ধাতু (শুন, উঠ, তুল, খুল, বুঝ, ঢুক…); লিখ/লেখ, শিখ/শেখ, ফির/ফের একই ছাঁচে',
    'বলা': 'বইয়ের সবচেয়ে বেশি ব্যবহৃত ক্রিয়ার একটি', 'আসা': 'অতীতে এল/এলেন', 'যাওয়া': 'গেল, গেছে, গিয়ে',
    'হওয়া': '', 'দেওয়া': 'নেওয়া একই ছাঁচে', 'নেওয়া': '', 'খাওয়া': 'পাওয়া একই ছাঁচে (খেল, খেয়েছে; পেল, পেয়েছে)',
    'পাওয়া': '', 'চাওয়া': 'গাওয়া একই ছাঁচে', 'দেখানো': 'ণিজন্ত বা -আনো ক্রিয়া (জানানো, পৌঁছানো, তাকানো, হারানো…)',
    'পৌঁছানো': 'পৌঁছেছে, জন্মেছে: ছোট রূপের -আনো ক্রিয়া', 'আছে': 'আছে/ছিল/নেই'}
CELLS = [c for c in sorted({c for l in MODEL for c in L.LEX[l][0]}, key=ckey)]
model = []
for l in MODEL:
    s, d = L.LEX[l]
    cells = {c: [s[c], d[c]] for c in s}
    for c, (ts, td) in T.TUI.get(l, {}).items(): cells[c] = [ts, td]
    model.append({'name': l, 'note': NOTE.get(l, ''), 'c': cells})
sent = sorted({i for f in forms for i in f['ex']})
data = {'lex': out_lex, 'forms': forms, 'model': model,
        'sent': {i: [M.rows[i][0], M.rows[i][1]] for i in sent},
        'labels': {c: label(c) for c in CELLS}}
json.dump(data, open('verbs.json', 'w'), ensure_ascii=False, separators=(',', ':'))
ch = sum(1 for f in forms if f['g'] != (f['t'][:-1] if f['e'] else f['t']))
print('lexemes', len(out_lex), 'forms', len(forms), 'changed', ch, 'sentences', len(sent))
