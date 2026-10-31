"""His chapter 1, applied to the book. candide-dhaka.tsv → candide-dhaka2.tsv."""
import re, json, glob, collections
rows = [l.rstrip('\n').split('\t') for l in open('candide-dhaka.tsv', encoding='utf-8')]
B = r'(?<![ঀ-৿])'
E = r'(?![ঀ-৿])'
# his own sentences in chapter 1, as he left them on the review page
OWN = {}
for f in glob.glob('../review/db/notes/*.json'):
    d = json.load(open(f)); d = d.get('data', d)
    if d.get('bn'): OWN[d['id']] = d['bn']
# 1. ই-রূপ back to standard: যেত, পেল, খেল (তুমি's -তা/-লা stay; his পাইল in 01.007.01 stays, for the sound with পাংলস)
IFORM = [('যাইত', 'যেত'), ('খাইত', 'খেত'), ('পাইত', 'পেত'), ('খাইল', 'খেল'), ('পাইল', 'পেল')]
def standard(m):
    w = m.group(0)
    if re.search(r'(তা|লা)$', w): return w
    for a, b in IFORM:
        if w.startswith(a): return b + w[len(a):]
    return w
n = collections.Counter()
for r in rows:
    if r[0] in OWN: r[1] = OWN[r[0]]; n['his sentence'] += 1
    if r[0] != '01.007.01':
        r[1], k = re.subn(B + r'(যাইত|খাইত|পাইত|খাইল|পাইল)[ঀ-৿]*', standard, r[1]); n['ই-রূপ'] += k
    r[1], k = re.subn(B + r'কুনেগোন্দ', 'কুনেগোঁদ', r[1]); n['কুনেগোঁদ'] += k
    r[1], k = re.subn(B + r'পেছন', 'পিছন', r[1]); n['পিছন'] += k
open('candide-dhaka2.tsv', 'w', encoding='utf-8').write(''.join(f'{a}\t{b}\n' for a, b in rows))
print(dict(n))
