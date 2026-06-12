#!/usr/bin/env python3
"""
Convert knb/alaol-sapta-paykar.md into per-chapter TSVs and HTML pages
under revisions/alaol-sapta-paykar/<slug>/, mirroring the
translations/metamorphoses/book-i/ shape.

TSV: 3 columns (Alaol | empty | empty). The `tercet` builder in
tsv-loader.js renders it as bn | ln-col | it — last two visually empty
but structurally present (so the table reads as 3 columns).

The poem is divided into 10 chapters following its narrative arc:
  1. Prologue
  2. Bahram's Story (birth → kingship → marrying the seven princesses)
  3–9. The seven pavilions (Saturday Black, Sunday Yellow, …, Friday White)
  10. Epilogue
"""
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC  = ROOT / "knb" / "alaol-sapta-paykar.md"
BASE = ROOT / "revisions" / "alaol-sapta-paykar"

# (slug, bn-title, en-title, source_start_line, source_end_line_exclusive)
CHAPTERS = [
    ("prologue",        "প্রস্তাবনা",                    "Prologue",                   9,   708),
    ("bahram",          "বাহরাম-চরিত",                  "Bahram's Story",             708, 4696),
    ("saturday-black",  "শনিবার — কৃষ্ণ মণ্ডপ",         "Saturday — Black Pavilion",  4696,6318),
    ("sunday-yellow",   "রবিবার — পীত মণ্ডপ",           "Sunday — Yellow Pavilion",   6318,6950),
    ("monday-green",    "সোমবার — হরিত মণ্ডপ",          "Monday — Green Pavilion",    6950,7713),
    ("tuesday-red",     "মঙ্গলবার — রক্ত মণ্ডপ",        "Tuesday — Red Pavilion",     7713,8265),
    ("wednesday-blue",  "বুধবার — নীল মণ্ডপ",           "Wednesday — Blue Pavilion",  8265,8912),
    ("thursday-sandal", "বৃহস্পতিবার — চন্দন মণ্ডপ",    "Thursday — Sandal Pavilion", 8912,9590),
    ("friday-white",    "শুক্রবার — শুভ্র মণ্ডপ",       "Friday — White Pavilion",    9590,10263),
    ("epilogue",        "উপসংহার",                      "Epilogue",                   10263, 10**9),
]

HTML_TEMPLATE = """<!DOCTYPE html>
<html lang="en">

<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>{en_title} — Alaol's Sapta Paykar — KMBA</title>
  <link rel="stylesheet" href="/css/style.css" />
  <link rel="stylesheet" href="/css/translation-table.css" />
  <script defer src="/js/nav.js"></script>
</head>

<body>
  <div class="page-header">
    <div class="page-header-inner">
      <div class="breadcrumb">
        <a href="/revisions/">Revisions</a>
        <span class="sep">/</span>
        <a href="/revisions/alaol-sapta-paykar/">Alaol's Sapta Paykar</a>
        <span class="sep">/</span>
        <span class="breadcrumb-current">{en_title}</span>
      </div>
    </div>
  </div>

  <div class="trans-page wide{prose_class}">
    <div class="tt-wrap">
      <table class="tt-table">
        <thead>
          <tr></tr>
        </thead>
        <tbody>
        </tbody>
      </table>
    </div><!-- /.tt-wrap -->
  </div><!-- /.trans-page -->

  <script>
    window.TSV_CONFIG = {{
      src: '{tsv_name}',
      type: 'tercet'
    }};
  </script>
  <script src="/js/tsv-loader.js"></script>
  <script src="/js/translation-table.js"></script>
</body>

</html>
"""

def keep(line: str) -> bool:
    """True if this source line should appear in the chapter TSV."""
    if line == "":
        return False
    if line.startswith("# ") and not line.startswith("## "):
        return False  # page-title separator pages like `# সপ্ত পয়কর — পৃষ্ঠা …`
    if line.startswith("### "):
        return False
    if line.startswith("**"):
        return False
    return True

def emit_text(line: str) -> str:
    """Convert a kept source line to its TSV col-0 text. Section headings
    keep their `## ` prefix so the tercet builder renders them as
    prominent full-width rows."""
    return line

# Chapters that already have English translations get the .tt-prose
# wrapper class (drops italic + enables nowrap on the English column).
PROSE_CHAPTERS = {"prologue"}

def main():
    src_lines = SRC.read_text(encoding="utf-8").splitlines()

    for slug, bn_title, en_title, start, end in CHAPTERS:
        chunk = src_lines[start - 1 : end - 1]   # 1-indexed inclusive→slice
        rows  = ["আলাওল\t\t"]                    # 3-col header, last two empty
        verse_count = 0
        for raw in chunk:
            line = raw.rstrip()
            if not keep(line):
                continue
            text = emit_text(line)
            rows.append(f"{text}\t\t")
            if not line.startswith("## "):
                verse_count += 1

        ch_dir = BASE / slug
        ch_dir.mkdir(parents=True, exist_ok=True)
        tsv_name = f"{slug}.tsv"
        tsv_path = ch_dir / tsv_name
        # Preserve TSVs that have been hand-edited / translated (translated
        # rows have content in col 3). Only write structural TSV if the file
        # doesn't exist or every row has empty col 3.
        if tsv_path.exists():
            existing = tsv_path.read_text(encoding="utf-8")
            has_translations = any(
                len(ln.split("\t")) >= 3 and ln.split("\t")[2].strip()
                for ln in existing.splitlines()[1:]
            )
            if not has_translations:
                tsv_path.write_text("\n".join(rows) + "\n", encoding="utf-8")
        else:
            tsv_path.write_text("\n".join(rows) + "\n", encoding="utf-8")

        prose_class = " tt-prose" if slug in PROSE_CHAPTERS else ""
        (ch_dir / "index.html").write_text(
            HTML_TEMPLATE.format(
                en_title=en_title,
                tsv_name=tsv_name,
                prose_class=prose_class,
            ),
            encoding="utf-8",
        )
        print(f"  {slug:<18} {bn_title:<35} {verse_count:>5} verse lines")

if __name__ == "__main__":
    main()
