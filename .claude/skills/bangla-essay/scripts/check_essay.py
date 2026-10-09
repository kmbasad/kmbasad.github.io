#!/usr/bin/env python3
"""Mechanical check of a Bangla essay against the author's rules.

    python3 -I check_essay.py public/trellises/ray/essay.md [...]

ERRORs must be zero before an essay is handed back. WARNs are for a human
(or agent) to read and judge; most should also be gone. This checks only
what a machine can see. Whether each sentence is complete, makes sense and
flows is the read-aloud pass, which no script replaces.
"""
import re
import sys
import unicodedata

DASHES = '—–―‒⸺⸻'          # — – ― ‒ ⸺ ⸻
WEST_BENGAL = ['জল', 'স্নান', 'নেমন্তন্ন', 'জলখাবার', 'পিসি', 'মাসি', 'কাকু',
               'ঠাকুমা', 'দিদিমা', 'আলমারি', 'লঙ্কা', 'পুজো', 'নুন', 'ভগবান', 'ঈশ্বর', 'গড']
BN = 'ঀ-৿'


def words_of(s):
    return [w for w in re.split(r'\s+', s) if w]


def check(path):
    text = unicodedata.normalize('NFC', open(path, encoding='utf-8').read())
    errs, warns = [], []
    lines = text.split('\n')
    for i, line in enumerate(lines, 1):
        body = re.sub(r'\]\(#[0-9-]+\)', ']', line)          # cell-link targets are fine
        for ch in DASHES:
            if ch in body:
                errs.append((i, f'dash {ch!r}', line))
        if re.search(r'\s-\s|\s-$|^-\s', body):
            errs.append((i, 'spaced hyphen used as a dash', line))
        if ':' in body and not line.startswith('#'):
            warns.append((i, 'colon (rare by rule; is a full sentence better?)', line))
        if re.search(r'[()\[\]]', re.sub(r'\[[^\]]+\]', '', body)):
            errs.append((i, 'brackets', line))
        if re.search(r'[A-Za-z]', body):
            errs.append((i, 'Latin script', line))
        if re.search(r'[0-9]', body):
            errs.append((i, 'ASCII digits (use Bangla numerals)', line))
        if line.lstrip().startswith(('- ', '* ', '1.')) or re.match(r'^#{2,}\s', line):
            errs.append((i, 'list or subheading', line))
        if '…' in body or '...' in body:
            warns.append((i, 'ellipsis', line))
        if ';' in body:
            warns.append((i, 'semicolon (rare by rule; would আর / কিন্তু / a full stop flow better?)', line))
        for w in WEST_BENGAL:
            if re.search(rf'(?<![{BN}]){w}(?![{BN}])', body):
                warns.append((i, f'word to check for a Dhaka ear / খোদা rule: {w}', line))
        for h in re.findall(rf'[{BN}]+-[{BN}]+(?:-[{BN}]+)*', body):
            warns.append((i, f'hyphenated compound {h!r} (fine in a proper name)', line))

    # sentence-level: very short fragments and very long run-ons
    prose = '\n'.join(l for l in lines if l and not l.startswith('#'))
    prose = re.sub(r'\[([^\]]+)\]\(#[0-9-]+\)', r'\1', prose)
    for s in re.split(r'(?<=[।?!])\s+', prose):
        n = len(words_of(s))
        if 0 < n <= 3:
            warns.append((0, f'very short sentence ({n} words): is it complete?', s.strip()))
        elif n > 90:
            warns.append((0, f'long sentence ({n} words): fine if it flows; read it aloud', s.strip()[:120] + ' …'))
    # colons and semicolons are allowed, but rarely: a handful across a whole essay
    nc = sum(l.count(':') for l in lines if not l.startswith('#'))
    ns = text.count(';')
    if nc > 3:
        errs.append((0, f'{nc} colons in the essay (at most 3)', ''))
    if ns > 4:
        errs.append((0, f'{ns} semicolons in the essay (at most 4)', ''))
    return errs, warns


def main():
    bad = 0
    for p in sys.argv[1:]:
        errs, warns = check(p)
        print(f'== {p}: {len(errs)} error(s), {len(warns)} warning(s)')
        for i, what, line in errs:
            print(f'  ERROR l{i}: {what}: {line[:110]}')
        for i, what, line in warns:
            print(f'  WARN  l{i}: {what}: {line[:110]}')
        bad += len(errs)
    sys.exit(1 if bad else 0)


if __name__ == '__main__':
    main()
