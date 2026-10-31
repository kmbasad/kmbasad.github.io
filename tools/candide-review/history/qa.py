"""Merge the passes' chapters and check them against the input."""
import sys, re, glob, collections, subprocess
sys.path.insert(0, '../verbs')
import match as M
WORD = re.compile(r'[ঀ-৿‌‍]+')
# standard progressive forms: left as they are, Dhaka reads them as a perfect
PROG = {w for w, (c, e) in M.matched.items() if c and all(cat.startswith(('prog.', 'pprog.')) for _, cat, _ in c)
        and not any(lex in ('খাওয়া', 'যাওয়া', 'দেওয়া', 'নেওয়া', 'হওয়া', 'পাওয়া', 'চাওয়া') or lex.endswith('নো') for lex, _, _ in c)}
inp = {}
for f in sorted(glob.glob('in/*.tsv')):
    for l in open(f, encoding='utf-8'):
        if l.startswith('#') or not l.strip(): continue
        id_, kind, fr, site, mech = l.rstrip('\n').split('\t'); inp[id_] = (kind, fr, site, mech)
out, problems = {}, collections.defaultdict(list)
for f in sorted(glob.glob('out/*.tsv')):
    ids = []
    for l in open(f, encoding='utf-8'):
        if not l.strip() or l.startswith('#'): continue
        parts = l.rstrip('\n').split('\t')
        if len(parts) != 2: problems['shape'].append((f, l[:40])); continue
        out[parts[0]] = parts[1].strip(); ids.append(parts[0])
    ch = f.split('/')[-1][:2]
    want = [i for i in inp if i.startswith(ch + '.')]
    if ids != want: problems['ids'].append((ch, len(ids), len(want)))
for id_, bn in out.items():
    kind, fr, site, mech = inp[id_]
    for mk in ('_', '*'):
        if site.count(mk) != bn.count(mk): problems['marks'].append(id_)
    if re.search(r'(^|[^ঀ-৿])(তাঁ|যাঁ)(র|কে|রা|দের)', bn): problems['তাঁ'].append(id_)
    for w in WORD.findall(site):
        if w in PROG and w in WORD.findall(bn): problems['progressive left'].append((id_, w))
    if bn == site and site != mech: problems['reverted to site'].append(id_)
changed_vs_mech = sum(1 for i, b in out.items() if b != inp[i][3])
print(f'rows {len(out)}/{len(inp)}; changed beyond the first pass: {changed_vs_mech}')
for k, v in problems.items(): print(k, len(v), v[:12])
with open('merged.tsv', 'w', encoding='utf-8') as f:
    for i in inp:
        if i in out: f.write(f'{i}\t{out[i]}\n')
r = subprocess.run(['python3', '-I', '/home/user/kmbasad.github.io/.claude/skills/dhaka-bangla/lint.py', 'merged.tsv', '--col', '2', '--only', 'replace'], capture_output=True, text=True)
print('lint:', r.stdout[-1500:], r.stderr.strip())
