# Candide in Dhaka Bangla: the review, handed over

The state of the work on 2026-10-31, for whoever picks it up: another Claude session,
another account, or the owner himself. Everything needed is in this folder and in the
skill `.claude/skills/dhaka-bangla/`. Nothing lives only in a chat or on claude.ai.

## What this is

The site's গদ্য room carries Voltaire's *Candide* in Bangla (`src/data/gadya/candide.tsv`:
one row a sentence, with columns id, kind, French and Bangla, and 1,310 rows). That Bangla is
standard চলিত. The owner is rewriting it, chapter by chapter, into his own modern Dhaka
Bangla. The rules he has set are the skill **dhaka-bangla**: read
`.claude/skills/dhaka-bangla/SKILL.md` before touching any text.

The rewrite is **not on the site yet**. The draft is `text/candide-dhaka.tsv` (columns id and
Bangla, 1,310 rows, the same ids as the site's file). He reads it on a review page and marks
it. Only when he has read it all does it replace the Bangla column of the site's TSV. That
last step is a single script: copy column 2 of the draft into column 4 of the site file, by
id. Do it only when he says so.

## Where the review stands

- **Chapters 1–6 are reviewed.** His marks are in `store/review/`, and every one of them has
  been applied to the whole book and answered. The rules they produced are in the skill,
  each marked [owner].
- **Chapters 7–30 have not been reviewed by him yet.** They carry every rule so far, applied
  book-wide.
- **Open questions** (also listed in the skill as [open]):
  - **যে before a long clause:** his last question was about "কোয়িমব্রা বিশ্ববিদ্যালয় সিদ্ধান্ত দিছিল যে, …"
    (06.001.01, second half). The proposal was to replace that যে with a colon wherever a long
    clause follows. There are about 21 places, and he has not answered.
  - **বারো:** kept, since বার also means "times".
  - **Coin names:** whether পিস্তোল, পিয়াস্তার and ফ্লোরিন should be named at all, or only
    described. Each is now glossed at its first use.
  - **Translated but still obscure:** খ্রিস্টযাগ and বাঁ-হাতি বিয়ে, whether to gloss them.
  - **তুই:** where it belongs. French has only tu and vous. The contemptuous tu (03.005.07,
    05.003.08) could become তুই.
  - **The last line:** "আমাদের বাগান চাষ করতে হবে". -টা was dropped from বাগানটা; he may want it back.

## How he works, and how to answer him

- **He marks sentences on the review page, then says "done with chapter N".** At that point:
  1. Read that chapter's marks: `notes` with `ch == N`, and the `chapters/NN` note.
  2. Find the patterns behind them. One edit usually stands for a rule. If a rule touches
     the whole book, count it and list the exceptions. Ask first when he has asked for that
     (he did in chapter 3), or when the change is large or uncertain.
  3. Apply it to the whole book in `text/candide-dhaka.tsv`.
  4. Put the rule in the skill: mark it [owner], add it to **At a glance** if he cares about it
     book-wide, and add a log line.
  5. Rebuild and republish the review page.
  6. Clear the applied marks: set the note's `bn` to null and write a short Bangla `reply`
     saying what was done. The reply shows under his comment.
  7. Commit and push.
- **He writes to Claude in Bangla and English mixed.** Answer in Bangla when he writes
  Bangla, briefly and concretely, with ids.
- **When you change a sentence he has an open rewrite on,** update his rewrite (the note's
  `bn`) the same way. The page shows his rewrite over the text, so otherwise your change
  stays hidden (this happened once, with কোশনিই).
- **He doesn't want floating comment threads on the page.** Comments live only in the
  sidebar. For voice he dictates into the chat and asks Claude to place it ("কমেন্ট: …" →
  put it verbatim into the selected sentence's comment), or uses the keyboard's mic.
  The page records the selected sentence in `state/selected`, so you can tell which
  sentence he means.

## The two pages

Both are claude.ai artifacts with a small database. **They belong to the owner's first
account.** Another account cannot open them, and their stores do not move with them, so on
a new account you publish them again from this folder. Each publish gives a new URL and an
empty store; this folder holds the latest export of the old stores.

| page | URL (current account, since 2026-10-31) | build | publish with |
|---|---|---|---|
| Candide review | https://claude.ai/artifact/ATW9iocMWJGuEE3XCLFGc6 | `python3 -I tools/candide-review/review/build.py` | `capabilities: {"db": {}, "downloads": true}` |
| verb and word choices | https://claude.ai/artifact/2c7dusSUtPsUVvdQF1d4NQ | `cd tools/candide-review/verbs && python3 -I build.py` | `capabilities: {"db": {}}` |

On the first account they were review https://claude.ai/artifact/K2gn9GJuBeLZFUVHyY2ers and
verbs https://claude.ai/artifact/HacLRsBMWgyTXFJZwGXnRd. The new review page's store was seeded
from `store/review/` on 2026-10-31; the verb page's store was left empty (that review is finished).

Both builds write to `work/` (ignored by git). Today they reproduce the published pages
byte for byte.

**The review page** (`review/template.html`, data injected at `__DATA__`):
- **Reading:** one chapter at a time. A tap on a sentence opens the sidebar, with the French,
  the Bangla to rewrite, a comment box, and the site's current text ("On the site now").
- **Marks:** a rewrite is underlined only in the words he changed (‸ where he cut). Comments
  show a blue dot.
- **Other tools:** a "Marks" view lists everything; chapters can be ticked as done; there is
  a JSON backup download.
- **Keys:** `j`/`k` move between sentences, `c` jumps into the comment box, `Esc` closes.
- **Store:**
  - `notes/<sentence id>`, holding `{id, ch, bn, comment, reply, orig, fr, updated}`:
    `bn` is his rewrite, or null; `reply` is Claude's answer;
  - `chapters/<NN>`, holding `{note, done}`;
  - `book/general`;
  - `state/selected`, holding `{id, recent}`.

**The verb page** (`verbs/template.html`): his choices, verb by verb, of the Dhaka form of
every verb form in the book. It also has tabs for other words and spelling. That review is
finished; its results are in the skill's `forms.tsv` and `words.tsv`. Store: `cells`,
`forms`, `words`, `settings/main`, `notes/main`.

## Moving to a new account

1. **Pull the repo.** The skill loads by itself from `.claude/skills/`.
2. **Publish both pages again** (see the table) and give him the new links.
3. **Seed the review page's store from `store/review/`** if he wants his old marks and replies
   visible: one ArtifactData batch of `set` writes, collection `notes`, `doc_id` the file
   name, data the file's `data`. Do the same for `chapters`. All marks so far are applied
   and answered, so seeding is for the record only. Starting empty loses no text.
4. **Edit `SKILL.md` → Sources** to point at the new URLs.

## What is in this folder

- **`text/candide-dhaka.tsv`:** the Dhaka draft, the text of record.
- **`review/`:** the review page's template, `build.py`, and `check.js` (a Playwright
  screenshot check).
- **`verbs/`:** the verb page and the tools behind it.
  - `morph.py`, `lexicon.py`, `tui.py`: the paradigms.
  - `match.py`: which forms Candide uses.
  - `final.py`: his choices applied.
  - `mech.py`: the first-pass converter used for Candide.
  - `data.py`, `addwords.py`: the page data.
  - `build.py`, `template.html`: the page itself.
- **`store/`:** the latest export of both pages' stores, so his marks, comments and choices
  survive the account.
- **`history/`:** the scripts that applied each chapter's rules, and the gleaned glosses.
  - `qa.py`, `harmonise.py`: merging and evening out the first conversion's six passes.
  - `ch1.py`, `ch3.py`, `ch4.py`: chapters 1, 3 and 4 applied book-wide.

  They are kept as a record of what was done. Their paths point to the old scratchpad, so
  don't rerun them. The skill's `convert.py` and `lint.py` are the tools to use now.

## How the draft was made

1. **First pass, by script.** Every verb form whose reading was certain was changed (`mech.py`,
   now `convert.py`).
2. **Six reading passes,** one per batch of chapters, read every sentence against the French.
   They settled the তুমি forms, words that depend on their sense, bookish vocabulary, idioms,
   and the script's mistakes (দিন read as দেন, জল → "পানিে" in the site's own text).
3. **Evening out.** Then everything was made consistent across the book.
4. **His reviews of chapters 1–6** each became book-wide rules: যেত/পেল/খেল; -গুলো avoided;
   -িয়ে → -ায়ে; -টা only when needed; না; curly quotes; Bangladeshi spelling; যুক্তবর্ণ; names
   closer to the French (কুনেগোঁদ, পাঁগ্লস, কাকাঁবো); হোটেল; and glosses at a word's first use,
   in brackets or in the flow.
