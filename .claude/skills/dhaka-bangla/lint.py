#!/usr/bin/env python3
"""Find what in a Bangla text is still standard চলিত where the owner's Dhaka
Bangla has its own form (see SKILL.md). It only finds; it never rewrites.

    python3 -I lint.py FILE            # plain text, one finding per line
    python3 -I lint.py FILE --col 4    # a TSV: check column 4 (1-based), id from column 1

A form is reported as 'replace' when every reading of it has the same Dhaka form,
and as 'check' when the right form depends on the sentence (করতে: infinitive, or
তুমি's habitual past করতা?). A form that is itself one of the owner's Dhaka forms
is never reported: করছিল is standard for "was doing" but Dhaka for "had done", and
only the sentence (or the standard text it came from) can say which was meant.
"""
import argparse, collections, re, sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
WORD = re.compile(r'[ঀ-৿‌‍]+')
# nouns and particles that look like a verb form
STOP = set('ভেড়া ভেড়ার গলা গলায় গলার পরে পরা মেলা ভরা সাজা জমা লোটা বাছা কামান হেলা মোড়ে মানে বাড়ি চেয়ে'.split())
# -িয়ে words that are not -আনো verbs: vowel roots, a marriage, a name
NOT_ANO = {'দিয়ে', 'নিয়ে', 'গিয়ে', 'বিয়ে', 'কর্দেলিয়ে'}
# words whose change depends on the sense: ভারি = very (খুব) or heavy (ভারী)
CONTEXT_WORDS = {'ভারি', 'বটে', 'বৈকি', 'দিব্যি', 'খানিক', 'বাছা', 'ব্যারনপত্নী', 'নও', 'নই'}  # নও/নই: না in speech only
# forms that are also common nouns: দিন is "day" far more often than "please give"
HOMOGRAPHS = {'দিন': 'দেন, only if it means "please give"', 'দিনই': 'দেনই, only if "please give"', 'দিনও': 'দেনও, only if "please give"',
              'দেবে': 'দিবে/দিবা, unless it means "sinks" (কাদায় দেবে গেল)',
              'পেতে': 'পাইতে, unless it is পাতা "to lay" (ওত পেতে)',
              'করুন': 'করেন for আপনি; a blessing or wish (খোদা … করুন) is করুক'}
HON = re.compile(r'^(তাঁ|যাঁ)(র|কে|রা|দের|দেরকে)(ই|ও)?$')
OE = re.compile(r'^(ওঁ|এঁ)(র|কে|রা|দের)(ই|ও)?$')


def tables():
    forms = collections.defaultdict(set)
    dhaka = set()
    for line in (HERE / 'forms.tsv').read_text(encoding='utf-8').splitlines():
        if line.startswith('#') or not line.strip():
            continue
        std, dh = line.split('\t')[:2]
        forms[std].add(dh)
        dhaka.add(dh)
    for std in list(forms):
        if std in dhaka:
            del forms[std]
    words = {}
    for line in (HERE / 'words.tsv').read_text(encoding='utf-8').splitlines():
        if line.startswith('#') or not line.strip():
            continue
        std, own, dlg = line.split('\t')[:3]
        if own != std or dlg:
            words[std] = (own, dlg)
    return forms, words


def findings(text, forms, words):
    for m in re.finditer(r'_([^_]+)_', text):
        yield 'replace', m.group(0), '‘' + m.group(1) + '’ (no italics in Bangla)'
    for w in WORD.findall(text):
        core, enc = w, ''
        if w not in forms and w[-1:] in ('ই', 'ও') and w[:-1] in forms:
            core, enc = w[:-1], w[-1]
        if 'গুলো' in w:
            yield 'check', w, 'reword it away (সব …, এসব, -রা), or -গুলা now and then'
        elif HON.match(w):
            yield 'replace', w, w.replace('ঁ', '', 1) + ' (only sarcastic honour keeps the chandrabindu)'
        elif OE.match(w):
            yield 'replace', w, 'উনা' + w[2:]
        elif w in HOMOGRAPHS:
            yield 'check', w, HOMOGRAPHS[w]
        elif w in CONTEXT_WORDS:
            yield 'check', w, words.get(w, ('',))[0] + ' (if the sense fits)'
        elif w in words:
            own, dlg = words[w]
            if own != w:
                yield 'replace', w, own + (f' (dialogue: {dlg})' if dlg else '')
        elif re.search('িয়ে$', core) and core not in NOT_ANO and core not in forms:
            yield 'check', w, core[:-4] + 'ায়ে' + enc + ' (an -আনো verb, unless it is a name)'
        elif core in forms and core not in STOP:
            outs = forms[core]
            if len(outs) == 1:
                o = next(iter(outs))
                if o != core:
                    yield 'replace', w, o + enc
            elif any(o != core for o in outs):
                yield 'check', w, ' / '.join(sorted(o + enc for o in outs))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('file')
    ap.add_argument('--col', type=int, help='TSV column holding the Bangla (1-based)')
    ap.add_argument('--only', choices=['replace', 'check'], help='report one kind only')
    a = ap.parse_args()
    forms, words = tables()
    n = collections.Counter()
    for i, line in enumerate(Path(a.file).read_text(encoding='utf-8').splitlines(), 1):
        if not line.strip() or line.startswith('#'):
            continue
        where, text = str(i), line
        if a.col:
            cols = line.split('\t')
            if len(cols) < a.col:
                continue
            where, text = cols[0], cols[a.col - 1]
        for kind, w, sug in findings(text, forms, words):
            if a.only and kind != a.only:
                continue
            n[kind] += 1
            print(f'{where}\t{kind}\t{w}\t→ {sug}')
    print(f'# {n["replace"]} to replace, {n["check"]} to check', file=sys.stderr)


if __name__ == '__main__':
    main()
