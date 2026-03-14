#!/usr/bin/env python3
"""
update_index.py
---------------
Scans philosophy/, translations/, and history/ for article .html files,
extracts the first <h1> from each, sorts alphabetically, and rewrites
the <!-- ARTICLES_START --> ... <!-- ARTICLES_END --> block inside each
folder's index.html directly. No JSON files involved.

Usage (run from the website root folder):
    python3 update_index.py
"""

import os
import re

SECTIONS = ["philosophy", "translations", "history"]
SKIP_FILES = {"index.html"}
PLACEHOLDER = {
    "philosophy":   "No philosophy articles published yet. Check back soon.",
    "translations": "No translations published yet. Check back soon.",
    "history":      "No history articles published yet. Check back soon.",
}

START_MARKER = "<!-- ARTICLES_START -->"
END_MARKER   = "<!-- ARTICLES_END -->"


def extract_h1(filepath):
    """Return plain text of the first <h1> in the file, or None."""
    with open(filepath, encoding="utf-8") as f:
        content = f.read()
    match = re.search(r"<h1[^>]*>(.*?)</h1>", content, re.IGNORECASE | re.DOTALL)
    if not match:
        return None
    text = re.sub(r"<[^>]+>", "", match.group(1))   # strip inner tags
    text = re.sub(r"\s+", " ", text).strip()
    return text or None


def build_listing(articles):
    """
    Build the HTML string that goes between the markers.
    articles is a list of (filename, title) tuples, already sorted.
    """
    if not articles:
        return ""   # caller will use placeholder

    lines = []
    for filename, title in articles:
        lines.append(
            f'    <a class="listing-item" href="{filename}">\n'
            f'      <span class="title">{title}</span>\n'
            f'    </a>'
        )
    return "\n".join(lines)


def update_index(section):
    base        = os.path.dirname(os.path.abspath(__file__))
    folder      = os.path.join(base, section)
    index_path  = os.path.join(folder, "index.html")

    if not os.path.isdir(folder):
        print(f"  [skip] folder not found: {folder}")
        return
    if not os.path.isfile(index_path):
        print(f"  [skip] index.html not found in {section}/")
        return

    # Collect articles
    articles = []
    for filename in os.listdir(folder):
        if not filename.endswith(".html"):
            continue
        if filename.lower() in SKIP_FILES:
            continue
        filepath = os.path.join(folder, filename)
        title = extract_h1(filepath)
        if not title:
            print(f"  [warn] no <h1> in {section}/{filename} — skipping")
            continue
        articles.append((filename, title))
        print(f"  [ok]   {section}/{filename}  →  \"{title}\"")

    articles.sort(key=lambda x: x[1].lower())

    # Build replacement block
    if articles:
        inner = "\n" + build_listing(articles) + "\n    "
    else:
        section_key = section.lower()
        placeholder_text = PLACEHOLDER.get(section_key, "No articles published yet.")
        inner = f'\n    <div class="placeholder">{placeholder_text}</div>\n    '

    replacement = START_MARKER + inner + END_MARKER

    # Read index.html and replace the block
    with open(index_path, encoding="utf-8") as f:
        content = f.read()

    pattern = re.compile(
        re.escape(START_MARKER) + r".*?" + re.escape(END_MARKER),
        re.DOTALL
    )

    if not pattern.search(content):
        print(f"  [error] markers not found in {section}/index.html — skipping")
        return

    new_content = pattern.sub(replacement, content)

    with open(index_path, "w", encoding="utf-8") as f:
        f.write(new_content)

    print(f"  → updated {section}/index.html with {len(articles)} article(s)\n")


def main():
    print("update_index.py — updating section index pages\n")
    for section in SECTIONS:
        print(f"[{section}]")
        update_index(section)
    print("Done.")


if __name__ == "__main__":
    main()
