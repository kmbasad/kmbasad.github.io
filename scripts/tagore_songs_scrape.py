#!/usr/bin/env python3
"""One-off scraper: tagoreweb.in songs → src/data/tagore-songs/*.json

Stages (run in order; each is resumable thanks to the HTML cache):
  python3 scripts/tagore_songs_scrape.py catalogue   # categories + song lists
  python3 scripts/tagore_songs_scrape.py songs       # every song page + renditions
  python3 scripts/tagore_songs_scrape.py emit        # write the site JSON

The raw HTML cache lives in CACHE_DIR (outside the repo). Lyrics are public
domain (Tagore d. 1941); rendition YouTube IDs are the ones curated on
tagoreweb.in, credited on the song pages.
"""
import json
import re
import sys
import time
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

import requests
from bs4 import BeautifulSoup

BASE = 'https://www.tagoreweb.in'
REPO = Path(__file__).resolve().parent.parent
OUT_DIR = REPO / 'src' / 'data' / 'tagore-songs'
CACHE_DIR = Path('/tmp/claude-1000/-home-asad-Software-kmba/70e51558-fea2-490b-84db-cb81be7d1171/scratchpad/tagore-cache')
CATALOGUE = CACHE_DIR / 'catalogue.json'
WORKERS = 4

session = requests.Session()
session.headers['User-Agent'] = 'Mozilla/5.0 (X11; Linux x86_64) kmba-site-builder (personal archive; contact arg@iub.edu.bd)'


def fetch(url, cache_name, post_data=None):
    """GET (or POST) with a file cache; returns text."""
    cache = CACHE_DIR / cache_name
    if cache.exists() and cache.stat().st_size > 500:
        return cache.read_text(encoding='utf-8')
    for attempt in range(4):
        try:
            if post_data is not None:
                r = session.post(url, data=post_data, timeout=30)
            else:
                r = session.get(url, timeout=30)
            r.raise_for_status()
            cache.parent.mkdir(parents=True, exist_ok=True)
            cache.write_text(r.text, encoding='utf-8')
            time.sleep(0.15)
            return r.text
        except Exception as e:
            if attempt == 3:
                raise
            time.sleep(2 * (attempt + 1))


def stage_catalogue():
    html = fetch(f'{BASE}/Songs', 'songs-index.html')
    soup = BeautifulSoup(html, 'html.parser')
    cats = []
    seen = set()
    for a in soup.select('a[href*="/Songs/"]'):
        href = a['href'].split('?')[0].rstrip('/')
        m = re.fullmatch(rf'{re.escape(BASE)}/Songs/([a-z0-9-]+-(\d+))', href)
        if not m or m.group(1) in seen:
            continue
        seen.add(m.group(1))
        name = a.get_text(strip=True)
        if not name:
            continue
        cats.append({'srcSlug': m.group(1), 'id': m.group(2), 'bn': name})

    total = 0
    for cat in cats:
        html = fetch(f'{BASE}/Songs/{cat["srcSlug"]}', f'cat-{cat["srcSlug"]}.html')
        soup = BeautifulSoup(html, 'html.parser')
        songs = []
        sseen = set()
        for a in soup.select('.suchi_patra_area a[href*="/Songs/"]'):
            href = a['href'].split('?')[0].rstrip('/')
            m = re.fullmatch(rf'{re.escape(BASE)}/Songs/{re.escape(cat["srcSlug"])}/([a-z0-9-]+-(\d+))', href)
            if not m or m.group(1) in sseen:
                continue
            sseen.add(m.group(1))
            songs.append({'srcSlug': m.group(1), 'id': m.group(2),
                          'title': ' '.join(a.get_text().split())})
        cat['songs'] = songs
        total += len(songs)
        print(f'{cat["bn"]} ({cat["srcSlug"]}): {len(songs)} songs', flush=True)

    CATALOGUE.write_text(json.dumps(cats, ensure_ascii=False, indent=1), encoding='utf-8')
    print(f'TOTAL: {total} songs in {len(cats)} categories')


def scrape_one(cat, song):
    key = f'{cat["srcSlug"]}/{song["srcSlug"]}'
    try:
        fetch(f'{BASE}/Songs/{key}', f'song-{song["id"]}.html')
        fetch(f'{BASE}/get-renditions', f'rend-{song["id"]}.html',
              post_data={'topic_id': song['id']})
    except Exception as e:
        # e.g. tagoreweb serves a 500 for a handful of songs — skip, don't die
        print(f'FAIL {key}: {e}', flush=True)
    return key


