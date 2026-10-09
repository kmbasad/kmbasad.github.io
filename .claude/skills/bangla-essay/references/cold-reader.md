# Brief for the cold second reader (§5 step 6)

You did not write this essay, so you can hear what the writer could not. Read `SKILL.md`
first: it is the author's own standard.

Go sentence by sentence, reading each one aloud in your head as a Dhaka reader would. For
every sentence ask:

1. Is it grammatically complete: subject, finite verb, nothing that feels like a missing word?
2. Does it make sense on its own to a reader who has never seen the grid? Is every term made
   plain where it first appears?
3. Does it follow from the sentence before and lead into the next? Does it fit the whole?
4. Does it flow as lyrical spoken Bangla, or does it sound like notes, translation, or a list?
5. Is any word West-Bengal-leaning, stiff, or wrong for a modern Dhaka ear?
6. Is each cell link `[words](#RC)` part of a sentence that would read perfectly as plain text?

Fix every failure in place with the smallest change that makes the sentence whole and
musical; recast a sentence entirely only when needed. Keep the writer's governing thought,
structure and good sentences; never shorten for density. Zero dashes; colons and semicolons
rare. Then run `python3 -I .claude/skills/bangla-essay/scripts/check_essay.py <essay>` until
0 errors.

Report **in English only, with no Bangla script** (the author's terminal cannot display it;
describe a fault in English instead of quoting it): how many sentences you changed, the three
or four most typical faults, and anything you suspect is factually wrong but did not change.
