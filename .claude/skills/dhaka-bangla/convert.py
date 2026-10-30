#!/usr/bin/env python3
"""First pass of a conversion to the owner's Dhaka Bangla (see SKILL.md): change
only what is certain, print the rest of the text untouched. A person or Claude then
reads every sentence for what needs the sentence (তুমি forms, ভারি, dialogue).

    python3 -I convert.py FILE > OUT            # plain text
    python3 -I convert.py FILE --col 4 > OUT    # a TSV: convert column 4 (1-based)

Certain means: every reading of the word in forms.tsv has the same Dhaka form, or
words.tsv gives one and the word is not sense-dependent. Words are matched whole;
nothing inside a word is replaced (জলে is not জল + ে).
"""
import argparse, collections, re, sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
from lint import STOP, CONTEXT_WORDS, HOMOGRAPHS, NOT_ANO  # noqa: E402

WORD = re.compile(r'[ঀ-৿‌‍]+')
HON = re.compile(r'^(তাঁ|যাঁ)(র|কে|রা|দের|দেরকে)(ই|ও)?$')
OE = re.compile(r'^(ওঁ|এঁ)(র|কে|রা|দের)(ই|ও)?$')
KEEP = {'সঙ্গে', 'সঙ্গেই'}  # সাথে and সঙ্গে are both his


def tables():
    forms = collections.defaultdict(set)
    for line in (HERE / 'forms.tsv').read_text(encoding='utf-8').splitlines():
        if line.startswith('#') or not line.strip():
            continue
        std, dh = line.split('\t')[:2]
        forms[std].add(dh)
    words = {}
    for line in (HERE / 'words.tsv').read_text(encoding='utf-8').splitlines():
        if line.startswith('#') or not line.strip():
            continue
        std, own = line.split('\t')[:2]
        if own != std and std not in CONTEXT_WORDS and std not in KEEP:
            words[std] = own
    return forms, words


def convert(text, forms, words, n):
    def one(m):
        w = m.group(0)
        if (h := HON.match(w)):
            n['honorific'] += 1
            return h.group(1)[:-1] + h.group(2) + (h.group(3) or '')
        if (h := OE.match(w)):
            n['উনি'] += 1
            return 'উনা' + h.group(2) + (h.group(3) or '')
        if w in words:
            n['word'] += 1
            return words[w]
        core, enc = w, ''
        if w not in forms and w[-1:] in ('ই', 'ও') and w[:-1] in forms:
            core, enc = w[:-1], w[-1]
        if core in STOP or core in HOMOGRAPHS:
            return w
        if core not in forms:
            if core.endswith('িয়ে') and core not in NOT_ANO:
                n['-ায়ে'] += 1
                return core[:-4] + 'ায়ে' + enc   # তাকিয়ে → তাকায়ে
            return w
        outs = forms[core]
        if len(outs) != 1:
            n['left for the sentence'] += 1
            return w
        o = next(iter(outs))
        if o != core:
            n['verb'] += 1
        return o + enc
    text = re.sub(r'_([^_]+)_', r'‘\1’', text)  # no italics in Bangla
    return WORD.sub(one, text)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('file')
    ap.add_argument('--col', type=int, help='TSV column holding the Bangla (1-based)')
    a = ap.parse_args()
    forms, words = tables()
    n = collections.Counter()
    for line in Path(a.file).read_text(encoding='utf-8').splitlines():
        if a.col and line.strip() and not line.startswith('#'):
            cols = line.split('\t')
            if len(cols) >= a.col:
                cols[a.col - 1] = convert(cols[a.col - 1], forms, words, n)
            print('\t'.join(cols))
        elif a.col:
            print(line)
        else:
            print(convert(line, forms, words, n))
    print('# ' + ', '.join(f'{k}: {v}' for k, v in n.items()), file=sys.stderr)


if __name__ == '__main__':
    main()
