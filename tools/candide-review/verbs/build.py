"""Build the verb page (the owner's choices of Dhaka verb and word forms).

    cd tools/candide-review/verbs && python3 -I build.py

Regenerates verbs.json from the paradigms and the site's text, and writes
../work/candide-verbs.html (not committed). Publish with capabilities {"db": {}}.
"""
import runpy, sys
from pathlib import Path
HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import os; os.chdir(HERE)
runpy.run_path('data.py', run_name='__main__')
runpy.run_path('addwords.py', run_name='__main__')
d = (HERE / 'verbs.json').read_text(encoding='utf-8').replace('</', '<\\/')
out = HERE.parent / 'work/candide-verbs.html'
out.parent.mkdir(parents=True, exist_ok=True)
out.write_text((HERE / 'template.html').read_text(encoding='utf-8').replace('__DATA__', d), encoding='utf-8')
print('→', out)
