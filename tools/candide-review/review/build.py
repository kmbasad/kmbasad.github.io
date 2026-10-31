"""Build the Candide review page.

    python3 -I tools/candide-review/review/build.py [OUT.html]

Reads the site's text (src/data/gadya/candide.tsv), the Dhaka draft
(tools/candide-review/text/candide-dhaka.tsv) and the page template, and writes
the page (default tools/candide-review/work/candide-review.html, not committed).
Publish it with the Artifact tool, capabilities {"db": {}, "downloads": true}.
"""
import json, sys
from pathlib import Path
HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
site = ROOT / 'src/data/gadya/candide.tsv'
dhaka_tsv = HERE.parent / 'text/candide-dhaka.tsv'
out = Path(sys.argv[1]) if len(sys.argv) > 1 else HERE.parent / 'work/candide-review.html'
dhaka = {}
for line in open(dhaka_tsv, encoding='utf-8'):
    if line.strip() and not line.startswith('#'):
        i, bn = line.rstrip('\n').split('\t'); dhaka[i] = bn.strip()
rows = []
for line in open(site, encoding='utf-8'):
    line = line.rstrip('\n')
    if not line.strip() or line.startswith('#'): continue
    id_, kind, fr, bn = line.split('\t')
    rows.append([id_, kind, fr.strip(), dhaka[id_], bn.strip()])   # the Dhaka text, and the site's beside it
data = json.dumps(rows, ensure_ascii=False, separators=(',', ':')).replace('</', '<\\/')
out.parent.mkdir(parents=True, exist_ok=True)
out.write_text((HERE / 'template.html').read_text(encoding='utf-8').replace('__DATA__', data), encoding='utf-8')
print(len(rows), 'rows →', out)
