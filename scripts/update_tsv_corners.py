import csv
import os

corners = {
  '/home/asad/Dropbox/GitHubs/kmbasad.github.io/creations/consciousness.tsv': 'Property ↓ · Thinker →\n10 × 10\nThinker\nProperty',
  '/home/asad/Dropbox/GitHubs/kmbasad.github.io/creations/god-philosophers.tsv': 'Property ↓ · Philosopher →\n10 × 10\nPhilosopher\nProperty',
  '/home/asad/Dropbox/GitHubs/kmbasad.github.io/creations/god-prophets.tsv': 'Property ↓ · Prophet →\n10 × 10\nProphet\nProperty',
  '/home/asad/Dropbox/GitHubs/kmbasad.github.io/visions/chan-wook.tsv': 'Film ↓ · Concept →\n10 × 10\nFilm\nConcept'
}

for path, corner_text in corners.items():
    if not os.path.exists(path):
        print(f"File not found: {path}")
        continue
        
    with open(path, 'r', encoding='utf-8') as f:
        reader = csv.reader(f, delimiter='\t')
        rows = list(reader)
        
    if rows and rows[0]:
        rows[0][0] = corner_text
        
    with open(path, 'w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f, delimiter='\t', quoting=csv.QUOTE_MINIMAL)
        writer.writerows(rows)
    print(f"Updated {path}")
