// গীতবিতান — the 22 sections scraped from tagoreweb.in, in the canonical
// order of the printed Gitabitan: the six mool porjay, the mixed shelves,
// the গীতিনাট্য ও নৃত্যনাট্য, then the porishishtos. Each section's songs
// live in ./tagore-songs/<slug>.json (emitted by scripts/tagore_songs_scrape.py,
// which also carries each song's lyrics, raga/tala metadata, and the YouTube
// renditions curated on tagoreweb.in).
export const tagoreSections = [
  { slug: 'pooja',                                 bn: 'পূজা',                         group: 'পর্যায়' },
  { slug: 'swadesh',                               bn: 'স্বদেশ',                       group: 'পর্যায়' },
  { slug: 'prem',                                  bn: 'প্রেম',                        group: 'পর্যায়' },
  { slug: 'prakriti',                              bn: 'প্রকৃতি',                      group: 'পর্যায়' },
  { slug: 'bichitra',                              bn: 'বিচিত্র',                      group: 'পর্যায়' },
  { slug: 'anusthanik',                            bn: 'আনুষ্ঠানিক',                   group: 'পর্যায়' },
  { slug: 'pooja-o-prarthana',                     bn: 'পূজা ও প্রার্থনা',             group: 'পর্যায়' },
  { slug: 'prem-o-prakriti',                       bn: 'প্রেম ও প্রকৃতি',              group: 'পর্যায়' },
  { slug: 'anusthanik-sangeet',                    bn: 'আনুষ্ঠানিক সংগীত',             group: 'পর্যায়' },
  { slug: 'jateeya-sangeet',                       bn: 'জাতীয় সংগীত',                  group: 'পর্যায়' },
  { slug: 'natyogiti',                             bn: 'নাট্যগীতি',                    group: 'পর্যায়' },
  { slug: 'bhausingha-thakurer-podabali-gitabitan',bn: 'ভানুসিংহ ঠাকুরের পদাবলী',      group: 'পর্যায়' },
  { slug: 'balmikiprotibha-gitabitan',             bn: 'বাল্মীকিপ্রতিভা',              group: 'গীতিনাট্য ও নৃত্যনাট্য' },
  { slug: 'kalmrigoya-gitabitan',                  bn: 'কালমৃগয়া',                     group: 'গীতিনাট্য ও নৃত্যনাট্য' },
  { slug: 'mayar-khela-gitabitan',                 bn: 'মায়ার খেলা',                   group: 'গীতিনাট্য ও নৃত্যনাট্য' },
  { slug: 'chitrangoda-gitabitan',                 bn: 'চিত্রাঙ্গদা',                  group: 'গীতিনাট্য ও নৃত্যনাট্য' },
  { slug: 'chadalika-gitabitan',                   bn: 'চণ্ডালিকা',                    group: 'গীতিনাট্য ও নৃত্যনাট্য' },
  { slug: 'shyama-gitabitan',                      bn: 'শ্যামা',                       group: 'গীতিনাট্য ও নৃত্যনাট্য' },
  { slug: 'nrityonatyo-mayar-khela',               bn: 'নৃত্যনাট্য মায়ার খেলা',        group: 'পরিশিষ্ট' },
  { slug: 'porishishto2-parishodh',                bn: 'পরিশোধ',                       group: 'পরিশিষ্ট' },
  { slug: 'porishishto3-rabichchhaya',             bn: 'রবিচ্ছায়া',                    group: 'পরিশিষ্ট' },
  { slug: 'porishishto-4',                         bn: 'পরিশিষ্ট ৪',                   group: 'পরিশিষ্ট' },
];

const files = import.meta.glob('./tagore-songs/*.json', { eager: true, import: 'default' });

// Claude's English translations + word alignments, one chunk file per ~25
// songs (written by the translation agents), each keyed by song id:
// { "<id>": { en: [lines], align: [[[bnWord, enWords], …], …] }, … }
const enFiles = import.meta.glob('./tagore-songs-en/*.json', { eager: true, import: 'default' });
const enById = {};
for (const chunk of Object.values(enFiles)) Object.assign(enById, chunk);

// Sections in canonical order, each with its songs; a song's serial within
// its section (1-based) is its গীতবিতান number.
export function loadSections() {
  return tagoreSections
    .map((sec) => {
      const songs = files[`./tagore-songs/${sec.slug}.json`];
      return songs
        ? { ...sec, songs: songs.map((s) => ({ ...s, ...(enById[s.id] || {}) })) }
        : null;
    })
    .filter(Boolean);
}

// Flat list in reading order with section + serial + prev/next attached.
export function loadSongs() {
  const flat = [];
  for (const sec of loadSections()) {
    sec.songs.forEach((song, i) => {
      flat.push({ ...song, section: sec, serial: i + 1 });
    });
  }
  return flat.map((s, i) => ({
    ...s,
    prev: i > 0 ? flat[i - 1] : null,
    next: i < flat.length - 1 ? flat[i + 1] : null,
  }));
}

export const bnNum = (n) =>
  String(n).replace(/\d/g, (d) => '০১২৩৪৫৬৭৮৯'[d]);
