"""His chapter 4, applied to the book. candide-dhaka12.tsv → candide-dhaka13.tsv."""
import re, json, glob, collections
rows = [l.rstrip('\n').split('\t') for l in open('candide-dhaka12.tsv', encoding='utf-8')]
B, E = r'(?<![ঀ-৿])', r'(?![ঀ-৿])'
OWN = {}
for f in glob.glob('../review/db4/notes/*.json'):
    d = json.load(open(f)); d = d.get('data', d)
    if d.get('bn'): OWN[d['id']] = d['bn']
# "মুক্তো পূজো খিদে টাইপের ইন্ডিয়ানা কখনো করা যাবে না": the Kolkata -ো ending gives way to -া
O2A = [('টুকরোয়', 'টুকরায়'), ('টুকরো', 'টুকরা'), ('পুরোনো', 'পুরানো'), ('পুরোপুরি', 'পুরাপুরি'), ('পুরো', 'পুরা'),
       ('বুড়োরা', 'বুড়ারা'), ('বুড়ো', 'বুড়া'), ('মুক্তো', 'মুক্তা'), ('উল্টোপাল্টা', 'উল্টাপাল্টা'), ('উল্টো', 'উল্টা'),
       ('কৌটো', 'কৌটা'), ('ধুলো', 'ধুলা'), ('মুঠোয়', 'মুঠায়'), ('ঠুনকো', 'ঠুনকা'),
       ('একশোটা', 'একশটা'), ('একশোবার', 'একশবার'), ('একশো', 'একশ'), ('দুশো', 'দুইশ'), ('তিনশো', 'তিনশ'),
       ('চারশো', 'চারশ'), ('ছয়শো', 'ছয়শ'), ('আটশো', 'আটশ'), ('পনেরো-ষোলোটা', 'পনের-ষোলটা'), ('পনেরো', 'পনের'),
       ('ষোলো', 'ষোল'), ('সতেরো', 'সতের')]
# "যথাসম্ভব যুক্তবর্ণ": a foreign cluster is written as one
CONJ = [('আনাব্যাপটিস্ট', 'আনাব্যাপ্টিস্ট'), ('ট্রানসিলভানিয়া', 'ট্রান্সিলভানিয়া'), ('জানসেনপন্থী', 'জান্সেনপন্থী'),
        ('ইগনাশিয়াস', 'ইগ্নাশিয়াস'), ('মাসকারেনেস', 'মাস্কারেনেস')]
n = collections.Counter()
for r in rows:
    if r[0] in OWN and OWN[r[0]] != r[1]: r[1] = OWN[r[0]]; n['his sentence'] += 1
    for a, b in O2A:
        r[1], k = re.subn(B + a + E, b, r[1]); n['-া'] += k
    for a, b in CONJ:
        r[1], k = re.subn(B + a, b, r[1]); n['যুক্তবর্ণ'] += k
open('candide-dhaka13.tsv', 'w', encoding='utf-8').write(''.join(f'{a}\t{b}\n' for a, b in rows))
print(dict(n))
