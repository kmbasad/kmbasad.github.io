#!/usr/bin/env python3
"""Check a Divan part: metre per ghazal, rhyme ends, the author's spellings,
and (optionally) the hover word-list.

Usage:  python3 -I check_ghazal.py PART_MD [--only 34,35] [--target 34=20,35=19]
                                           [--words PART-words.md]

Per ghazal: the matra count of every line (scripts/matra.py), its median,
lines ≥2 off the target (or the median), and the rhyme-carrying ends of the
matla + every even line. Flags spellings the author never uses in the
ghazals (কী, নেই, এসো, ধুলো, …) and old poetic forms. With --words, lists
word-list pairs whose tokens are missing from the page.
"""
import os, re, statistics, sys, unicodedata
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from matra import count

# author's ghazal spellings (ghazals 1–33): left = never (or rarely) used, right = his form
SPELL = {'কী': 'কি', 'নেই': 'নাই', 'এসো': 'আসো', 'ধুলো': 'ধুলা', 'হয়তো': 'হয়ত',
         'কীভাবে': 'কিভাবে', 'শুঁড়িখানা': 'বার / খারাবাত / মাজির মন্দির',
         'মাইখানা': 'বার / খারাবাত', 'প্রাণ': 'rare in his ghazals — he prefers জান (33:1)',
         'হৃদয়': 'rare in his ghazals — he prefers দিল (63:3)'}
OLD = ['কভু', 'নাহি', 'হেরি', 'তব', 'মম', 'যবে', 'সনে', 'তরে', 'লাগি', 'আঁখি', 'হৃদি',
       'মোর', 'মোরে', 'তোমারে', 'আমারে', 'যাহা', 'তাহা', 'কেহ', 'হেথা', 'সেথা', 'নারে']

def rows(md):
    g, out = None, {}
    for l in open(md, encoding='utf-8'):
        if not l.startswith('|') or re.match(r'\|\s*(বাংলা|:--)', l):
            continue
        c = [x.strip() for x in l.strip().strip('|').split('|')]
        if len(c) >= 3 and c[2]:
            g = int(c[2])
        if c[0] and g is not None:
            out.setdefault(g, []).append((unicodedata.normalize('NFC', c[0]), c[1]))
    return out

def words(s):
    return re.sub(r"[,।?!;:—'‘’\"()]", ' ', s).split()

def norm(w):
    # mirror md-loader's normWord: NFC, keep letters/marks/digits/' only
    # (drops ، ؛ ؟ and ZWNJ), strip Arabic tashkeel
    w = unicodedata.normalize('NFC', w)
    w = ''.join(ch for ch in w if ch == "'" or unicodedata.category(ch)[0] in 'LMN')
    return re.sub('[\u064B-\u065F\u0670]', '', w).lower()

def main():
    a = sys.argv[1:]; md = a[0]
    opt = lambda k: a[a.index(k) + 1] if k in a else None
    only = {int(x) for x in opt('--only').split(',')} if opt('--only') else None
    target = {int(k): int(v) for k, v in (p.split('=') for p in opt('--target').split(','))} if opt('--target') else {}
    data = rows(md)
    for n in sorted(data):
        if only and n not in only:
            continue
        bn = [b for b, _ in data[n]]
        cs = [count(x) for x in bn]
        t = target.get(n, statistics.median_low(cs))
        off = [(i + 1, c) for i, c in enumerate(cs) if abs(c - t) >= 2]
        ends = [words(bn[0])[-1]] + [words(x)[-1] for x in bn[1::2]]
        print(f'G{n}  couplets {len(bn) // 2}  target {t}  counts {cs}')
        print(f'     ends: {" / ".join(ends)}')
        if off:
            print(f'     ≥2 off: ' + ', '.join(f'l{i}={c}' for i, c in off))
        for i, x in enumerate(bn, 1):
            for w in words(x):
                # exact for the short ones, else any inflection (শুঁড়িখানার, প্রাণের)
                hit = next((k for k in SPELL if w == k or (len(k) > 3 and w.startswith(k))), None)
                if hit or w in OLD:
                    print(f'     l{i}: {w} → {SPELL[hit] if hit else "old form"}')
    wl = opt('--words')
    if wl:
        bnT, faT = set(), set()
        for g in data.values():
            for b, f in g:
                for t in b.split():
                    bnT.add(norm(t))
                    bnT.update(norm(p) for p in t.split('-'))
                faT.update(norm(t) for t in f.split())
        miss = []
        for l in open(wl, encoding='utf-8'):
            c = [x.strip() for x in l.strip().strip('|').split('|')] if l.startswith('|') else []
            if len(c) == 2 and (norm(c[0]) not in bnT or norm(c[1]) not in faT):
                miss.append(f'{c[0]} | {c[1]}')
        print(f'word-list: {len(miss)} pairs not on the page' + (': ' + '; '.join(miss) if miss else ''))

if __name__ == '__main__':
    main()
