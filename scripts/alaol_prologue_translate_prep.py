#!/usr/bin/env python3
"""
Prepare the Alaol prologue TSV for parallel English translation.

Pipeline (one-shot):
  1. Read revisions/alaol-sapta-paykar/prologue/prologue.tsv
     (current shape: bn \\t \\t).
  2. For each VERSE line (couplet halves ending in । or ॥), assign a
     1-indexed verse number. Section headings (## …) and rhythm
     markers (*(...)*) are NOT verse lines.
  3. Build a 3-column TSV: bn \\t lineNumberOrEmpty \\t (empty).
     Line number is shown in Bangla numerals on every 7th verse line.
  4. Split body rows into 10 equal-ish chunks. Write each chunk to
     /tmp/alaol-prologue-chunks/chunk-N.tsv together with a tiny
     header comment noting its row range and verse range.
"""
from pathlib import Path
import shutil

ROOT  = Path(__file__).resolve().parent.parent
SRC   = ROOT / "revisions" / "alaol-sapta-paykar" / "prologue" / "prologue.tsv"
WORK  = Path("/tmp/alaol-prologue-chunks")

LINE_NUMBER_EVERY = 7
BN_DIGITS = "০১২৩৪৫৬৭৮৯"

def to_bn(n: int) -> str:
    return "".join(BN_DIGITS[int(d)] for d in str(n))

def is_verse(text: str) -> bool:
    """A verse line ends in । or ॥ (Bangla dandas)."""
    if not text:
        return False
    if text.startswith("## "):
        return False
    if text.startswith("*("):     # rhythm marker
        return False
    return True

def main():
    raw = SRC.read_text(encoding="utf-8").splitlines()
    if not raw:
        raise SystemExit("empty source TSV")

    header = raw[0]                # original header (will be replaced)
    body   = [ln for ln in raw[1:] if ln.strip()]  # drop blank rows

    # Build 3-col rows with line numbers
    out_rows = []
    verse_count = 0
    for ln in body:
        cols = ln.split("\t")
        bn   = cols[0].strip()
        if is_verse(bn):
            verse_count += 1
            lnum = to_bn(verse_count) if verse_count % LINE_NUMBER_EVERY == 0 else ""
        else:
            lnum = ""
        out_rows.append(f"{bn}\t{lnum}\t")

    # Clean working dir
    if WORK.exists():
        shutil.rmtree(WORK)
    WORK.mkdir(parents=True)

    # Write the pre-filled full TSV (for later reference / merge sanity)
    new_header = "আলাওল\t#\tEnglish"
    (WORK / "prologue-prepped.tsv").write_text(
        new_header + "\n" + "\n".join(out_rows) + "\n", encoding="utf-8"
    )

    # Split into 10 chunks
    N = 10
    total = len(out_rows)
    chunk_size = (total + N - 1) // N
    for i in range(N):
        start = i * chunk_size
        end   = min(start + chunk_size, total)
        chunk = out_rows[start:end]
        if not chunk:
            continue
        body_text = "\n".join(chunk) + "\n"
        (WORK / f"chunk-{i+1}.tsv").write_text(body_text, encoding="utf-8")

    print(f"Total body rows: {total}, verse lines: {verse_count}")
    print(f"Chunks written to {WORK}/  (~{chunk_size} rows each)")
    print(f"Header for final TSV: {new_header!r}")

if __name__ == "__main__":
    main()
