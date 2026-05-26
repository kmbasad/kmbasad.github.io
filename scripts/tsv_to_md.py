#!/usr/bin/env python3
"""
Convert a trellis TSV to a navigable markdown file.

Output format (every section is a markdown heading so Ctrl+F finds it):

    # <Trellis title>

    axes:
      rows: <Row dimension>
      cols: <Col dimension>

    ## Columns

    ### Col 0 · <Name>

    dates: ...
    culture: ...
    short: ...

    Long synthesis paragraphs...

    ### Col 1 · ...

    ## Rows

    ### Row 0 · <Name>

    dates: ...
    desc: ...
    short: ...

    Long synthesis paragraphs...

    ## Cells

    ### 00 · <Short label>

    Long cell content...

    ### 01 · <Short label>

    ...

Cell ids are <row><col> (e.g. 00, 45, 99) so that searching "### 45"
jumps directly to cell (row 4, col 5).

Usage:
    python3 scripts/tsv_to_md.py <input.tsv> <output.md>
"""

from __future__ import annotations

import csv
import re
import sys
from pathlib import Path


# ── TSV reading ────────────────────────────────────────────────────────────────

def parse_tsv(path: Path) -> list[list[str]]:
    with path.open("r", encoding="utf-8", newline="") as f:
        reader = csv.reader(f, delimiter="\t", quotechar='"')
        return [row for row in reader if row]


# ── Cell parsers ───────────────────────────────────────────────────────────────

def split_corner(text: str) -> tuple[str, str]:
    """Extract row + col dimension labels from the corner cell."""
    t = text.strip()
    m = re.match(r"^(.+?)\s*↓\s*[·•\-]\s*(.+?)\s*→", t)
    if m:
        return m.group(1).strip(), m.group(2).strip()
    parts = [p.strip() for p in re.split(r"\n+", t) if p.strip()]
    parts = [p for p in parts if not re.match(r"^\d+\s*[×x]\s*\d+$", p)]
    if len(parts) >= 2:
        return parts[0], parts[1]
    return (parts[0] if parts else "Row"), "Col"


def split_col_header(text: str) -> dict:
    """name, dates, culture, short, long — all optional except name."""
    parts = [p.strip() for p in text.split("\n\n")]
    name = parts[0] if parts else ""
    rest = parts[1:]

    dates = ""
    culture = ""

    if rest and re.search(r"\d", rest[0]):
        dates = rest.pop(0)
        if rest and not re.search(r"\d", rest[0]):
            culture = rest.pop(0)

    short = rest.pop(0) if rest else ""
    long_text = "\n\n".join(rest).strip()

    return {
        "name": name,
        "dates": dates,
        "culture": culture,
        "short": short,
        "long": long_text,
    }


def split_row_header(text: str) -> dict:
    """name, desc, short (if <80 chars), long."""
    parts = [p.strip() for p in text.split("\n\n")]
    name = parts[0] if parts else ""
    rest = parts[1:]

    desc = rest.pop(0) if rest else ""
    short = ""
    if rest and len(rest[0]) < 80:
        short = rest.pop(0)
    long_text = "\n\n".join(rest).strip()

    return {"name": name, "desc": desc, "short": short, "long": long_text}


def split_cell(text: str) -> dict:
    parts = text.split("\n\n")
    short = parts[0].strip() if parts else ""
    # short is just the first line of the first block (matrix.js does the same)
    short = short.split("\n", 1)[0]
    long_text = "\n\n".join(parts[1:]).strip() if len(parts) > 1 else ""
    return {"short": short, "long": long_text}


# ── Markdown emitter ───────────────────────────────────────────────────────────

def emit(rows: list[list[str]], title: str) -> str:
    n_rows = len(rows) - 1
    n_cols = len(rows[0]) - 1
    row_label, col_label = split_corner(rows[0][0])

    out: list[str] = []
    out.append(f"# {title}")
    out.append("")
    out.append("axes:")
    out.append(f"  rows: {row_label}")
    out.append(f"  cols: {col_label}")
    out.append("")
    out.append("## Columns")
    out.append("")
    for ci in range(n_cols):
        c = split_col_header(rows[0][ci + 1])
        out.append(f"### Col {ci} · {c['name']}")
        out.append("")
        if c["dates"]:
            out.append(f"dates: {c['dates']}")
            out.append("")
        if c["culture"]:
            out.append(f"culture: {c['culture']}")
            out.append("")
        if c["short"]:
            out.append(f"short: {c['short']}")
            out.append("")
        if c["long"]:
            out.append(c["long"])
            out.append("")

    out.append("## Rows")
    out.append("")
    for ri in range(n_rows):
        r = split_row_header(rows[ri + 1][0])
        out.append(f"### Row {ri} · {r['name']}")
        out.append("")
        if r["desc"]:
            out.append(f"desc: {r['desc']}")
            out.append("")
        if r["short"]:
            out.append(f"short: {r['short']}")
            out.append("")
        if r["long"]:
            out.append(r["long"])
            out.append("")

    out.append("## Cells")
    out.append("")
    for ri in range(n_rows):
        for ci in range(n_cols):
            cell = split_cell(rows[ri + 1][ci + 1])
            cid = f"{ri}{ci}"
            label = f" · {cell['short']}" if cell["short"] else ""
            out.append(f"### {cid}{label}")
            out.append("")
            if cell["long"]:
                out.append(cell["long"])
                out.append("")
    return "\n".join(out).rstrip() + "\n"


# ── Main ───────────────────────────────────────────────────────────────────────

def derive_title(p: Path) -> str:
    stem = p.stem
    stem = stem.replace("-", " ").replace("_", " ")
    return stem[:1].upper() + stem[1:]


def main() -> None:
    if len(sys.argv) != 3:
        print("Usage: tsv_to_md.py <input.tsv> <output.md>", file=sys.stderr)
        sys.exit(1)
    in_path = Path(sys.argv[1])
    out_path = Path(sys.argv[2])
    rows = parse_tsv(in_path)
    md = emit(rows, derive_title(in_path))
    out_path.write_text(md, encoding="utf-8")
    print(f"Wrote {out_path} from {in_path} ({len(rows)-1}×{len(rows[0])-1} cells)")


if __name__ == "__main__":
    main()
