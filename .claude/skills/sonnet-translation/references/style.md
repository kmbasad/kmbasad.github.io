# The author's style — brief for translation agents

(Merged from the three working briefs of the Shakespeare run, 2026-10-09. Paths are illustrative: the work dir is wherever SONNET_WORK points.)

## The author's style (match it exactly)
- Each Bangla line renders exactly one English line (line 1 ↔ line 1, … line 14 ↔ 14).
- **Matrabritta, 18 matras per line** by the author's count. The counter is the site's
  scanner; for the author's existing lines it mostly reads 18 but sometimes 17 or 19 because
  of counting conventions on loan-words and final syllables. RULE: a line you edit must come
  out of `matra.py` with the **same count as the original line** had. A line you write new
  must come out at **18**.
- **Rhyme scheme reproduced from the English: abab cdcd efef gg** — end-words of lines 1/3,
  2/4, 5/7, 6/8, 9/11, 10/12, 13/14 rhyme in Bangla (the author rhymes on the final syllable
  sound, often the last two). Never change a rhyme word unless the replacement rhymes just as
  well with its partner.
- Register: intimate colloquial Bangla — আমি/তুমি/তোমার, কর/করো/করছ, চলিত forms
  (করছিলাম, দিছ, পাইছি occasionally), direct and plain, not সাধু, not Sanskritised unless
  the English is elevated.
- The author keeps English words in Bangla script when they carry a rhyme or an idea:
  মিউজ, গ্রেইস, হার্ট, বিউটি, ইউজ, এবিউজ, মিস্ট্রেস, স্টাইল, আর্ট, পার্ট, ফিগার, কী,
  ভার্চু, প্রফেট/প্রফেসি, উইল (for Will). Keep them; use them yourself where the English
  word is itself the point (Will / will in 135–136, 143).
- Punctuation follows the English line's (comma, semicolon, colon, dash —, question mark);
  a sonnet's final line ends with । . The author uses ’ for apostrophes and ‘ ’ for quotes.

## What "improve" means (polish agents)
The author says: "I'm not satisfied with some word choices because I had to match the rhymes.
Improve word choice — replace one word with another — keeping the Bangla rhythm intact. Never
change things too much." So:
- Swap a single weak or awkward word (or a 2-word phrase) for a more elegant, more exact
  Bangla word with the same matra count. Prefer natural Bangla over a loan-word when the
  loan-word is NOT a rhyme word and a Bangla word of the same count exists and is better.
- Do not rewrite lines. Do not change meaning. Do not touch rhyme words (unless the new word
  rhymes identically). Do not change word order. Leave good lines alone — most lines are
  good; expect to change roughly 1–3 lines per sonnet, some sonnets none.
- Verify EVERY edited line with matra.py against the original's count before keeping it.

## Output
Write exactly one JSON file (path given in your task). Polish agents:
`{"<sonnet number>": {"<0-based line index 0..13>": "<new full line>"}}` — only changed
lines. New-sonnet agents: `{"<sonnet number>": ["line1", …, "line14"]}` — all 14 lines, no
gap entries. Valid JSON, UTF-8, nothing else in the file. Report back in 3 lines: how many
lines changed/written, and anything you could not resolve.

---

## What to do, sonnet by sonnet
1. **Read the English line by line with a scholar's care.** Resolve every hard word and
   conceit (Shakespeare's Words at shakespeareswords.com, Wiktionary, Etymonline, the
   public-domain notes in Dowden / Tyler / Rolfe on archive.org or Wikisource are fine to
   consult). You may use WebFetch/WebSearch for glosses. **Do not read, copy or imitate any
   other Bangla translation of the sonnets** — only the author's own text and the English
   count. Never reproduce more than a short phrase of any copyrighted commentary.
2. **Check the Bangla against the sense.** Where a line misreads Shakespeare (e.g. "statute"
   rendered as মূর্তি, "lays" as নীড়), fix it — the fix may be a word or a whole line, but it
   must keep the line's matra count (the same count `matra.py` gives the original line) and
   its rhyme sound with its partner line (abab cdcd efef gg).
3. **Register — formal, modern, standard চলিত.** Replace every regional/colloquial verb form
   and contraction with the standard literary চলিত form of the same count where possible,
   or recast the phrase: দিছ→দিয়েছ, পাইছি→পেয়েছি, হইছে→হয়েছে, করছিলা→করেছিলে,
   বলবা→বলবে, রাখবা→রাখবে, রাখতেছি→রাখছি, ভাসায়ে→ভাসিয়ে, নিছে→নিয়েছে, দিছিলা→দিয়েছিলে,
   থাকবা→থাকবে, হারাইছি→হারিয়েছি, কইরো→কোরো, ভালা→ভালো, আইসো→এসো, ইত্যাদি.
   Keep তুমি/তোমার (Shakespeare's *thou* is intimate, not আপনি). Keep the dignified plainness —
   not সাধু, not Sanskritised pomp; think of the register of a modern formal Bangla poem.
3b. **Modern intelligibility — the author's firmest rule.** "The line must be as
   understandable to a modern Bangla reader as the English line is." Formal, yes, but never
   old poetic forms: no কভু, নাহি, হেরি, তব, মম, যবে, সনে, নর (for man), মাঝারে, তরে, লাগি,
   কহে, যথা/তথা, আঁখি, হৃদি, মোর/মোরে, তোমারে/আমারে, যাহা/তাহা, কেহ, হেথা/সেথা. Where the
   text has one, replace it with the plain modern word of the same count. Prefer the clear
   word over the rare word; a reader should not need a dictionary for the Bangla.
   Equally banned: Hindustani-flavoured coinages the author would never write — no -ওয়ালা /
   -ওয়ালি agent nouns (সরানেওয়ালা), no বোলো/করো-type Hindi-isms; agent nouns are made the
   Bangla way (যে সরায়, সরানোর হাত, অপসারক) or recast.
4. **Loan-words.** The author deliberately writes some English words in Bangla script
   (মিউজ, গ্রেইস, হার্ট, বিউটি, উইল, মিস্ট্রেস, আর্ট). Keep them where they are rhyme words or
   where the English word is itself the point (Will/will; "art"). Replace a casual loan-word
   that is not a rhyme word (প্লিজ, হ্যালো, গিফট, লস, ফলো, টর্চার, রেইনকোট, এক্সকিউজ when
   unrhymed, পারফেক্ট) with a Bangla word of the same count.
5. **Elegance.** Where a word is merely serviceable, a more exact or more beautiful Bangla
   word of the same count is welcome. Do not rewrite lines that are good — most are.
6. **Verify every changed line** with `matra.py`: its count must equal the original line's
   count. Verify the rhyme by ear (final syllable sound, usually the last two).

