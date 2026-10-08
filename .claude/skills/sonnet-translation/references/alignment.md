# Word alignment — brief for alignment agents

## Input
Your task names a file `SCRATCH/align/src_NN_<from>-<to>.json`:
`{"<sonnet>.<line>": {"bn": "<Bangla line>", "en": "<English line>"}, …}`.

## Output
`SCRATCH/align/out_NN.json`: `{"<sonnet>.<line>": [["<bn token>", "<en token>"], …], …}`
— for every line in your input, the list of word pairs. Rules:
- A token is one whitespace-separated word **copied exactly as it appears in the line**,
  punctuation and all (e.g. `বিউটির`, `beauty’s`, `মরে,`, `die,`). Matching is done after
  stripping punctuation and case, so copying exactly is safest.
- Pair every content word you can: nouns, verbs, adjectives, adverbs, pronouns (তুমি↔thou,
  তোমার↔thy/thine/thee as the line has it), and function words where the correspondence is
  real (না↔never/not, যদি↔if, কিন্তু↔but, আর/ও↔and).
- A Bangla word rendering an English phrase: pair it with each word of the phrase (one pair
  per English word). A Bangla phrase rendering one English word: one pair per Bangla word.
- Leave out words with no counterpart (metrical fillers, rhyme padding). Do not guess.
- Keep the order of pairs by Bangla position. Do not invent tokens not in the line.
- Work line by line through the whole chunk; write the file incrementally (every ~40
  lines) so a partial result survives. Valid JSON, UTF-8, nothing else in the file.

Report in 3 lines: lines done, pairs written, anything odd.
