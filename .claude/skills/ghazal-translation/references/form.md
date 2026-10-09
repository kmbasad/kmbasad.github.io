# The ghazal form as the author builds it

Measured from his own 33 ghazals (প্রথমা, `public/translations/divan/prathama/prathama.md`),
2026-10-09. Ghazals 34–36 (দ্বিতীয়া) were made by Claude with this method; they are not evidence.

## 1 · Lines and couplets

- **One Bangla line per Persian misra (half-line), in order.** A beyt = two table rows. The
  Persian cell is Ganjoor's text verbatim (with its harakat and ZWNJs); the ghazal number sits
  in `#` on the first row only; a `| | | |` row separates ghazals. Never merge or split misras —
  the table, the সূচি and the hover alignment all hang on it.
- **Couplet count = Ganjoor's, exactly.** Codas after the signature couplet are translated too.
- **Sense may run over from the first line of a couplet into the second** (81 of the author's
  291 first lines end with no punctuation), never from one couplet into the next.

## 2 · Line length — one length per ghazal, set by the Persian metre

Matrabritta, counted with `scripts/matra.py` (open syllable 1, closed 2 — the site's own
scanner). The author does **not** use one length for the whole Divan: each ghazal has its own,
and it follows the original's metre. His medians, by metre family:

| Persian metre | Ghazals (median matras) | Use for a new one |
|---|---|---|
| Hazaj, full — *mafāʿīlun ×4* | 1 (19), 3 (19) | 19 |
| Mujtass — *mafāʿilun faʿilātun mafāʿilun faʿlun* | 2 (18), 4 (18), 16 (19), 22 (18), 23 (20), 25 (19), 28 (21), 32 (20) | 19 (18–20) |
| Ramal makhbun — *fāʿilātun faʿilātun faʿilātun faʿlun* | 9 (19), 17 (18), 18 (19), 19 (19), 20 (19), 21 (20), 24 (19), 26 (18) | 19 |
| Ramal full mahzuf — *fāʿilātun ×3 fāʿilun* | 10 (19), 12 (19), 14 (21), 31 (19) | 19 |
| Ramal mashkul — *faʿilātu fāʿilātun ×2* | 6 (18) | 18 |
| Mozāreʿ akhrab makfuf — *mafʿūlu fāʿilātu mafāʿīlu fāʿilun* | 7 (19), 11 (20), 30 (19), 33 (19) | 19 |
| Mozāreʿ akhrab — *mafʿūlu fāʿilātun ×2* | 5 (19) | 19 |
| Hazaj akhrab makfuf — *mafʿūlu mafāʿīlu mafāʿīlu faʿūlun* | 15 (19), 29 (21) | 19–20 |
| Hazaj akhrab — *mafʿūlu mafāʿīlun ×2* | 27 (18) | 18 |
| Ramal, six-foot — *fāʿilātun fāʿilātun fāʿilun* | 8 (15) | 15 |
| Khafif — *fāʿilātun mafāʿilun faʿlun* | 13 (16) | 16 |

(Metres identified from the incipits; confirm on Ganjoor, which names each ghazal's metre on
its page.) Rules of thumb:

- The two **short** metres get short lines (15–16); the long ones 18–21. Pick the family value
  from the table; a long refrain (পড়েছে, কি দরকার) may justify +1.
- **The author lets lines breathe ±1 around the ghazal's length** (his within-ghazal spread is
  about one matra; 13% of his lines sit ≥2 off). A new ghazal should keep to target ±1;
  ≥2 off is a line to recast. Do not chase every line to the exact number for its own sake.

## 3 · Rhyme — three architectures, chosen by the Persian

Every ghazal rhymes its matla (both lines of couplet 1) and then every second line.

1. **Refrain + rhyme (radif + qāfiya) — when the Persian radif is a content word Bangla can
   end on.** 6 of 33: 11 *আমাদের*, 12 *তোমার*, 17 *পোড়ে*, 19 *কোথায়*, 30 *বাঁধা/বাধা*,
   33 *কি দরকার* (and 34 *তোমার*, 36 *পড়েছে*). The rhyme falls on the word before the refrain:
   12 অম্লান/ফরমান/সম্মান… তোমার; 33 তামাশা/দুরাশা/জিজ্ঞাসা… কি দরকার. Ghazal 30 is the
   model of wit: বাঁধা (tied) / বাধা (blocked) carries both senses of *bast*.
2. **Single rhyme, full** — when the radif is grammatical (*rā*, *ast*, *-at*) and cannot be
   kept: the last word of each rhyming line shares vowel + final consonant. 3 (-ার: তার / ধার /
   খাবার / বাহার / আঁধার / কিনার / হার), 9 (-ান), 10 (-ির), 20 (-িল), 21 (-াম), 22 (-ুল),
   25 (-ান), 27 (-াল), 31 (-লে), 32 (-ায়).
3. **Single rhyme, loose** — the final consonant or syllable shared, vowel free: 1 (-লে),
   4/8/13 (-রে), 7 (-ত), 18 (-তে), 24 (-কে/-গে/-খে), 26 (-তে/-টে), 28 (-ম), 2/15/29 (-াব/-াপ).

The author **tolerates** a repeated rhyme word (1 তুলে, 4 ঘোরে, 8 শিরে, 10 পীর — Hafez does
it too) and an occasional slant. Aim for type 1 or 2; fall back to 3 rather than distort sense.

## 4 · The signature couplet

Hafez names himself in the last couplet (32 of 33; 20 has none — follow the Persian). The
author keeps the name where Hafez puts it, usually as a **vocative with commas**: `হাফিজ,`
(17 times), else `হাফিজের` (8), `হাফিজ` (6). Couplets after the signature (11's Haji Qavam,
12's address to Yazd and the shah, 16's khwaja, 31's pen's crow) are translated as they stand.

## 5 · Shapes the ghazals take (for orientation, not rules)

Repeated-question ghazals (2 *kojā*, 19, 33); dialogue (14 throughout, 21's opening, 32's
close, the beloved's speech in 26); night-visit scenes (26, 27); spring and Eid (9, 13, 25;
18, 20); patron poems (6, 11, 12, 16, 28); wine against the ascetic (7, 8, 10, 20, 24, 25, 29).
Keep the shape the Persian has — a question refrain stays a question, a dialogue keeps its
বললাম / বলল.