def stage_songs():
    cats = json.loads(CATALOGUE.read_text(encoding='utf-8'))
    work = [(c, s) for c in cats for s in c['songs']]
    done = 0
    with ThreadPoolExecutor(max_workers=WORKERS) as ex:
        for _ in ex.map(lambda w: scrape_one(*w), work):
            done += 1
            if done % 100 == 0:
                print(f'{done}/{len(work)}', flush=True)
    print(f'scraped {done} songs')


META_KEYS = {
    'রাগ': 'raga', 'তাল': 'tala', 'রচনাকাল (বঙ্গাব্দ)': 'writtenBn',
    'রচনাকাল (খৃষ্টাব্দ)': 'writtenEn', 'রচনাস্থান': 'place',
    'স্বরলিপিকার': 'notator',
}


def parse_song(song):
    page = CACHE_DIR / f'song-{song["id"]}.html'
    if not page.exists():
        return None, None, None
    html = page.read_text(encoding='utf-8')
    soup = BeautifulSoup(html, 'html.parser')
    lines = []
    content = soup.select_one('.song-content')
    if content:
        for p in content.find_all('p'):
            # keep the leading-space indentation; collapse internal runs later in CSS
            lines.append(p.get_text().replace('\xa0', ' ').rstrip())
    meta = {}
    details = soup.select_one('.song-details')
    if details:
        for p in details.find_all('p'):
            txt = ' '.join(p.get_text().split())
            if ':' in txt:
                k, v = txt.split(':', 1)
                k, v = k.strip(), v.strip()
                if k in META_KEYS and v:
                    meta[META_KEYS[k]] = v

    rend_html = (CACHE_DIR / f'rend-{song["id"]}.html').read_text(encoding='utf-8')
    rsoup = BeautifulSoup(rend_html, 'html.parser')
    renditions = []
    for box in rsoup.select('.rendition-box'):
        img = box.select_one('img[src*="img.youtube.com"]')
        h3 = box.select_one('h3')
        if not img:
            continue
        m = re.search(r'/vi/([\w-]{11})/', img['src'])
        if m:
            renditions.append({'yt': m.group(1),
                               'artist': ' '.join(h3.get_text().split()) if h3 else ''})
    return lines, meta, renditions


def stage_emit():
    cats = json.loads(CATALOGUE.read_text(encoding='utf-8'))
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    # our song slugs: source slug without the trailing numeric id, deduped globally
    counts = {}
    for c in cats:
        for s in c['songs']:
            base = re.sub(r'-\d+$', '', s['srcSlug'])
            counts[base] = counts.get(base, 0) + 1
    out_cats = []
    n_songs = n_rend = 0
    for c in cats:
        cat_slug = re.sub(r'-\d+$', '', c['srcSlug'])
        songs_out = []
        for s in c['songs']:
            base = re.sub(r'-\d+$', '', s['srcSlug'])
            slug = s['srcSlug'] if counts[base] > 1 else base
            lines, meta, rends = parse_song(s)
            if lines is None:
                print(f'SKIP (not scraped): {s["srcSlug"]}', flush=True)
                continue
            if not lines:
                print(f'WARN no lyrics: {s["srcSlug"]}', flush=True)
            songs_out.append({
                'slug': slug, 'id': s['id'], 'title': s['title'],
                'lines': lines, 'meta': meta, 'renditions': rends,
                'src': f'{BASE}/Songs/{c["srcSlug"]}/{s["srcSlug"]}',
            })
            n_songs += 1
            n_rend += len(rends)
        out_cats.append({'slug': cat_slug, 'bn': c['bn'], 'srcSlug': c['srcSlug'],
                         'count': len(songs_out)})
        (OUT_DIR / f'{cat_slug}.json').write_text(
            json.dumps(songs_out, ensure_ascii=False), encoding='utf-8')
        print(f'{cat_slug}.json: {len(songs_out)} songs', flush=True)
    (OUT_DIR / 'categories.json').write_text(
        json.dumps(out_cats, ensure_ascii=False, indent=1), encoding='utf-8')
    print(f'EMITTED {n_songs} songs, {n_rend} renditions, {len(out_cats)} categories')


if __name__ == '__main__':
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    stage = sys.argv[1] if len(sys.argv) > 1 else 'catalogue'
    {'catalogue': stage_catalogue, 'songs': stage_songs, 'emit': stage_emit}[stage]()
