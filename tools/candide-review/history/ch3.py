"""His chapter 3, applied to the book. candide-dhaka7.tsv → candide-dhaka8.tsv."""
import re, json, glob, collections
rows = [l.rstrip('\n').split('\t') for l in open('candide-dhaka7.tsv', encoding='utf-8')]
B, E = r'(?<![ঀ-৿])', r'(?![ঀ-৿])'
OWN = {}
for f in glob.glob('../review/db3/notes/*.json'):
    d = json.load(open(f)); d = d.get('data', d)
    if d.get('bn'): OWN[d['id']] = d['bn']
FIX = {  # his questions on chapter 3, answered as he agreed
 '03.003.03': ('কুমারী কুনেগোঁদের সুন্দর চোখ দুইটার জন্য সেখান থেকে তাড়া খাওয়ার আগে।', 'কুমারী কুনেগোঁদের সুন্দর চোখের দায়ে সেখান থেকে তাকে তাড়ায়ে দেয়ার আগ পর্যন্ত।'),
 '03.005.08': ('তার মাথায় ঢেলে দিল একটা ভরা…', 'তার মাথায় ঢেলে দিল এক ভরা ইয়ে…'),
}
# রুটি and ব্রেড by turns where it is bread on a table; রুটি-রোজগার and the like stay রুটি
BREAD = {'03.005.07': 'ব্রেড', '04.001.07': 'রুটি', '05.005.03': 'ব্রেড', '16.001.02': 'রুটি'}
KEEP = {'দিয়ে', 'নিয়ে', 'গিয়ে', 'বিয়ে', 'কর্দেলিয়ে'}
SPECIAL = {'বেরিয়ে': 'বের হয়ে', 'পেরিয়ে': 'পার হয়ে', 'এগিয়ে': 'আগায়ে', 'পৌঁছে': 'পৌঁছায়ে'}
n = collections.Counter(); seen = collections.Counter()
def conj(m):
    w = m.group(0)
    core, enc = (w[:-1], w[-1]) if w[-1] in 'ইও' and (w[:-1].endswith('িয়ে') or w[:-1] in SPECIAL) else (w, '')
    if core in KEEP: return w
    if core in SPECIAL: n['special'] += 1; seen[core + '→' + SPECIAL[core]] += 1; return SPECIAL[core] + enc
    if core.endswith('িয়ে'):
        new = core[:-4] + 'ায়ে'; n['-ায়ে'] += 1; seen[core + '→' + new] += 1; return new + enc
    return w
for r in rows:
    if r[0] in OWN and OWN[r[0]] != r[1]: r[1] = OWN[r[0]]; n['his sentence'] += 1
    if r[0] in FIX:
        a, b = FIX[r[0]]; assert r[1].count(a) == 1, r[0]; r[1] = r[1].replace(a, b); n['fix'] += 1
    r[1] = re.sub(B + r'[ঀ-৿]*(িয়ে|পৌঁছে)[ইও]?' + E, conj, r[1])
    for a, b in [('হয়তো', 'হয়ত'), ('নয়তো', 'নয়ত')]:
        r[1], k = re.subn(B + a + E, b, r[1]); n[b] += k
    r[1], k = re.subn(r'_([^_]+)_', r'‘\1’', r[1]); n['‘…’'] += k
    r[1], k = re.subn(B + 'বেগম সাহেবার' + E, 'বউয়ের', r[1]); n['বউ'] += k
    if r[0] in BREAD and BREAD[r[0]] == 'ব্রেড':
        r[1], k = re.subn(B + 'রুটি' + E, 'ব্রেড', r[1], count=1); n['ব্রেড'] += k
open('candide-dhaka8.tsv', 'w', encoding='utf-8').write(''.join(f'{a}\t{b}\n' for a, b in rows))
print(dict(n))
print(' '.join(f'{k}:{v}' for k, v in seen.most_common()))
