#!/usr/bin/env python3
"""
Merge the 10 translated chunks back into the prologue TSV.

Reads /tmp/alaol-prologue-chunks/chunk-{1..10}-out.tsv in order, prepends
the 3-column header, and writes the result to
revisions/alaol-sapta-paykar/prologue/prologue.tsv.

Validates that every row has exactly 3 tab-separated fields.
"""
from pathlib import Path

ROOT  = Path(__file__).resolve().parent.parent
WORK  = Path("/tmp/alaol-prologue-chunks")
DST   = ROOT / "revisions" / "alaol-sapta-paykar" / "prologue" / "prologue.tsv"
HEADER = "আলাওল\t#\tEnglish"

def main():
    merged = [HEADER]
    for i in range(1, 11):
        ch = WORK / f"chunk-{i}-out.tsv"
        if not ch.exists():
            raise SystemExit(f"missing: {ch}")
        for ln in ch.read_text(encoding="utf-8").splitlines():
            if not ln.strip():
                continue
            fields = ln.split("\t")
            if len(fields) != 3:
                raise SystemExit(f"bad row in {ch.name}: {len(fields)} fields → {ln!r}")
            merged.append(ln)

    DST.write_text("\n".join(merged) + "\n", encoding="utf-8")
    print(f"Wrote {DST.relative_to(ROOT)} — {len(merged)-1} body rows")

if __name__ == "__main__":
    main()
