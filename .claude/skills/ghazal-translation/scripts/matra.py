#!/usr/bin/env python3
"""Matrabritta matra counter — a port of matraBreaks() in public/js/book.js.

Open (vowel-ended) syllable = 1 matra, closed = 2, counted incrementally:
every vowel sound is 1 (ঐ ঔ ৈ ৌ are 2) and every syllable-closing
consonant (bare, hasanta'd, conjunct-initial, anusvara/visarga/khanda-ta)
adds 1. ও before য়/য + vowel sign is the glide w.

Usage:  matra.py "line" ["line" ...]      → one count per line
        echo lines | matra.py -            → same, from stdin
"""
import re, sys, unicodedata

# Code points, not literals: a literal য় in a class may be stored decomposed
# (য + nukta) and then the nukta itself would match as a consonant.
CONS = re.compile('[ক-হড়ঢ়য়]')
VSIGN = re.compile(r'[া-ৄেৈোৌৗ]')
VIND = re.compile(r'[অ-ঔ]')
TWO = re.compile(r'[ঐঔৈৌ]')
CODA = re.compile(r'[ংঃৎ]')
ZERO = re.compile(r'[ঁ়]')
HAS = '্'
ZW = re.compile(r'[‌‍়]')

def count(text):
    # NFC: Sheets often stores ো/ৌ as two code points (ে + া), which would
    # otherwise count as two vowels.
    ch = list(unicodedata.normalize('NFC', text))
    n = len(ch)
    def skip(k, d):
        while 0 <= k < n and ZW.match(ch[k]): k += d
        return k
    def nxt(i):
        j = skip(i + 1, 1)
        return ch[j] if j < n else None
    def glide_o(i):
        j = skip(i + 1, 1)
        if j >= n or ch[j] not in ('য়', 'য'): return False
        k = skip(j + 1, 1)
        return k < n and bool(VSIGN.match(ch[k]))
    cum, nucleus = 0, False
    for i, c in enumerate(ch):
        if CONS.match(c):
            nx = nxt(i)
            if nx == HAS:
                if nucleus: cum += 1; nucleus = False
            elif nx is not None and VSIGN.match(nx):
                pass
            else:
                cum += 1; nucleus = True
        elif c == 'ও' and glide_o(i):
            pass
        elif VSIGN.match(c) or VIND.match(c):
            cum += 2 if TWO.match(c) else 1; nucleus = True
        elif CODA.match(c):
            if nucleus: cum += 1
            nucleus = False
        elif c != HAS and not ZW.match(c) and not ZERO.match(c):
            nucleus = False
    return cum

if __name__ == '__main__':
    args = sys.argv[1:]
    lines = sys.stdin.read().split('\n') if args == ['-'] else args
    for l in lines:
        if l.strip(): print(count(l), l)
